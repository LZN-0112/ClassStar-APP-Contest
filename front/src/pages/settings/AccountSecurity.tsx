import PhoneFrame from '@/components/layout/PhoneFrame';
import SettingsHeader from '@/components/layout/SettingsHeader';
import { api } from '@/lib/api';
import { requestWechatAuthCode } from '@/lib/wechat';
import { unregisterPushToken } from '@/lib/push';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import BottomSheet from '@/components/ui/BottomSheet';

export default function AccountSecurity() {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState('');
  const [hasWechat, setHasWechat] = useState(false);
  const [isWechatLoading, setIsWechatLoading] = useState(false);
  const [showUnbindWechatConfirm, setShowUnbindWechatConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [email, setEmail] = useState('');
  const [showBindEmail, setShowBindEmail] = useState(false);
  const [bindEmailValue, setBindEmailValue] = useState('');
  const [bindEmailCode, setBindEmailCode] = useState('');
  const [emailCountdown, setEmailCountdown] = useState(0);
  const [isSendingEmailCode, setIsSendingEmailCode] = useState(false);
  const [isBindingEmail, setIsBindingEmail] = useState(false);

  useEffect(() => {
    api
      .get('/auth/me')
      .then((res) => {
        const data = res.data.data || res.data;
        setMaskedPhone(data.phone || '');
        setHasWechat(!!data.hasWechat);
        setEmail(data.email || '');
      })
      .catch(() => {
        setMaskedPhone('');
      });
  }, []);

  useEffect(() => {
    if (emailCountdown <= 0) return;
    const timer = setInterval(() => {
      setEmailCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [emailCountdown]);

  const openBindEmail = () => {
    setBindEmailValue(email);
    setBindEmailCode('');
    setEmailCountdown(0);
    setShowBindEmail(true);
  };

  const handleSendEmailCode = async () => {
    const target = bindEmailValue.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      toast.error('请输入正确的邮箱');
      return;
    }
    if (isSendingEmailCode || emailCountdown > 0) return;
    setIsSendingEmailCode(true);
    try {
      const res = await api.post('/auth/email/send-code', {
        email: target,
        scene: 'bind_email',
      });
      const data = res.data?.data || res.data;
      if (data?.devCode) {
        // 测试环境未配置 SMTP，后端回传验证码并自动填入
        setBindEmailCode(String(data.devCode));
        toast.success('测试环境验证码已自动填入');
      } else {
        toast.success('验证码已发送，请查收邮箱');
      }
      setEmailCountdown(60);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '验证码发送失败，请重试');
    } finally {
      setIsSendingEmailCode(false);
    }
  };

  const handleBindEmail = async () => {
    const target = bindEmailValue.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      toast.error('请输入正确的邮箱');
      return;
    }
    if (!/^\d{6}$/.test(bindEmailCode.trim())) {
      toast.error('请输入 6 位邮箱验证码');
      return;
    }
    if (isBindingEmail) return;
    setIsBindingEmail(true);
    try {
      await api.post('/auth/email/bind', {
        email: target,
        code: bindEmailCode.trim(),
      });
      setEmail(target);
      setShowBindEmail(false);
      toast.success(email ? '邮箱已更换' : '邮箱绑定成功');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '绑定失败，请重试');
    } finally {
      setIsBindingEmail(false);
    }
  };

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
      // 先解绑本机推送标识（需在清除 token 之前），避免退出后仍收到该账号的通知
      await unregisterPushToken();
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

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error('请输入登录密码');
      return;
    }
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await api.delete('/auth/account', { data: { password: deletePassword } });
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('currentUser');
      toast.success('账号已注销');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '注销失败，请稍后重试');
    } finally {
      setIsDeleting(false);
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
                        onClick={openBindEmail}
                        className="box-border w-full h-[56px] shrink-0 flex flex-row gap-[12px] p-[0px_12px] justify-start items-center cursor-pointer active:bg-[#F9FAFB]"
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
                        <div className="box-border flex flex-col gap-[2px] justify-center items-start min-w-0">
                          <div
                            data-pencil-name="Label"
                            className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-medium text-left [white-space:nowrap]"
                          >
                            绑定邮箱
                          </div>
                          {email && (
                            <div className="max-w-[140px] truncate text-[11px]/[normal] text-[#9CA3AF] font-body text-left">
                              {email}
                            </div>
                          )}
                        </div>
                        <div
                          className="box-border [flex:1_1_0] h-0 flex flex-row gap-0 justify-start items-start"
                        ></div>
                        <div
                          data-pencil-name="Right"
                          className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center"
                        >
                          <div
                            data-pencil-name="Tag 邮箱状态"
                            className={`box-border w-fit shrink-0 h-[24px] flex flex-row gap-0 p-[0px_10px] justify-center items-center rounded-full ${email ? 'bg-[#0062FF]' : 'bg-[#F3F4F6]'}`}
                          >
                            <div
                              data-pencil-name="Text"
                              className={`text-[11px]/[normal] box-border font-body font-semibold text-left [white-space:nowrap] ${email ? 'text-[#FFFFFF]' : 'text-[#9CA3AF]'}`}
                            >
                              {email ? '已绑定' : '未绑定'}
                            </div>
                          </div>
                          <div
                            data-pencil-name="Text 操作"
                            className="text-[12px]/[normal] box-border text-[#0062FF] font-body font-medium text-left [white-space:nowrap]"
                          >
                            {email ? '更换' : '去绑定'}
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
                      <div className="mx-[12px] h-px bg-[#FECACA]" />
                      <button
                        type="button"
                        data-pencil-name="Row 注销账号"
                        onClick={() => {
                          setDeletePassword('');
                          setShowDeleteConfirm(true);
                        }}
                        className="box-border w-full h-[56px] shrink-0 flex flex-row gap-[12px] p-[0px_12px] justify-start items-center bg-transparent text-left"
                      >
                        <div className="box-border w-[36px] shrink-0 h-[36px] flex flex-row gap-0 justify-center items-center bg-[#FEE2E2] rounded-lg">
                          <svg
                            viewBox="0 0 24 24"
                            className="box-border w-[24px] shrink-0 h-[24px]"
                            fill="none"
                            stroke="#DC2626"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                            <path d="M10 11v6M14 11v6" />
                          </svg>
                        </div>
                        <div className="text-[14px]/[normal] box-border text-[#991B1B] font-body font-medium text-left [white-space:nowrap]">
                          注销账号
                        </div>
                        <div className="box-border [flex:1_1_0] h-0 flex flex-row gap-0 justify-start items-start"></div>
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
      {showBindEmail && (
        <BottomSheet
          open
          onClose={() => {
            if (!isBindingEmail) setShowBindEmail(false);
          }}
          title={email ? '更换邮箱' : '绑定邮箱'}
          maxHeight="72vh"
        >
          <div className="flex flex-col gap-3 px-2 pb-2">
            <div className="rounded-[12px] bg-[#F0F7FF] px-4 py-3 font-body text-[12.5px]/[20px] text-[#1D4ED8]">
              邮箱可用于接收验证码与重要通知，请填写常用邮箱并完成验证码校验。
            </div>
            <label className="font-body text-[12px] font-semibold text-[#4B5563]">
              邮箱地址
            </label>
            <input
              type="email"
              value={bindEmailValue}
              onChange={(e) => setBindEmailValue(e.target.value)}
              placeholder="请输入邮箱地址"
              className="h-[46px] w-full rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB] px-3 font-body text-[14px] text-[#1A1A1A] outline-none focus:border-[#0062FF]"
            />
            <label className="font-body text-[12px] font-semibold text-[#4B5563]">
              邮箱验证码
            </label>
            <div className="flex flex-row gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={bindEmailCode}
                onChange={(e) =>
                  setBindEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                placeholder="6 位验证码"
                className="h-[46px] min-w-0 flex-1 rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB] px-3 font-body text-[14px] text-[#1A1A1A] outline-none focus:border-[#0062FF]"
              />
              <button
                type="button"
                disabled={isSendingEmailCode || emailCountdown > 0}
                onClick={() => void handleSendEmailCode()}
                className="h-[46px] shrink-0 rounded-[12px] bg-[#EBF2FF] px-3 font-body text-[13px] font-semibold text-[#0062FF] active:opacity-80 disabled:opacity-50"
              >
                {isSendingEmailCode
                  ? '发送中...'
                  : emailCountdown > 0
                    ? `${emailCountdown}s 后重发`
                    : '获取验证码'}
              </button>
            </div>
            <button
              type="button"
              disabled={isBindingEmail}
              onClick={() => void handleBindEmail()}
              className="mt-1 h-[48px] w-full rounded-[14px] bg-[#0062FF] font-body text-[15px] font-semibold text-white active:opacity-90 disabled:opacity-60"
            >
              {isBindingEmail ? '提交中...' : email ? '确认更换' : '确认绑定'}
            </button>
            <button
              type="button"
              disabled={isBindingEmail}
              onClick={() => setShowBindEmail(false)}
              className="h-[44px] w-full rounded-[12px] font-body text-[14px] font-medium text-[#64748B] active:opacity-70"
            >
              取消
            </button>
          </div>
        </BottomSheet>
      )}
      {showDeleteConfirm && (
        <BottomSheet
          open
          onClose={() => {
            if (!isDeleting) setShowDeleteConfirm(false);
          }}
          title="注销账号"
          maxHeight="60vh"
        >
          <div className="flex flex-col gap-3 px-2 pb-2">
            <div className="rounded-[12px] bg-[#FEF2F2] px-4 py-3 font-body text-[12.5px]/[20px] text-[#991B1B]">
              注销后账号不可恢复，您将被移出所在班级，姓名、头像、学号、手机号等身份信息将被删除或匿名化，历史班级记录保留但不再关联到您。
            </div>
            <label className="font-body text-[12px] font-semibold text-[#4B5563]">
              请输入登录密码以确认身份
            </label>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="登录密码"
              className="h-[46px] w-full rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB] px-3 font-body text-[14px] text-[#1A1A1A] outline-none focus:border-[#DC2626]"
            />
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => void handleDeleteAccount()}
              className="mt-1 h-[48px] w-full rounded-[14px] bg-[#DC2626] font-body text-[15px] font-semibold text-white active:opacity-90 disabled:opacity-60"
            >
              {isDeleting ? '注销中...' : '确认注销'}
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setShowDeleteConfirm(false)}
              className="h-[44px] w-full rounded-[12px] font-body text-[14px] font-medium text-[#64748B] active:opacity-70"
            >
              取消
            </button>
          </div>
        </BottomSheet>
      )}
    </PhoneFrame>
  );
}
