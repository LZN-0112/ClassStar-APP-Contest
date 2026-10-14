import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function AccountSecurity() {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await api.post('/auth/logout');
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
                className="box-border w-full h-[267.99px] shrink-0 flex flex-col gap-0 justify-start items-start [background-image:linear-gradient(-1.562deg,_#defcff_-3.474%,_#156170_100.37%,_#33a7a8_48.448%)] bg-no-repeat bg-[length:100%_100%] rounded-[0px_0px_24px_24px]"
              >
                <div
                  data-pencil-name="Status Bar"
                  className="box-border w-full h-[62px] shrink-0 flex flex-row gap-0 p-[12px_24px_0px_24px] justify-between items-center bg-[#00000000]"
                >
                  <div
                    data-pencil-name="Time"
                    className="text-[14px]/[normal] box-border text-[#FFFFFF] font-data font-semibold text-left [white-space:nowrap]"
                  >
                    9:41
                  </div>
                  <div
                    data-pencil-name="Status Icons"
                    className="box-border w-fit shrink-0 h-fit flex flex-row gap-[6px] justify-start items-center"
                  >
                    <div
                      data-pencil-name="Signal"
                      className="text-[14px]/[normal] box-border text-[#FFFFFF] font-caption font-normal text-left [white-space:nowrap]"
                    >
                      ◉◉◉◉
                    </div>
                    <div
                      data-pencil-name="Battery"
                      className="text-[14px]/[normal] box-border text-[#FFFFFF] font-data font-normal text-left [white-space:nowrap]"
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
                  <div
                    data-pencil-name="Top Row"
                    className="box-border w-full h-[24px] shrink-0 flex flex-row gap-0 justify-between items-center relative [z-index:0]"
                  >

                    <div
                      className="box-border w-[24px] shrink-0 h-[24px] flex flex-row gap-0 justify-start items-start"
                    ></div>
                  </div>
                  <div
                    data-pencil-name="Title"
                    className="text-[28px]/[normal] box-border text-[#FFFFFF] font-heading font-bold text-left [white-space:nowrap] relative [z-index:1]"
                  >
                    账号与安全
                  </div>
                  <div
                    data-pencil-name="Decor Icon"
                    className="box-border w-[120px] h-[120px] opacity-[0.15] absolute left-[285px] top-[80px] flex flex-row gap-0 justify-center items-center [z-index:2]"
                  >
                    <svg
                      data-pencil-name="Icon-shield"
                      viewBox="0 0 24 24"
                      preserveAspectRatio="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="box-border w-[112px] shrink-0 h-[112px] overflow-visible"
                    >
                      <path
                        d="M12 3a12 12 0 0 0 8.5 3 12 12 0 0 1-8.5 15 12 12 0 0 1-8.5-15 12 12 0 0 0 8.5-3"
                        fill="none"
                      ></path>
                      <path
                        d="M12 3a12 12 0 0 0 8.5 3 12 12 0 0 1-8.5 15 12 12 0 0 1-8.5-15 12 12 0 0 0 8.5-3"
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
                className="box-border w-full [flex:1_1_0] flex flex-col gap-0 justify-start items-start bg-[#FFFFFF]"
              >
                <div
                  data-pencil-name="Body"
                  className="box-border w-full [flex:1_1_0] flex flex-col gap-[20px] p-[16px_20px_20px_20px] justify-start items-start"
                >
                  <div
                    data-pencil-name="Group 账号绑定"
                    className="box-border w-full h-[200px] shrink-0 relative"
                  >
                    <div
                      data-pencil-name="Group Title"
                      className="text-[11px]/[normal] box-border absolute left-0 top-0 text-[#4B5563] font-body font-semibold text-left [white-space:nowrap] [z-index:0]"
                    >
                      账号绑定
                    </div>
                    <div
                      data-pencil-name="Card"
                      className="box-border w-[345px] h-fit [box-shadow:0px_4px_16px_0px_#0000000D] absolute left-0 top-[24px] flex flex-col gap-0 p-[4px] justify-start items-start bg-[#FFFFFF] [border:1px_solid_#E5E7EB] rounded-lg [z-index:1]"
                    >
                      <div
                        data-pencil-name="Row 修改密码"
                        onClick={() => navigate('/settings')}
                        className="box-border w-full h-[56px] shrink-0 flex flex-row gap-[12px] p-[0px_12px] justify-start items-center"
                      >
                        <div
                          data-pencil-name="Icon Container"
                          className="box-border w-[36px] shrink-0 h-[36px] flex flex-row gap-0 justify-center items-center bg-[#0062FF0D] rounded-lg"
                        >
                          <svg
                            data-pencil-name="Icon-lock"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
                          >
                            <path
                              d="M5 13a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2z m6 3a1 1 0 1 0 2 0 1 1 0 0 0-2 0m-3-5v-4a4 4 0 1 1 8 0v4"
                              fill="#00000000"
                            ></path>
                            <path
                              d="M5 13a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2z m6 3a1 1 0 1 0 2 0 1 1 0 0 0-2 0m-3-5v-4a4 4 0 1 1 8 0v4"
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
                          data-pencil-name="Label"
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-medium text-left [white-space:nowrap]"
                        >
                          修改密码
                        </div>
                        <div
                          className="box-border [flex:1_1_0] h-0 flex flex-row gap-0 justify-start items-start"
                        ></div>
                        <div
                          data-pencil-name="Right"
                          className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center"
                        >
                          <div
                            className="box-border w-[8px] shrink-0 h-[8px] flex flex-row gap-0 justify-start items-start"
                          ></div>
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
                      <div
                        data-pencil-name="Row 绑定手机"
                        onClick={() => navigate('/settings')}
                        className="box-border w-full h-[56px] shrink-0 flex flex-row gap-[12px] p-[0px_12px] justify-start items-center"
                      >
                        <div
                          data-pencil-name="Icon Container"
                          className="box-border w-[36px] shrink-0 h-[36px] flex flex-row gap-0 justify-center items-center bg-[#0062FF0D] rounded-lg"
                        >
                          <svg
                            data-pencil-name="Icon-device-mobile"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
                          >
                            <path
                              d="M6 5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2z m5-1h2m-1 13v0.01"
                              fill="#00000000"
                            ></path>
                            <path
                              d="M6 5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2z m5-1h2m-1 13v0.01"
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
                          data-pencil-name="Label"
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-medium text-left [white-space:nowrap]"
                        >
                          绑定手机
                        </div>
                        <div
                          className="box-border [flex:1_1_0] h-0 flex flex-row gap-0 justify-start items-start"
                        ></div>
                        <div
                          data-pencil-name="Right"
                          className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center"
                        >
                          <div
                            data-pencil-name="Tag 已绑定"
                            className="box-border w-fit shrink-0 h-[24px] flex flex-row gap-0 p-[0px_10px] justify-center items-center bg-[#0062FF] rounded-full"
                          >
                            <div
                              data-pencil-name="Text"
                              className="text-[11px]/[normal] box-border text-[#FFFFFF] font-body font-semibold text-left [white-space:nowrap]"
                            >
                              已绑定
                            </div>
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
                      <div
                        data-pencil-name="Row 绑定邮箱"
                        onClick={() => navigate('/settings')}
                        className="box-border w-full h-[56px] shrink-0 flex flex-row gap-[12px] p-[0px_12px] justify-start items-center"
                      >
                        <div
                          data-pencil-name="Icon Container"
                          className="box-border w-[36px] shrink-0 h-[36px] flex flex-row gap-0 justify-center items-center bg-[#0062FF0D] rounded-lg"
                        >
                          <svg
                            data-pencil-name="Icon-mail"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
                          >
                            <path
                              d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2z m0 0l9 6 9-6"
                              fill="#00000000"
                            ></path>
                            <path
                              d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2z m0 0l9 6 9-6"
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
                          data-pencil-name="Label"
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-medium text-left [white-space:nowrap]"
                        >
                          绑定邮箱
                        </div>
                        <div
                          className="box-border [flex:1_1_0] h-0 flex flex-row gap-0 justify-start items-start"
                        ></div>
                        <div
                          data-pencil-name="Right"
                          className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center"
                        >
                          <div
                            data-pencil-name="Tag 未绑定"
                            className="box-border w-fit shrink-0 h-[24px] flex flex-row gap-0 p-[0px_10px] justify-center items-center bg-[#E0F2FE] rounded-full"
                          >
                            <div
                              data-pencil-name="Text"
                              className="text-[11px]/[normal] box-border text-[#0062FF] font-body font-semibold text-left [white-space:nowrap]"
                            >
                              未绑定
                            </div>
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
                    data-pencil-name="Group 账号操作"
                    className="box-border w-full h-fit shrink-0 flex flex-col gap-2 justify-start items-start"
                  >
                    <div
                      data-pencil-name="Group Title"
                      className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-semibold text-left [white-space:nowrap]"
                    >
                      账号操作
                    </div>
                    <div
                      data-pencil-name="Card"
                      className="box-border w-[345px] h-fit shrink-0 flex flex-col gap-0 p-[4px] justify-start items-start bg-[#FEF2F2] [border:1px_solid_#FECACA] rounded-lg"
                    >
                      <button
                        type="button"
                        data-pencil-name="Row 退出登录"
                        disabled={isLoggingOut}
                        onClick={handleLogout}
                        className="box-border w-full h-[56px] shrink-0 flex flex-row gap-[12px] p-[0px_12px] justify-start items-center bg-transparent text-left"
                      >
                        <div
                          data-pencil-name="Icon Container"
                          className="box-border w-[36px] shrink-0 h-[36px] flex flex-row gap-0 justify-center items-center bg-[#FEE2E2] rounded-lg"
                        >
                          <svg
                            data-pencil-name="Icon-logout"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
                          >
                            <path
                              d="M14 8v-2a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2m-5-4h12l-3-3m0 6l3-3"
                              fill="#00000000"
                            ></path>
                            <path
                              d="M14 8v-2a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2m-5-4h12l-3-3m0 6l3-3"
                              fill="none"
                              stroke="#DC2626"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            ></path>
                          </svg>
                        </div>
                        <div
                          data-pencil-name="Label"
                          className="text-[14px]/[normal] box-border text-[#991B1B] font-body font-medium text-left [white-space:nowrap]"
                        >
                          {isLoggingOut ? '退出中...' : '退出登录'}
                        </div>
                        <div
                          className="box-border [flex:1_1_0] h-0 flex flex-row gap-0 justify-start items-start"
                        ></div>
                        <div
                          data-pencil-name="Right"
                          className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center"
                        >
                          <div
                            className="box-border w-[8px] shrink-0 h-[8px] flex flex-row gap-0 justify-start items-start"
                          ></div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
    </PhoneFrame>
  );
}
