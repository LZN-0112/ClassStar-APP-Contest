import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

export default function Settings() {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await api.post('/auth/logout');
      toast.success('已退出登录');
    } catch {
      // 即使接口失败也继续清理本地状态
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('currentUser');
      setIsLoggingOut(false);
      navigate('/login', { replace: true });
    }
  };

  return (
    <PhoneFrame>
      <div
                data-pencil-name="Unified Header"
                className="box-border w-full h-[282px] shrink-0 flex flex-col gap-0 justify-start items-start [background-image:linear-gradient(180deg,_#004ECC_0%,_#4B83FF_55%,_#DEFCFF_100%)] bg-no-repeat bg-[length:100%_100%] rounded-[0px_0px_24px_24px]"
              >
                <div
                  data-pencil-name="Status Bar"
                  className="box-border w-full h-[62px] shrink-0 flex flex-row gap-0 p-[12px_24px_0px_24px] justify-between items-center bg-[#00000000]"
                >
                  <div
                    data-pencil-name="Text"
                    className="text-[14px]/[normal] box-border text-[#FFFFFF] font-data font-semibold text-left [white-space:nowrap]"
                  >
                    9:41
                  </div>
                  <div
                    data-pencil-name="Status Icons"
                    className="box-border w-fit shrink-0 h-fit flex flex-row gap-[6px] justify-start items-center bg-[#00000000]"
                  >
                    <div
                      data-pencil-name="Text"
                      className="text-[14px]/[normal] box-border text-[#FFFFFF] font-caption font-medium text-left [white-space:nowrap]"
                    >
                      OOOO
                    </div>
                    <div
                      data-pencil-name="Text"
                      className="text-[14px]/[normal] box-border text-[#FFFFFF] font-data font-medium text-left [white-space:nowrap]"
                    >
                      100%
                    </div>
                  </div>
                </div>
                <div
                  data-pencil-name="Header"
                  className="box-border w-full h-[220px] shrink-0 flex flex-col gap-[12px] p-[20px] justify-start items-start bg-[#00000000] relative"
                >
                  <BackButton variant="dark" className="absolute left-[-4px] top-[0px] z-10" />
                  <div className="h-8 w-10" />
                  <div
                    data-pencil-name="Text"
                    className="text-[28px]/[normal] box-border text-[#FFFFFF] font-heading font-bold text-left [white-space:nowrap] relative [z-index:0]"
                  >
                    设置
                  </div>
                  <div
                    data-pencil-name="Decor Icon"
                    className="box-border w-[120px] h-[120px] opacity-[0.12] absolute left-[265px] top-[80px] flex flex-col gap-0 justify-center items-center bg-[#00000000] [z-index:1]"
                  >
                    <svg
                      data-pencil-name="Icon-settings"
                      viewBox="0 0 24 24"
                      preserveAspectRatio="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="box-border w-[112px] h-[112px] shrink-0 overflow-visible"
                    >
                      <path
                        d="M12.22 2h-0.44a2 2 0 0 0-2 2v0.18a2 2 0 0 1-1 1.73l-0.43 0.25a2 2 0 0 1-2 0l-0.15-0.08a2 2 0 0 0-2.73 0.73l-0.22 0.38a2 2 0 0 0 0.73 2.73l0.15 0.1a2 2 0 0 1 1 1.72v0.51a2 2 0 0 1-1 1.74l-0.15 0.09a2 2 0 0 0-0.73 2.73l0.22 0.38a2 2 0 0 0 2.73 0.73l0.15-0.08a2 2 0 0 1 2 0l0.43 0.25a2 2 0 0 1 1 1.73v0.18a2 2 0 0 0 2 2h0.44a2 2 0 0 0 2-2v-0.18a2 2 0 0 1 1-1.73l0.43-0.25a2 2 0 0 1 2 0l0.15 0.08a2 2 0 0 0 2.73-0.73l0.22-0.39a2 2 0 0 0-0.73-2.73l-0.15-0.1a2 2 0 0 1-1-1.72v-0.51a2 2 0 0 1 1-1.74l0.15-0.09a2 2 0 0 0 0.73-2.73l-0.22-0.38a2 2 0 0 0-2.73-0.73l-0.15 0.08a2 2 0 0 1-2 0l-0.43-0.25a2 2 0 0 1-1-1.73v-0.17a2 2 0 0 0-2-2m-0.22 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6"
                        fill="none"
                      ></path>
                      <path
                        d="M12.22 2h-0.44a2 2 0 0 0-2 2v0.18a2 2 0 0 1-1 1.73l-0.43 0.25a2 2 0 0 1-2 0l-0.15-0.08a2 2 0 0 0-2.73 0.73l-0.22 0.38a2 2 0 0 0 0.73 2.73l0.15 0.1a2 2 0 0 1 1 1.72v0.51a2 2 0 0 1-1 1.74l-0.15 0.09a2 2 0 0 0-0.73 2.73l0.22 0.38a2 2 0 0 0 2.73 0.73l0.15-0.08a2 2 0 0 1 2 0l0.43 0.25a2 2 0 0 1 1 1.73v0.18a2 2 0 0 0 2 2h0.44a2 2 0 0 0 2-2v-0.18a2 2 0 0 1 1-1.73l0.43-0.25a2 2 0 0 1 2 0l0.15 0.08a2 2 0 0 0 2.73-0.73l0.22-0.39a2 2 0 0 0-0.73-2.73l-0.15-0.1a2 2 0 0 1-1-1.72v-0.51a2 2 0 0 1 1-1.74l0.15-0.09a2 2 0 0 0 0.73-2.73l-0.22-0.38a2 2 0 0 0-2.73-0.73l-0.15 0.08a2 2 0 0 1-2 0l-0.43-0.25a2 2 0 0 1-1-1.73v-0.17a2 2 0 0 0-2-2m-0.22 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6"
                        fill="none"
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      ></path>
                    </svg>
                  </div>
                </div>
              </div>
              <div
                data-pencil-name="Content"
                className="box-border w-full [flex:1_1_0] flex flex-col gap-0 justify-start items-start overflow-y-auto overscroll-y-contain bg-[#FFFFFF]"
              >
                <div
                  data-pencil-name="Body"
                  className="box-border w-full [flex:1_1_0] flex flex-col gap-[20px] p-[16px_20px_96px_20px] justify-start items-start bg-[#FFFFFF]"
                >
                  <div
                    data-pencil-name="Group 账号与安全"
                    className="box-border w-full h-fit shrink-0 flex flex-col gap-[10px] justify-start items-start bg-[#00000000]"
                  >
                    <div
                      data-pencil-name="Text"
                      className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-semibold text-left [white-space:nowrap]"
                    >
                      账号与安全
                    </div>
                    <div
                      data-pencil-name="Group Content"
                      className="box-border w-full h-fit shrink-0 flex flex-col gap-2 justify-start items-start bg-[#00000000]"
                    >
                      <div
                        data-pencil-name="List Item"
                        className="box-border w-full h-[64px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-[12px] p-[0px_16px] justify-start items-center bg-[#FFFFFF] rounded-lg"
                       onClick={() => navigate('/account-security')}>
                        <div
                          data-pencil-name="Icon Box"
                          className="box-border w-[40px] shrink-0 h-[40px] flex flex-col gap-0 justify-center items-center bg-[#E0F2FE] rounded-lg"
                        >
                          <svg
                            data-pencil-name="Icon-shield"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[24px] h-[24px] shrink-0 overflow-visible"
                          >
                            <path
                              d="M12 3a12 12 0 0 0 8.5 3 12 12 0 0 1-8.5 15 12 12 0 0 1-8.5-15 12 12 0 0 0 8.5-3"
                              fill="none"
                            ></path>
                            <path
                              d="M12 3a12 12 0 0 0 8.5 3 12 12 0 0 1-8.5 15 12 12 0 0 1-8.5-15 12 12 0 0 0 8.5-3"
                              fill="none"
                              stroke="#004ECC"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            ></path>
                          </svg>
                        </div>
                        <div
                          data-pencil-name="Text"
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                        >
                          账号与安全
                        </div>
                        <div
                          data-pencil-name="Right"
                          className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center bg-[#00000000]"
                        >
                          <svg
                            data-pencil-name="Icon-chevron-right"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[20px] shrink-0 h-[20px] overflow-visible"
                          >
                            <path d="M9 18l6-6-6-6" fill="none"></path>
                            <path
                              d="M9 18l6-6-6-6"
                              fill="none"
                              stroke="#9CA3AF"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            ></path>
                          </svg>
                        </div>
                      </div>
                      <div
                        data-pencil-name="List Item"
                        className="box-border w-full h-[64px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-[12px] p-[0px_16px] justify-start items-center bg-[#FFFFFF] rounded-lg"
                       onClick={() => navigate('/privacy-settings')}>
                        <div
                          data-pencil-name="Icon Box"
                          className="box-border w-[40px] shrink-0 h-[40px] flex flex-col gap-0 justify-center items-center bg-[#E0F2FE] rounded-lg"
                        >
                          <svg
                            data-pencil-name="Icon-lock"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[24px] h-[24px] shrink-0 overflow-visible"
                          >
                            <path
                              d="M19 11h-14a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2m-12 0v-4a5 5 0 1 1 10 0v4m-5 5a1 1 0 1 0 0 2 1 1 0 0 0 0-2"
                              fill="none"
                            ></path>
                            <path
                              d="M19 11h-14a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2m-12 0v-4a5 5 0 1 1 10 0v4m-5 5a1 1 0 1 0 0 2 1 1 0 0 0 0-2"
                              fill="none"
                              stroke="#004ECC"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            ></path>
                          </svg>
                        </div>
                        <div
                          data-pencil-name="Text"
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                        >
                          隐私设置
                        </div>
                        <div
                          data-pencil-name="Right"
                          className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center bg-[#00000000]"
                        >
                          <svg
                            data-pencil-name="Icon-chevron-right"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[20px] shrink-0 h-[20px] overflow-visible"
                          >
                            <path d="M9 18l6-6-6-6" fill="none"></path>
                            <path
                              d="M9 18l6-6-6-6"
                              fill="none"
                              stroke="#9CA3AF"
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
                    data-pencil-name="Group 通知设置"
                    className="box-border w-full h-fit shrink-0 flex flex-col gap-[10px] justify-start items-start bg-[#00000000]"
                  >
                    <div
                      data-pencil-name="Text"
                      className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-semibold text-left [white-space:nowrap]"
                    >
                      通知设置
                    </div>
                    <div
                      data-pencil-name="Group Content"
                      className="box-border w-full h-fit shrink-0 flex flex-col gap-2 justify-start items-start bg-[#00000000]"
                    >
                      <div
                        data-pencil-name="List Item"
                        className="box-border w-full h-[64px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-[12px] p-[0px_16px] justify-start items-center bg-[#FFFFFF] rounded-lg"
                       onClick={() => navigate('/notification-settings')}>
                        <div
                          data-pencil-name="Icon Box"
                          className="box-border w-[40px] shrink-0 h-[40px] flex flex-col gap-0 justify-center items-center bg-[#E0F2FE] rounded-lg"
                        >
                          <svg
                            data-pencil-name="Icon-bell"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[24px] h-[24px] shrink-0 overflow-visible"
                          >
                            <path
                              d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9m-4.27 13a2 2 0 0 1-3.46 0"
                              fill="none"
                            ></path>
                            <path
                              d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9m-4.27 13a2 2 0 0 1-3.46 0"
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
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                        >
                          消息通知设置
                        </div>
                        <div
                          data-pencil-name="Right"
                          className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center bg-[#00000000]"
                        >
                          <svg
                            data-pencil-name="Icon-chevron-right"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[20px] shrink-0 h-[20px] overflow-visible"
                          >
                            <path d="M9 18l6-6-6-6" fill="none"></path>
                            <path
                              d="M9 18l6-6-6-6"
                              fill="none"
                              stroke="#9CA3AF"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            ></path>
                          </svg>
                        </div>
                      </div>
                      <div
                        data-pencil-name="List Item"
                        className="box-border w-full h-[64px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-[12px] p-[0px_16px] justify-start items-center bg-[#FFFFFF] rounded-lg"
                       onClick={() => navigate('/reminder-settings')}>
                        <div
                          data-pencil-name="Icon Box"
                          className="box-border w-[40px] shrink-0 h-[40px] flex flex-col gap-0 justify-center items-center bg-[#E0F2FE] rounded-lg"
                        >
                          <svg
                            data-pencil-name="Icon-clock"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[24px] h-[24px] shrink-0 overflow-visible"
                          >
                            <path
                              d="M12 22c5.523 0 10-4.477 10-10s-4.477-10-10-10-10 4.477-10 10 4.477 10 10 10m0-16v6l4 2"
                              fill="none"
                            ></path>
                            <path
                              d="M12 22c5.523 0 10-4.477 10-10s-4.477-10-10-10-10 4.477-10 10 4.477 10 10 10m0-16v6l4 2"
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
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                        >
                          再次提醒设置
                        </div>
                        <div
                          data-pencil-name="Right"
                          className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center bg-[#00000000]"
                        >
                          <svg
                            data-pencil-name="Icon-chevron-right"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[20px] shrink-0 h-[20px] overflow-visible"
                          >
                            <path d="M9 18l6-6-6-6" fill="none"></path>
                            <path
                              d="M9 18l6-6-6-6"
                              fill="none"
                              stroke="#9CA3AF"
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
                    data-pencil-name="Group 通用设置"
                    className="box-border w-full h-fit shrink-0 flex flex-col gap-[10px] justify-start items-start bg-[#00000000]"
                  >
                    <div
                      data-pencil-name="Text"
                      className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-semibold text-left [white-space:nowrap]"
                    >
                      通用设置
                    </div>
                    <div
                      data-pencil-name="Group Content"
                      className="box-border w-full h-fit shrink-0 flex flex-col gap-2 justify-start items-start bg-[#00000000]"
                    >
                      <div
                        data-pencil-name="List Item"
                        className="box-border w-full h-[64px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-[12px] p-[0px_16px] justify-start items-center bg-[#FFFFFF] rounded-lg"
                        onClick={() => navigate('/general-settings')}
                      >
                        <div
                          data-pencil-name="Icon Box"
                          className="box-border w-[40px] shrink-0 h-[40px] flex flex-col gap-0 justify-center items-center bg-[#F3F4F6] rounded-lg"
                        >
                          <svg
                            data-pencil-name="Icon-settings"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[24px] h-[24px] shrink-0 overflow-visible"
                          >
                            <path
                              d="M12.22 2h-0.44a2 2 0 0 0-2 2v0.18a2 2 0 0 1-1 1.73l-0.43 0.25a2 2 0 0 1-2 0l-0.15-0.08a2 2 0 0 0-2.73 0.73l-0.22 0.38a2 2 0 0 0 0.73 2.73l0.15 0.1a2 2 0 0 1 1 1.72v0.51a2 2 0 0 1-1 1.74l-0.15 0.09a2 2 0 0 0-0.73 2.73l0.22 0.38a2 2 0 0 0 2.73 0.73l0.15-0.08a2 2 0 0 1 2 0l0.43 0.25a2 2 0 0 1 1 1.73v0.18a2 2 0 0 0 2 2h0.44a2 2 0 0 0 2-2v-0.18a2 2 0 0 1 1-1.73l0.43-0.25a2 2 0 0 1 2 0l0.15 0.08a2 2 0 0 0 2.73-0.73l0.22-0.39a2 2 0 0 0-0.73-2.73l-0.15-0.1a2 2 0 0 1-1-1.72v-0.51a2 2 0 0 1 1-1.74l0.15-0.09a2 2 0 0 0 0.73-2.73l-0.22-0.38a2 2 0 0 0-2.73-0.73l-0.15 0.08a2 2 0 0 1-2 0l-0.43-0.25a2 2 0 0 1-1-1.73v-0.17a2 2 0 0 0-2-2m-0.22 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6"
                              fill="none"
                            ></path>
                            <path
                              d="M12.22 2h-0.44a2 2 0 0 0-2 2v0.18a2 2 0 0 1-1 1.73l-0.43 0.25a2 2 0 0 1-2 0l-0.15-0.08a2 2 0 0 0-2.73 0.73l-0.22 0.38a2 2 0 0 0 0.73 2.73l0.15 0.1a2 2 0 0 1 1 1.72v0.51a2 2 0 0 1-1 1.74l-0.15 0.09a2 2 0 0 0-0.73 2.73l0.22 0.38a2 2 0 0 0 2.73 0.73l0.15-0.08a2 2 0 0 1 2 0l0.43 0.25a2 2 0 0 1 1 1.73v0.18a2 2 0 0 0 2 2h0.44a2 2 0 0 0 2-2v-0.18a2 2 0 0 1 1-1.73l0.43-0.25a2 2 0 0 1 2 0l0.15 0.08a2 2 0 0 0 2.73-0.73l0.22-0.39a2 2 0 0 0-0.73-2.73l-0.15-0.1a2 2 0 0 1-1-1.72v-0.51a2 2 0 0 1 1-1.74l0.15-0.09a2 2 0 0 0 0.73-2.73l-0.22-0.38a2 2 0 0 0-2.73-0.73l-0.15 0.08a2 2 0 0 1-2 0l-0.43-0.25a2 2 0 0 1-1-1.73v-0.17a2 2 0 0 0-2-2m-0.22 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6"
                              fill="none"
                              stroke="#4B5563"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            ></path>
                          </svg>
                        </div>
                        <div
                          data-pencil-name="Text"
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                        >
                          通用设置
                        </div>
                        <div
                          data-pencil-name="Right"
                          className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center bg-[#00000000]"
                        >
                          <svg
                            data-pencil-name="Icon-chevron-right"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[20px] shrink-0 h-[20px] overflow-visible"
                          >
                            <path d="M9 18l6-6-6-6" fill="none"></path>
                            <path
                              d="M9 18l6-6-6-6"
                              fill="none"
                              stroke="#9CA3AF"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            ></path>
                          </svg>
                        </div>
                      </div>
                      <div
                        data-pencil-name="List Item"
                        className="box-border w-full h-[64px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-[12px] p-[0px_16px] justify-start items-center bg-[#FFFFFF] rounded-lg"
                       onClick={() => navigate('/about')}>
                        <div
                          data-pencil-name="Icon Box"
                          className="box-border w-[40px] shrink-0 h-[40px] flex flex-col gap-0 justify-center items-center bg-[#F3F4F6] rounded-lg"
                        >
                          <svg
                            data-pencil-name="Icon-info"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[24px] h-[24px] shrink-0 overflow-visible"
                          >
                            <path
                              d="M12 22c5.523 0 10-4.477 10-10s-4.477-10-10-10-10 4.477-10 10 4.477 10 10 10m0-6v-4m0-4h0.01"
                              fill="none"
                            ></path>
                            <path
                              d="M12 22c5.523 0 10-4.477 10-10s-4.477-10-10-10-10 4.477-10 10 4.477 10 10 10m0-6v-4m0-4h0.01"
                              fill="none"
                              stroke="#4B5563"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            ></path>
                          </svg>
                        </div>
                        <div
                          data-pencil-name="Text"
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                        >
                          关于
                        </div>
                        <div
                          data-pencil-name="Right"
                          className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center bg-[#00000000]"
                        >
                          <svg
                            data-pencil-name="Icon-chevron-right"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[20px] shrink-0 h-[20px] overflow-visible"
                          >
                            <path d="M9 18l6-6-6-6" fill="none"></path>
                            <path
                              d="M9 18l6-6-6-6"
                              fill="none"
                              stroke="#9CA3AF"
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
                    data-pencil-name="Group 帮助反馈"
                    className="box-border w-full h-fit shrink-0 flex flex-col gap-[10px] justify-start items-start bg-[#00000000]"
                  >
                    <div
                      data-pencil-name="Text"
                      className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-semibold text-left [white-space:nowrap]"
                    >
                      帮助反馈
                    </div>
                    <div
                      data-pencil-name="Group Content"
                      className="box-border w-full h-fit shrink-0 flex flex-col gap-2 justify-start items-start bg-[#00000000]"
                    >
                      <div
                        data-pencil-name="List Item"
                        className="box-border w-full h-[64px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-[12px] p-[0px_16px] justify-start items-center bg-[#FFFFFF] rounded-lg"
                       onClick={() => navigate('/help-feedback')}>
                        <div
                          data-pencil-name="Icon Box"
                          className="box-border w-[40px] shrink-0 h-[40px] flex flex-col gap-0 justify-center items-center bg-[#FEF3C7] rounded-lg"
                        >
                          <svg
                            data-pencil-name="Icon-help-circle"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[24px] h-[24px] shrink-0 overflow-visible"
                          >
                            <path
                              d="M12 22c5.523 0 10-4.477 10-10s-4.477-10-10-10-10 4.477-10 10 4.477 10 10 10m-2.91-13a3 3 0 0 1 5.83 1c0 2-3 3-3 3m0.08 4h0.01"
                              fill="none"
                            ></path>
                            <path
                              d="M12 22c5.523 0 10-4.477 10-10s-4.477-10-10-10-10 4.477-10 10 4.477 10 10 10m-2.91-13a3 3 0 0 1 5.83 1c0 2-3 3-3 3m0.08 4h0.01"
                              fill="none"
                              stroke="#D97706"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            ></path>
                          </svg>
                        </div>
                        <div
                          data-pencil-name="Text"
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                        >
                          帮助与反馈
                        </div>
                        <div
                          data-pencil-name="Right"
                          className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center bg-[#00000000]"
                        >
                          <svg
                            data-pencil-name="Icon-chevron-right"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[20px] shrink-0 h-[20px] overflow-visible"
                          >
                            <path d="M9 18l6-6-6-6" fill="none"></path>
                            <path
                              d="M9 18l6-6-6-6"
                              fill="none"
                              stroke="#9CA3AF"
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
                    data-pencil-name="Group 账号操作"
                    className="box-border w-full h-fit shrink-0 flex flex-col gap-[10px] justify-start items-start bg-[#00000000]"
                  >
                    <div
                      data-pencil-name="Text"
                      className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-semibold text-left [white-space:nowrap]"
                    >
                      账号操作
                    </div>
                    <button
                      type="button"
                      data-pencil-name="退出登录"
                      disabled={isLoggingOut}
                      onClick={handleLogout}
                      className="box-border w-full h-[64px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-[12px] p-[0px_16px] justify-start items-center bg-[#FFFFFF] rounded-lg text-left"
                    >
                      <div
                        data-pencil-name="Icon Box"
                        className="box-border w-[40px] shrink-0 h-[40px] flex flex-col gap-0 justify-center items-center bg-[#FEE2E2] rounded-lg"
                      >
                        <LogOut className="w-[24px] h-[24px] text-[#DC2626]" />
                      </div>
                      <div
                        data-pencil-name="Text"
                        className="text-[14px]/[normal] box-border text-[#DC2626] font-body font-semibold text-left [white-space:nowrap]"
                      >
                        {isLoggingOut ? '退出中...' : '退出登录'}
                      </div>
                    </button>
                  </div>
                </div>
              </div>
    </PhoneFrame>
  );
}
