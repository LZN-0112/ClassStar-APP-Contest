import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import StatusBar from '@/components/layout/StatusBar';
import BottomSheet, { SheetRow } from '@/components/ui/BottomSheet';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { isNative } from '@/lib/capacitor';
import { getCurrentOrgId, setCurrentOrg } from '@/hooks/useCurrentUser';
import {
  ORG_TYPES,
  ORG_TYPE_LABEL,
  ORG_TYPE_COLOR,
  ORG_TYPE_ICON,
  getOrgTypeMeta,
  type OrgType,
} from '@/utils/org';
import { ScanLine } from 'lucide-react';

interface ClassInfo {
  id: string;
  name: string;
  code: string;
  qrCodeUrl: string;
  orgType?: string;
  grade?: string | null;
  major?: string | null;
  category?: string | null;
  logoUrl?: string | null;
  description?: string | null;
  maxMembers?: number | null;
  role?: string;
  roleLevel?: 'owner' | 'admin' | 'member';
  isCommittee?: boolean;
  memberCount?: number;
  joinedAt?: string;
}

// 创建组织时可选的显示身份，群主可按实际情况（如本人是团支书）自选
const OWNER_ROLE_OPTIONS: Record<OrgType, string[]> = {
  class: ['班长', '团支书', '学习委员'],
  association: ['社长', '副社长', '部长'],
  committee: ['部长', '副部长', '干事'],
  club: ['负责人', '小组长'],
};

const OWNER_ROLE_DEFAULT: Record<OrgType, string> = {
  class: '班长',
  association: '社长',
  committee: '部长',
  club: '负责人',
};

