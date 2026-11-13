import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

const CONSENT_KEY = 'privacy_consent_v1';
/** 协议正文页放行渲染，保证用户可在弹窗内点开阅读后返回 */
const DOC_PATHS = ['/user-agreement', '/privacy-policy'];

/**
 * 首次启动隐私合规弹窗：
 * 1) 未同意前遮罩覆盖全屏，不进入业务页面；
 * 2) 同意后写入本地标记，后续启动不再弹出；
 * 3) 暂不同意在原生端直接退出 App（应用商店合规要求）。
 */
export default function PrivacyConsentGate({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [consented, setConsented] = useState(() => {
    try {
      return localStorage.getItem(CONSENT_KEY) === 'accepted';
    } catch {
      return false;
    }
  });
  const [declined, setDeclined] = useState(false);

  if (consented || DOC_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  const handleAgree = () => {
    try {
      localStorage.setItem(CONSENT_KEY, 'accepted');
    } catch {
      // 隐私模式下写入失败时仅在本次会话内放行
    }
    setConsented(true);
  };

  const handleDecline = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await CapApp.exitApp();
      } catch {
        setDeclined(true);
      }
      return;
    }
    setDeclined(true);
  };

  return (
    <>
      {children}
      <div
        className="fixed inset-0 z-[130] flex flex-col items-center justify-center bg-[rgba(15,23,42,0.42)] px-6 backdrop-blur-[2px]"
        style={{
          paddingTop: 'calc(var(--safe-top, env(safe-area-inset-top, 0px)) + 16px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-consent-title"
      >
        <div className="box-border flex w-full max-w-[360px] flex-col rounded-[24px] bg-white px-[22px] pb-5 pt-[26px] shadow-[0_24px_60px_rgba(15,23,42,0.24)] animate-[popIn_0.3s_cubic-bezier(0.22,1.2,0.36,1)_both]">
          <div className="mx-auto flex h-[58px] w-[58px] items-center justify-center rounded-[19px] bg-[#EEF4FF]">
            <ShieldCheck className="h-7 w-7 text-[#0062FF]" strokeWidth={1.8} />
          </div>

          <h2
            id="privacy-consent-title"
            className="mt-4 text-center font-body text-[17.5px]/[1.4] font-semibold text-[#1A1A1A]"
          >
            用户隐私保护提示
          </h2>

          <p className="mt-2 text-center font-body text-[12.5px]/[1.7] font-normal text-[#6B7280]">
            欢迎使用班务星！我们非常重视您的个人信息保护。
          </p>

          <div className="mt-4 flex flex-col gap-2.5 rounded-[16px] bg-[#F7F9FC] px-4 py-3.5">
            <div className="flex items-start gap-2">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#0062FF]" />
              <p className="font-body text-[12.5px]/[1.7] font-normal text-[#4B5563]">
                在您使用本服务前，请仔细阅读
                <button
                  type="button"
                  onClick={() => navigate('/user-agreement')}
                  className="font-semibold text-[#0062FF] active:opacity-70"
                >
                  《用户协议》
                </button>
                和
                <button
                  type="button"
                  onClick={() => navigate('/privacy-policy')}
                  className="font-semibold text-[#0062FF] active:opacity-70"
                >
                  《隐私政策》
                </button>
                。
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#0062FF]" />
              <p className="font-body text-[12.5px]/[1.7] font-normal text-[#4B5563]">
                使用考勤打卡、发布动态、扫码等功能时，我们会在您主动触发时申请相机、定位等必要权限。
              </p>
            </div>
          </div>

          {declined ? (
            <>
              <p className="mt-3 rounded-[14px] bg-[#FEF3C7] px-3.5 py-3 font-body text-[12px]/[18px] font-normal text-[#92400E]">
                您需同意《用户协议》与《隐私政策》后才能使用班务星。
              </p>
              <button
                type="button"
                onClick={() => setDeclined(false)}
                className="mt-4 box-border h-[47px] w-full rounded-[14px] bg-[linear-gradient(180deg,#2E7DFF_0%,#0062FF_100%)] font-body text-[15px]/[normal] font-semibold tracking-[0.3px] text-white shadow-[0_10px_20px_rgba(0,98,255,0.24)] active:opacity-90"
              >
                我再想想
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleAgree}
                className="mt-4 box-border h-[47px] w-full rounded-[14px] bg-[linear-gradient(180deg,#2E7DFF_0%,#0062FF_100%)] font-body text-[15px]/[normal] font-semibold tracking-[0.3px] text-white shadow-[0_10px_20px_rgba(0,98,255,0.24)] active:opacity-90"
              >
                同意并继续
              </button>
              <button
                type="button"
                onClick={handleDecline}
                className="mt-1.5 h-[42px] w-full rounded-[12px] font-body text-[14px]/[normal] font-medium text-[#64748B] active:opacity-70"
              >
                暂不同意
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
