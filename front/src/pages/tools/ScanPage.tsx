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
    // 重试前先释放上一次可能残留的流，避免摄像头被占用
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      const msg = '当前环境不支持摄像头，请从相册选择二维码';
      setCameraError(msg);
      toast.error(msg);
      return;
    }

    // getUserMedia 在部分机型/WebView 上可能既不 resolve 也不 reject，加超时兜底避免一直黑屏
    let timer: number | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = window.setTimeout(() => reject(new Error('CAMERA_TIMEOUT')), 8000);
    });
    const gumPromise = navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });

    try {
      const stream = await Promise.race([gumPromise, timeoutPromise]);
      streamRef.current = stream;

      requestAnimationFrame(() => {
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video.play().then(() => {
            setCameraReady(true);
          }).catch(() => {
            setCameraError('视频播放失败，请重试');
          });
        };
        // 流已获取但迟迟没有画面时的兜底提示
        window.setTimeout(() => {
          if (video.readyState < 1 || video.videoWidth === 0) {
            setCameraError('摄像头画面加载超时，请重试');
          }
        }, 8000);
      });
    } catch (err: any) {
      // 超时后如果 getUserMedia 又成功返回，立即释放，避免摄像头一直开启
      gumPromise.then((s) => s.getTracks().forEach((t) => t.stop())).catch(() => undefined);
      const msg = err?.message === 'CAMERA_TIMEOUT'
        ? '摄像头启动超时，请重试或从相册选择'
        : err?.name === 'NotAllowedError'
        ? '摄像头权限被拒绝'
        : err?.name === 'NotFoundError'
        ? '未检测到摄像头'
        : '无法访问摄像头';
      setCameraError(msg);
      toast.error(msg);
    } finally {
      if (timer) window.clearTimeout(timer);
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
      // 兼容历史班级码（可能含字母，非 6 位纯数字）
      const classMatch = data.match(/class-assistant:\/\/class\/join\?code=([A-Za-z0-9]+)/);
      if (classMatch) {
        const code = classMatch[1].toUpperCase();
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
          // 已导入名单的班级需要学号，转到加入页补充
          if (err instanceof Error && (err.message.includes('学号') || err.message.includes('名单'))) {
            toast.info('该班级已导入名单，请填写学号后加入');
            navigate(`/join-class?code=${encodeURIComponent(code)}`, { replace: true });
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
        // 大图先等比压缩到 1280px 以内再解码，避免 12MP 原图 getImageData 占用数十 MB 导致卡顿/闪退
        const maxSide = 1280;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          toast.error('图片处理失败，请重试');
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          handleScanResult(code.data);
        } else {
          toast.error('未在图片中识别到二维码');
        }
      };
      img.onerror = () => {
        toast.error('图片读取失败，请更换图片重试');
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
    <div className="fixed inset-0 z-50 bg-[#0F172A] flex flex-col">
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
          <div className="absolute inset-0 flex items-center justify-center bg-[rgba(15,23,42,0.78)]">
            <div className="text-center px-6">
              <div className="text-white text-lg mb-2">无法打开摄像头</div>
              <div className="text-white/60 text-sm mb-4">{cameraError}</div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => void startCamera()}
                  className="px-6 h-[48px] rounded-[14px] bg-[linear-gradient(180deg,#2E7DFF_0%,#0062FF_100%)] text-white text-sm font-semibold shadow-[0_10px_20px_rgba(0,98,255,0.24)] active:opacity-90"
                >
                  重试
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 h-[48px] rounded-[14px] bg-[#F2F5F9] text-[#475569] text-sm font-medium active:opacity-80"
                >
                  从相册选择二维码
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scan frame overlay */}
        {cameraReady && (
          <>
            {/* Dark overlay with cutout */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-[rgba(15,23,42,0.55)]" />
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] border-2 border-white/80 rounded-[20px]"
                style={{
                  boxShadow: '0 0 0 9999px rgba(15,23,42,0.55)',
                }}
              >
                {/* Corner accents */}
                <div className="absolute -top-[2px] -left-[2px] w-8 h-8 border-t-[3px] border-l-[3px] border-[#0062FF] rounded-tl-[20px]" />
                <div className="absolute -top-[2px] -right-[2px] w-8 h-8 border-t-[3px] border-r-[3px] border-[#0062FF] rounded-tr-[20px]" />
                <div className="absolute -bottom-[2px] -left-[2px] w-8 h-8 border-b-[3px] border-l-[3px] border-[#0062FF] rounded-bl-[20px]" />
                <div className="absolute -bottom-[2px] -right-[2px] w-8 h-8 border-b-[3px] border-r-[3px] border-[#0062FF] rounded-br-[20px]" />

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
                className="w-10 h-10 flex items-center justify-center rounded-[14px] bg-[rgba(15,23,42,0.55)] backdrop-blur-sm"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <span className="text-white text-sm font-medium">扫一扫</span>
              <button
                onClick={toggleFlash}
                className="w-10 h-10 flex items-center justify-center rounded-[14px] bg-[rgba(15,23,42,0.55)] backdrop-blur-sm"
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
      <div className="flex items-center justify-center gap-12 py-6 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] bg-[#0F172A]">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center gap-1.5"
        >
          <div className="w-12 h-12 flex items-center justify-center rounded-[16px] bg-white/10">
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