export default function JoinClass() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialCreated = location.state?.createdClass || null;

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 扫码唤起时通过 ?code= 预填班级码
  const [searchParams] = useSearchParams();
  const codeFromUrl = (searchParams.get('code') || '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, 20);

  const [classCode, setClassCode] = useState(codeFromUrl);
  const [realName, setRealName] = useState(() => {
    // 优先带出账号注册时填写的真实姓名，用户可在加入时修改
    try {
      const cached = localStorage.getItem('currentUser');
      return cached ? (JSON.parse(cached) as { name?: string }).name || '' : '';
    } catch {
      return '';
    }
  });
  const [studentId, setStudentId] = useState('');
  const [needStudentId, setNeedStudentId] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);

  useEffect(() => {
    if (codeFromUrl) setClassCode(codeFromUrl);
  }, [codeFromUrl]);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [className, setClassName] = useState('');
  const [createOrgType, setCreateOrgType] = useState<OrgType>('class');
  const [createRole, setCreateRole] = useState('');
  const [classGrade] = useState('');
  const [classMajor] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createdClass, setCreatedClass] = useState<ClassInfo | null>(initialCreated);
  const [joinedClass, setJoinedClass] = useState<ClassInfo | null>(null);

  const [myClasses, setMyClasses] = useState<ClassInfo[]>([]);

  // 页面加载时获取当前用户已加入的班级列表
  useEffect(() => {
    let cancelled = false;
    const fetchMyClasses = async () => {
      try {
        const res = await api.get('/classes/my');
        const list = res.data?.data || [];
        if (!cancelled) {
          setMyClasses(list);
          // 与「进入班级」页保持一致：优先显示当前选中的组织，找不到再回退到最近加入的组织
          if (!initialCreated && list.length > 0) {
            const currentOrgId = getCurrentOrgId();
            setJoinedClass(list.find((c: ClassInfo) => c.id === currentOrgId) || list[0]);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('获取我的班级失败:', err);
        }
      }
    };
    fetchMyClasses();
    return () => {
      cancelled = true;
    };
  }, [initialCreated]);

  const matchedClass = useMemo(() => {
    if (!classCode) return null;
    return myClasses.find((c) => c.code?.toUpperCase() === classCode) || null;
  }, [classCode, myClasses]);

  const displayed = createdClass || matchedClass || joinedClass;
  const displayedOrgMeta = getOrgTypeMeta(displayed?.orgType);

  const alreadyMember = useMemo(() => {
    if (!classCode) return false;
    return myClasses.some((c) => c.code?.toUpperCase() === classCode);
  }, [classCode, myClasses]);

  const joinDisabled = joinLoading || alreadyMember;

  const activateClass = useCallback(
    (target: ClassInfo, fallbackRole: 'owner' | 'member') => {
      setCurrentOrg({
        id: target.id,
        name: target.name,
        code: target.code,
        grade: target.grade ?? null,
        major: target.major ?? null,
        qrCodeUrl: target.qrCodeUrl ?? null,
        orgType: target.orgType || 'class',
        category: target.category ?? null,
        logoUrl: target.logoUrl ?? null,
        description: target.description ?? null,
        maxMembers: target.maxMembers ?? null,
        role: target.role || (fallbackRole === 'owner' ? '群主' : '成员'),
        roleLevel: target.roleLevel || fallbackRole,
        isCommittee: target.isCommittee ?? false,
        memberCount: target.memberCount ?? 0,
        joinedAt: target.joinedAt || '',
      });
      window.dispatchEvent(new Event('orgChanged'));
    },
    [],
  );

  const handleEnterHome = useCallback(() => {
    // 进入前切换到当前展示的组织，避免「这里的班级码」和「点进去的班级」不是同一个
    if (!displayed) return;
    if (displayed.id !== getCurrentOrgId()) {
      activateClass(displayed, createdClass ? 'owner' : 'member');
    }
    navigate('/home', { replace: true });
  }, [displayed, createdClass, activateClass, navigate]);

  // 历史班级可能没有二维码，不能再用装饰性假图案冒充
  const qrPlaceholder = (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center text-[11px] text-[#9CA3AF]">
      <span>二维码未生成</span>
      <span>请联系管理员补生成</span>
    </div>
  );

  const handleQrPointerDown = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      setSaveMenuOpen(true);
    }, 600);
  };

  const handleQrPointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const saveQrImage = () => {
    if (!displayed?.qrCodeUrl) return;
    setSaveMenuOpen(false);
    if (isNative) {
      // WebView 不支持 a[download]，引导用户用系统截图保存
      toast.info('请使用手机截屏保存二维码');
      return;
    }
    const link = document.createElement('a');
    link.download = `${displayed.name || '班级'}二维码.png`;
    link.href = displayed.qrCodeUrl;
    link.click();
  };

  const copyClassCode = async () => {
    if (!displayed?.code) return;
    try {
      await navigator.clipboard.writeText(displayed.code);
    } catch {
      const input = document.createElement('textarea');
      input.value = displayed.code;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    toast.success('班级码已复制');
    setSaveMenuOpen(false);
  };

  const handleJoin = async () => {
    if (!/^[A-Za-z0-9]{4,20}$/.test(classCode)) {
      toast.error('请输入正确的班级码（4-20 位字母或数字）');
      return;
    }
    if (alreadyMember) {
      toast.info('已是该班级成员');
      return;
    }
    const trimmedName = realName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      toast.error('请填写真实姓名（2-50 个字），方便班委核对身份');
      return;
    }
    if (needStudentId && !studentId.trim()) {
      toast.error('该班级已导入名单，请填写学号');
      return;
    }
    if (joinLoading) return;
    setJoinLoading(true);
    try {
      const payload: { code: string; studentId?: string; realName: string } = {
        code: classCode,
        realName: trimmedName,
      };
      if (studentId.trim()) {
        payload.studentId = studentId.trim();
      }
      const res = await api.post('/classes/join', payload);
      const data = res.data.data || res.data;
      const joinedName = data.name || data.className || '';
      if (data.verifyStatus === 'PENDING') {
        toast.success(`已加入班级：${joinedName}，姓名与名单不一致，已提交班委核对`);
      } else {
        toast.success(`成功加入班级：${joinedName}`);
      }
      setMyClasses((prev) => [data, ...prev.filter((c) => c.id !== data.id)]);
      activateClass(data, 'member');
      navigate('/home', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : '加入班级失败，请检查邀请码';
      if (message.includes('学号') || message.includes('名单')) {
        setNeedStudentId(true);
      }
      toast.error(message);
    } finally {
      setJoinLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!className.trim()) {
      toast.error(`请输入${ORG_TYPE_LABEL[createOrgType]}名称`);
      return;
    }
    if (createLoading) return;
    setCreateLoading(true);
    try {
      const res = await api.post('/classes', {
        name: className.trim(),
        grade: classGrade.trim(),
        major: classMajor.trim(),
        orgType: createOrgType,
        role: createRole.trim() || undefined,
      });
      const data = res.data.data || res.data;
      setCreatedClass(data);
      setMyClasses((prev) => [data, ...prev.filter((c) => c.id !== data.id)]);
      // 创建后直接切换为当前组织，避免用户「跳过后仍停留在旧班级」
      activateClass(data, 'owner');
      setCreateModalOpen(false);
      toast.success(`${ORG_TYPE_LABEL[createOrgType]}创建成功`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `创建${ORG_TYPE_LABEL[createOrgType]}失败，请稍后重试`);
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <PhoneFrame className="bg-white" reserveSafeAreaTop safeAreaTopClassName="bg-white">
      <StatusBar />
      <div className="box-border w-full flex-1 flex flex-col gap-4 px-6 pb-8 bg-white">
            <div className="flex w-full flex-row items-center">
              <BackButton className="-ml-2" onClick={() => navigate(-1)} />
              <div className="text-[20px]/[normal] text-[#1A1A1A] font-heading font-bold">加入或创建班级</div>
            </div>
            <div className="text-[13px]/[normal] text-[#6B7280] font-body">
              输入班级码加入，或创建一个新的班级
            </div>

            {myClasses.length > 0 && (
              <div className="flex w-full flex-col gap-2">
                <div className="text-[12px] font-body font-medium text-[#9CA3AF]">我的班级</div>
                <div className="flex w-full flex-row gap-2 overflow-x-auto pb-1">
                  {myClasses.map((c) => {
                    const active = displayed?.id === c.id;
                    const meta = getOrgTypeMeta(c.orgType);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCreatedClass(null);
                          setJoinedClass(c);
                        }}
                        className={`flex shrink-0 flex-row items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-body font-medium transition-colors ${
                          active ? 'bg-[#0062FF] text-white' : 'bg-[#F3F4F6] text-[#4B5563]'
                        }`}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: active ? '#FFFFFF' : meta.color }}
                        />
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <input
              data-pencil-name="Class Code Input"
              type="text"
              maxLength={20}
              value={classCode}
              onChange={(e) =>
                setClassCode(
                  e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 20),
                )
              }
              placeholder="请输入班级码"
              className="box-border w-full h-[56px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-2 p-[0px_16px] justify-center items-start bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg text-[14px] font-body text-[#1A1A1A] placeholder:text-[#9CA3AF] outline-none focus:border-[#0062FF]"
            />
            <button
              type="button"
              data-pencil-name="Scan Button"
              onClick={() => navigate('/scan')}
              className="box-border flex h-[44px] w-full shrink-0 flex-row items-center justify-center gap-2 rounded-lg border border-[#0062FF] bg-[#0062FF0D] text-[14px] font-body font-semibold text-[#0062FF] active:opacity-80"
            >
              <ScanLine className="h-[18px] w-[18px]" strokeWidth={2} />
              扫一扫班级二维码
            </button>
            <input
              data-pencil-name="Real Name Input"
              type="text"
              maxLength={50}
              value={realName}
              onChange={(e) => setRealName(e.target.value)}
              placeholder="请填写真实姓名（必填，用于班委核对身份）"
              className="box-border w-full h-[56px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-2 p-[0px_16px] justify-center items-start bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg text-[14px] font-body text-[#1A1A1A] placeholder:text-[#9CA3AF] outline-none focus:border-[#0062FF]"
            />
            <input
              data-pencil-name="Student ID Input"
              type="text"
              maxLength={20}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value.slice(0, 20))}
              placeholder="学号（如班级已导入名单请填写）"
              className={`box-border w-full h-[56px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-2 p-[0px_16px] justify-center items-start bg-[#FFFFFF] rounded-lg text-[14px] font-body text-[#1A1A1A] placeholder:text-[#9CA3AF] outline-none border ${
                needStudentId ? 'border-[#EF4444]' : 'border-[#E5E7EB] focus:border-[#0062FF]'
              }`}
            />
            {needStudentId && (
              <div
                data-pencil-name="Student ID Hint"
                className="box-border w-full text-[12px]/[normal] text-[#EF4444] font-body"
              >
                该班级已导入名单，请填写学号后重新加入
              </div>
            )}
            {alreadyMember && matchedClass && (
              <div className="box-border w-full flex flex-col gap-2.5 rounded-xl bg-[#EBF3FF] p-3.5">
                <div className="flex flex-row items-center gap-1.5 text-[13px]/[normal] text-[#0062FF] font-body font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0062FF]" />
                  你已加入「{matchedClass.name}」
                </div>
                <button
                  type="button"
                  onClick={() => {
                    activateClass(matchedClass, 'member');
                    navigate('/home', { replace: true });
                  }}
                  className="h-[40px] w-full rounded-lg bg-[#0062FF] text-[13px] font-body font-semibold text-white active:scale-[0.98] transition-transform"
                >
                  直接进入该班级
                </button>
              </div>
            )}
            <div
              data-pencil-name="Join Button"
              className={`box-border w-full h-[52px] shrink-0 [box-shadow:0px_4px_16px_0px_#0000000D] flex flex-col gap-2 p-[0px_16px] justify-center items-center rounded-lg ${
                joinDisabled
                  ? 'bg-[#9CA3AF] cursor-not-allowed'
                  : joinLoading
                    ? 'bg-[#93C5FD]'
                    : 'bg-[#0062FF]'
              }`}
              onClick={() => {
                if (joinDisabled) return;
                handleJoin();
              }}
            >
              <div
                data-pencil-name="Label"
                className="text-[16px]/[normal] box-border text-[#FFFFFF] font-body font-semibold text-left [white-space:nowrap]"
              >
                {joinLoading ? '加入中...' : '加入班级'}
              </div>
            </div>
            <div
              data-pencil-name="Divider"
              className="box-border w-[343px] h-[19px] shrink-0 flex flex-row gap-[12px] justify-center items-center"
            >
              <div
                data-pencil-name="Line"
                className="box-border w-[120px] shrink-0 h-[1px] bg-[#E5E7EB]"
              ></div>
              <div
                data-pencil-name="Or"
                className="text-[11px]/[normal] box-border text-[#4B5563] font-caption font-normal text-center [white-space:nowrap]"
              >
                或
              </div>
              <div
                data-pencil-name="Line"
                className="box-border w-[120px] shrink-0 h-[1px] bg-[#E5E7EB]"
              ></div>
            </div>
            <div
              data-pencil-name="Create Button"
              className="box-border w-full h-[52px] shrink-0 flex flex-col gap-2 p-[0px_16px] justify-center items-center bg-[#0062FF0D] [border:1px_solid_#E5E7EB] rounded-lg"
              onClick={() => setCreateModalOpen(true)}
            >
              <div
                data-pencil-name="Label"
                className="text-[16px]/[normal] box-border text-[#0062FF] font-body font-semibold text-left [white-space:nowrap]"
              >
                创建新班级
              </div>
            </div>
            {displayed && (
              <div
                data-pencil-name="Invite Card"
                className="box-border w-full h-fit shrink-0 flex flex-col gap-4 p-[20px] justify-start items-center bg-[#0062FF0D] [border:1px_solid_#F3F4F6] rounded-lg"
              >
                <div
                  data-pencil-name="Card Title"
                  className="text-[16px]/[normal] box-border text-[#1A1A1A] font-heading font-semibold text-left [white-space:nowrap]"
                >
                  {createdClass ? '创建成功，分享班级邀请' : '当前组织'}
                </div>
                <div className="flex w-full flex-row items-center justify-center gap-2">
                  <span className="text-[14px]/[normal] box-border text-[#4B5563] font-body font-medium">
                    {displayed.name}
                  </span>
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px]/[normal] font-body font-medium"
                    style={{
                      color: displayedOrgMeta.color,
                      backgroundColor: `${displayedOrgMeta.color}1A`,
                    }}
                  >
                    {displayedOrgMeta.label}
                  </span>
                </div>
                <div
                  data-pencil-name="Class Code"
                  className="text-[24px]/[normal] box-border text-[#0062FF] font-data font-bold text-left [white-space:nowrap]"
                >
                  班级码：{displayed.code.slice(0, 3)} {displayed.code.slice(3)}
                </div>
                <div
                  data-pencil-name="QR Code"
                  className="box-border w-[120px] h-[120px] shrink-0 bg-[#FFFFFF] [border:1px_solid_#E5E7EB] rounded-lg relative cursor-pointer overflow-hidden"
                  onClick={() => setQrModalOpen(true)}
                  onPointerDown={handleQrPointerDown}
                  onPointerUp={handleQrPointerUp}
                  onPointerLeave={handleQrPointerUp}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {displayed.qrCodeUrl ? (
                    <img
                      src={displayed.qrCodeUrl}
                      alt="班级二维码"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    qrPlaceholder
                  )}
                </div>
                <div
                  data-pencil-name="QR Hint"
                  className="text-[11px]/[normal] box-border text-[#4B5563] font-caption font-normal text-center"
                >
                  {displayed.qrCodeUrl
                    ? '同学用系统相机扫码即可打开 App 加入班级'
                    : '二维码未生成，可先用班级码邀请'}
                </div>
                <button
                  data-pencil-name="Enter Class Button"
                  type="button"
                  onClick={handleEnterHome}
                  className="box-border w-full h-[44px] shrink-0 [box-shadow:0px_4px_16px_0px_#0000000D] flex flex-col gap-2 p-[0px_16px] justify-center items-center bg-[#0062FF] rounded-lg text-[16px]/[normal] text-[#FFFFFF] font-body font-semibold [white-space:nowrap] active:scale-[0.98] transition-transform"
                >
                  进入班级
                </button>
              </div>
            )}
            {/* 跳过按钮 */}
            <div className="box-border w-full h-[40px] flex justify-center items-center mt-4">
              <button
                type="button"
                className="text-[13px] text-[#9CA3AF] font-body cursor-pointer active:opacity-60 underline bg-transparent border-none p-0"
                onClick={() => navigate('/home', { replace: true })}
              >
                跳过，稍后再加入班级
              </button>
            </div>
          </div>

      {/* QR 大图弹窗 */}
      {qrModalOpen && displayed && (
        <BottomSheet
          open
          onClose={() => setQrModalOpen(false)}
          title={`班级码：${displayed.code}`}
          maxHeight="80vh"
          footer={
            <div className="flex flex-row gap-3">
              <button
                type="button"
                onClick={copyClassCode}
                className="h-[48px] flex-1 rounded-[14px] bg-[#F2F5F9] font-body text-[15px]/[normal] font-semibold text-[#475569] active:opacity-80"
              >
                复制班级码
              </button>
              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                className="h-[48px] flex-1 rounded-[14px] bg-[linear-gradient(180deg,#2E7DFF_0%,#0062FF_100%)] font-body text-[15px]/[normal] font-semibold text-white shadow-[0_10px_20px_rgba(0,98,255,0.24)] active:opacity-90"
              >
                关闭
              </button>
            </div>
          }
        >
          <div className="flex flex-col items-center gap-3 px-5 pb-2">
            <div
              className="box-border w-[240px] h-[240px] shrink-0 bg-[#FFFFFF] [border:1px_solid_#E5E7EB] rounded-lg relative overflow-hidden"
              onPointerDown={handleQrPointerDown}
              onPointerUp={handleQrPointerUp}
              onPointerLeave={handleQrPointerUp}
              onContextMenu={(e) => e.preventDefault()}
            >
              {displayed.qrCodeUrl ? (
                <img src={displayed.qrCodeUrl} alt="班级二维码" className="w-full h-full object-contain" />
              ) : (
                qrPlaceholder
              )}
            </div>
          </div>
        </BottomSheet>
      )}

      {/* 长按保存菜单 */}
      {saveMenuOpen && (
        <BottomSheet open onClose={() => setSaveMenuOpen(false)} maxHeight="50vh">
          <div className="flex flex-col gap-1 px-3 pb-2">
            {displayed?.qrCodeUrl && <SheetRow title="保存图片" onClick={saveQrImage} />}
            <SheetRow title="复制班级码" onClick={copyClassCode} />
          </div>
        </BottomSheet>
      )}

      {/* 创建班级弹窗 */}
      {createModalOpen && (
        <BottomSheet
          open
          onClose={() => setCreateModalOpen(false)}
          title="创建新组织"
          maxHeight="85vh"
          locked={createLoading}
          footer={
            <div className="flex w-full gap-3">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="h-[48px] flex-1 rounded-[14px] bg-[#F2F5F9] font-body text-[15px]/[normal] font-semibold text-[#475569] active:opacity-80"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={createLoading}
                className="h-[48px] flex-1 rounded-[14px] bg-[linear-gradient(180deg,#2E7DFF_0%,#0062FF_100%)] font-body text-[15px]/[normal] font-semibold text-white shadow-[0_10px_20px_rgba(0,98,255,0.24)] active:opacity-90 disabled:opacity-50"
              >
                {createLoading ? '创建中...' : '创建'}
              </button>
            </div>
          }
        >
          <div className="box-border flex w-full flex-col gap-4 px-5 pb-2 justify-start items-start">
            {/* 组织类型选择 */}
            <div className="grid w-full grid-cols-4 gap-2">
              {ORG_TYPES.map((t) => {
                const Icon = ORG_TYPE_ICON[t];
                const active = createOrgType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setCreateOrgType(t);
                      setCreateRole('');
                    }}
                    className={`flex flex-col items-center gap-1 rounded-lg border py-2 transition-all ${
                      active
                        ? 'border-transparent text-white'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                    style={active ? { backgroundColor: ORG_TYPE_COLOR[t] } : undefined}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2} />
                    <span className="text-[11px] font-medium">{ORG_TYPE_LABEL[t]}</span>
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder={`请输入${ORG_TYPE_LABEL[createOrgType]}名称`}
              className="box-border w-full h-[48px] px-4 rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] text-[14px] font-body text-[#1A1A1A] placeholder:text-[#9CA3AF] outline-none focus:border-[#0062FF]"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            {/* 群主身份：本人不一定是班长，可按实际情况选择或自定义 */}
            <div className="flex w-full flex-col gap-2">
              <span className="text-[12px] font-body text-[#6B7280]">
                我的身份（选填，默认{OWNER_ROLE_DEFAULT[createOrgType]}）
              </span>
              <div className="flex flex-wrap gap-2">
                {OWNER_ROLE_OPTIONS[createOrgType].map((r) => {
                  const active =
                    (createRole.trim() || OWNER_ROLE_DEFAULT[createOrgType]) === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setCreateRole(r)}
                      className={`rounded-full border px-3 py-1.5 text-[12px] font-body transition-colors ${
                        active
                          ? 'border-[#0062FF] bg-[#EAF2FF] text-[#0062FF]'
                          : 'border-[#E5E7EB] bg-white text-[#4B5563]'
                      }`}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={createRole}
                maxLength={20}
                onChange={(e) => setCreateRole(e.target.value)}
                placeholder={`也可自定义，如 团支书、学习委员`}
                className="box-border w-full h-[44px] px-4 rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] text-[14px] font-body text-[#1A1A1A] placeholder:text-[#9CA3AF] outline-none focus:border-[#0062FF]"
              />
            </div>
          </div>
        </BottomSheet>
      )}
    </PhoneFrame>
  );
}
