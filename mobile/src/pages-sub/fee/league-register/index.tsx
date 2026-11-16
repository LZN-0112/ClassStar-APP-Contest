// ============================================================
// 团费缴费登记（1:1 对齐 front/src/pages/finance/LeaguePaymentRegister.tsx）
// ============================================================
import { useLoad } from '@tarojs/taro'

import { useAuth } from '@/utils'
import FeePaymentRegisterForm from '../components/FeePaymentRegisterForm'

export default function LeaguePaymentRegister() {
  const { requireLogin } = useAuth()

  useLoad(() => {
    requireLogin()
  })

  return (
    <FeePaymentRegisterForm feeType='group' title='团费' defaultAmount={10} />
  )
}