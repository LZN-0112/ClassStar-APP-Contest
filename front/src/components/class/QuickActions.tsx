import { Share2, Settings, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface QuickActionsProps {
  classId: string;
  onExit?: () => void;
}

export default function QuickActions({ classId, onExit }: QuickActionsProps) {
  const navigate = useNavigate();

  const handleShare = async () => {
    try {
      const shareText = `邀请你加入班级！班级码：${classId}`;
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareText);
        toast.success('班级码已复制到剪贴板');
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shareText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        toast.success('班级码已复制到剪贴板');
      }
    } catch {
      toast.error('复制失败，请手动复制');
    }
  };

  const handleExit = () => {
    if (onExit) {
      onExit();
    }
  };

  const actions = [
    {
      label: '邀请同学',
      icon: Share2,
      color: '#0062FF',
      bg: '#EBF5FF',
      onClick: handleShare,
    },
    {
      label: '班级设置',
      icon: Settings,
      color: '#6B7280',
      bg: '#F3F4F6',
      onClick: () => navigate('/class-settings'),
    },
    {
      label: '退出班级',
      icon: LogOut,
      color: '#EF4444',
      bg: '#FEE2E2',
      onClick: handleExit,
    },
  ];

  return (
    <div className="box-border w-full flex flex-row justify-between gap-3">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className="flex-1 flex flex-col items-center gap-2 p-3 bg-white border border-[#E5E7EB] rounded-xl active:scale-95 transition-transform duration-150 shadow-sm hover:shadow-md"
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: action.bg }}
            >
              <Icon className="w-5 h-5" style={{ color: action.color }} strokeWidth={2} />
            </div>
            <div className="text-[12px] font-body font-medium text-[#4B5563] text-center">
              {action.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}
