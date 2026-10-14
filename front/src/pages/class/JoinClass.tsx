import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { ORG_TYPES, ORG_TYPE_LABEL, ORG_TYPE_COLOR, ORG_TYPE_ICON, type OrgType } from '@/utils/org';

interface ClassInfo {
  id: string;
  name: string;
  code: string;
  qrCodeUrl: string;
}

export default function JoinClass() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialCreated = location.state?.createdClass || null;

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [classCode, setClassCode] = useState('');
  const [studentId, setStudentId] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [className, setClassName] = useState('');
  const [createOrgType, setCreateOrgType] = useState<OrgType>('class');
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
          // 如果页面从创建班级跳转过来，优先显示刚创建的班级；否则显示最近加入的班级
          if (!initialCreated && list.length > 0) {
            setJoinedClass(list[0]);
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

  const displayed = createdClass || joinedClass;

  const alreadyMember = useMemo(() => {
    if (!classCode || classCode.length !== 6) return false;
    return myClasses.some((c) => c.code === classCode);
  }, [classCode, myClasses]);

  const joinDisabled = joinLoading || alreadyMember;

  const handleEnterHome = useCallback(() => {
    navigate('/home', { replace: true });
  }, [navigate]);

  const qrNodes = (
    <>
      <div data-pencil-name="rect" className="box-border w-[28px] h-[28px] absolute left-[12px] top-[12px] flex flex-row gap-0 justify-start items-start bg-[#1A1A1A] [z-index:0]"></div>
      <div data-pencil-name="rect" className="box-border w-[20px] h-[20px] absolute left-[16px] top-[16px] flex flex-row gap-0 justify-start items-start bg-[#FFFFFF] [z-index:1]"></div>
      <div data-pencil-name="rect" className="box-border w-[12px] h-[12px] absolute left-[20px] top-[20px] flex flex-row gap-0 justify-start items-start bg-[#1A1A1A] [z-index:2]"></div>
      <div data-pencil-name="rect" className="box-border w-[28px] h-[28px] absolute left-[80px] top-[12px] flex flex-row gap-0 justify-start items-start bg-[#1A1A1A] [z-index:3]"></div>
      <div data-pencil-name="rect" className="box-border w-[20px] h-[20px] absolute left-[84px] top-[16px] flex flex-row gap-0 justify-start items-start bg-[#FFFFFF] [z-index:4]"></div>
      <div data-pencil-name="rect" className="box-border w-[12px] h-[12px] absolute left-[88px] top-[20px] flex flex-row gap-0 justify-start items-start bg-[#1A1A1A] [z-index:5]"></div>
      <div data-pencil-name="rect" className="box-border w-[28px] h-[28px] absolute left-[12px] top-[80px] flex flex-row gap-0 justify-start items-start bg-[#1A1A1A] [z-index:6]"></div>
      <div data-pencil-name="rect" className="box-border w-[20px] h-[20px] absolute left-[16px] top-[84px] flex flex-row gap-0 justify-start items-start bg-[#FFFFFF] [z-index:7]"></div>
      <div data-pencil-name="rect" className="box-border w-[12px] h-[12px] absolute left-[20px] top-[88px] flex flex-row gap-0 justify-start items-start bg-[#1A1A1A] [z-index:8]"></div>
      <div data-pencil-name="rect" className="box-border w-[6px] h-[6px] absolute left-[52px] top-[44px] flex flex-row gap-0 justify-start items-start bg-[#1A1A1A] [z-index:9]"></div>
      <div data-pencil-name="rect" className="box-border w-[6px] h-[6px] absolute left-[52px] top-[60px] flex flex-row gap-0 justify-start items-start bg-[#1A1A1A] [z-index:10]"></div>
      <div data-pencil-name="rect" className="box-border w-[6px] h-[6px] absolute left-[52px] top-[76px] flex flex-row gap-0 justify-start items-start bg-[#1A1A1A] [z-index:11]"></div>
      <div data-pencil-name="rect" className="box-border w-[6px] h-[6px] absolute left-[60px] top-[52px] flex flex-row gap-0 justify-start items-start bg-[#1A1A1A] [z-index:12]"></div>
      <div data-pencil-name="rect" className="box-border w-[6px] h-[6px] absolute left-[60px] top-[68px] flex flex-row gap-0 justify-start items-start bg-[#1A1A1A] [z-index:13]"></div>
      <div data-pencil-name="rect" className="box-border w-[6px] h-[6px] absolute left-[68px] top-[44px] flex flex-row gap-0 justify-start items-start bg-[#1A1A1A] [z-index:14]"></div>
      <div data-pencil-name="rect" className="box-border w-[6px] h-[6px] absolute left-[68px] top-[60px] flex flex-row gap-0 justify-start items-start bg-[#1A1A1A] [z-index:15]"></div>
      <div data-pencil-name="rect" className="box-border w-[6px] h-[6px] absolute left-[68px] top-[76px] flex flex-row gap-0 justify-start items-start bg-[#1A1A1A] [z-index:16]"></div>
      <div data-pencil-name="rect" className="box-border w-[6px] h-[6px] absolute left-[76px] top-[52px] flex flex-row gap-0 justify-start items-start bg-[#1A1A1A] [z-index:17]"></div>
      <div data-pencil-name="rect" className="box-border w-[6px] h-[6px] absolute left-[76px] top-[68px] flex flex-row gap-0 justify-start items-start bg-[#1A1A1A] [z-index:18]"></div>
      <div data-pencil-name="rect" className="box-border w-[6px] h-[6px] absolute left-[84px] top-[44px] flex flex-row gap-0 justify-start items-start bg-[#1A1A1A] [z-index:19]"></div>
      <div data-pencil-name="rect" className="box-border w-[6px] h-[6px] absolute left-[84px] top-[60px] flex flex-row gap-0 justify-start items-start bg-[#1A1A1A] [z-index:20]"></div>
      <div data-pencil-name="rect" className="box-border w-[6px] h-[6px] absolute left-[84px] top-[76px] flex flex-row gap-0 justify-start items-start bg-[#1A1A1A] [z-index:21]"></div>
      <div data-pencil-name="rect" className="box-border w-[4px] h-[4px] absolute left-[92px] top-[92px] flex flex-row gap-0 justify-start items-start bg-[#1A1A1A] [z-index:22]"></div>
      <div data-pencil-name="rect" className="box-border w-[4px] h-[4px] absolute left-[92px] top-[72px] flex flex-row gap-0 justify-start items-start bg-[#1A1A1A] [z-index:23]"></div>
      <div data-pencil-name="rect" className="box-border w-[4px] h-[4px] absolute left-[98px] top-[92px] flex flex-row gap-0 justify-start items-start bg-[#1A1A1A] [z-index:24]"></div>
      <div data-pencil-name="rect" className="box-border w-[4px] h-[4px] absolute left-[92px] top-[78px] flex flex-row gap-0 justify-start items-start bg-[#1A1A1A] [z-index:25]"></div>
      <div data-pencil-name="rect" className="box-border w-[4px] h-[4px] absolute left-[104px] top-[92px] flex flex-row gap-0 justify-start items-start bg-[#1A1A1A] [z-index:26]"></div>
      <div data-pencil-name="rect" className="box-border w-[4px] h-[4px] absolute left-[92px] top-[84px] flex flex-row gap-0 justify-start items-start bg-[#1A1A1A] [z-index:27]"></div>
      <div data-pencil-name="rect" className="box-border w-[4px] h-[4px] absolute left-[110px] top-[92px] flex flex-row gap-0 justify-start items-start bg-[#1A1A1A] [z-index:28]"></div>
      <div data-pencil-name="rect" className="box-border w-[4px] h-[4px] absolute left-[92px] top-[90px] flex flex-row gap-0 justify-start items-start bg-[#1A1A1A] [z-index:29]"></div>
    </>
  );

  const handleQrPointerDown = (e: React.PointerEvent) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      setMenuPos({ x: e.clientX, y: e.clientY });
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
    const link = document.createElement('a');
    link.download = '班级二维码.png';
    link.href = displayed.qrCodeUrl;
    link.click();
    setSaveMenuOpen(false);
  };

  const handleJoin = async () => {
    if (!/^\d{6}$/.test(classCode)) {
      toast.error('请输入 6 位班级邀请码');
      return;
    }
    if (alreadyMember) {
      toast.info('已是该班级成员');
      return;
    }
    if (joinLoading) return;
    setJoinLoading(true);
    try {
      const payload: { code: string; studentId?: string } = { code: classCode };
      if (studentId.trim()) {
        payload.studentId = studentId.trim();
      }
      const res = await api.post('/classes/join', payload);
      const data = res.data.data || res.data;
      toast.success(`成功加入班级：${data.name || data.className || ''}`);
      navigate('/home', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '加入班级失败，请检查邀请码');
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
      });
      const data = res.data.data || res.data;
      setCreatedClass(data);
      setCreateModalOpen(false);
      toast.success(`${ORG_TYPE_LABEL[createOrgType]}创建成功`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `创建${ORG_TYPE_LABEL[createOrgType]}失败，请稍后重试`);
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <PhoneFrame className="bg-white">
      <div
            data-pencil-name="Status Bar"
            className="box-border w-full h-[62px] shrink-0 flex flex-row gap-0 p-[12px_24px_0px_24px] justify-between items-center bg-[#FFFFFF]"
          >
            <div
              data-pencil-name="Time"
              className="text-[14px]/[normal] box-border text-[#1A1A1A] font-data font-semibold text-left [white-space:nowrap]"
            >
              9:41
            </div>
            <div
              data-pencil-name="Status Icons"
              className="box-border w-fit shrink-0 h-fit flex flex-row gap-[6px] justify-start items-center"
            >
              <div
                data-pencil-name="Signal"
                className="text-[14px]/[normal] box-border text-[#1A1A1A] font-caption font-normal text-left [white-space:nowrap]"
              >
                ◉◉◉◉
              </div>
              <div
                data-pencil-name="Battery"
                className="text-[14px]/[normal] box-border text-[#1A1A1A] font-data font-normal text-left [white-space:nowrap]"
              >
                100%
              </div>
            </div>
          </div>
          <div
            data-pencil-name="Content"
            className="box-border relative w-full [flex:1_1_0] flex flex-col gap-4 p-[0px_24px] justify-start items-start"
          >
            <BackButton
              className="absolute left-[-8px] top-[16px] z-10"
              onClick={() => navigate(-1)}
            />
            <div
              data-pencil-name="Spacer"
              className="box-border w-full h-[60px] shrink-0 flex flex-row gap-0 justify-start items-start"
            ></div>
            <div
              data-pencil-name="Title"
              className="text-[28px]/[normal] box-border text-[#1A1A1A] font-heading font-bold text-left [white-space:nowrap]"
            >
              加入或创建班级
            </div>
            <div
              data-pencil-name="Subtitle"
              className="text-[14px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap]"
            >
              输入班级码加入，或创建新班级
            </div>
            <div
              data-pencil-name="Spacer2"
              className="box-border w-full h-[32px] shrink-0 flex flex-row gap-0 justify-start items-start"
            ></div>
            <input
              data-pencil-name="Class Code Input"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={classCode}
              onChange={(e) => setClassCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="请输入 6 位班级邀请码"
              className="box-border w-full h-[56px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-2 p-[0px_16px] justify-center items-start bg-[#FFFFFF] [border:1px_solid_#E5E7EB] rounded-lg text-[14px] font-body text-[#1A1A1A] placeholder:text-[#9CA3AF] outline-none"
            />
            <input
              data-pencil-name="Student ID Input"
              type="text"
              maxLength={20}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value.slice(0, 20))}
              placeholder="学号（如班级已导入名单请填写）"
              className="box-border w-full h-[56px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-2 p-[0px_16px] justify-center items-start bg-[#FFFFFF] [border:1px_solid_#E5E7EB] rounded-lg text-[14px] font-body text-[#1A1A1A] placeholder:text-[#9CA3AF] outline-none"
            />
            {alreadyMember && (
              <div
                data-pencil-name="Member Hint"
                className="box-border w-full flex flex-row gap-2 justify-start items-center text-[13px]/[normal] text-[#0062FF] font-body font-medium"
              >
                <span>已是该班级成员</span>
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
                  {createdClass ? '创建成功，分享班级邀请' : '已加入班级'}
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
                    qrNodes
                  )}
                </div>
                <div
                  data-pencil-name="QR Hint"
                  className="text-[11px]/[normal] box-border text-[#4B5563] font-caption font-normal text-left [white-space:nowrap]"
                >
                  扫描二维码加入班级
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
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-6"
          onClick={() => setQrModalOpen(false)}
        >
          <div
            className="box-border w-[240px] h-[240px] shrink-0 bg-[#FFFFFF] [border:1px_solid_#E5E7EB] rounded-lg relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={handleQrPointerDown}
            onPointerUp={handleQrPointerUp}
            onPointerLeave={handleQrPointerUp}
            onContextMenu={(e) => e.preventDefault()}
          >
            {displayed.qrCodeUrl ? (
              <img src={displayed.qrCodeUrl} alt="班级二维码" className="w-full h-full object-contain" />
            ) : (
              qrNodes
            )}
          </div>
        </div>
      )}

      {/* 长按保存菜单 */}
      {saveMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-[101]"
            onClick={() => setSaveMenuOpen(false)}
          />
          <div
            className="fixed z-[102] box-border min-w-[120px] flex flex-col gap-0 p-[8px_0px] justify-start items-start bg-[#FFFFFF] rounded-lg shadow-lg"
            style={{ left: menuPos.x, top: menuPos.y }}
          >
            <button
              type="button"
              onClick={saveQrImage}
              className="w-full px-4 py-2 text-left text-[14px] font-body text-[#1A1A1A] hover:bg-[#F3F4F6]"
            >
              保存图片
            </button>
          </div>
        </>
      )}

      {/* 创建班级弹窗 */}
      {createModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-6"
          onClick={() => setCreateModalOpen(false)}
        >
          <div
            className="box-border w-full max-w-[320px] flex flex-col gap-4 p-[24px] justify-start items-start bg-[#FFFFFF] rounded-2xl shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[18px] font-heading font-bold text-[#1A1A1A]">创建新组织</div>
            {/* 组织类型选择 */}
            <div className="grid w-full grid-cols-4 gap-2">
              {ORG_TYPES.map((t) => {
                const Icon = ORG_TYPE_ICON[t];
                const active = createOrgType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCreateOrgType(t)}
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
              className="box-border w-full h-[48px] px-4 rounded-lg border-[1px_solid_#E5E7EB] bg-[#FFFFFF] text-[14px] font-body text-[#1A1A1A] placeholder:text-[#9CA3AF] outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <div className="flex w-full gap-3">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="flex-1 h-[44px] rounded-lg border-[1px_solid_#E5E7EB] bg-[#FFFFFF] text-[14px] font-body font-semibold text-[#4B5563]"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={createLoading}
                className={`flex-1 h-[44px] rounded-lg text-[14px] font-body font-semibold text-[#FFFFFF] ${
                  createLoading ? 'bg-[#93C5FD]' : 'bg-[#0062FF]'
                }`}
              >
                {createLoading ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PhoneFrame>
  );
}
