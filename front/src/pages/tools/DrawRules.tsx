import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Users, Shuffle, Award, RotateCcw, AlertCircle } from 'lucide-react';

const rules = [
  {
    icon: Users,
    title: '参与范围',
    content: '抽签从当前班级的所有成员中随机抽取，包括班长和班委。总人数以班级实际导入的成员名单为准。',
  },
  {
    icon: Shuffle,
    title: '随机机制',
    content: '采用 Fisher-Yates 洗牌算法，确保每位成员被抽中的概率完全均等。每次抽签结果独立，不受历史抽签记录影响。',
  },
  {
    icon: Award,
    title: '正选与候补',
    content: '正选代表为优先中签人员，候补代表按顺序递补。若正选代表因故无法参加，由候补代表依次替补。正选与候补不会重复。',
  },
  {
    icon: RotateCcw,
    title: '重复抽签',
    content: '每次点击"开始抽签"将产生全新的随机结果，之前的抽签结果不会被覆盖，可在"中签记录"中查看历史结果。',
  },
  {
    icon: AlertCircle,
    title: '注意事项',
    content: '抽签结果仅作为参考，最终决定权由班长或活动负责人确认。抽签记录可保存并同步至班级通知，方便全班查看。',
  },
];

export default function DrawRules() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[100dvh] w-full items-start justify-center overflow-x-hidden overflow-y-auto bg-gray-200 sm:items-center sm:p-6">
      <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-background sm:h-phone sm:w-phone sm:rounded-device sm:shadow-lift">
        <div className="relative flex flex-1 flex-col items-center overflow-y-auto overflow-x-hidden">
          <div className="flex w-full min-h-full flex-col items-center">
            {/* Status Bar */}
            <div
              data-pencil-name="Status Bar"
              className="box-border flex h-[62px] w-full shrink-0 flex-row items-center justify-between gap-0 bg-[#85C5F4] p-[12px_24px_0px_24px]"
            >
              <div className="box-border text-left font-data text-[14px]/[normal] font-semibold text-[#1A1A1A] [white-space:nowrap]">
                9:41
              </div>
              <div className="box-border flex h-fit w-fit shrink-0 flex-row items-center justify-start gap-[6px]">
                <div className="box-border text-left font-caption text-[14px]/[normal] font-normal text-[#1A1A1A] [white-space:nowrap]">
                  ◉◉◉
                </div>
                <div className="box-border text-left font-data text-[14px]/[normal] font-normal text-[#1A1A1A] [white-space:nowrap]">
                  100%
                </div>
              </div>
            </div>

            {/* Content */}
            <div
              data-pencil-name="Content"
              className="relative flex w-full flex-1 flex-col items-center justify-start gap-0 bg-cover bg-no-repeat [background-image:linear-gradient(180deg,#85C5F4_0%,#F1F8FE_100%)]"
            >
              {/* Header */}
              <div
                data-pencil-name="Header"
                className="relative box-border flex h-[48px] w-full shrink-0 flex-row items-center justify-between gap-0 bg-[#00000000] p-[0px_20px]"
              >
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center text-[#1A1A1A] transition-opacity active:opacity-70"
                  aria-label="返回"
                >
                  <ChevronLeft className="h-6 w-6" strokeWidth={2} />
                </button>
                <div
                  data-pencil-name="Title"
                  className="box-border text-left font-heading text-[16px]/[normal] font-bold text-[#1A1A1A] [white-space:nowrap] [filter:drop-shadow(0px_0px_10px_#FFFFFF66)]"
                >
                  抽签规则
                </div>
                <div className="w-10" />
              </div>

              {/* Rules List */}
              <div className="w-full flex-1 px-5 pb-8 pt-2">
                {rules.map((rule, index) => {
                  const Icon = rule.icon;
                  return (
                    <div
                      key={index}
                      className="mb-3 flex flex-col rounded-[16px] border border-[#FFFFFF60] bg-[#FFFFFFCC] p-4 backdrop-blur-sm [box-shadow:0px_2px_8px_0px_#0000000A]"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1986E6]">
                          <Icon className="h-4 w-4 text-white" strokeWidth={2} />
                        </div>
                        <span className="font-heading text-[15px]/[normal] font-bold text-[#1F2937]">
                          {rule.title}
                        </span>
                      </div>
                      <p className="pl-9 font-body text-[13px]/[1.6] text-[#4B5563]">
                        {rule.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
