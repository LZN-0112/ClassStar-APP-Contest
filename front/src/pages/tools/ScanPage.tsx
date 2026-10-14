import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Image, Zap, ZapOff } from 'lucide-react';
import jsQR from 'jsqr';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function ScanPage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [flashOn, setFlashOn] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [processing, setProcessing] = useState(false);

  const startCamera = useCallback(async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;

      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().then(() => {
              setCameraReady(true);
            }).catch(() => {
              setCameraError('视频播放失败');
            });
          };
        }
      });
    } catch (err: any) {
      const msg = err?.name === 'NotAllowedError'
        ? '摄像头权限被拒绝'
        : err?.name === 'NotFoundError'
        ? '未检测到摄像头'
        : '无法访问摄像头';
      setCameraError(msg);
      toast.error(msg);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }, []);

  // QR code scanning loop
  const scanLoop = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !scanning) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        setScanning(false);
        handleScanResult(code.data);
        return;
      }
    }

    animationRef.current = requestAnimationFrame(scanLoop);
  }, [scanning]);

  useEffect(() => {
    if (cameraReady && scanning) {
      animationRef.current = requestAnimationFrame(scanLoop);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [cameraReady, scanning, scanLoop]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // Parse scan result and handle check-in or class join
  const handleScanResult = async (data: string) => {
    setProcessing(true);
    try {
      // Check if it's a class invite QR code: class-assistant://class/join?code=XXXXXX
      const classMatch = data.match(/class-assistant:\/\/class\/join\?code=(\d{6})$/);
      if (classMatch) {
        const code = classMatch[1];
        try {
          const res = await api.post('/classes/join', { code });
          const className = res.data?.data?.name || res.data?.name || '';
          toast.success(`成功加入班级：${className}`);
          navigate('/home', { replace: true });
          return;
        } catch (err) {
          if (err instanceof Error && err.message.includes('已是该班级成员')) {
            toast.info('你已是该班级成员');
            navigate('/home', { replace: true });
            return;
          }
          throw err;
        }
      }

      // Otherwise, handle as attendance QR code
      // Expected format: attendance:{classId}:{attendanceId}
      const match = data.match(/^attendance:([^:]+):([^:]+)$/);
      if (!match) {
        toast.error('无法识别的二维码');
        setScanning(true);
        return;
      }
      const [, classId, attendanceId] = match;
      await api.post(`/classes/${classId}/attendances/${attendanceId}/check-in`, {
        method: 'qr',
      });
      toast.success('签到成功！');
      navigate('/attendance-list', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '处理失败');
      setScanning(true);
    } finally {
      setProcessing(false);
    }
  };

  // Handle album image selection
  const handleAlbumSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new (window as any).Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          handleScanResult(code.data);
        } else {
          toast.error('未在图片中识别到二维码');
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Toggle flash
  const toggleFlash = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      const capabilities = track.getCapabilities() as any;
      if (!capabilities.torch) {
        toast.error('当前设备不支持闪光灯');
        return;
      }
      const newFlash = !flashOn;
      await track.applyConstraints({ advanced: [{ torch: newFlash } as any] });
      setFlashOn(newFlash);
    } catch {
      toast.error('闪光灯控制失败');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAlbumSelect}
      />

      {/* Camera view */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Error overlay */}
        {!cameraReady && cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center px-6">
              <div className="text-white text-lg mb-2">无法打开摄像头</div>
              <div className="text-white/60 text-sm mb-4">{cameraError}</div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2 bg-white/20 text-white rounded-lg text-sm"
              >
                从相册选择二维码
              </button>
            </div>
          </div>
        )}

        {/* Scan frame overlay */}
        {cameraReady && (
          <>
            {/* Dark overlay with cutout */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-black/50" />
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] border-2 border-white/80 rounded-lg"
                style={{
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                }}
              >
                {/* Corner accents */}
                <div className="absolute -top-[2px] -left-[2px] w-8 h-8 border-t-[3px] border-l-[3px] border-[#0062FF] rounded-tl-lg" />
                <div className="absolute -top-[2px] -right-[2px] w-8 h-8 border-t-[3px] border-r-[3px] border-[#0062FF] rounded-tr-lg" />
                <div className="absolute -bottom-[2px] -left-[2px] w-8 h-8 border-b-[3px] border-l-[3px] border-[#0062FF] rounded-bl-lg" />
                <div className="absolute -bottom-[2px] -right-[2px] w-8 h-8 border-b-[3px] border-r-[3px] border-[#0062FF] rounded-br-lg" />

                {/* Scanning line animation */}
                {scanning && (
                  <div
                    className="absolute left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-[#0062FF] to-transparent"
                    style={{
                      animation: 'scanLine 2s ease-in-out infinite',
                    }}
                  />
                )}
              </div>
            </div>

            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-[env(safe-area-inset-top,12px)] pb-3">
              <button
                onClick={() => navigate(-1)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <span className="text-white text-sm font-medium">扫一扫</span>
              <button
                onClick={toggleFlash}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm"
              >
                {flashOn ? (
                  <ZapOff className="w-5 h-5 text-white" />
                ) : (
                  <Zap className="w-5 h-5 text-white" />
                )}
              </button>
            </div>

            {/* Bottom hint */}
            <div className="absolute bottom-24 left-0 right-0 text-center pointer-events-none">
              <div className="text-white/80 text-sm">
                {processing ? '签到处理中...' : scanning ? '将二维码放入框内，即可自动扫描' : '扫描成功'}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom toolbar */}
      <div className="flex items-center justify-center gap-12 py-6 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] bg-black">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center gap-1.5"
        >
          <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10">
            <Image className="w-5 h-5 text-white" />
          </div>
          <span className="text-white/70 text-xs">相册</span>
        </button>
      </div>

      {/* Scan line animation style */}
      <style>{`
        @keyframes scanLine {
          0% { top: 8px; }
          50% { top: calc(100% - 8px); }
          100% { top: 8px; }
        }
      `}</style>
    </div>
  );
}
