import { useState } from 'react';
import { Calendar, ChevronRight, ImagePlus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import DateTimePickerSheet, { formatDateTimeLabel } from '@/components/ui/DateTimePickerSheet';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api, resolveFileUrl } from '@/lib/api';
import { toast } from 'sonner';

const inputShell =
  'box-border flex min-h-[60px] w-full shrink-0 flex-col justify-center gap-1 rounded-xl border border-[#E2E8F0] bg-white px-4 py-2';
const labelClass =
  'text-[11px]/[normal] box-border font-body font-medium text-[#94A3B8] text-left';
const inputClass =
  'w-full bg-transparent font-body text-[14px] font-medium text-[#1A1A1A] placeholder:text-[#94A3B8] outline-none';

const ACTIVITY_CATEGORIES = ['文体活动', '学习交流', '志愿服务', '班级事务', '其他'];
const MAX_PHOTOS = 6;

interface ActivityPhoto {
  key: string;
  url: string;
}

export default function PublishActivity() {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    category: '',
    date: '',
    location: '',
    description: '',
    deadline: '',
    quota: '',
  });
  const [photos, setPhotos] = useState<ActivityPhoto[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [mandatory, setMandatory] = useState(false);
  const [picker, setPicker] = useState<'date' | 'deadline' | null>(null);

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
    const eventStart = new Date(form.date).getTime();
    if (Number.isNaN(eventStart) || eventStart < Date.now()) {
      toast.error('活动时间不能早于当前时间');
      return false;
    }
    if (!form.location.trim()) {
      toast.error('请输入活动地点');
      return false;
    }
    if (form.description.trim().length > 2000) {
      toast.error('活动详情不能超过 2000 字');
      return false;
    }
    if (form.deadline) {
      const deadline = new Date(form.deadline).getTime();
      if (Number.isNaN(deadline) || deadline <= Date.now()) {
        toast.error('报名截止时间必须晚于当前时间');
        return false;
      }
      if (deadline > eventStart) {
        toast.error('报名截止时间不能晚于活动开始时间');
        return false;
      }
    }
    if (form.quota) {
      const quota = Number(form.quota);
      if (!Number.isInteger(quota) || quota <= 0) {
        toast.error('人数限制必须为正整数');
        return false;
      }
    }
    if (uploadingPhoto) {
      toast.error('图片正在上传，请稍候');
      return false;
    }
    return true;
  };

  const handlePhotosSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length) return;

    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      toast.error(`最多上传 ${MAX_PHOTOS} 张图片`);
      return;
    }
    if (files.length > remaining) {
      toast.error(`最多上传 ${MAX_PHOTOS} 张图片，本次仅添加前 ${remaining} 张`);
    }
    const selected = files.slice(0, remaining);

    if (!classId) {
      toast.error('缺少班级信息，请返回重试');
      return;
    }

    setUploadingPhoto(true);
    for (const file of selected) {
      if (!file.type.startsWith('image/')) {
        toast.error('请选择图片文件');
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('单张图片大小不能超过 5MB');
        continue;
      }
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post(`/classes/${classId}/activities/upload-cover`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const url = res.data?.data?.coverUrl || res.data?.coverUrl;
        if (url) {
          setPhotos((prev) => [
            ...prev,
            { key: `${Date.now()}-${Math.random().toString(36).slice(2)}`, url },
          ]);
        } else {
          toast.error('图片上传失败，请重试');
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '图片上传失败');
      }
    }
    setUploadingPhoto(false);
  };

  const handleRemovePhoto = (key: string) => {
    setPhotos((prev) => prev.filter((photo) => photo.key !== key));
  };

  const handleSubmit = async () => {
    if (loading || !classId) return;
    if (user?.roleLevel !== 'owner' && user?.roleLevel !== 'admin') {
      toast.error('仅班委可发布活动');
      return;
    }
    if (!validate()) return;

    const [eventDate, eventTimeRaw] = form.date.split('T');
    const eventTime = eventTimeRaw ? `${eventTimeRaw}:00` : undefined;

    setLoading(true);
    try {
      await api.post(`/classes/${classId}/activities`, {
        title: form.title.trim(),
        category: form.category || undefined,
        eventDate,
        eventTime,
        location: form.location.trim(),
        description: form.description.trim() || undefined,
        capacity: form.quota ? Number(form.quota) : undefined,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined,
        coverUrl: photos[0]?.url || undefined,
        images: photos.length ? photos.map((photo) => photo.url) : undefined,
        isMandatory: mandatory,
      });
      toast.success('发布成功');
      navigate('/activity-list', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '发布失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (userLoading) {
    return (
      <PageLayout title="发布活动" variant="a">
        <div className="flex min-h-[300px] items-center justify-center text-sm text-gray-500">
          加载中...
        </div>
      </PageLayout>
    );
  }

  if (user?.roleLevel !== 'owner' && user?.roleLevel !== 'admin') {
    return (
      <PageLayout title="发布活动" variant="a">
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
          <p className="text-[14px] text-[#4B5563]">仅班委可发布活动</p>
          <button
            type="button"
            onClick={() => navigate('/activity-list', { replace: true })}
            className="rounded-lg bg-[#0062FF] px-4 py-2 text-[13px] font-medium text-white"
          >
            返回活动列表
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <>
      <PageLayout
        title="发布活动"
        variant="a"
        decor={<Calendar className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}
      >
        <div className="flex min-h-full w-full flex-col gap-5">
          <div data-pencil-name="Input Field" className={inputShell}>
            <span className={labelClass}>活动名称</span>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="请输入活动名称"
              maxLength={50}
              className={inputClass}
            />
          </div>
          <div className="box-border flex w-full shrink-0 flex-col gap-2 rounded-xl border border-[#E2E8F0] bg-white p-4">
            <span className={labelClass}>活动分类（选填）</span>
            <div className="flex flex-wrap gap-2">
              {ACTIVITY_CATEGORIES.map((category) => {
                const active = form.category === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        category: active ? '' : category,
                      }))
                    }
                    className={`h-8 rounded-full px-3 text-[12px] font-medium ${
                      active ? 'bg-[#0062FF] text-white' : 'bg-[#F1F5F9] text-[#475569]'
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="box-border flex w-full shrink-0 flex-col gap-2 rounded-xl border border-[#E2E8F0] bg-white p-4">
            <span className={labelClass}>活动性质</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: true, label: '强制活动', desc: '计入班级考核' },
                { value: false, label: '自愿活动', desc: '不计入考核' },
              ].map((option) => {
                const active = mandatory === option.value;
                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setMandatory(option.value)}
                    className={`flex flex-col items-center justify-center gap-0.5 rounded-xl border py-2.5 ${
                      active
                        ? 'border-[#0062FF] bg-[#E8F0FF]'
                        : 'border-[#E2E8F0] bg-white'
                    }`}
                  >
                    <span
                      className={`font-body text-[13px] font-semibold ${
                        active ? 'text-[#0062FF]' : 'text-[#475569]'
                      }`}
                    >
                      {option.label}
                    </span>
                    <span className="font-body text-[10px] text-[#94A3B8]">{option.desc}</span>
                  </button>
                );
              })}
            </div>
            <span className="text-[11px] text-[#94A3B8]">
              强制活动会纳入成员个人考核，全部参与可加分；自愿活动不计入扣分。
            </span>
          </div>
          <div data-pencil-name="Input Field" className={inputShell}>
            <span className={labelClass}>活动时间</span>
            <button
              type="button"
              onClick={() => setPicker('date')}
              className="flex w-full items-center justify-between text-left active:opacity-70"
            >
              <span
                className={`font-body text-[14px] font-medium ${
                  form.date ? 'text-[#1A1A1A]' : 'text-[#94A3B8]'
                }`}
              >
                {form.date ? formatDateTimeLabel(form.date) : '请选择活动时间'}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-[#CBD5E1]" strokeWidth={2} />
            </button>
          </div>
          <div data-pencil-name="Input Field" className={inputShell}>
            <span className={labelClass}>活动地点</span>
            <input
              type="text"
              value={form.location}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="请输入活动地点"
              maxLength={100}
              className={inputClass}
            />
          </div>
          <div
            data-pencil-name="Textarea"
            className="box-border flex h-[140px] w-full shrink-0 flex-col justify-start gap-1 rounded-xl border border-[#E2E8F0] bg-white p-4"
          >
            <span className={labelClass}>活动详情（选填）</span>
            <textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="请输入活动详情..."
              rows={4}
              maxLength={2000}
              className="h-full w-full resize-none bg-transparent font-body text-[14px] font-medium text-[#1A1A1A] placeholder:text-[#94A3B8] outline-none"
            />
          </div>
          <div className="box-border flex w-full shrink-0 flex-col gap-2 rounded-xl border border-[#E2E8F0] bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-medium text-[#1A1A1A]">
                活动照片（最多 {MAX_PHOTOS} 张）
              </span>
              <span className="text-[12px] text-[#94A3B8]">
                {photos.length}/{MAX_PHOTOS}
              </span>
            </div>
            <div className="grid w-full grid-cols-3 gap-2">
              {photos.map((photo, index) => (
                <div
                  key={photo.key}
                  className="relative aspect-square overflow-hidden rounded-lg bg-gray-50"
                >
                  <img
                    src={resolveFileUrl(photo.url)}
                    alt={`活动照片 ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  {index === 0 && (
                    <span className="absolute bottom-1 left-1 rounded bg-[#0062FF] px-1.5 py-0.5 text-[10px] font-medium text-white">
                      封面
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label="删除图片"
                    onClick={() => handleRemovePhoto(photo.key)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <label className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#CBD5E1] bg-gray-50 text-[#94A3B8]">
                  <ImagePlus className="h-6 w-6" />
                  <span className="text-[11px]">
                    {uploadingPhoto ? '上传中...' : '添加图片'}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    multiple
                    disabled={uploadingPhoto}
                    onChange={handlePhotosSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <span className="text-[11px] text-[#94A3B8]">
              支持 jpg/png，单张不超过 5MB；第一张图片将作为活动封面
            </span>
          </div>
          <div data-pencil-name="Input Field" className={inputShell}>
            <span className={labelClass}>报名截止时间（选填）</span>
            <button
              type="button"
              onClick={() => setPicker('deadline')}
              className="flex w-full items-center justify-between text-left active:opacity-70"
            >
              <span
                className={`font-body text-[14px] font-medium ${
                  form.deadline ? 'text-[#1A1A1A]' : 'text-[#94A3B8]'
                }`}
              >
                {form.deadline ? formatDateTimeLabel(form.deadline) : '请选择报名截止时间'}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-[#CBD5E1]" strokeWidth={2} />
            </button>
          </div>
          <div data-pencil-name="Input Field" className={inputShell}>
            <span className={labelClass}>人数限制（选填）</span>
            <input
              type="number"
              min={1}
              value={form.quota}
              onChange={(e) => handleChange('quota', e.target.value)}
              placeholder="不填写则表示不限制人数"
              className={inputClass}
            />
          </div>
          <div data-pencil-name="Spacer" className="box-border h-[20px] w-full shrink-0"></div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || uploadingPhoto}
            data-pencil-name="Button Primary"
            className={`box-border flex h-[52px] w-full shrink-0 flex-col items-center justify-center rounded-xl shadow-[0px_4px_16px_0px_#0000001A] ${
              loading || uploadingPhoto ? 'bg-[#93C5FD]' : 'bg-[#0062FF]'
            }`}
          >
            <div
              data-pencil-name="Text"
              className="text-[16px]/[normal] box-border text-left font-body font-semibold text-white [white-space:nowrap]"
            >
              {loading ? '发布中...' : uploadingPhoto ? '图片上传中...' : '发布活动'}
            </div>
          </button>
        </div>
      </PageLayout>

      {/* 活动时间 / 报名截止时间选择 */}
      <DateTimePickerSheet
        open={picker !== null}
        value={picker === 'deadline' ? form.deadline : form.date}
        title={picker === 'deadline' ? '选择报名截止时间' : '选择活动时间'}
        onClose={() => setPicker(null)}
        onConfirm={(next) => {
          handleChange(picker === 'deadline' ? 'deadline' : 'date', next);
          setPicker(null);
        }}
      />
    </>
  );
}