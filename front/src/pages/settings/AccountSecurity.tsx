import PhoneFrame from '@/components/layout/PhoneFrame';
import SettingsHeader from '@/components/layout/SettingsHeader';
import { api } from '@/lib/api';
import { requestWechatAuthCode } from '@/lib/wechat';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

export default function AccountSecurity() {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState('');
  const [hasWechat, setHasWechat] = useState(false);
  const [isWechatLoading, setIsWechatLoading] = useState(false);
  const [showUnbindWechatConfirm, setShowUnbindWechatConfirm] = useState(false);

  useEffect(() => {
    api
      .get('/auth/me')
      .then((res) => {
        const data = res.data.data || res.data;
        setMaskedPhone(data.phone || '');
        setHasWechat(!!data.hasWechat);
      })
      .catch(() => {
        setMaskedPhone('');
      });
  }, []);

  const handleWechatClick = async () => {
    if (isWechatLoading) return;
    if (hasWechat) {
      setShowUnbindWechatConfirm(true);
      return;
    }
    setIsWechatLoading(true);
    try {
      const code = await requestWechatAuthCode();
      await api.post('/auth/wechat/bind', { code });
      setHasWechat(true);
      toast.success('微信绑定成功');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '微信绑定失败，请重试');
    } finally {
      setIsWechatLoading(false);
    }
  };

  const handleUnbindWechat = async () => {
    if (isWechatLoading) return;
    setIsWechatLoading(true);
    try {
      await api.delete('/auth/wechat/bind');
      setHasWechat(false);
      setShowUnbindWechatConfirm(false);
      toast.success('已解除微信绑定');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '解除绑定失败，请重试');
    } finally {
      setIsWechatLoading(false);
    }
  };

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
      <SettingsHeader title="账号与安全" />
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
                    className="box-border w-full h-[256px] shrink-0 relative"
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
                        onClick={() => navigate('/change-password')}
                        className="box-border w-full h-[56px] shrink-0 flex flex-row gap-[12px] p-[0px_12px] justify-start items-center cursor-pointer active:bg-[#F9FAFB]"
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
                        onClick={() => toast.info('手机号暂不支持自行修改，如需更换请联系班主任')}
                        className="box-border w-full h-[56px] shrink-0 flex flex-row gap-[12px] p-[0px_12px] justify-start items-center cursor-pointer active:bg-[#F9FAFB]"
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
                            data-pencil-name="Text 手机号"
                            className="text-[12px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap]"
                          >
                            {maskedPhone}
                          </div>
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
                        data-pencil-name="Row 绑定微信"
                        onClick={handleWechatClick}
                        className={`box-border w-full h-[56px] shrink-0 flex flex-row gap-[12px] p-[0px_12px] justify-start items-center cursor-pointer active:bg-[#F9FAFB] ${isWechatLoading ? 'opacity-60 pointer-events-none' : ''}`}
                      >
                        <div
                          data-pencil-name="Icon Container"
                          className="box-border w-[36px] shrink-0 h-[36px] flex flex-row gap-0 justify-center items-center bg-[#0062FF0D] rounded-lg"
                        >
                          <svg
                            data-pencil-name="Icon-WeChat"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
                          >
                            <path
                              d="M8.691 2.188c-4.8 0-8.691 3.288-8.691 7.342 0 2.212 1.17 4.203 3.002 5.55a0.59 0.59 0 0 1 0.213 0.665l-0.39 1.48c-0.019 0.07-0.048 0.141-0.048 0.213 0 0.163 0.13 0.295 0.29 0.295a0.33 0.33 0 0 0 0.167-0.054l1.903-1.114a0.86 0.86 0 0 1 0.717-0.098 10.2 10.2 0 0 0 2.837 0.403c0.276 0 0.543-0.027 0.811-0.05-0.857-2.578 0.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-0.576-3.583-4.196-6.348-8.596-6.348m-2.906 3.803c0.642 0 1.162 0.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.179c0-0.651 0.52-1.18 1.162-1.18z m5.813 0c0.642 0 1.162 0.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-0.651 0.52-1.18 1.162-1.18m5.34 2.867c-1.797-0.052-3.746 0.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22 0.942 2.453 3.666 4.229 6.884 4.229 0.826 0 1.622-0.12 2.361-0.336a0.72 0.72 0 0 1 0.598 0.082l1.584 0.926a0.3 0.3 0 0 0 0.14 0.047c0.134 0 0.24-0.111 0.24-0.247 0-0.06-0.023-0.12-0.038-0.177l-0.327-1.233a0.6 0.6 0 0 1-0.023-0.156 0.49 0.49 0 0 1 0.201-0.398c1.526-1.121 2.502-2.781 2.502-4.621 0-3.21-2.931-5.837-6.656-6.088v-0.002c-0.135-0.01-0.27-0.027-0.407-0.03z m-2.53 3.274c0.535 0 0.969 0.44 0.969 0.982a0.976 0.976 0 0 1-0.969 0.983 0.976 0.976 0 0 1-0.969-0.983c0-0.542 0.434-0.982 0.97-0.982z m4.844 0c0.535 0 0.969 0.44 0.969 0.982a0.976 0.976 0 0 1-0.969 0.983 0.976 0.976 0 0 1-0.969-0.983c0-0.542 0.434-0.982 0.969-0.982"
                              fill="#07C160"
                            ></path>
                          </svg>
                        </div>
                        <div
                          data-pencil-name="Label"
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-medium text-left [white-space:nowrap]"
                        >
                          微信
                        </div>
                        <div
                          className="box-border [flex:1_1_0] h-0 flex flex-row gap-0 justify-start items-start"
                        ></div>
                        <div
                          data-pencil-name="Right"
                          className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center"
                        >
                          <div
                            data-pencil-name="Tag 微信状态"
                            className={`box-border w-fit shrink-0 h-[24px] flex flex-row gap-0 p-[0px_10px] justify-center items-center rounded-full ${hasWechat ? 'bg-[#0062FF]' : 'bg-[#F3F4F6]'}`}
                          >
                            <div
                              data-pencil-name="Text"
                              className={`text-[11px]/[normal] box-border font-body font-semibold text-left [white-space:nowrap] ${hasWechat ? 'text-[#FFFFFF]' : 'text-[#9CA3AF]'}`}
                            >
                              {hasWechat ? '已绑定' : '未绑定'}
                            </div>
                          </div>
                          <div
                            data-pencil-name="Text 操作"
                            className="text-[12px]/[normal] box-border text-[#0062FF] font-body font-medium text-left [white-space:nowrap]"
                          >
                            {isWechatLoading ? '处理中...' : hasWechat ? '解除' : '去绑定'}
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
                        className="box-border w-full h-[56px] shrink-0 flex flex-row gap-[12px] p-[0px_12px] justify-start items-center cursor-not-allowed select-none opacity-60"
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
                            data-pencil-name="Tag 暂未开放"
                            className="box-border w-fit shrink-0 h-[24px] flex flex-row gap-0 p-[0px_10px] justify-center items-center bg-[#F3F4F6] rounded-full"
                          >
                            <div
                              data-pencil-name="Text"
                              className="text-[11px]/[normal] box-border text-[#9CA3AF] font-body font-semibold text-left [white-space:nowrap]"
                            >
                              暂未开放
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
                        onClick={() => setShowLogoutConfirm(true)}
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
    <ConfirmDialog
        open={showLogoutConfirm}
        title="退出登录"
        description="退出后需要重新登录才能查看班级消息、考勤与作业，确定要退出吗？"
        confirmText="确认退出"
        danger
        loading={isLoggingOut}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
      />
      <ConfirmDialog
        open={showUnbindWechatConfirm}
        title="解除微信绑定"
        description="解除后将无法使用微信一键登录，仍可用手机号和密码登录，确定要解除吗？"
        confirmText="确认解除"
        danger
        loading={isWechatLoading}
        onCancel={() => setShowUnbindWechatConfirm(false)}
        onConfirm={handleUnbindWechat}
      />
    </PhoneFrame>
  );
}
