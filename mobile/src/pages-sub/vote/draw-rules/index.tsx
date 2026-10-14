import { View, Text } from '@tarojs/components'

import { NavBar } from '@/components/business'
import './index.scss'

const RULES = [
  {
    title: '参与范围',
    content: '抽签从当前班级的所有成员中随机抽取，包括班长和班委。总人数以班级实际导入的成员名单为准。'
  },
  {
    title: '随机机制',
    content: '采用 Fisher-Yates 洗牌算法，确保每位成员被抽中的概率完全均等。每次抽签结果独立，不受历史抽签记录影响。'
  },
  {
    title: '正选与候补',
    content: '正选代表为优先中签人员，候补代表按顺序递补。若正选代表因故无法参加，由候补代表依次替补。正选与候补不会重复。'
  },
  {
    title: '重复抽签',
    content: '每次点击“开始抽签”将产生全新的随机结果，之前的抽签结果不会被覆盖，可在“中签记录”中查看历史结果。'
  },
  {
    title: '注意事项',
    content: '抽签结果仅作为参考，最终决定权由班长或活动负责人确认。抽签记录可保存并同步至班级通知，方便全班查看。'
  }
]

export default function DrawRules() {
  return (
    <View className='drawrules'>
      <NavBar title='抽签规则' />

      <View className='drawrules__body'>
        {RULES.map((rule, index) => (
          <View className='drawrules__card' key={index}>
            <View className='drawrules__head'>
              <View className='drawrules__badge'>
                <Text className='drawrules__badge-text'>{index + 1}</Text>
              </View>
              <Text className='drawrules__title'>{rule.title}</Text>
            </View>
            <Text className='drawrules__content'>{rule.content}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}