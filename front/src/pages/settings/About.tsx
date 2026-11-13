import PhoneFrame from '@/components/layout/PhoneFrame';
import SettingsHeader from '@/components/layout/SettingsHeader';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAppVersion } from '@/hooks/useAppVersion';

export default function About() {
  const navigate = useNavigate();
  const appVersion = useAppVersion();

  // 应用尚未上架应用商店：先给出明确提示，避免跳转到不存在的商店详情页
  const handleRate = () => {
    toast.info('应用商店暂未上架，敬请期待');
  };

  return (
    <PhoneFrame>
      <SettingsHeader title="关于" />
              <div
                data-pencil-name="Content"
                className="box-border w-full [flex:1_1_0] flex flex-col gap-0 justify-start items-start bg-[#FFFFFF]"
              >
                <div
                  data-pencil-name="Body"
                  className="box-border w-full [flex:1_1_0] flex flex-col gap-[20px] p-[16px_20px_20px_20px] justify-start items-start bg-[#FFFFFF]"
                >
                  <div
                    data-pencil-name="Group "
                    className="box-border w-full h-fit shrink-0 flex flex-col gap-[10px] justify-start items-start bg-[#00000000]"
                  >
                    <div
                      data-pencil-name="Text"
                      className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-semibold text-left [white-space:nowrap]"
                    ></div>
                    <div
                      data-pencil-name="Group Content"
                      className="box-border w-full h-fit shrink-0 flex flex-col gap-2 justify-start items-start bg-[#00000000]"
                    >
                      <div
                        data-pencil-name="List Item"
                        onClick={() => navigate('/user-agreement')}
                        className="box-border w-full h-[64px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-[12px] p-[0px_16px] justify-start items-center bg-[#FFFFFF] rounded-lg"
                      >
                        <div
                          data-pencil-name="Icon Box"
                          className="box-border w-[40px] shrink-0 h-[40px] flex flex-col gap-0 justify-center items-center bg-[#F3F4F6] rounded-lg"
                        >
                          <svg
                            data-pencil-name="Icon-file-text"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[24px] h-[24px] shrink-0 overflow-visible"
                          >
                            <path
                              d="M14 2h-8a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-12m-6-6v6h6m-4 5h-8m8 4h-8m2-8h-2"
                              fill="none"
                            ></path>
                            <path
                              d="M14 2h-8a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-12m-6-6v6h6m-4 5h-8m8 4h-8m2-8h-2"
                              fill="none"
                              stroke="#4B5563"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            ></path>
                          </svg>
                        </div>
                        <div
                          data-pencil-name="Text"
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                        >
                          用户协议
                        </div>
                        <div
                          data-pencil-name="Right"
                          className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center bg-[#00000000]"
                        >
                          <svg
                            data-pencil-name="Icon-chevron-right"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[20px] shrink-0 h-[20px] overflow-visible"
                          >
                            <path d="M9 18l6-6-6-6" fill="none"></path>
                            <path
                              d="M9 18l6-6-6-6"
                              fill="none"
                              stroke="#9CA3AF"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            ></path>
                          </svg>
                        </div>
                      </div>
                      <div
                        data-pencil-name="List Item"
                        onClick={() => navigate('/privacy-policy')}
                        className="box-border w-full h-[64px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-[12px] p-[0px_16px] justify-start items-center bg-[#FFFFFF] rounded-lg"
                      >
                        <div
                          data-pencil-name="Icon Box"
                          className="box-border w-[40px] shrink-0 h-[40px] flex flex-col gap-0 justify-center items-center bg-[#F3F4F6] rounded-lg"
                        >
                          <svg
                            data-pencil-name="Icon-lock"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[24px] h-[24px] shrink-0 overflow-visible"
                          >
                            <path
                              d="M19 11h-14a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2m-12 0v-4a5 5 0 1 1 10 0v4m-5 5a1 1 0 1 0 0 2 1 1 0 0 0 0-2"
                              fill="none"
                            ></path>
                            <path
                              d="M19 11h-14a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2m-12 0v-4a5 5 0 1 1 10 0v4m-5 5a1 1 0 1 0 0 2 1 1 0 0 0 0-2"
                              fill="none"
                              stroke="#4B5563"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            ></path>
                          </svg>
                        </div>
                        <div
                          data-pencil-name="Text"
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                        >
                          隐私政策
                        </div>
                        <div
                          data-pencil-name="Right"
                          className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center bg-[#00000000]"
                        >
                          <svg
                            data-pencil-name="Icon-chevron-right"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[20px] shrink-0 h-[20px] overflow-visible"
                          >
                            <path d="M9 18l6-6-6-6" fill="none"></path>
                            <path
                              d="M9 18l6-6-6-6"
                              fill="none"
                              stroke="#9CA3AF"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            ></path>
                          </svg>
                        </div>
                      </div>
                      <div
                        data-pencil-name="List Item"
                        className="box-border w-full h-[64px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-[12px] p-[0px_16px] justify-start items-center bg-[#FFFFFF] rounded-lg"
                      >
                        <div
                          data-pencil-name="Icon Box"
                          className="box-border w-[40px] shrink-0 h-[40px] flex flex-col gap-0 justify-center items-center bg-[#F3F4F6] rounded-lg"
                        >
                          <svg
                            data-pencil-name="Icon-refresh"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[24px] h-[24px] shrink-0 overflow-visible"
                          >
                            <path
                              d="M23 4v6h-6m-16 10v-6h6m-3.49-5a9 9 0 0 1 14.85-3.36l4.64 4.36m-22 4l4.64 4.36a9 9 0 0 0 14.85-3.36"
                              fill="none"
                            ></path>
                            <path
                              d="M23 4v6h-6m-16 10v-6h6m-3.49-5a9 9 0 0 1 14.85-3.36l4.64 4.36m-22 4l4.64 4.36a9 9 0 0 0 14.85-3.36"
                              fill="none"
                              stroke="#4B5563"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            ></path>
                          </svg>
                        </div>
                        <div
                          data-pencil-name="Text"
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                        >
                          版本更新
                        </div>
                        <div
                          data-pencil-name="Right"
                          className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center bg-[#00000000]"
                        >
                          <div
                            data-pencil-name="Text"
                            className="text-[14px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                          >
                            v{appVersion}
                          </div>
                        </div>
                      </div>
                      <div
                        data-pencil-name="List Item"
                        onClick={handleRate}
                        className="box-border w-full h-[64px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-[12px] p-[0px_16px] justify-start items-center bg-[#FFFFFF] rounded-lg"
                      >
                        <div
                          data-pencil-name="Icon Box"
                          className="box-border w-[40px] shrink-0 h-[40px] flex flex-col gap-0 justify-center items-center bg-[#FEF3C7] rounded-lg"
                        >
                          <svg
                            data-pencil-name="Icon-star"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[24px] h-[24px] shrink-0 overflow-visible"
                          >
                            <path
                              d="M12 2l3.09 6.26 6.91 1.01-5 4.87 1.18 6.88-6.18-3.25-6.18 3.25 1.18-6.88-5-4.87 6.91-1.01 3.09-6.26"
                              fill="none"
                            ></path>
                            <path
                              d="M12 2l3.09 6.26 6.91 1.01-5 4.87 1.18 6.88-6.18-3.25-6.18 3.25 1.18-6.88-5-4.87 6.91-1.01 3.09-6.26"
                              fill="none"
                              stroke="#D97706"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            ></path>
                          </svg>
                        </div>
                        <div
                          data-pencil-name="Text"
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                        >
                          给我们评分
                        </div>
                        <div
                          data-pencil-name="Right"
                          className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center bg-[#00000000]"
                        >
                          <svg
                            data-pencil-name="Icon-chevron-right"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[20px] shrink-0 h-[20px] overflow-visible"
                          >
                            <path d="M9 18l6-6-6-6" fill="none"></path>
                            <path
                              d="M9 18l6-6-6-6"
                              fill="none"
                              stroke="#9CA3AF"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            ></path>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
    </PhoneFrame>
  );
}
