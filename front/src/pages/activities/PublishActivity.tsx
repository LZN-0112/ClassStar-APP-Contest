import { useState } from 'react';
import { Calendar, ImagePlus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function PublishActivity() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    date: '',
    location: '',
    description: '',
    deadline: '',
    quota: '',
  });
  const [, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  const classId = user?.classId;

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    if (!form.title.trim()) {
      toast.error('请输入活动名称');
      return false;
    }
    if (!form.date) {
      toast.error('请选择活动时间');
      return false;
    }
    if (!form.location.trim()) {
      toast.error('请输入活动地点');
      return false;
    }
    return true;
  };

  const handleCoverSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过 5MB');
      return;
    }

    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setCoverUrl(null);

    if (!classId) return;
    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post(`/classes/${classId}/activities/upload-cover`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.data?.coverUrl || res.data?.coverUrl;
      if (url) {
        setCoverUrl(url);
        toast.success('封面上传成功');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '封面上传失败');
      setCoverFile(null);
      setCoverPreview(null);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleRemoveCover = () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(null);
    setCoverPreview(null);
    setCoverUrl(null);
  };

  const handleSubmit = async () => {
    if (!validate() || loading || !classId) return;

    const [eventDate, eventTimeRaw] = form.date.split('T');
    const eventTime = eventTimeRaw ? `${eventTimeRaw}:00` : undefined;

    setLoading(true);
    try {
      await api.post(`/classes/${classId}/activities`, {
        title: form.title.trim(),
        eventDate,
        eventTime,
        location: form.location.trim(),
        capacity: form.quota ? Number(form.quota) : undefined,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined,
        coverUrl: coverUrl || undefined,
      });
      toast.success('发布成功');
      navigate('/activity-list', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '发布失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageLayout
        title="发布活动"
        variant="a"
        decor={<Calendar className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}
      >
        <div className="flex min-h-full w-full flex-col gap-5">
        <div
          data-pencil-name="Input Field"
          className="box-border flex h-[56px] w-full shrink-0 flex-col justify-center rounded-xl border border-[#E2E8F0] bg-white px-4"
        >
          <input
            type="text"
            value={form.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="请输入活动名称"
            className="w-full bg-transparent font-body text-[14px] font-medium text-[#1A1A1A] placeholder:text-[#94A3B8] outline-none"
          />
        </div>
        <div
          data-pencil-name="Input Field"
          className="box-border flex h-[56px] w-full shrink-0 flex-col justify-center rounded-xl border border-[#E2E8F0] bg-white px-4"
        >
          <input
            type="datetime-local"
            value={form.date}
            onChange={(e) => handleChange('date', e.target.value)}
            placeholder="请选择活动时间"
            className="w-full bg-transparent font-body text-[14px] font-medium text-[#1A1A1A] placeholder:text-[#94A3B8] outline-none"
          />
        </div>
        <div
          data-pencil-name="Input Field"
          className="box-border flex h-[56px] w-full shrink-0 flex-col justify-center rounded-xl border border-[#E2E8F0] bg-white px-4"
        >
          <input
            type="text"
            value={form.location}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder="请输入活动地点"
            className="w-full bg-transparent font-body text-[14px] font-medium text-[#1A1A1A] placeholder:text-[#94A3B8] outline-none"
          />
        </div>
        <div
          data-pencil-name="Textarea"
          className="box-border flex h-[120px] w-full shrink-0 flex-col justify-start rounded-xl border border-[#E2E8F0] bg-white p-4"
        >
          <textarea
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="请输入活动详情..."
            rows={4}
            className="h-full w-full resize-none bg-transparent font-body text-[14px] font-medium text-[#1A1A1A] placeholder:text-[#94A3B8] outline-none"
          />
        </div>
        <div className="box-border flex w-full shrink-0 flex-col gap-2 rounded-xl border border-[#E2E8F0] bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-medium text-[#1A1A1A]">活动封面照片</span>
            {coverPreview && (
              <button
                type="button"
                onClick={handleRemoveCover}
                className="flex items-center gap-1 text-[12px] text-red-500"
              >
                <X className="h-3 w-3" />
                移除
              </button>
            )}
          </div>
          {coverPreview ? (
            <div className="relative h-[160px] w-full overflow-hidden rounded-lg bg-gray-50">
              <img
                src={coverPreview}
                alt="活动封面预览"
                className="h-full w-full object-cover"
              />
              {uploadingCover && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white text-sm">
                  上传中...
                </div>
              )}
            </div>
          ) : (
            <label className="flex h-[160px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#CBD5E1] bg-gray-50 text-[#94A3B8]">
              <ImagePlus className="h-8 w-8" />
              <span className="text-[13px]">点击上传活动封面照片</span>
              <span className="text-[11px]">支持 jpg/png，不超过 5MB</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handleCoverSelect}
                className="hidden"
              />
            </label>
          )}
        </div>
        <div
          data-pencil-name="Input Field"
          className="box-border flex h-[56px] w-full shrink-0 flex-col justify-center rounded-xl border border-[#E2E8F0] bg-white px-4"
        >
          <input
            type="datetime-local"
            value={form.deadline}
            onChange={(e) => handleChange('deadline', e.target.value)}
            placeholder="请选择报名截止时间"
            className="w-full bg-transparent font-body text-[14px] font-medium text-[#1A1A1A] placeholder:text-[#94A3B8] outline-none"
          />
        </div>
        <div
          data-pencil-name="Input Field"
          className="box-border flex h-[56px] w-full shrink-0 flex-col justify-center rounded-xl border border-[#E2E8F0] bg-white px-4"
        >
          <input
            type="number"
            value={form.quota}
            onChange={(e) => handleChange('quota', e.target.value)}
            placeholder="请输入人数限制"
            className="w-full bg-transparent font-body text-[14px] font-medium text-[#1A1A1A] placeholder:text-[#94A3B8] outline-none"
          />
        </div>
        <div
          data-pencil-name="Spacer"
          className="box-border h-[20px] w-full shrink-0"
        ></div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          data-pencil-name="Button Primary"
          className={`box-border flex h-[52px] w-full shrink-0 flex-col items-center justify-center rounded-xl shadow-[0px_4px_16px_0px_#0000001A] ${
            loading ? 'bg-[#93C5FD]' : 'bg-[#0062FF]'
          }`}
        >
          <div
            data-pencil-name="Text"
            className="text-[16px]/[normal] box-border text-left font-body font-semibold text-white [white-space:nowrap]"
          >
            {loading ? '发布中...' : '发布活动'}
          </div>
        </button>
      </div>
      </PageLayout>
    </>
  );
}
