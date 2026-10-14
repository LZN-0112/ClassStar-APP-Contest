import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import { useNavigate } from 'react-router-dom';

export default function CheckInMethod() {
  const navigate = useNavigate();
  return (
    <PhoneFrame>
      <div className="flex h-full flex-col overflow-y-auto">
        <div
      data-pencil-name="签到方式选择页"
      className="box-border w-[393px] h-[844px] flex flex-col gap-0 justify-start items-start bg-[#FFFFFF] rounded-[40px] overflow-hidden"
    >
      <div
        data-pencil-name="Phone Frame"
        className="box-border w-[393px] h-[844px] shrink-0 bg-[#FFFFFF] rounded-[40px] overflow-hidden relative"
      >
        <div
          data-pencil-name="Status Bar"
          className="box-border w-[393px] h-[62px] absolute left-0 top-0 flex flex-row gap-0 p-[12px_24px_0px_24px] justify-between items-center bg-[#60a5fa] [z-index:0]"
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
          className="box-border w-[393px] h-[788.37px] absolute left-0 top-[55.631px] [z-index:1]"
        >
          <div
            data-pencil-name="Header"
            className="box-border w-[395.19px] h-[219.704px] absolute left-[-1.22px] top-[-7.34px] [background-image:linear-gradient(0deg,_#E0F2FE_0.093%,_#60A5FA_100.066%)] bg-no-repeat bg-[length:100%_100%] rounded-[0px_0px_24px_24px] [z-index:0]"
          >
            <div
              data-pencil-name="Nav"
              className="box-border w-[346.214px] h-[24px] absolute left-[20px] top-[20px] flex flex-row gap-0 justify-start items-center [z-index:0]"
            ></div>
            <div
              data-pencil-name="Title"
              className="text-[28px]/[normal] box-border absolute left-[19.09px] top-[78.386px] text-[#FFFFFF] font-body font-bold text-left [white-space:nowrap] [z-index:1]"
            >
              选择签到方式
            </div>
            <svg
              data-pencil-name="Deco"
              viewBox="0 0 24 24"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
              className="box-border w-[120px] h-[120px] opacity-[0.15] absolute left-[260px] top-[50px] overflow-visible [z-index:2]"
            >
              <path
                d="M11.5 21h-5.5a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6m-4-10v4m-8-4v4m-4 4h16m-5 8l2 2 4-4"
                fill="none"
              ></path>
              <path
                d="M11.5 21h-5.5a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6m-4-10v4m-8-4v4m-4 4h16m-5 8l2 2 4-4"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              ></path>
            </svg>
            <BackButton variant="dark" className="absolute left-[10px] top-[41px] z-10" />
          </div>
          <div
            data-pencil-name="Grid"
            className="box-border w-[353px] h-fit absolute left-[20px] top-[240px] flex flex-col gap-[12px] justify-start items-start [z-index:1]"
          >
            <div
              data-pencil-name="Row1"
              className="box-border w-full h-[170px] shrink-0 flex flex-row gap-[12px] justify-between items-center"
            >
              <div
                data-pencil-name="定位签到"
                className="box-border w-[170px] shrink-0 h-[170px] [box-shadow:0px_2px_8px_0px_#0000000D,_0px_0px_12px_0px_#0062FF33] flex flex-col gap-[10px] p-[12px] justify-center items-center bg-[#FFFFFF] [border:1px_solid_#1c8ddb] rounded-lg" onClick={() => navigate('/check-in')}
              >
                <svg
                  data-pencil-name="map-pin"
                  viewBox="0 0 24 24"
                  preserveAspectRatio="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="box-border w-[48px] h-[48px] shrink-0 overflow-visible"
                >
                  <path
                    d="M9 11a3 3 0 1 0 6 0 3 3 0 0 0-6 0m8.657 5.657l-4.243 4.243a2 2 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0"
                    fill="#0062FF"
                  ></path>
                </svg>
                <div
                  data-pencil-name="Title"
                  className="text-[16px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                >
                  定位签到
                </div>
                <div
                  data-pencil-name="Subtitle"
                  className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap]"
                >
                  基于GPS定位范围验证
                </div>
              </div>
              <div
                data-pencil-name="二维码签到"
                className="box-border w-[170px] shrink-0 h-[170px] [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-[10px] p-[12px] justify-center items-center bg-[#FFFFFF] [border:1px_solid_#1c8ddb] rounded-lg" onClick={() => navigate('/check-in')}
              >
                <svg
                  data-pencil-name="qrcode"
                  viewBox="0 0 24 24"
                  preserveAspectRatio="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="box-border w-[48px] h-[48px] shrink-0 overflow-visible"
                >
                  <path
                    d="M4 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z m3 12v0.01m7-12.01a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z m-7 2v0.01m-3 7.99a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z m13-8v0.01m-3 6.99h3m3 0v0.01m-6-0.01v3m0 3h3m0-3h3m0 0v3"
                    fill="none"
                  ></path>
                  <path
                    d="M4 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z m3 12v0.01m7-12.01a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z m-7 2v0.01m-3 7.99a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z m13-8v0.01m-3 6.99h3m3 0v0.01m-6-0.01v3m0 3h3m0-3h3m0 0v3"
                    fill="none"
                    stroke="#0062FF"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  ></path>
                </svg>
                <div
                  data-pencil-name="Title"
                  className="text-[16px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                >
                  二维码签到
                </div>
                <div
                  data-pencil-name="Subtitle"
                  className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap]"
                >
                  扫码完成签到
                </div>
              </div>
            </div>
            <div
              data-pencil-name="Row2"
              className="box-border w-full h-[170px] shrink-0 flex flex-row gap-[12px] justify-between items-center"
            >
              <div
                data-pencil-name="水印拍照签到"
                className="box-border w-[170px] shrink-0 h-[170px] [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-[10px] p-[12px] justify-center items-center bg-[#FFFFFF] [border:1px_solid_#1c8ddb] rounded-lg" onClick={() => navigate('/check-in')}
              >
                <svg
                  data-pencil-name="camera"
                  viewBox="0 0 24 24"
                  preserveAspectRatio="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="box-border w-[48px] h-[48px] shrink-0 overflow-visible"
                >
                  <path
                    d="M5 7h1a2 2 0 0 0 2-2 1 1 0 0 1 1-1h6a1 1 0 0 1 1 1 2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2m4 6a3 3 0 1 0 6 0 3 3 0 0 0-6 0"
                    fill="none"
                  ></path>
                  <path
                    d="M5 7h1a2 2 0 0 0 2-2 1 1 0 0 1 1-1h6a1 1 0 0 1 1 1 2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2m4 6a3 3 0 1 0 6 0 3 3 0 0 0-6 0"
                    fill="none"
                    stroke="#0062FF"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  ></path>
                </svg>
                <div
                  data-pencil-name="Title"
                  className="text-[16px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                >
                  水印拍照签到
                </div>
                <div
                  data-pencil-name="Subtitle"
                  className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap]"
                >
                  拍照带时间地点水印
                </div>
              </div>
              <div
                data-pencil-name="口令签到"
                className="box-border w-[170px] shrink-0 h-[170px] [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-[10px] p-[12px] justify-center items-center bg-[#FFFFFF] [border:1px_solid_#1c8ddb] rounded-lg" onClick={() => navigate('/check-in')}
              >
                <svg
                  data-pencil-name="key"
                  viewBox="0 0 24 24"
                  preserveAspectRatio="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="box-border w-[48px] h-[48px] shrink-0 overflow-visible"
                >
                  <path
                    d="M16.555 3.843l3.602 3.602a2.877 2.877 0 0 1 0 4.069l-2.643 2.643a2.877 2.877 0 0 1-4.069 0l-0.301-0.301-6.558 6.558a2 2 0 0 1-1.239 0.578l-0.175 0.008h-1.172a1 1 0 0 1-0.993-0.883l-0.007-0.117v-1.172a2 2 0 0 1 0.467-1.284l0.119-0.13 0.414-0.414h2v-2h2v-2l2.144-2.144-0.301-0.301a2.877 2.877 0 0 1 0-4.069l2.643-2.643a2.877 2.877 0 0 1 4.069 0m-1.555 5.157h0.01"
                    fill="none"
                  ></path>
                  <path
                    d="M16.555 3.843l3.602 3.602a2.877 2.877 0 0 1 0 4.069l-2.643 2.643a2.877 2.877 0 0 1-4.069 0l-0.301-0.301-6.558 6.558a2 2 0 0 1-1.239 0.578l-0.175 0.008h-1.172a1 1 0 0 1-0.993-0.883l-0.007-0.117v-1.172a2 2 0 0 1 0.467-1.284l0.119-0.13 0.414-0.414h2v-2h2v-2l2.144-2.144-0.301-0.301a2.877 2.877 0 0 1 0-4.069l2.643-2.643a2.877 2.877 0 0 1 4.069 0m-1.555 5.157h0.01"
                    fill="none"
                    stroke="#0062FF"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  ></path>
                </svg>
                <div
                  data-pencil-name="Title"
                  className="text-[16px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                >
                  口令签到
                </div>
                <div
                  data-pencil-name="Subtitle"
                  className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap]"
                >
                  输入4位数字口令
                </div>
              </div>
            </div>
          </div>
          <div
            data-pencil-name="下一步"
            className="box-border w-[353px] h-[52px] [box-shadow:0px_4px_16px_0px_#0062FF33] absolute left-[20px] top-[620px] flex flex-col gap-0 justify-center items-center [background-image:linear-gradient(-98.38deg,_#0062FF_14.645%,_#3B82F6_85.355%)] bg-no-repeat bg-[length:100%_100%] rounded-lg [z-index:2]"
          >
            <div
              data-pencil-name="Label"
              className="text-[16px]/[normal] box-border text-[#FFFFFF] font-body font-semibold text-left [white-space:nowrap]"
            >
              下一步
            </div>
          </div>
        </div>
      </div>
    </div>
      </div>
    </PhoneFrame>
  );
}
