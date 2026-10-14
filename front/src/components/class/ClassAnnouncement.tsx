import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';

interface ClassAnnouncementProps {
  announcement?: string;
  className?: string;
}

export default function ClassAnnouncement({ announcement, className = '' }: ClassAnnouncementProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (announcement && announcement.length > 0) {
      setIsVisible(true);
    }
  }, [announcement]);

  if (!announcement || !announcement.trim() || !isVisible) {
    return null;
  }

  return (
    <div className={`box-border w-full flex flex-col gap-2 p-3 bg-[#FFF7ED] border border-[#FED7AA] rounded-xl shadow-sm ${className}`}>
      <div className="flex flex-row items-start gap-2">
        <Bell className="w-4 h-4 text-[#F97316] mt-0.5 flex-shrink-0" strokeWidth={2} />
        <div className="flex-1">
          <div className="text-[13px] font-body font-medium text-[#9A3412] leading-relaxed line-clamp-3">
            {announcement}
          </div>
        </div>
      </div>
    </div>
  );
}
