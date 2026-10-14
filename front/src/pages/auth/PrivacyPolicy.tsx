import { useNavigate } from 'react-router-dom';
import PhoneFrame from '@/components/layout/PhoneFrame';

const sections = [
  {
    title: '一、引言',
    content: (
      <>
        <span className="text-[#0062FF] font-semibold">班务星App</span>（以下简称"本软件"）高度重视用户隐私保护。本隐私政策（以下简称"本政策"）旨在向您说明本软件如何<span className="text-[#0062FF]">收集、使用、存储、共享和保护</span>您的个人信息。请您在使用本软件前仔细阅读本政策。
      </>
    ),
  },
  {
    title: '二、我们收集的信息',
    content: (
      <>
        1. <span className="text-[#0062FF]">账号信息</span>：您在注册时提供的手机号码、姓名等基本信息。
        {'\n'}2. <span className="text-[#0062FF]">班级信息</span>：您所属班级的名称、班级成员列表等。
        {'\n'}3. <span className="text-[#0062FF]">使用记录</span>：您在使用本软件过程中产生的考勤记录、作业提交记录、活动报名记录、投票记录等操作数据。
        {'\n'}4. <span className="text-[#0062FF]">设备信息</span>：设备型号、操作系统版本、网络类型等基础设备信息。
        {'\n'}5. <span className="text-[#0062FF]">日志信息</span>：IP地址、访问时间、页面浏览记录等服务日志。
      </>
    ),
  },
  {
    title: '三、信息的使用方式',
    content: (
      <>
        我们收集的信息将用于以下目的：
        {'\n'}1. 为您提供<span className="text-[#0062FF]">班级事务管理、考勤、作业、活动</span>等核心功能服务；
        {'\n'}2. 改进和优化软件功能与用户体验；
        {'\n'}3. 保障软件的安全稳定运行，防范安全风险；
        {'\n'}4. 向您发送与班级事务相关的通知和提醒；
        {'\n'}5. 遵守法律法规要求，配合相关监管。
      </>
    ),
  },
  {
    title: '四、信息的存储与保护',
    content: (
      <>
        1. 我们采用行业标准的<span className="text-[#0062FF]">安全技术措施</span>（如数据加密、访问控制等）保护您的个人信息。
        {'\n'}2. 您的个人信息将存储在<span className="text-[#0062FF]">中华人民共和国境内</span>的服务器上。
        {'\n'}3. 我们仅在实现本政策所述目的所必需的时间内保留您的个人信息，超出保留期限后将进行<span className="text-[#0062FF]">删除或匿名化处理</span>。
      </>
    ),
  },
  {
    title: '五、信息的共享与披露',
    content: (
      <>
        1. 我们<span className="text-[#0062FF]">不会向第三方出售</span>您的个人信息。
        {'\n'}2. 在以下情况下，我们可能会共享您的信息：
        {'\n'}   - 获得您的明确同意；
        {'\n'}   - 为完成班级内的事务协作（如考勤统计、作业收交），在班级成员范围内共享必要信息；
        {'\n'}   - 法律法规要求或政府部门依法调取；
        {'\n'}   - 为保护本软件及用户的合法权益。
      </>
    ),
  },
  {
    title: '六、Cookie 与类似技术',
    content: (
      <>
        本软件可能使用 Cookie 或类似技术来存储您的登录状态和偏好设置，以提升使用体验。您可以通过浏览器设置管理或删除 Cookie。
      </>
    ),
  },
  {
    title: '七、您的权利',
    content: (
      <>
        您对自己的个人信息享有以下权利：
        {'\n'}1. <span className="text-[#0062FF]">访问权</span>：您可以查看本软件收集的您的个人信息；
        {'\n'}2. <span className="text-[#0062FF]">更正权</span>：您可以要求更正不准确的个人信息；
        {'\n'}3. <span className="text-[#0062FF]">删除权</span>：在符合法律法规的前提下，您可以请求删除您的个人信息；
        {'\n'}4. <span className="text-[#0062FF]">注销权</span>：您可以随时注销账号，注销后我们将停止收集并使用您的信息。
      </>
    ),
  },
  {
    title: '八、未成年人保护',
    content: (
      <>
        本软件主要面向高校学生群体。若您是未成年人，请在<span className="text-[#0062FF]">监护人指导</span>下使用本软件，监护人应仔细阅读本政策并同意后方可使用。
      </>
    ),
  },
  {
    title: '九、政策的更新',
    content: (
      <>
        本政策可能适时更新。更新后的政策将在本页面公布，重大变更将通过软件内通知等方式告知您。若您继续使用本软件，即表示您同意更新后的政策。
      </>
    ),
  },
  {
    title: '十、联系我们',
    content: (
      <>
        如您对本政策有任何疑问、意见或建议，请通过软件内<span className="text-[#0062FF]">"帮助与反馈"</span>功能与我们联系。我们将在合理期限内予以回复。
      </>
    ),
  },
];

export default function PrivacyPolicy() {
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
              ◉◉
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
            隐私政策
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
              如您对本政策有任何疑问，请通过软件内"帮助与反馈"功能联系我们。
            </p>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}
