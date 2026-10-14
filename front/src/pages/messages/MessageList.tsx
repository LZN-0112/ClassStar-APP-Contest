import { useEffect, useState } from 'react';
import PhoneFrame from '@/components/layout/PhoneFrame';
import BackButton from '@/components/navigation/BackButton';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Bell,
  BookOpen,
  Flag,
  FileText,
} from 'lucide-react';

interface MessageItem {
  id: string;
  type: string;
  title: string;
  content: string;
  location?: string;
  eventTime?: string;
  isRead: boolean;
  requireAck: boolean;
  status: 'published' | 'ended';
  createdAt: string;
  publisher?: { id: string; name: string; avatar?: string };
}

const typeIconMap: Record<string, React.ReactNode> = {
  notice: <Bell className="w-[24px] h-[24px] text-[#FFFFFF]" strokeWidth={2} />,
  homework: <FileText className="w-[24px] h-[24px] text-[#FFFFFF]" strokeWidth={2} />,
  activity: <Flag className="w-[24px] h-[24px] text-[#FFFFFF]" strokeWidth={2} />,
};

const typeLabelMap: Record<string, string> = {
  notice: '通知',
  homework: '学业',
  activity: '活动',
};

const statusLabelMap: Record<string, string> = {
  published: '进行中',
  ended: '已结束',
};

const iconBgMap: Record<string, string> = {
  notice: 'bg-[#0062FF]',
  homework: 'bg-[#22C55E]',
  activity: 'bg-[#F59E0B]',
};

function formatTime(iso?: string) {
  if (!iso) return '';
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

export default function MessageList() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);

  const classId = user?.classId;

  useEffect(() => {
    const fetchMessages = async () => {
      if (!classId) return;
      setLoading(true);
      try {
        const res = await api.get('/classes/' + classId + '/messages?pageSize=100');
        const data = res.data.data || res.data;
        setMessages(data.list || []);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '获取通知列表失败');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [classId]);

  const handleItemClick = (item: MessageItem) => {
    navigate('/message-detail/' + item.id);
  };

  return (
    <PhoneFrame>
      <div className="flex h-full w-full flex-1 flex-col items-center bg-[#FFFFFF]">
        <div
          data-pencil-name="Content"
          className="box-border w-full flex-1 flex flex-col gap-4 p-[0px_20px] justify-start items-start overflow-y-auto"
        >
          <div
            data-pencil-name="Spacer"
            className="box-border w-full h-[20px] shrink-0 flex flex-row gap-0 justify-start items-start"
          ></div>
          <div
            data-pencil-name="Header"
            className="box-border w-full h-fit shrink-0 flex flex-row gap-0 justify-between items-start"
          >
            <div className="relative flex-1">
              <BackButton className="absolute left-0 top-0 z-10" />
              <div
                data-pencil-name="Title"
                className="text-[28px]/[normal] box-border text-[#1A1A1A] font-heading font-bold text-left [white-space:nowrap] pl-10"
              >
                通知
              </div>
            </div>
            <button
              type="button"
              data-pencil-name="Publish"
              onClick={() => navigate('/publish-message')}
              className="box-border h-[32px] shrink-0 flex flex-row gap-1 px-3 justify-center items-center bg-[#0062FF] rounded-full active:opacity-80"
            >
              <div className="text-[13px]/[normal] box-border text-[#FFFFFF] font-body font-medium text-left [white-space:nowrap]">
                发布通知
              </div>
            </button>
          </div>
          <div
            data-pencil-name="List"
            className="box-border w-full h-fit shrink-0 flex flex-col gap-[10px] justify-start items-start"
          >
            {loading ? (
              <div className="w-full py-10 text-center text-[14px] text-[#4B5563]">
                加载中...
              </div>
            ) : messages.length === 0 ? (
              <div className="w-full py-10 text-center text-[14px] text-[#4B5563]">
                暂无通知
              </div>
            ) : (
              messages.map((item) => {
                const icon = typeIconMap[item.type] || (
                  <BookOpen className="w-[24px] h-[24px] text-[#FFFFFF]" strokeWidth={2} />
                );
                const label = typeLabelMap[item.type] || '通知';
                const bgClass = iconBgMap[item.type] || 'bg-[#0062FF]';
                return (
                  <div
                    key={item.id}
                    data-pencil-name={item.title}
                    className="box-border w-full h-[80px] shrink-0 flex flex-row gap-[12px] p-[0px_14px] justify-start items-center bg-[#FFFFFF] [border:1px_solid_#E5E7EB] rounded-lg cursor-pointer active:opacity-80"
                    onClick={() => handleItemClick(item)}
                  >
                    <div
                      className={'box-border w-[40px] shrink-0 h-[40px] flex flex-row gap-0 justify-center items-center ' + bgClass + ' rounded-[10px]'}
                    >
                      {icon}
                    </div>
                    <div
                      data-pencil-name="Text"
                      className="box-border [flex:1_1_0] min-w-0 h-fit flex flex-col gap-[3px] justify-start items-start"
                    >
                      <div className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-medium text-left truncate w-full">
                        {item.title}
                      </div>
                      <div
                        data-pencil-name="Meta"
                        className="text-[11px]/[normal] box-border text-[#4B5563] font-caption font-normal text-left truncate w-full"
                      >
                        {formatTime(item.createdAt)} · {label} · {statusLabelMap[item.status] || '进行中'}
                      </div>
                    </div>
                    {!item.isRead && (
                      <div
                        data-pencil-name="Unread Dot"
                        className="box-border w-[8px] shrink-0 h-[8px] flex flex-row gap-0 justify-start items-start bg-[#EF4444] rounded-full"
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}
