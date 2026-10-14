import { useNavigate } from 'react-router-dom';
import { Home, Users, Bell, BarChart3, User } from 'lucide-react';
import { InteractiveMenu, InteractiveMenuItem } from '@/components/ui/modern-mobile-menu';
import { PRIMARY_ROUTES, usePrimaryPageIndex } from '@/hooks/usePrimaryPage';

const menuItems: InteractiveMenuItem[] = [
  { label: '首页', icon: Home },
  { label: '班级', icon: Users },
  { label: '通知', icon: Bell },
  { label: '数据', icon: BarChart3 },
  { label: '我的', icon: User },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const activeIndex = usePrimaryPageIndex();

  // 非一级主页面不渲染底部导航栏
  if (activeIndex === -1) {
    return null;
  }

  const handleItemClick = (index: number) => {
    if (index === activeIndex) {
      return;
    }
    navigate(PRIMARY_ROUTES[index]);
  };

  return (
    <div className="pointer-events-auto z-50 w-full shrink-0 bg-white">
      <InteractiveMenu
        items={menuItems}
        accentColor="#0062FF"
        defaultActiveIndex={activeIndex}
        onItemClick={handleItemClick}
      />
    </div>
  );
}
