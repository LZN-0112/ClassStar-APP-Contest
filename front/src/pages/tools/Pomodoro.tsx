import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import { useState, useEffect, useRef } from 'react';
import { useStatusBarStyle } from '@/hooks/useStatusBarStyle';

export default function Pomodoro() {
  useStatusBarStyle(false); // 浅蓝渐变头部 → 系统状态栏深色(黑)图标
  const [focusDuration, setFocusDuration] = useState(25 * 60);
  const [breakDuration] = useState(5 * 60);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds] = useState(4);
  const [isBreak, setIsBreak] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTaskEdit, setShowTaskEdit] = useState(false);
  const [taskName, setTaskName] = useState('复习高数·第三章习题');
  const [taskTotalMinutes, setTaskTotalMinutes] = useState(120);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            if (!isBreak) {
              setIsBreak(true);
              setTimeLeft(breakDuration);
            } else {
              setIsBreak(false);
              if (currentRound < totalRounds) {
                setCurrentRound(r => r + 1);
              }
              setTimeLeft(focusDuration);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft, isBreak, breakDuration, currentRound, totalRounds, focusDuration]);

  const handlePlay = () => {
    if (timeLeft === 0) {
      setTimeLeft(isBreak ? breakDuration : focusDuration);
    }
    setHasStarted(true);
    setIsRunning(true);
  };

  const handleStop = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setHasStarted(false);
    setIsBreak(false);
    setCurrentRound(1);
    setTimeLeft(focusDuration);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const handleSetTime = (mins: number) => {
    setFocusDuration(mins * 60);
    if (!isRunning) {
      setTimeLeft(mins * 60);
    }
    setIsBreak(false);
    setCurrentRound(1);
    setHasStarted(false);
    setShowSettings(false);
  };

  return (
    <PhoneFrame className="[background-image:linear-gradient(180deg,#85C5F4_0%,#F1F8FE_100%)] bg-no-repeat bg-[length:100%_100%]">
      <div
                data-pencil-name="Status Bar"
                className="box-border w-full h-[62px] shrink-0 flex flex-row gap-0 p-[12px_24px_0px_24px] justify-between items-center bg-[#85c5f4]"
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
                className="box-border w-full [flex:1_1_0] flex flex-col gap-0 justify-start items-start [background-image:linear-gradient(-153.318deg,_#85C5F4_14.645%,_#F1F8FE_85.355%)] bg-no-repeat bg-[length:100%_100%]"
              >
                <div
                  data-pencil-name="Header"
                  className="box-border w-full h-[56px] shrink-0 flex flex-row gap-0 p-[0px_16px] justify-between items-center bg-[#85c5f4]"
                >
                  <BackButton />
                  <div
                    data-pencil-name="Title"
                    className="text-[16px]/[normal] box-border text-[#1A1A1A] font-heading font-semibold text-left [white-space:nowrap]"
                  >
                    专注
                  </div>
                  <svg
                    data-pencil-name="Icon-settings"
                    viewBox="0 0 24 24"
                    preserveAspectRatio="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
                  >
                    <path
                      d="M10.325 4.317c0.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-0.94 3.31 0.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 0.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c0.94 1.543-0.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-0.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543 0.94-3.31-0.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-0.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-0.94-1.543 0.826-3.31 2.37-2.37 1 0.608 2.296 0.07 2.572-1.065m-1.325 7.683a3 3 0 1 0 6 0 3 3 0 0 0-6 0"
                      fill="#00000000"
                    ></path>
                    <path
                      d="M10.325 4.317c0.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-0.94 3.31 0.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 0.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c0.94 1.543-0.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-0.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543 0.94-3.31-0.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-0.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-0.94-1.543 0.826-3.31 2.37-2.37 1 0.608 2.296 0.07 2.572-1.065m-1.325 7.683a3 3 0 1 0 6 0 3 3 0 0 0-6 0"
                      fill="none"
                      stroke="#1A1A1A"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    ></path>
                  </svg>
                </div>
                <div
                  data-pencil-name="Body"
                  className="box-border w-full [flex:1_1_0] flex flex-col gap-[40px] p-[44px_24px_0px_24px] justify-start items-center [background-image:linear-gradient(179.477deg,_#85C5F4_1.512%,_#F1F8FE_95.454%)] bg-no-repeat bg-[length:100%_100%]"
                >
                  <div
                    data-pencil-name="Task Card"
                    onClick={() => !isRunning && setShowTaskEdit(true)}
                    className="box-border w-[345px] h-[80px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-0 p-[16px_20px] justify-between items-center bg-[#FFFFFF] [border:1px_solid_#00000000] rounded-lg cursor-pointer"
                  >
                    <div
                      data-pencil-name="Left Row"
                      className="box-border w-fit shrink-0 h-fit flex flex-row gap-[14px] justify-start items-center"
                    >
                      <div
                        data-pencil-name="Icon Container"
                        className="box-border w-[48px] shrink-0 h-[48px] flex flex-row gap-0 justify-center items-center bg-[#DBEAFE] rounded-full"
                      >
                        <svg
                          data-pencil-name="Icon-book"
                          viewBox="0 0 24 24"
                          preserveAspectRatio="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
                        >
                          <path
                            d="M3 19a9 9 0 0 1 9 0 9 9 0 0 1 9 0m-18-13a9 9 0 0 1 9 0 9 9 0 0 1 9 0m-18 0v13m9-13v13m9-13v13"
                            fill="#00000000"
                          ></path>
                          <path
                            d="M3 19a9 9 0 0 1 9 0 9 9 0 0 1 9 0m-18-13a9 9 0 0 1 9 0 9 9 0 0 1 9 0m-18 0v13m9-13v13m9-13v13"
                            fill="none"
                            stroke="#3B82F6"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                          ></path>
                        </svg>
                      </div>
                      <div
                        data-pencil-name="Task Text"
                        className="box-border w-fit shrink-0 h-fit flex flex-col gap-[4px] justify-center items-start"
                      >
                        <div
                          data-pencil-name="Task Name"
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-heading font-medium text-left [white-space:nowrap]"
                        >
                          {taskName}
                        </div>
                        <div
                          data-pencil-name="Duration"
                          className="text-[11px]/[normal] box-border text-[#4B5563] font-caption font-normal text-left [white-space:nowrap]"
                        >
                          总预计 {taskTotalMinutes} 分钟
                        </div>
                      </div>
                    </div>
                    <div
                      data-pencil-name="Meta Text"
                      className="box-border w-fit shrink-0 h-fit flex flex-col gap-[4px] justify-center items-end"
                    >
                      <div
                        data-pencil-name="Session"
                        className="text-[14px]/[normal] box-border text-[#1A1A1A] font-heading font-medium text-left [white-space:nowrap]"
                      >
                        {currentRound}/{totalRounds}
                      </div>
                      <div
                        data-pencil-name="Round"
                        className="text-[11px]/[normal] box-border text-[#4B5563] font-caption font-normal text-left [white-space:nowrap]"
                      >
                        {Math.floor(focusDuration / 60)}分钟
                      </div>
                    </div>
                  </div>
                  <div
                    data-pencil-name="Timer Ring"
                    className="box-border w-[284px] h-[284px] shrink-0 bg-[#00000000] relative"
                  >
                    <svg
                      data-pencil-name="Ring Background"
                      viewBox="19.962018966674805 19.999990463256836 220.0759449005127 220.00000953674316"
                      preserveAspectRatio="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="box-border w-[260px] h-[260px] absolute left-[12px] top-[12px] overflow-visible [z-index:0]"
                    >
                      <path d="M130 20a110 110 0 1 1 0 220 110 110 0 1 1 0-220" fill="#00000000"></path>
                      <path
                        d="M130 20a110 110 0 1 1 0 220 110 110 0 1 1 0-220"
                        fill="none"
                        stroke="#DBEAFE"
                        strokeWidth="18"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                      ></path>
                    </svg>
                    <div
                      data-pencil-name="Timer Info"
                      className="box-border w-[260px] h-[260px] absolute left-[12px] top-[12px] flex flex-col gap-[6px] justify-center items-center bg-[#00000000] [z-index:2]"
                    >
                      <div
                        data-pencil-name="Timer"
                        className="text-[56px]/[normal] box-border w-[200px] h-[64px] shrink-0 text-[#1A1A1A] font-data font-bold text-center flex flex-col justify-center"
                      >
                        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                      </div>
                      <div
                        data-pencil-name="Round Info"
                        className="text-[11px]/[normal] box-border w-[200px] h-[20px] shrink-0 text-[#4B5563] font-caption font-normal text-center flex flex-col justify-center"
                      >
                        {isBreak ? '休息时间' : `第${currentRound}轮 / 共${totalRounds}轮`}
                      </div>
                      <div
                        data-pencil-name="Tip"
                        className="text-[11px]/[normal] box-border w-[200px] h-[20px] shrink-0 text-[#4B5563] font-caption font-normal text-center flex flex-col justify-center"
                      >
                        {isBreak ? '放松一下吧' : `保持专注 ${Math.floor(focusDuration / 60)} 分钟`}
                      </div>
                      <div
                        data-pencil-name="Set Time Button"
                        onClick={() => setShowSettings(!showSettings)}
                        className="box-border w-[80px] h-[32px] shrink-0 flex flex-row gap-[4px] justify-center items-center bg-[#DBEAFE] rounded-[16px] cursor-pointer"
                      >
                        <div
                          data-pencil-name="Set Time Label"
                          className="text-[12px]/[normal] box-border text-[#3B82F6] font-caption font-semibold text-center"
                        >
                          设置时间
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    data-pencil-name="Button Row"
                    className="box-border w-full h-fit shrink-0 flex flex-row gap-8 justify-center items-center"
                  >
                    {hasStarted && (
                      <div
                        data-pencil-name="Reset Button"
                        onClick={handleReset}
                        className="box-border w-[56px] shrink-0 h-[56px] [box-shadow:0px_6px_20px_0px_#3B82F666] flex flex-row gap-0 justify-center items-center [background-image:linear-gradient(180deg,_#3B82F6_0%,_#60A5FA_100%)] bg-no-repeat bg-[length:100%_100%] rounded-full cursor-pointer"
                      >
                        <svg
                          data-pencil-name="Icon-refresh"
                          viewBox="0 0 24 24"
                          preserveAspectRatio="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="box-border w-[22px] shrink-0 h-[22px] overflow-visible"
                        >
                          <path
                            d="M20 11a8.1 8.1 0 0 0-15.5-2m-0.5-4v4h4m-4 4a8.1 8.1 0 0 0 15.5 2m0.5 4v-4h-4"
                            fill="#00000000"
                          ></path>
                          <path
                            d="M20 11a8.1 8.1 0 0 0-15.5-2m-0.5-4v4h4m-4 4a8.1 8.1 0 0 0 15.5 2m0.5 4v-4h-4"
                            fill="none"
                            stroke="#FFFFFF"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                          ></path>
                        </svg>
                      </div>
                    )}
                    <div
                      data-pencil-name="Play/Pause Button"
                      onClick={isRunning ? handleStop : handlePlay}
                      className="box-border w-[56px] shrink-0 h-[56px] [box-shadow:0px_6px_20px_0px_#3B82F666] flex flex-row gap-0 justify-center items-center [background-image:linear-gradient(180deg,_#3B82F6_0%,_#60A5FA_100%)] bg-no-repeat bg-[length:100%_100%] rounded-full cursor-pointer"
                    >
                      {isRunning ? (
                        <svg
                          data-pencil-name="Icon-pause"
                          viewBox="0 0 24 24"
                          preserveAspectRatio="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="box-border w-[22px] shrink-0 h-[22px] overflow-visible"
                        >
                          <path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="#FFFFFF"></path>
                          <path
                            d="M6 4h4v16H6zM14 4h4v16h-4z"
                            fill="none"
                            stroke="#FFFFFF"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                          ></path>
                        </svg>
                      ) : (
                        <svg
                          data-pencil-name="Icon-player-play"
                          viewBox="0 0 24 24"
                          preserveAspectRatio="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="box-border w-[22px] shrink-0 h-[22px] overflow-visible"
                        >
                          <path d="M7 4v16l13-8z" fill="#FFFFFF"></path>
                          <path
                            d="M7 4v16l13-8z"
                            fill="none"
                            stroke="#FFFFFF"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                          ></path>
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {showSettings && (
                <div
                  className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                  onClick={() => setShowSettings(false)}
                >
                  <div
                    className="bg-white rounded-lg p-6 w-[300px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-[16px] font-semibold mb-4">设置专注时间</div>
                    <div className="flex flex-col gap-3">
                      {[15, 20, 25, 30, 45, 60].map((mins) => (
                        <div
                          key={mins}
                          onClick={() => handleSetTime(mins)}
                          className={`px-4 py-3 rounded-lg cursor-pointer text-center ${
                            Math.floor(focusDuration / 60) === mins
                              ? 'bg-[#3B82F6] text-white'
                              : 'bg-[#F3F4F6] text-[#1A1A1A]'
                          }`}
                        >
                          {mins} 分钟
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {showTaskEdit && (
                <div
                  className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                  onClick={() => setShowTaskEdit(false)}
                >
                  <div
                    className="bg-white rounded-lg p-6 w-[300px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-[16px] font-semibold mb-4">编辑任务</div>
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="text-[12px] text-[#4B5563] mb-1 block">任务名称</label>
                        <input
                          type="text"
                          value={taskName}
                          onChange={(e) => setTaskName(e.target.value)}
                          className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-[14px]"
                        />
                      </div>
                      <div>
                        <label className="text-[12px] text-[#4B5563] mb-1 block">总预计时间（分钟）</label>
                        <input
                          type="number"
                          value={taskTotalMinutes}
                          onChange={(e) => setTaskTotalMinutes(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-[14px]"
                        />
                      </div>
                      <button
                        onClick={() => setShowTaskEdit(false)}
                        className="w-full py-2 bg-[#3B82F6] text-white rounded-lg text-[14px] font-semibold"
                      >
                        保存
                      </button>
                    </div>
                  </div>
                </div>
              )}
    </PhoneFrame>
  );
}
