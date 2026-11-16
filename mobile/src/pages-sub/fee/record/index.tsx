// ============================================================
// 班费记账（1:1 对齐 front/src/pages/finance/FeeRecord.tsx）
// ============================================================
import { useLoad } from '@tarojs/taro'

import { useAuth } from '@/utils'
import FeeRecordForm from '../components/FeeRecordForm'

export default function FeeRecord() {
  const { requireLogin } = useAuth()

  useLoad(() => {
    requireLogin()
  })

  return <FeeRecordForm feeType='class' />
}