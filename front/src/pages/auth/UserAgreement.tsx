import { useNavigate } from 'react-router-dom';
import PhoneFrame from '@/components/layout/PhoneFrame';

const sections = [
  {
    title: '一、协议的接受与修改',
    content: (
      <>
        欢迎使用<span className="text-[#0062FF] font-semibold">班务星App</span>（以下简称"本软件"）。您在使用本软件前，请仔细阅读并充分理解本用户协议（以下简称"本协议"）的全部内容。一旦您<span className="text-[#0062FF]">注册、登录</span>或以其他方式使用本软件，即表示您已充分阅读、理解并同意接受本协议的约束。本软件保留随时修改本协议的权利，修改后的协议将在本页面公布，恕不另行通知。若您不同意修改后的协议，您有权停止使用本软件。
      </>
    ),
  },
  {
    title: '二、服务内容',
    content: (
      <>
        本软件为高校班级提供<span className="text-[#0062FF]">班级事务管理、考勤签到、作业管理、活动组织、投票表决、班费管理、随机抽签</span>等综合功能服务。本软件有权根据业务发展需要，随时变更、中断或终止部分或全部服务，且无需事先通知用户。
      </>
    ),
  },
  {
    title: '三、账号注册与使用',
    content: (
      <>
        1. 用户在注册时应当提供<span className="text-[#0062FF]">真实、准确、完整</span>的个人信息，并在信息发生变更时及时更新。
        {'\n'}2. 用户应<span className="text-[#0062FF]">妥善保管账号及密码</span>，因用户自身原因导致账号泄露造成的损失由用户自行承担。
        {'\n'}3. 用户不得将账号转让、出借或以任何方式交由他人使用。
        {'\n'}4. 本软件有权对违规账号采取<span className="text-[#0062FF]">限制功能、暂停服务或注销账号</span>等措施。
      </>
    ),
  },
  {
    title: '四、用户行为规范',
    content: (
      <>
        用户在使用本软件时，应遵守相关法律法规，不得利用本软件从事以下行为：
        {'\n'}1. 发布、传播违反国家法律法规的内容；
        {'\n'}2. 侵犯他人知识产权、肖像权、隐私权等合法权益；
        {'\n'}3. 干扰或破坏本软件的正常运行；
        {'\n'}4. 利用本软件从事任何商业推广或广告活动；
        {'\n'}5. 其他违反法律法规或社会公德的行为。
      </>
    ),
  },
  {
    title: '五、知识产权',
    content: (
      <>
        本软件的所有内容，包括但不限于文字、图片、音频、视频、软件代码、界面设计等，其<span className="text-[#0062FF]">知识产权均归本软件运营方所有</span>。未经书面许可，用户不得复制、修改、传播或用于商业用途。
      </>
    ),
  },
  {
    title: '六、免责声明',
    content: (
      <>
        1. 本软件按"现状"提供服务，不保证服务完全无中断或无错误。
        {'\n'}2. 因不可抗力、网络故障、系统维护等原因导致的服务中断，本软件不承担责任。
        {'\n'}3. 用户因使用本软件而产生的任何直接或间接损失，本软件在法律法规允许的范围内不承担赔偿责任。
      </>
    ),
  },
  {
    title: '七、协议终止',
    content: (
      <>
        1. 用户有权随时<span className="text-[#0062FF]">注销账号</span>以终止本协议。
        {'\n'}2. 若用户违反本协议，本软件有权单方面终止提供服务。
        {'\n'}3. 协议终止后，本软件有权保留用户的注册信息和使用记录。
      </>
    ),
  },
  {
    title: '八、争议解决',
    content: (
      <>
        本协议的签订、履行和解释均适用<span className="text-[#0062FF]">中华人民共和国法律</span>。因本协议产生的任何争议，双方应友好协商解决；协商不成的，任何一方均可向本软件运营方所在地有管辖权的人民法院提起诉讼。
      </>
    ),
  },
];

export default function UserAgreement() {
  const navigate = useNavigate();

  return (
    <PhoneFrame className="bg-white">
      <div className="relative box-border w-full flex-1 overflow-y-auto bg-[#FFFFFF]">
        {/* Status Bar */}
        <div className="box-border flex h-[62px] w-full shrink-0 flex-row items-center justify-between gap-0 bg-[#FFFFFF] p-[12px_24px_0px_24px]">
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

        {/* Header */}
        <div className="box-border flex h-[56px] w-full shrink-0 flex-row items-center gap-[12px] bg-[#FFFFFF] px-[16px]">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center text-[#1A1A1A] transition-opacity active:opacity-70"
            aria-label="返回"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="text-left font-heading text-[18px]/[normal] font-bold text-[#1A1A1A]">
            用户协议
          </div>
        </div>

        {/* Content */}
        <div className="box-border w-full flex-1 overflow-y-auto bg-[#F5F5F5] p-[16px]">
          <div className="mb-[16px] rounded-lg bg-[#FFFFFF] p-[16px] [box-shadow:0px_2px_8px_0px_#0000000D]">
            <p className="font-body text-[13px]/[22px] font-normal text-[#4B5563]">
              更新日期：2026年9月3日
              <br />
              生效日期：2026年9月3日
            </p>
          </div>

          {sections.map((section, index) => (
            <div
              key={index}
              className="mb-[12px] rounded-lg bg-[#FFFFFF] p-[16px] [box-shadow:0px_2px_8px_0px_#0000000D]"
            >
              <h3 className="mb-[8px] font-heading text-[15px]/[normal] font-bold text-[#1A1A1A]">
                {section.title}
              </h3>
              <p className="font-body text-[13px]/[22px] font-normal text-[#4B5563]">
                {section.content}
              </p>
            </div>
          ))}

          <div className="mb-[16px] rounded-lg bg-[#FFFFFF] p-[16px] [box-shadow:0px_2px_8px_0px_#0000000D]">
            <p className="font-body text-[13px]/[22px] font-normal text-[#4B5563]">
              如您对本协议有任何疑问，请通过软件内"帮助与反馈"功能联系我们。
            </p>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}
