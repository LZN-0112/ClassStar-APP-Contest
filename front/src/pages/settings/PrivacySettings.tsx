import { useEffect, useState } from 'react';
import PhoneFrame from '@/components/layout/PhoneFrame';
import SettingsHeader from '@/components/layout/SettingsHeader';
import BottomSheet from '@/components/ui/BottomSheet';
import { toast } from 'sonner';
import { api } from '@/lib/api';

type Visibility = 'all' | 'class' | 'committee' | 'self';
type SettingKey = 'classInfo' | 'contact' | 'attendance';

interface VisibilityOption {
  value: Visibility;
  label: string;
  tagClassName: string;
}

const VISIBILITY_OPTIONS: VisibilityOption[] = [
  { value: 'all', label: '所有人可见', tagClassName: 'bg-[#E5E7EB] text-[#374151]' },
  { value: 'class', label: '同班可见', tagClassName: 'bg-[#DBEAFE] text-[#1E3A8A]' },
  { value: 'committee', label: '仅班委可见', tagClassName: 'bg-[#93C5FD] text-[#1E40AF]' },
  { value: 'self', label: '仅自己可见', tagClassName: 'bg-[#60A5FA] text-[#FFFFFF]' },
];

const OPTION_MAP = Object.fromEntries(
  VISIBILITY_OPTIONS.map((option) => [option.value, option]),
) as Record<Visibility, VisibilityOption>;

const ROW_TITLES: Record<SettingKey, string> = {
  classInfo: '班级信息可见',
  contact: '联系方式可见',
  attendance: '考勤记录可见',
};

const DEFAULT_SETTINGS: Record<SettingKey, Visibility> = {
  classInfo: 'class',
  contact: 'committee',
  attendance: 'self',
};

