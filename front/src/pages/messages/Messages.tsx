import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import {
  Bell,
  Calendar,
  CalendarCheck,
  CircleCheck,
  FileText,
  Ticket,
  Wallet,
} from 'lucide-react';
import { useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface NoticeCardProps {
  icon: React.ReactNode;
  title: string;
  meta: string;
  unread?: boolean;
  onClick: () => void;
}

function NoticeCard({ icon, title, meta, unread, onClick }: NoticeCardProps) {
  return (
    <div
      data-pencil-name="Notice Card"
      className="box-border w-full h-[76px] shrink-0 flex flex-row gap-[12px] p-[0px_14px] justify-start items-center bg-[#FFFFFF] [border:1px_solid_#E5E7EB] [box-shadow:0px_2px_8px_0px_#0000000D] rounded-[16px] cursor-pointer active:opacity-80"
      onClick={onClick}
    >
      <div className="box-border w-[40px] shrink-0 h-[40px] flex flex-row gap-0 justify-center items-center bg-[#2563EB] rounded-[10px]">
        {icon}
      </div>
      <div className="box-border flex-1 min-w-0 flex flex-col gap-[3px] justify-center items-start">
        <div className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left truncate w-full">
          {title}
        </div>
        <div className="text-[11px]/[normal] box-border text-[#4B5563] font-caption font-normal text-left truncate w-full">
          {meta}
        </div>
      </div>
      {unread && (
        <div className="box-border w-[8px] shrink-0 h-[8px] flex flex-row gap-0 justify-start items-start bg-[#EF4444] rounded-full" />
      )}
    </div>
  );
}

interface MessageCardProps {
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  desc: string;
  time: string;
  unread?: boolean;
  onClick: () => void;
}

function MessageCard({ icon, iconBg, iconColor, title, desc, time, unread, onClick }: MessageCardProps) {
  return (
    <div
      className="box-border w-full h-[76px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-[12px] p-[12px] justify-start items-center bg-[#FFFFFF] [border:1px_solid_#E5E7EB] rounded-[16px] cursor-pointer active:opacity-80"
      onClick={onClick}
    >
      <div className={`box-border w-[44px] shrink-0 h-[44px] flex flex-col gap-0 justify-center items-center ${iconBg} rounded-lg`}>
        <div className={iconColor}>{icon}</div>
      </div>
      <div className="box-border flex-1 min-w-0 flex flex-col gap-[4px] justify-center items-start bg-[#00000000]">
        <div className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left truncate w-full">
          {title}
        </div>
        <div className="text-[12px]/[normal] box-border text-[#4B5563] font-body font-medium text-left truncate w-full">
          {desc}
        </div>
      </div>
      <div className="box-border shrink-0 flex flex-col gap-[4px] justify-center items-end bg-[#00000000]">
        <div className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]">
          {time}
        </div>
        <div
          className={`box-border w-[8px] h-[8px] rounded-full ${unread ? 'bg-[#EF4444]' : 'bg-[#00000000]'}`}
        ></div>
      </div>
    </div>
  );
}

interface MessageItem {
  id: string;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  requireAck: boolean;
  status: string;
  createdAt: string;
  publisher?: { id: string; name: string; avatar?: string };
}

function formatTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return minutes + '分钟前';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + '小时前';
  const days = Math.floor(hours / 24);
  if (days < 7) return days + '天前';
  return (date.getMonth() + 1) + '月' + date.getDate() + '日';
}

const noticeIconMap: Record<string, React.ReactNode> = {
  notice: <Bell className="w-[24px] h-[24px] text-[#FFFFFF]" strokeWidth={2} />,
  homework: <FileText className="w-[24px] h-[24px] text-[#FFFFFF]" strokeWidth={2} />,
  activity: <Calendar className="w-[24px] h-[24px] text-[#FFFFFF]" strokeWidth={2} />,
};

