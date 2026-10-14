import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { useParams } from 'react-router-dom';
import { Image, Camera, Mic, FileText, X, CheckCircle } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import {
  getHomeworkById,
  getMySubmission,
  submitHomework,
  type HomeworkItem,
  type SubmissionRecord,
  type SubmissionAttachment,
} from '@/stores/homeworkStore';

type Attachment = {
  id: string;
  file: File;
  preview?: string;
  type: 'image' | 'audio' | 'file';
};

export default function HomeworkDetail() {
  const { id } = useParams<{ id: string }>();
  const [hw, setHw] = useState<HomeworkItem | null>(null);
  const [submission, setSubmission] = useState<SubmissionRecord | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // 摄像头相关
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // 录音相关
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const imgRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // 加载作业数据和提交记录
  useEffect(() => {
    if (id) {
      const homework = getHomeworkById(id);
      if (homework) {
        setHw(homework);
        const sub = getMySubmission(id);
        if (sub) setSubmission(sub);
      }
    }
  }, [id]);

  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (recordStreamRef.current) recordStreamRef.current.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!showCamera && streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, [showCamera]);

  const genId = () => Math.random().toString(36).slice(2, 10);

  const addFile = (file: File, preview?: string, type: 'image' | 'audio' | 'file' = 'file') => {
    setAttachments((prev) => [...prev, { id: genId(), file, preview, type }]);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const item = prev.find((a) => a.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((a) => a.id !== id);
    });
  };

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        const url = URL.createObjectURL(file);
        addFile(file, url, 'image');
      });
    }
    e.target.value = '';
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => addFile(file, undefined, 'file'));
    }
    e.target.value = '';
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch {
      alert('无法访问摄像头，请检查权限设置');
    }
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const url = URL.createObjectURL(file);
        addFile(file, url, 'image');
      }
    }, 'image/jpeg', 0.8);
    setShowCamera(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `record_${Date.now()}.webm`, { type: 'audio/webm' });
        addFile(file, undefined, 'audio');
        if (recordStreamRef.current) {
          recordStreamRef.current.getTracks().forEach((t) => t.stop());
          recordStreamRef.current = null;
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordTime(0);
      timerRef.current = setInterval(() => setRecordTime((t) => t + 1), 1000);
    } catch {
      alert('无法访问麦克风，请检查权限设置');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const handleSubmit = () => {
    if (!content.trim() && attachments.length === 0) {
      alert('请输入内容或添加附件');
      return;
    }
    if (!hw) return;

    // 将 File 对象转为可序列化的附件数据
    const storeAttachments: SubmissionAttachment[] = attachments.map((a) => ({
      id: a.id,
      name: a.file.name,
      type: a.type,
      preview: a.preview,
    }));

    const record = submitHomework(hw.id, content.trim(), storeAttachments);
    setSubmission(record);

    attachments.forEach((a) => {
      if (a.preview) URL.revokeObjectURL(a.preview);
    });
    setShowModal(false);
    setContent('');
    setAttachments([]);
  };

  const isSubmitted = !!submission;

  // 格式化截止时间
  const formatDeadline = (deadline: string) => {
    if (!deadline) return '';
    const d = new Date(deadline);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hour = d.getHours();
    return `${month}月${day}日 ${String(hour).padStart(2, '0')}:00截止`;
  };

  if (!hw) {
    return (
      <PageLayout title="作业详情" variant="a">
        <div className="flex items-center justify-center py-16 text-[#9CA3AF]">
          作业不存在
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="作业详情" variant="a">
      {/* 作业详情卡片 */}
      <div className="w-full bg-white/70 backdrop-blur-md rounded-2xl p-4 mb-3 shadow-[0_2px_12px_0px_#00000008]">
        <div className="w-full bg-[#EBF4FF] rounded-xl p-3 mb-3">
          <div className="text-[16px] font-bold text-[#1A1A1A] mb-2">{hw.title}</div>
          <div className="flex gap-2 flex-wrap">
            <span className="text-[12px] text-[#4B5563] bg-white/60 px-3 py-1 rounded-full">
              预计需 15 分钟
            </span>
            <span className="text-[12px] text-[#4B5563] bg-white/60 px-3 py-1 rounded-full">
              {formatDeadline(hw.deadline)}
            </span>
          </div>
        </div>
        <p className="text-[15px] text-[#1A1A1A] leading-relaxed whitespace-pre-wrap mb-3">
          {hw.requirement}
        </p>
        <div className="text-[12px] text-[#9CA3AF]">
          {hw.createdBy} 布置于 {hw.createdAt}
        </div>
      </div>

      {/* 已提交记录卡片 */}
      {isSubmitted && submission && (
        <div className="w-full bg-white/70 backdrop-blur-md rounded-2xl p-4 mb-3 shadow-[0_2px_12px_0px_#00000008]">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-[#22C55E]" />
            <span className="text-[15px] font-semibold text-[#22C55E]">已提交</span>
            <span className="text-[12px] text-[#9CA3AF] ml-auto">{submission.submittedAt}</span>
          </div>
          {submission.content && (
            <div className="text-[14px] text-[#1A1A1A] leading-relaxed whitespace-pre-wrap mb-2 bg-[#F9FAFB] rounded-lg p-3">
              {submission.content}
            </div>
          )}
          {submission.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {submission.attachments.map((att) => (
                <div key={att.id}>
                  {att.type === 'image' && att.preview ? (
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-[#E5E7EB]">
                      <img src={att.preview} alt={att.name} className="w-full h-full object-cover" />
                    </div>
                  ) : att.type === 'audio' ? (
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-[#F3F4F6] rounded-lg text-[12px] text-[#4B5563]">
                      <Mic className="w-3.5 h-3.5 text-[#0062FF]" />
                      <span>{att.name}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-[#F3F4F6] rounded-lg text-[12px] text-[#4B5563]">
                      <FileText className="w-3.5 h-3.5" />
                      <span className="max-w-[100px] truncate">{att.name}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 优秀作答卡片 */}
      <div className="w-full bg-white/70 backdrop-blur-md rounded-2xl px-4 py-3 mb-4 shadow-[0_2px_12px_0px_#00000008] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center">
            <span className="text-white text-sm font-bold">★</span>
          </div>
          <span className="text-[15px] font-semibold text-[#1A1A1A]">优秀作答</span>
        </div>
        <span className="text-[13px] text-[#9CA3AF]">如何被选为优秀作答 ›</span>
      </div>

      {/* 底部留白 */}
      <div className="h-[72px]" />

      {/* 底部固定按钮栏 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 px-5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-3">
        <div className="flex gap-3 bg-white/80 backdrop-blur-md rounded-2xl px-4 py-3 shadow-[0_4px_20px_0px_#00000010] border border-white/50">
          <button
            type="button"
            className="flex-1 h-[48px] rounded-xl border border-[#E5E7EB] bg-white text-[15px] font-medium text-[#4B5563] active:bg-gray-50 transition-colors"
          >
            有疑问
          </button>
          <button
            type="button"
            onClick={() => {
              if (isSubmitted && submission) {
                setContent(submission.content);
              }
              setShowModal(true);
            }}
            className="flex-1 h-[48px] rounded-xl bg-[#0062FF] text-[15px] font-semibold text-white shadow-[0_4px_16px_0px_#0000001A] active:opacity-90 transition-opacity"
          >
            {isSubmitted ? '去改正' : '去提交'}
          </button>
        </div>
      </div>

      {/* 提交弹窗 */}
      {showModal && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 animate-[fadeIn_0.2s_ease]"
            onClick={() => setShowModal(false)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[85vh] flex flex-col animate-[slideUp_0.25s_ease]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F3F4F6] shrink-0">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center text-[#9CA3AF]"
              >
                <X className="w-5 h-5" />
              </button>
              <span className="text-[16px] font-semibold text-[#1A1A1A]">
                {isSubmitted ? '改正练习' : '提交练习'}
              </span>
              <div className="w-8" />
            </div>

            <div className="flex-1 overflow-y-auto">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="请填写提交内容"
                className="w-full min-h-[120px] px-5 py-4 text-[15px] text-[#1A1A1A] placeholder-[#9CA3AF] resize-none outline-none bg-transparent"
              />

              {attachments.length > 0 && (
                <div className="px-5 pb-2 flex flex-wrap gap-2">
                  {attachments.map((att) => (
                    <div key={att.id} className="relative">
                      {att.type === 'image' && att.preview ? (
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#E5E7EB]">
                          <img src={att.preview} alt={att.file.name} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeAttachment(att.id)}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#EF4444] text-white flex items-center justify-center shadow"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : att.type === 'audio' ? (
                        <div className="flex items-center gap-1.5 px-3 py-2 bg-[#F3F4F6] rounded-lg text-[12px] text-[#4B5563]">
                          <Mic className="w-3.5 h-3.5 text-[#0062FF]" />
                          <span className="max-w-[100px] truncate">{att.file.name}</span>
                          <button type="button" onClick={() => removeAttachment(att.id)} className="text-[#9CA3AF]">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-3 py-2 bg-[#F3F4F6] rounded-lg text-[12px] text-[#4B5563]">
                          <FileText className="w-3.5 h-3.5" />
                          <span className="max-w-[100px] truncate">{att.file.name}</span>
                          <button type="button" onClick={() => removeAttachment(att.id)} className="text-[#9CA3AF]">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 px-5 py-3 border-t border-[#F3F4F6] shrink-0">
              <button
                type="button"
                onClick={() => imgRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-full border border-[#E5E7EB] bg-white text-[13px] font-medium text-[#4B5563] active:bg-gray-50 transition-colors"
              >
                <Image className="w-4 h-4" />
                图片
              </button>
              <button
                type="button"
                onClick={openCamera}
                className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-full border border-[#E5E7EB] bg-white text-[13px] font-medium text-[#4B5563] active:bg-gray-50 transition-colors"
              >
                <Camera className="w-4 h-4" />
                拍照
              </button>
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-full border text-[13px] font-medium transition-colors ${
                  isRecording
                    ? 'border-[#EF4444] bg-[#EF4444] text-white animate-pulse'
                    : 'border-[#E5E7EB] bg-white text-[#4B5563] active:bg-gray-50'
                }`}
              >
                <Mic className="w-4 h-4" />
                {isRecording ? `${formatTime(recordTime)}` : '录音'}
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-full border border-[#E5E7EB] bg-white text-[13px] font-medium text-[#4B5563] active:bg-gray-50 transition-colors"
              >
                <FileText className="w-4 h-4" />
                文件
              </button>
            </div>

            <div className="px-5 pb-6 pt-2 shrink-0">
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full h-[48px] rounded-xl bg-[#0062FF] text-[16px] font-semibold text-white shadow-[0_4px_16px_0px_#0000001A] active:opacity-90 transition-opacity"
              >
                {isSubmitted ? '重新提交' : '提交'}
              </button>
            </div>
          </div>

          <input ref={imgRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
          <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
        </>
      )}

      {/* 摄像头拍照弹窗 */}
      {showCamera && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 bg-black/80">
            <button
              type="button"
              onClick={() => {
                setShowCamera(false);
                if (streamRef.current) {
                  streamRef.current.getTracks().forEach((t) => t.stop());
                  streamRef.current = null;
                }
              }}
              className="w-8 h-8 flex items-center justify-center text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <span className="text-white text-[16px] font-semibold">拍照</span>
            <div className="w-8" />
          </div>
          <div className="flex-1 flex items-center justify-center bg-black relative">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <div className="flex items-center justify-center py-6 bg-black/80">
            <button
              type="button"
              onClick={takePhoto}
              className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform"
            >
              <div className="w-12 h-12 rounded-full bg-white" />
            </button>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