export default function PrivacySettings() {

  const [settings, setSettings] = useState<Record<SettingKey, Visibility>>(DEFAULT_SETTINGS);
  const [activeKey, setActiveKey] = useState<SettingKey | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/settings')
      .then((res) => {
        if (cancelled) return;
        const remote = res.data?.data?.privacySettings as
          | Partial<Record<SettingKey, Visibility>>
          | undefined;
        if (!remote) return;
        setSettings((prev) => {
          const next = { ...prev };
          (Object.keys(prev) as SettingKey[]).forEach((key) => {
            const value = remote[key];
            if (value && OPTION_MAP[value]) {
              next[key] = value;
            }
          });
          return next;
        });
      })
      .catch(() => {
        // 读取失败时沿用默认值
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings', { privacySettings: settings });
      toast.success('设置已保存');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || '保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PhoneFrame>
      <SettingsHeader title="隐私设置" />
              <div
                data-pencil-name="Content"
                className="box-border w-full [flex:1_1_0] flex flex-col gap-0 justify-start items-start bg-[#FFFFFF]"
              >
                <div
                  data-pencil-name="Body"
                  className="box-border w-full [flex:1_1_0] flex flex-col gap-4 p-[16px_20px_20px_20px] justify-start items-start"
                >
                  <div
                    data-pencil-name="Card"
                    className="box-border w-full h-fit shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-[4px] p-[12px] justify-start items-start bg-[#FFFFFF] rounded-lg"
                  >
                    <div
                      data-pencil-name="Row 班级信息可见"
                      onClick={() => setActiveKey('classInfo')}
                      className="box-border w-full h-[72px] shrink-0 flex flex-row gap-[12px] p-[0px_12px] justify-start items-center active:bg-[#F8FAFC] rounded-lg"
                    >
                      <div
                        data-pencil-name="Icon Container"
                        className="box-border w-[40px] shrink-0 h-[40px] flex flex-row gap-0 justify-center items-center bg-[#0062FF0D] rounded-lg"
                      >
                        <svg
                          data-pencil-name="Icon-eye"
                          viewBox="0 0 24 24"
                          preserveAspectRatio="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
                        >
                          <path
                            d="M10 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0m11 0q-3.6 6-9 6t-9-6q3.6-6 9-6t9 6"
                            fill="#00000000"
                          ></path>
                          <path
                            d="M10 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0m11 0q-3.6 6-9 6t-9-6q3.6-6 9-6t9 6"
                            fill="none"
                            stroke="#0062FF"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                          ></path>
                        </svg>
                      </div>
                      <div
                        data-pencil-name="Text"
                        className="box-border [flex:1_1_0] h-full flex flex-col gap-[4px] justify-center items-start"
                      >
                        <div
                          data-pencil-name="Title"
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                        >
                          班级信息可见
                        </div>
                        <div
                          data-pencil-name="Subtitle"
                          className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                        >
                          控制个人资料展示范围
                        </div>
                      </div>
                      <div
                        data-pencil-name="Right"
                        className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center"
                      >
                        <div
                          data-pencil-name="Tag"
                          className={`box-border w-fit shrink-0 h-[26px] flex flex-row gap-0 p-[0px_10px] justify-center items-center rounded-full ${OPTION_MAP[settings.classInfo].tagClassName}`}
                        >
                          <div
                            data-pencil-name="Text"
                            className="text-[11px]/[normal] box-border font-body font-semibold text-left [white-space:nowrap]"
                          >
                            {OPTION_MAP[settings.classInfo].label}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      data-pencil-name="Row 联系方式可见"
                      onClick={() => setActiveKey('contact')}
                      className="box-border w-full h-[72px] shrink-0 flex flex-row gap-[12px] p-[0px_12px] justify-start items-center active:bg-[#F8FAFC] rounded-lg"
                    >
                      <div
                        data-pencil-name="Icon Container"
                        className="box-border w-[40px] shrink-0 h-[40px] flex flex-row gap-0 justify-center items-center bg-[#0062FF0D] rounded-lg"
                      >
                        <svg
                          data-pencil-name="Icon-phone"
                          viewBox="0 0 24 24"
                          preserveAspectRatio="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
                        >
                          <path
                            d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5l1.5-2.5 5 2v4a2 2 0 0 1-2 2 16 16 0 0 1-15-15 2 2 0 0 1 2-2"
                            fill="#00000000"
                          ></path>
                          <path
                            d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5l1.5-2.5 5 2v4a2 2 0 0 1-2 2 16 16 0 0 1-15-15 2 2 0 0 1 2-2"
                            fill="none"
                            stroke="#0062FF"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                          ></path>
                        </svg>
                      </div>
                      <div
                        data-pencil-name="Text"
                        className="box-border [flex:1_1_0] h-full flex flex-col gap-[4px] justify-center items-start"
                      >
                        <div
                          data-pencil-name="Title"
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                        >
                          联系方式可见
                        </div>
                        <div
                          data-pencil-name="Subtitle"
                          className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                        >
                          控制手机号展示范围
                        </div>
                      </div>
                      <div
                        data-pencil-name="Right"
                        className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center"
                      >
                        <div
                          data-pencil-name="Tag"
                          className={`box-border w-fit shrink-0 h-[26px] flex flex-row gap-0 p-[0px_10px] justify-center items-center rounded-full ${OPTION_MAP[settings.contact].tagClassName}`}
                        >
                          <div
                            data-pencil-name="Text"
                            className="text-[11px]/[normal] box-border font-body font-semibold text-left [white-space:nowrap]"
                          >
                            {OPTION_MAP[settings.contact].label}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      data-pencil-name="Row 考勤记录可见"
                      onClick={() => setActiveKey('attendance')}
                      className="box-border w-full h-[72px] shrink-0 flex flex-row gap-[12px] p-[0px_12px] justify-start items-center active:bg-[#F8FAFC] rounded-lg"
                    >
                      <div
                        data-pencil-name="Icon Container"
                        className="box-border w-[40px] shrink-0 h-[40px] flex flex-row gap-0 justify-center items-center bg-[#0062FF0D] rounded-lg"
                      >
                        <svg
                          data-pencil-name="Icon-calendar-check"
                          viewBox="0 0 24 24"
                          preserveAspectRatio="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
                        >
                          <path
                            d="M11.5 21h-5.5a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6m-4-10v4m-8-4v4m-4 4h16m-5 8l2 2 4-4"
                            fill="#00000000"
                          ></path>
                          <path
                            d="M11.5 21h-5.5a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6m-4-10v4m-8-4v4m-4 4h16m-5 8l2 2 4-4"
                            fill="none"
                            stroke="#0062FF"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                          ></path>
                        </svg>
                      </div>
                      <div
                        data-pencil-name="Text"
                        className="box-border [flex:1_1_0] h-full flex flex-col gap-[4px] justify-center items-start"
                      >
                        <div
                          data-pencil-name="Title"
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                        >
                          考勤记录可见
                        </div>
                        <div
                          data-pencil-name="Subtitle"
                          className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                        >
                          控制考勤数据展示范围
                        </div>
                      </div>
                      <div
                        data-pencil-name="Right"
                        className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center"
                      >
                        <div
                          data-pencil-name="Tag"
                          className={`box-border w-fit shrink-0 h-[26px] flex flex-row gap-0 p-[0px_10px] justify-center items-center rounded-full ${OPTION_MAP[settings.attendance].tagClassName}`}
                        >
                          <div
                            data-pencil-name="Text"
                            className="text-[11px]/[normal] box-border font-body font-semibold text-left [white-space:nowrap]"
                          >
                            {OPTION_MAP[settings.attendance].label}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    data-pencil-name="Primary Button"
                    onClick={handleSave}
                    disabled={saving}
                    className="box-border w-full h-[52px] shrink-0 [box-shadow:0px_6px_20px_0px_#0062FF33] flex flex-col gap-0 justify-center items-center [background-image:linear-gradient(180deg,_#0062FF_0%,_#3B82F6_100%)] bg-no-repeat bg-[length:100%_100%] rounded-lg disabled:opacity-60"
                  >
                    <span
                      data-pencil-name="Label"
                      className="text-[16px]/[normal] box-border text-[#FFFFFF] font-body font-semibold text-left [white-space:nowrap]"
                    >
                      {saving ? '保存中...' : '保存'}
                    </span>
                  </button>
                </div>
              </div>
      {activeKey && (
        <BottomSheet
          open
          onClose={() => setActiveKey(null)}
          title={ROW_TITLES[activeKey]}
          maxHeight="70vh"
        >
          <div className="flex flex-col px-2 pb-2">
            {VISIBILITY_OPTIONS.map((option) => {
              const selected = settings[activeKey] === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setSettings((prev) => ({ ...prev, [activeKey]: option.value }));
                    setActiveKey(null);
                  }}
                  className="flex items-center justify-between rounded-[14px] px-3 py-3.5 text-left active:bg-[#F7F9FC]"
                >
                  <span
                    className={`font-body text-[15px]/[normal] ${
                      selected ? 'font-semibold text-[#0062FF]' : 'font-normal text-[#1A1A1A]'
                    }`}
                  >
                    {option.label}
                  </span>
                  {selected && (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="#0062FF"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </BottomSheet>
      )}
    </PhoneFrame>
  );
}