const interactionIconMap: Record<string, React.ReactNode> = {
  homework: <FileText className="w-[24px] h-[24px]" strokeWidth={2} />,
  activity: <CalendarCheck className="w-[24px] h-[24px]" strokeWidth={2} />,
  vote: <CircleCheck className="w-[24px] h-[24px]" strokeWidth={2} />,
  random_draw: <Ticket className="w-[24px] h-[24px]" strokeWidth={2} />,
  fee: <Wallet className="w-[24px] h-[24px]" strokeWidth={2} />,
};

const interactionBgMap: Record<string, string> = {
  homework: 'bg-[#DBEAFE]',
  activity: 'bg-[#DCFCE7]',
  vote: 'bg-[#FEF3C7]',
  random_draw: 'bg-[#F3E8FF]',
  fee: 'bg-[#DCFCE7]',
};

const interactionColorMap: Record<string, string> = {
  homework: 'text-[#1986E6]',
  activity: 'text-[#22C55E]',
  vote: 'text-[#F59E0B]',
  random_draw: 'text-[#A855F7]',
  fee: 'text-[#22C55E]',
};

export default function Messages() {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<'通知' | '互动'>('通知');
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);

  const classId = user?.classId;

  useEffect(() => {
    // 等待用户数据加载完成
    if (userLoading) return;
    
    const fetchMessages = async () => {
      if (!classId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await api.get(`/classes/${classId}/messages?pageSize=100`);
        const data = res.data.data || res.data;
        setMessages(data.list || []);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '获取消息列表失败');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [classId, userLoading]);

  // 通知Tab：type === 'notice'
  const noticeMessages = messages.filter((m) => m.type === 'notice');
  // 互动Tab：type !== 'notice'
  const interactionMessages = messages.filter((m) => m.type !== 'notice');

  return (
    <PhoneFrame className="bg-white">
      <div className="flex w-full flex-1 flex-col items-center">
        {/* Status Bar */}
        <div
          data-pencil-name="Status Bar"
          className="box-border w-full h-[62px] shrink-0 flex flex-row gap-[40px] p-[12px_24px_0px_24px] justify-between items-center bg-[#FFFFFF]"
        >
          <div className="text-[14px]/[normal] box-border text-[#1A1A1A] font-data font-semibold text-left [white-space:nowrap]">
            9:41
          </div>
          <div className="box-border w-fit shrink-0 h-fit flex flex-row gap-[6px] justify-start items-center">
            <div className="text-[14px]/[normal] box-border text-[#1A1A1A] font-caption font-normal text-left [white-space:nowrap]">
              ◉◉◉
            </div>
            <div className="text-[14px]/[normal] box-border text-[#1A1A1A] font-data font-normal text-left [white-space:nowrap]">
              100%
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="box-border w-full flex-1 flex flex-col gap-4 p-[0px_20px] justify-start items-start relative">
          <div className="box-border w-full h-[20px] shrink-0 flex flex-row gap-0 justify-start items-start relative [z-index:0]" />
          <div className="relative w-full">
            <BackButton className="absolute left-0 top-0 z-10" />
            <div
              data-pencil-name="Title"
              className="text-[28px]/[normal] box-border text-[#1A1A1A] font-heading font-bold text-left [white-space:nowrap] relative [z-index:1] pl-10"
            >
              通知
            </div>
          </div>
          <div
            data-pencil-name="Tabs"
            className="box-border w-full h-[40px] shrink-0 shadow-soft flex flex-row gap-0 p-[2px] justify-start items-start bg-[#FFFFFF] border border-border rounded-full relative [z-index:2]"
          >
            <div
              data-pencil-name="Tab 通知"
              className={`box-border [flex:1_1_0] h-full flex flex-col gap-0 justify-center items-center rounded-full cursor-pointer active:opacity-80 ${activeTab === '通知' ? 'bg-[#0062FF]' : 'bg-[#F3F4F6]'}`}
              onClick={() => setActiveTab('通知')}
            >
              <div className={`text-[14px]/[normal] box-border font-body font-medium text-left [white-space:nowrap] ${activeTab === '通知' ? 'text-[#FFFFFF]' : 'text-[#4B5563]'}`}>
                通知
              </div>
            </div>
            <div
              data-pencil-name="Tab 互动"
              className={`box-border [flex:1_1_0] h-full flex flex-col gap-0 justify-center items-center rounded-full cursor-pointer active:opacity-80 ${activeTab === '互动' ? 'bg-[#0062FF]' : 'bg-[#F3F4F6]'}`}
              onClick={() => setActiveTab('互动')}
            >
              <div className={`text-[14px]/[normal] box-border font-body font-medium text-left [white-space:nowrap] ${activeTab === '互动' ? 'text-[#FFFFFF]' : 'text-[#4B5563]'}`}>
                互动
              </div>
            </div>
          </div>

          {activeTab === '通知' ? (
            <div
              data-pencil-name="Notice List"
              className="box-border w-full h-fit shrink-0 flex flex-col gap-[10px] justify-start items-start relative [z-index:3]"
            >
              {loading ? (
                <div className="w-full py-10 text-center text-[14px] text-[#4B5563]">加载中...</div>
              ) : noticeMessages.length === 0 ? (
                <div className="w-full py-10 text-center text-[14px] text-[#4B5563]">暂无通知</div>
              ) : (
                noticeMessages.map((item) => {
                  const icon = noticeIconMap[item.type] || (
                    <Bell className="w-[24px] h-[24px] text-[#FFFFFF]" strokeWidth={2} />
                  );
                  const publisherName = item.publisher?.name || '未知';
                  const ackLabel = item.requireAck
                    ? item.isRead
                      ? '已确认'
                      : '待确认'
                    : item.isRead
                      ? '已读'
                      : '未读';
                  const timeStr = formatTime(item.createdAt);
                  return (
                    <NoticeCard
                      key={item.id}
                      icon={icon}
                      title={item.title}
                      meta={`${timeStr} · ${ackLabel} · ${publisherName}`}
                      unread={!item.isRead}
                      onClick={() => navigate(`/message-detail/${item.id}`)}
                    />
                  );
                })
              )}
            </div>
          ) : (
            <div
              data-pencil-name="Interaction List"
              className="box-border w-full h-fit shrink-0 flex flex-col gap-[10px] justify-start items-start relative [z-index:3]"
            >
              {loading ? (
                <div className="w-full py-10 text-center text-[14px] text-[#4B5563]">加载中...</div>
              ) : interactionMessages.length === 0 ? (
                <div className="w-full py-10 text-center text-[14px] text-[#4B5563]">暂无互动消息</div>
              ) : (
                interactionMessages.map((item) => {
                  const icon = interactionIconMap[item.type] || (
                    <CircleCheck className="w-[24px] h-[24px]" strokeWidth={2} />
                  );
                  const bg = interactionBgMap[item.type] || 'bg-[#F3F4F6]';
                  const color = interactionColorMap[item.type] || 'text-[#4B5563]';
                  const typeLabelMap: Record<string, string> = {
                    homework: '作业',
                    activity: '活动',
                    vote: '投票',
                    random_draw: '抽签',
                    fee: '班费',
                  };
                  const typeLabel = typeLabelMap[item.type] || '消息';
                  const timeStr = formatTime(item.createdAt);
                  return (
                    <MessageCard
                      key={item.id}
                      iconBg={bg}
                      iconColor={color}
                      title={item.title}
                      desc={`${typeLabel} · ${item.status === 'ended' ? '已结束' : '进行中'}`}
                      time={timeStr}
                      unread={!item.isRead}
                      onClick={() => navigate(`/message-detail/${item.id}`)}
                      icon={icon}
                    />
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}
