import { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface FaceCheckInProps {
  classId: string;
  attendanceId: string;
  onSuccess: () => void;
}

export default function FaceCheckIn({ classId, attendanceId, onSuccess }: FaceCheckInProps) {
  const [loading, setLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      // 先设置状态让 video 元素渲染出来，再绑定流
      setCameraActive(true);
    } catch (err: any) {
      const msg = err?.name === 'NotAllowedError'
        ? '摄像头权限被拒绝，请在浏览器设置中允许访问'
        : err?.name === 'NotFoundError'
        ? '未检测到摄像头设备'
        : '无法访问摄像头，请检查权限设置';
      setCameraError(msg);
      toast.error(msg);
    }
  };

  // 当 cameraActive 变为 true 时，绑定流到 video 元素
  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().catch(() => {
          setCameraError('视频播放失败，请重试');
        });
      };
    }
  }, [cameraActive]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // 压缩图片并添加水印
  const compressAndWatermark = (img: HTMLImageElement): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const maxW = 640;
    const maxH = 480;
    let w = img.width;
    let h = img.height;
    if (w > maxW) {
      h = (h * maxW) / w;
      w = maxW;
    }
    if (h > maxH) {
      w = (w * maxH) / h;
      h = maxH;
    }

    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(img, 0, 0, w, h);

    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, h - 36, w, 36);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px sans-serif';
    ctx.fillText(`签到时间：${timeStr}`, 8, h - 12);

    return canvas.toDataURL('image/jpeg', 0.6);
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error('摄像头画面未就绪，请稍后重试');
      return;
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    tempCtx.drawImage(video, 0, 0);

    const img = new (window as any).Image();
    img.onload = () => {
      const compressed = compressAndWatermark(img);
      setPhotoUrl(compressed);
      stopCamera();
    };
    img.src = tempCanvas.toDataURL('image/png');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        const compressed = compressAndWatermark(img);
        setPhotoUrl(compressed);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCheckIn = async () => {
    if (!photoUrl) {
      toast.error('请先拍照或选择图片');
      return;
    }
    setLoading(true);
    try {
      await api.post(`/classes/${classId}/attendances/${attendanceId}/check-in`, {
        method: 'face',
        selfieUrl: photoUrl,
      });
      toast.success('签到成功！');
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '签到失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="flex flex-col gap-2 p-4 bg-[#FFF7ED] rounded-lg border border-[#FED7AA]">
        <div className="flex items-center gap-2 text-[#C2410C] text-sm font-medium">
          <Camera className="w-4 h-4" />
          <span>水印拍照签到</span>
        </div>
        <div className="text-xs text-[#4B5563]">拍照或选择图片时自动添加时间水印</div>
      </div>

      <div className="flex flex-col items-center gap-3 bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg overflow-hidden">
        {cameraActive ? (
          <div className="relative w-full">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-[300px] object-cover bg-black"
              style={{ transform: 'scaleX(-1)' }}
            />
            <button
              onClick={takePhoto}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-white border-4 border-[#0062FF] flex items-center justify-center active:opacity-80"
            >
              <div className="w-10 h-10 rounded-full bg-[#0062FF]" />
            </button>
          </div>
        ) : photoUrl ? (
          <div className="relative w-full">
            <img src={photoUrl} alt="签到照片" className="w-full h-[300px] object-cover" />
            <button
              onClick={() => setPhotoUrl(null)}
              className="absolute top-2 right-2 px-3 py-1 bg-black/50 text-white text-xs rounded-full"
            >
              重拍
            </button>
          </div>
        ) : (
          <div className="w-full h-[300px] flex flex-col items-center justify-center bg-[#F3F4F6]">
            <Camera className="w-12 h-12 text-[#9CA3AF] mb-2" />
            <div className="text-sm text-[#9CA3AF]">点击下方按钮开始拍照</div>
            {cameraError && (
              <div className="text-xs text-[#EF4444] mt-2 px-4 text-center">{cameraError}</div>
            )}
          </div>
        )}
      </div>

      {!cameraActive && !photoUrl && (
        <div className="flex gap-2">
          <button
            onClick={startCamera}
            className="flex-1 h-[48px] flex items-center justify-center gap-2 bg-[#0062FF] text-white font-medium rounded-lg active:opacity-80"
          >
            <Camera className="w-4 h-4" />
            打开相机
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 h-[48px] flex items-center justify-center gap-2 bg-[#F9FAFB] text-[#374151] font-medium rounded-lg border border-[#E5E7EB] active:opacity-80"
          >
            <ImageIcon className="w-4 h-4" />
            从相册选择
          </button>
        </div>
      )}

      {photoUrl && (
        <button
          onClick={handleCheckIn}
          disabled={loading}
          className="w-full h-[48px] flex items-center justify-center bg-[#0062FF] text-white font-medium rounded-lg disabled:opacity-50 active:opacity-80"
        >
          {loading ? '签到中...' : '确认签到'}
        </button>
      )}
    </div>
  );
}
