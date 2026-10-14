import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { isOwner, ROLE_LABEL } from '@/utils/role';

interface Member {
  id: string;
  userId: string;
  name: string;
  avatar?: string;
  studentId?: string;
  phone: string;
  role: string;
  roleLevel: 'owner' | 'admin' | 'member';
  isCommittee: boolean;
  joinedAt: string;
}

const LEVEL_BADGE: Record<Member['roleLevel'], string> = {
  owner: 'bg-[#0062FF] text-white',
  admin: 'bg-[#10B981] text-white',
  member: 'bg-[#F3F4F6] text-[#4B5563]',
};

export default function MemberList() {
  const { user } = useCurrentUser();
  const classId = user?.classId;
  const isOwnerRole = isOwner(user?.roleLevel);

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMembers = async () => {
    if (!classId) return;
    setLoading(true);
    try {
      const res = await api.get(`/classes/${classId}/members`, {
        params: { pageSize: 200 },
      });
      const list = res.data?.data?.list || [];
      setMembers(list);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '获取成员列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [classId]);

  const { total, adminCount, memberCount } = useMemo(() => {
    const total = members.length;
    const adminCount = members.filter(
      (m) => m.roleLevel === 'owner' || m.roleLevel === 'admin',
    ).length;
    return { total, adminCount, memberCount: total - adminCount };
  }, [members]);

  const setRoleLevel = async (
    targetUserId: string,
    roleLevel: 'admin' | 'member',
    role?: string,
  ) => {
    if (!classId) return;
    try {
      await api.post(`/classes/${classId}/members/${targetUserId}/role-level`, {
        roleLevel,
        role,
      });
      toast.success(roleLevel === 'admin' ? '已设为管理员' : '已设为普通成员');
      fetchMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败');
    }
  };

  const transferOwner = async (newOwnerUserId: string) => {
    if (!classId) return;
    try {
      await api.post(`/classes/${classId}/transfer-owner`, {
        newOwnerUserId,
      });
      toast.success('群主转让成功');
      fetchMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '转让失败');
    }
  };

  return (
    <PhoneFrame>
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
        className="box-border w-full [flex:1_1_0] flex flex-col gap-4 p-[0px_20px] justify-start items-start overflow-y-auto"
      >
        <div
          data-pencil-name="Spacer"
          className="box-border w-full h-[20px] shrink-0 flex flex-row gap-0 justify-start items-start"
        ></div>
        <div
          data-pencil-name="Header"
          className="box-border w-full h-fit shrink-0 flex flex-row gap-0 justify-between items-center"
        >
          <div className="flex flex-row items-center gap-0">
            <BackButton className="-ml-2" />
            <div
              data-pencil-name="Title"
              className="text-[20px]/[normal] box-border text-[#1A1A1A] font-heading font-bold text-left [white-space:nowrap]"
            >
              班级成员
            </div>
          </div>
          <div className="box-border w-[40px] shrink-0 h-[40px]" />
        </div>
        <div
          data-pencil-name="Stats"
          className="box-border w-full h-fit shrink-0 flex flex-row gap-[10px] justify-start items-start"
        >
          <div className="box-border [flex:1_1_0] h-[70px] [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-[4px] justify-center items-center bg-[#FFFFFF] rounded-lg">
            <div className="text-[16px]/[normal] box-border text-[#1A1A1A] font-heading font-bold text-left [white-space:nowrap]">
              {total}
            </div>
            <div className="text-[11px]/[normal] box-border text-[#4B5563] font-caption font-normal text-left [white-space:nowrap]">
              总人数
            </div>
          </div>
          <div className="box-border [flex:1_1_0] h-[70px] [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-[4px] justify-center items-center bg-[#FFFFFF] rounded-lg">
            <div className="text-[16px]/[normal] box-border text-[#1A1A1A] font-heading font-bold text-left [white-space:nowrap]">
              {adminCount}
            </div>
            <div className="text-[11px]/[normal] box-border text-[#4B5563] font-caption font-normal text-left [white-space:nowrap]">
              管理员
            </div>
          </div>
          <div className="box-border [flex:1_1_0] h-[70px] [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-[4px] justify-center items-center bg-[#FFFFFF] rounded-lg">
            <div className="text-[16px]/[normal] box-border text-[#1A1A1A] font-heading font-bold text-left [white-space:nowrap]">
              {memberCount}
            </div>
            <div className="text-[11px]/[normal] box-border text-[#4B5563] font-caption font-normal text-left [white-space:nowrap]">
              普通成员
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-[14px] text-[#4B5563] font-body">加载中...</div>
        )}

        {!classId && !loading && (
          <div className="text-[14px] text-[#4B5563] font-body">
            你还没有加入班级
          </div>
        )}

        <div
          data-pencil-name="Member List"
          className="box-border w-full h-fit shrink-0 flex flex-col gap-2 justify-start items-start"
        >
          {members.map((member) => (
            <div
              key={member.id}
              data-pencil-name="Member Item"
              className="box-border w-full h-fit min-h-[60px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-[12px] p-[10px_14px] justify-start items-center bg-[#FFFFFF] rounded-lg"
            >
              <div
                data-pencil-name="Avatar"
                className="box-border w-[36px] shrink-0 h-[36px] opacity-[0.3] [box-shadow:0px_2px_6px_0px_#0000000D] flex flex-row gap-0 justify-start items-start bg-[#0062FF] rounded-lg"
              ></div>
              <div
                data-pencil-name="Text"
                className="box-border [flex:1_1_0] h-fit flex flex-col gap-[2px] justify-start items-start"
              >
                <div className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-medium text-left [white-space:nowrap]">
                  {member.name}
                </div>
                <div className="flex flex-row gap-2 items-center">
                  <span
                    className={`text-[10px] px-2 py-[2px] rounded-full ${LEVEL_BADGE[member.roleLevel]}`}
                  >
                    {ROLE_LABEL[member.roleLevel]}
                  </span>
                  <span className="text-[11px]/[normal] box-border text-[#4B5563] font-caption font-normal text-left [white-space:nowrap]">
                    {member.role}
                  </span>
                </div>
              </div>
              {isOwnerRole && member.roleLevel !== 'owner' && (
                <div className="flex flex-row gap-2">
                  {member.roleLevel === 'member' ? (
                    <button
                      type="button"
                      onClick={() =>
                        setRoleLevel(member.userId, 'admin', '管理员')
                      }
                      className="text-[12px] px-2 py-1 rounded bg-[#0062FF] text-white"
                    >
                      设为管理员
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRoleLevel(member.userId, 'member')}
                      className="text-[12px] px-2 py-1 rounded bg-[#F3F4F6] text-[#4B5563]"
                    >
                      取消管理员
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => transferOwner(member.userId)}
                    className="text-[12px] px-2 py-1 rounded bg-[#F59E0B] text-white"
                  >
                    转让群主
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
}
