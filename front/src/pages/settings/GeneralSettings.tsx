import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAppVersion } from '@/hooks/useAppVersion';
import { clearAppCache, formatCacheSize, getAppCacheSize } from '@/lib/appCache';
import PhoneFrame from '@/components/layout/PhoneFrame';
import SettingsHeader from '@/components/layout/SettingsHeader';
import BottomSheet from '@/components/ui/BottomSheet';
import { useNavigate } from 'react-router-dom';

export default function GeneralSettings() {
  const navigate = useNavigate();
  const appVersion = useAppVersion();
  const [cacheSize, setCacheSize] = useState<number | null>(null);
  const [showClearCache, setShowClearCache] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getAppCacheSize()
      .then((size) => {
        if (!cancelled) setCacheSize(size);
      })
      .catch(() => {
        if (!cancelled) setCacheSize(0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleClearCache = async () => {
    if (clearingCache) return;
    setClearingCache(true);
    const before = cacheSize ?? 0;
    try {
      await clearAppCache();
      const after = await getAppCacheSize();
      setCacheSize(after);
      const freed = Math.max(0, before - after);
      toast.success(freed > 0 ? `已清理 ${formatCacheSize(freed)} 缓存` : '缓存已清理');
      setShowClearCache(false);
    } catch {
      toast.error('清除缓存失败，请稍后重试');
    } finally {
      setClearingCache(false);
    }
  };
  return (
    <PhoneFrame>
      <SettingsHeader title="通用设置" />
              <div
                data-pencil-name="Content"
                className="box-border w-full [flex:1_1_0] flex flex-col gap-0 justify-start items-start bg-[#FFFFFF]"
              >
                <div
                  data-pencil-name="Body"
                  className="box-border w-full [flex:1_1_0] flex flex-col gap-6 p-[16px_20px_20px_20px] justify-start items-start"
                >
                  <div
                    data-pencil-name="Group 基础偏好"
                    className="box-border w-full h-fit shrink-0 flex flex-col gap-2 justify-start items-start"
                  >
                    <div
                      data-pencil-name="Group Title"
                      className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-semibold text-left [white-space:nowrap]"
                    >
                      基础偏好
                    </div>
                    <div
                      data-pencil-name="Rows"
                      className="box-border w-full h-fit shrink-0 flex flex-col gap-[4px] justify-start items-start"
                    >
                      <div
                        data-pencil-name="Row 语言"
                        className="box-border w-full h-[56px] shrink-0 flex flex-row gap-[12px] p-[0px_12px] justify-start items-center"
                      >
                        <div
                          data-pencil-name="Label"
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-medium text-left [white-space:nowrap]"
                        >
                          语言
                        </div>
                        <div
                          className="box-border [flex:1_1_0] h-0 flex flex-row gap-0 justify-start items-start"
                        ></div>
                        <div
                          data-pencil-name="Right"
                          className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center"
                        >
                          <div
                            data-pencil-name="Value"
                            className="text-[14px]/[normal] box-border text-[#9CA3AF] font-body font-medium text-left [white-space:nowrap]"
                          >
                            简体中文（当前仅支持）
                          </div>
                        </div>
                      </div>
                      <div
                        data-pencil-name="Row 深色模式"
                        className="box-border w-full h-[56px] shrink-0 flex flex-row gap-[12px] p-[0px_12px] justify-start items-center"
                      >
                        <div
                          data-pencil-name="Label"
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-medium text-left [white-space:nowrap]"
                        >
                          深色模式
                        </div>
                        <div
                          className="box-border [flex:1_1_0] h-0 flex flex-row gap-0 justify-start items-start"
                        ></div>
                        <div
                          data-pencil-name="Right"
                          className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center"
                        >
                          <div
                            data-pencil-name="Value"
                            className="text-[14px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                          >
                            跟随系统
                          </div>
                          <svg
                            data-pencil-name="Icon-chevron-right"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
                          >
                            <path d="M9 18l6-6-6-6" fill="#00000000"></path>
                            <path
                              d="M9 18l6-6-6-6"
                              fill="none"
                              stroke="#4B5563"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            ></path>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    data-pencil-name="Group 存储管理"
                    className="box-border w-full h-fit shrink-0 flex flex-col gap-2 justify-start items-start"
                  >
                    <div
                      data-pencil-name="Group Title"
                      className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-semibold text-left [white-space:nowrap]"
                    >
                      存储管理
                    </div>
                    <div
                      data-pencil-name="Rows"
                      className="box-border w-full h-fit shrink-0 flex flex-col gap-[4px] justify-start items-start"
                    >
                      <div
                        data-pencil-name="Row 清除缓存"
                        onClick={() => setShowClearCache(true)}
                        className="box-border w-full h-[56px] shrink-0 flex flex-row gap-[12px] p-[0px_12px] justify-start items-center cursor-pointer"
                      >
                        <div
                          data-pencil-name="Label"
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-medium text-left [white-space:nowrap]"
                        >
                          清除缓存
                        </div>
                        <div
                          className="box-border [flex:1_1_0] h-0 flex flex-row gap-0 justify-start items-start"
                        ></div>
                        <div
                          data-pencil-name="Right"
                          className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center"
                        >
                          <div
                            data-pencil-name="Value"
                            className="text-[14px]/[normal] box-border text-[#0062FF] font-body font-bold text-left [white-space:nowrap]"
                          >
                            {cacheSize === null ? '计算中…' : formatCacheSize(cacheSize)}
                          </div>
                          <svg
                            data-pencil-name="Icon-chevron-right"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
                          >
                            <path d="M9 18l6-6-6-6" fill="#00000000"></path>
                            <path
                              d="M9 18l6-6-6-6"
                              fill="none"
                              stroke="#4B5563"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            ></path>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    data-pencil-name="Group 关于"
                    className="box-border w-full h-fit shrink-0 flex flex-col gap-2 justify-start items-start"
                  >
                    <div
                      data-pencil-name="Group Title"
                      className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-semibold text-left [white-space:nowrap]"
                    >
                      关于
                    </div>
                    <div
                      data-pencil-name="Rows"
                      className="box-border w-full h-fit shrink-0 flex flex-col gap-[4px] justify-start items-start"
                    >
                      <div
                        data-pencil-name="Row 关于"
                        onClick={() => navigate('/about')}
                        className="box-border w-full h-[56px] shrink-0 flex flex-row gap-[12px] p-[0px_12px] justify-start items-center"
                      >
                        <div
                          data-pencil-name="Label"
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-medium text-left [white-space:nowrap]"
                        >
                          关于
                        </div>
                        <div
                          className="box-border [flex:1_1_0] h-0 flex flex-row gap-0 justify-start items-start"
                        ></div>
                        <div
                          data-pencil-name="Right"
                          className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center"
                        >
                          <div
                            data-pencil-name="Value"
                            className="text-[14px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                          >
                            v{appVersion}
                          </div>
                          <svg
                            data-pencil-name="Icon-chevron-right"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
                          >
                            <path d="M9 18l6-6-6-6" fill="#00000000"></path>
                            <path
                              d="M9 18l6-6-6-6"
                              fill="none"
                              stroke="#4B5563"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            ></path>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
      <BottomSheet
        open={showClearCache}
        onClose={() => setShowClearCache(false)}
        title="清除缓存"
        locked={clearingCache}
        maxHeight="60vh"
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              disabled={clearingCache}
              onClick={() => setShowClearCache(false)}
              className="h-[48px] flex-1 rounded-[14px] bg-[#F2F5F9] font-body text-[15px]/[normal] font-semibold text-[#475569] active:opacity-80 disabled:opacity-60"
            >
              取消
            </button>
            <button
              type="button"
              disabled={clearingCache}
              onClick={handleClearCache}
              className="h-[48px] flex-1 rounded-[14px] bg-[linear-gradient(180deg,#2E7DFF_0%,#0062FF_100%)] font-body text-[15px]/[normal] font-semibold text-white shadow-[0_10px_20px_rgba(0,98,255,0.24)] active:opacity-90 disabled:opacity-60"
            >
              {clearingCache ? '清理中…' : '清除'}
            </button>
          </div>
        }
      >
        <div className="px-5 pb-2 font-body text-[13px]/[1.7] font-normal text-[#4B5563]">
          将清理应用内临时缓存（当前 {cacheSize === null ? '计算中…' : formatCacheSize(cacheSize)}），不会影响登录状态和本地业务数据。
        </div>
      </BottomSheet>
    </PhoneFrame>
  );
}
