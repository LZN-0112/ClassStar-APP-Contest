import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { NavBar } from '@/components/business'

import './index.scss'

interface Seg {
  text: string
  highlight?: boolean
}
interface Section {
  title: string
  paragraphs: Seg[][]
}

const sections: Section[] = [
  {
    title: '一、引言',
    paragraphs: [
      [
        { text: '班务星App', highlight: true },
        {
          text: '（以下简称"本软件"）高度重视用户隐私保护。本隐私政策（以下简称"本政策"）旨在向您说明本软件如何'
        },
        { text: '收集、使用、存储、共享和保护', highlight: true },
        { text: '您的个人信息。请您在使用本软件前仔细阅读本政策。' }
      ]
    ]
  },
  {
    title: '二、我们收集的信息',
    paragraphs: [
      [ { text: '1. ' }, { text: '账号信息', highlight: true }, { text: '：您在注册时提供的手机号码、姓名等基本信息。' } ],
      [ { text: '2. ' }, { text: '班级信息', highlight: true }, { text: '：您所属班级的名称、班级成员列表等。' } ],
      [ { text: '3. ' }, { text: '使用记录', highlight: true }, { text: '：您在使用本软件过程中产生的考勤记录、作业提交记录、活动报名记录、投票记录等操作数据。' } ],
      [ { text: '4. ' }, { text: '设备信息', highlight: true }, { text: '：设备型号、操作系统版本、网络类型等基础设备信息。' } ],
      [ { text: '5. ' }, { text: '日志信息', highlight: true }, { text: '：IP地址、访问时间、页面浏览记录等服务日志。' } ]
    ]
  },
  {
    title: '三、信息的使用方式',
    paragraphs: [
      [ { text: '我们收集的信息将用于以下目的：' } ],
      [ { text: '1. 为您提供' }, { text: '班级事务管理、考勤、作业、活动', highlight: true }, { text: '等核心功能服务；' } ],
      [ { text: '2. 改进和优化软件功能与用户体验；' } ],
      [ { text: '3. 保障软件的安全稳定运行，防范安全风险；' } ],
      [ { text: '4. 向您发送与班级事务相关的通知和提醒；' } ],
      [ { text: '5. 遵守法律法规要求，配合相关监管。' } ]
    ]
  },
  {
    title: '四、信息的存储与保护',
    paragraphs: [
      [ { text: '1. 我们采用行业标准的' }, { text: '安全技术措施', highlight: true }, { text: '（如数据加密、访问控制等）保护您的个人信息。' } ],
      [ { text: '2. 您的个人信息将存储在' }, { text: '中华人民共和国境内', highlight: true }, { text: '的服务器上。' } ],
      [ { text: '3. 我们仅在实现本政策所述目的所必需的时间内保留您的个人信息，超出保留期限后将进行' }, { text: '删除或匿名化处理', highlight: true }, { text: '。' } ]
    ]
  },
  {
    title: '五、信息的共享与披露',
    paragraphs: [
      [ { text: '1. 我们' }, { text: '不会向第三方出售', highlight: true }, { text: '您的个人信息。' } ],
      [ { text: '2. 在以下情况下，我们可能会共享您的信息：' } ],
      [ { text: '   - 获得您的明确同意；' } ],
      [ { text: '   - 为完成班级内的事务协作（如考勤统计、作业收交），在班级成员范围内共享必要信息；' } ],
      [ { text: '   - 法律法规要求或政府部门依法调取；' } ],
      [ { text: '   - 为保护本软件及用户的合法权益。' } ]
    ]
  },
  {
    title: '六、Cookie 与类似技术',
    paragraphs: [
      [ { text: '本软件可能使用 Cookie 或类似技术来存储您的登录状态和偏好设置，以提升使用体验。您可以通过浏览器设置管理或删除 Cookie。' } ]
    ]
  },
  {
    title: '七、您的权利',
    paragraphs: [
      [ { text: '您对自己的个人信息享有以下权利：' } ],
      [ { text: '1. ' }, { text: '访问权', highlight: true }, { text: '：您可以查看本软件收集的您的个人信息；' } ],
      [ { text: '2. ' }, { text: '更正权', highlight: true }, { text: '：您可以要求更正不准确的个人信息；' } ],
      [ { text: '3. ' }, { text: '删除权', highlight: true }, { text: '：在符合法律法规的前提下，您可以请求删除您的个人信息；' } ],
      [ { text: '4. ' }, { text: '注销权', highlight: true }, { text: '：您可以随时注销账号，注销后我们将停止收集并使用您的信息。' } ]
    ]
  },
  {
    title: '八、未成年人保护',
    paragraphs: [
      [ { text: '本软件主要面向高校学生群体。若您是未成年人，请在' }, { text: '监护人指导', highlight: true }, { text: '下使用本软件，监护人应仔细阅读本政策并同意后方可使用。' } ]
    ]
  },
  {
    title: '九、政策的更新',
    paragraphs: [
      [ { text: '本政策可能适时更新。更新后的政策将在本页面公布，重大变更将通过软件内通知等方式告知您。若您继续使用本软件，即表示您同意更新后的政策。' } ]
    ]
  },
  {
    title: '十、联系我们',
    paragraphs: [
      [ { text: '如您对本政策有任何疑问、意见或建议，请通过软件内' }, { text: '"帮助与反馈"', highlight: true }, { text: '功能与我们联系。我们将在合理期限内予以回复。' } ]
    ]
  }
]

function renderParagraph(paragraph: Seg[], idx: number) {
  return (
    <Text key={idx} className='privacy__text'>
      {paragraph.map((seg, k) => (
        <Text
          key={k}
          className={seg.highlight ? 'privacy__text--highlight' : undefined}
        >
          {seg.text}
        </Text>
      ))}
    </Text>
  )
}

export default function PrivacyPolicy() {
  return (
    <View className='privacy'>
      <NavBar
        title='隐私政策'
        onBack={() => Taro.navigateBack()}
      />

      <View className='privacy__content'>
        <View className='privacy__card'>
          <Text className='privacy__date'>
            更新日期：2026年9月3日{'\n'}生效日期：2026年9月3日
          </Text>
        </View>

        {sections.map((section, index) => (
          <View key={index} className='privacy__card'>
            <Text className='privacy__heading'>{section.title}</Text>
            {section.paragraphs.map(renderParagraph)}
          </View>
        ))}

        <View className='privacy__card'>
          <Text className='privacy__text'>
            如您对本政策有任何疑问，请通过软件内&quot;帮助与反馈&quot;功能联系我们。
          </Text>
        </View>
      </View>
    </View>
  )
}