import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import { CalendarCheck, CircleCheck, FileText, Ticket, Wallet } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';
import { toast } from 'sonner';

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

const iconMap: Record<string, ReactNode> = {
  homework: <FileText className="w-[24px] h-[24px]" strokeWidth={2} />,
  activity: <CalendarCheck className="w-[24px] h-[24px]" strokeWidth={2} />,
  vote: <CircleCheck className="w-[24px] h-[24px]" strokeWidth={2} />,
  random_draw: <Ticket className="w-[24px] h-[24px]" strokeWidth={2} />,
  fee: <Wallet className="w-[24px] h-[24px]" strokeWidth={2} />,
};

const bgMap: Record<string, string> = {
  homework: 'bg-[#DBEAFE]',
  activity: 'bg-[#DCFCE7]',
  vote: 'bg-[#FEF3C7]',
  random_draw: 'bg-[#F3E8FF]',
  fee: 'bg-[#DCFCE7]',
};

const colorMap: Record<string, string> = {
  homework: 'text-[#1986E6]',
  activity: 'text-[#22C55E]',
  vote: 'text-[#F59E0B]',
  random_draw: 'text-[#A855F7]',
  fee: 'text-[#22C55E]',
};

const typeLabelMap: Record<string, string> = {
  homework: '作业',
  activity: '活动',
  vote: '投票',
  random_draw: '抽签',
  fee: '班费',
};

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

export default function InteractionMessages() {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useCurrentUser();
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
        const allMessages = data.list || [];
        // 过滤出互动类型的消息（非通知类型）
        const interactionMessages = allMessages.filter((m: MessageItem) => m.type !== 'notice');
        setMessages(interactionMessages);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '获取互动消息失败');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [classId, userLoading]);

  return (
    <PhoneFrame>
      <div
        data-pencil-name="Unified Header"
        className="box-border w-full h-[216px] shrink-0 flex flex-col gap-0 justify-start items-start [background-image:linear-gradient(180deg,_#0062FF_0%,_#004ECC_100%)] bg-no-repeat bg-[length:100%_100%] rounded-[0px_0px_24px_24px]"
      >
        <div
          data-pencil-name="Status Bar"
          className="box-border w-full h-[62px] shrink-0 flex flex-row gap-0 p-[12px_24px_0px_24px] justify-between items-center bg-[#00000000]"
        >
          <div className="text-[14px]/[normal] box-border text-[#FFFFFF] font-data font-semibold text-left [white-space:nowrap]">
            9:41
          </div>
          <div className="box-border w-fit shrink-0 h-fit flex flex-row gap-[6px] justify-start items-center bg-[#00000000]">
            <div className="text-[14px]/[normal] box-border text-[#FFFFFF] font-caption font-medium text-left [white-space:nowrap]">
              OOOO
            </div>
            <div className="text-[14px]/[normal] box-border text-[#FFFFFF] font-data font-medium text-left [white-space:nowrap]">
              100%
            </div>
          </div>
        </div>
        <div
          data-pencil-name="Header"
          className="box-border w-full h-[154px] shrink-0 flex flex-col gap-[12px] p-[20px] justify-start items-start bg-[#00000000] relative"
        >
          <BackButton variant="dark" className="absolute left-[16px] top-[0px] z-10" />
          <div className="h-8 w-10" />
          <div className="text-[28px]/[normal] box-border text-[#FFFFFF] font-heading font-bold text-left [white-space:nowrap] relative [z-index:0]">
            互动消息
          </div>
          <div
            data-pencil-name="Decor Icon"
            className="box-border w-[120px] h-[120px] opacity-[0.12] absolute left-[265px] top-[80px] flex flex-col gap-0 justify-center items-center bg-[#00000000] [z-index:1]"
          >
            <svg
              data-pencil-name="Icon-message-circle"
              viewBox="0 0 24 24"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
              className="box-border w-[112px] h-[112px] shrink-0 overflow-visible"
            >
              <path
                d="M21 11.5a8.38 8.38 0 0 1-0.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-0.9l-5.7 1.9 1.9-5.7a8.38 8.38 0 0 1-0.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-0.9h0.5a8.48 8.48 0 0 1 8 8v0.5"
                fill="none"
              ></path>
              <path
                d="M21 11.5a8.38 8.38 0 0 1-0.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-0.9l-5.7 1.9 1.9-5.7a8.38 8.38 0 0 1-0.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-0.9h0.5a8.48 8.48 0 0 1 8 8v0.5"
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
        className="box-border w-full [flex:1_1_0] flex flex-col gap-0 justify-start items-start overflow-y-auto overscroll-y-contain [webkit-overflow-scrolling:touch] min-h-0 bg-[#FFFFFF]"
      >
        <div
          data-pencil-name="Body"
          className="box-border w-full flex flex-col gap-[20px] p-[16px_20px_96px_20px] justify-start items-start bg-[#FFFFFF]"
        >
          <div
            data-pencil-name="Filter Tabs"
            className="box-border w-full h-fit shrink-0 flex flex-row gap-2 justify-center items-start bg-[#00000000]"
          >
            <button
              type="button"
              data-pencil-name="Tab 通知"
              className="box-border w-fit shrink-0 h-[32px] flex flex-col gap-0 p-[8px_16px] justify-center items-center bg-[#0062FF] rounded-full transition-opacity active:opacity-80"
            >
              <div className="text-[11px]/[normal] box-border text-[#FFFFFF] font-body font-semibold text-left [white-space:nowrap]">
                通知
              </div>
            </button>
            <button
              type="button"
              data-pencil-name="Tab 作业"
              className="box-border w-fit shrink-0 h-[32px] flex flex-col gap-0 p-[8px_16px] justify-center items-center bg-[#F3F4F6] rounded-full transition-opacity active:opacity-80"
              onClick={() => navigate('/homework-list')}
            >
              <div className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-semibold text-left [white-space:nowrap]">
                作业
              </div>
            </button>
            <button
              type="button"
              data-pencil-name="Tab 活动"
              className="box-border w-fit shrink-0 h-[32px] flex flex-col gap-0 p-[8px_16px] justify-center items-center bg-[#F3F4F6] rounded-full transition-opacity active:opacity-80"
              onClick={() => navigate('/activity-list')}
            >
              <div className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-semibold text-left [white-space:nowrap]">
                活动
              </div>
            </button>
          </div>

          <div
            data-pencil-name="Group 消息列表"
            className="box-border w-full h-fit shrink-0 flex flex-col gap-2 justify-start items-start bg-[#00000000]"
          >
            {loading ? (
              <div className="w-full py-10 text-center text-[14px] text-[#4B5563]">加载中...</div>
            ) : messages.length === 0 ? (
              <div className="w-full py-10 text-center text-[14px] text-[#4B5563]">暂无互动消息</div>
            ) : (
              messages.map((item) => {
                const icon = iconMap[item.type] || <CircleCheck className="w-[24px] h-[24px]" strokeWidth={2} />;
                const bg = bgMap[item.type] || 'bg-[#F3F4F6]';
                const color = colorMap[item.type] || 'text-[#4B5563]';
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
        </div>
      </div>
    </PhoneFrame>
  );
}
