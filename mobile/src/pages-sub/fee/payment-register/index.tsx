// ============================================================
// 班费缴费登记（1:1 对齐 front/src/pages/finance/PaymentRegister.tsx）
// ============================================================
import { useLoad } from '@tarojs/taro'

import { useAuth } from '@/utils'
import FeePaymentRegisterForm from '../components/FeePaymentRegisterForm'

export default function PaymentRegister() {
  const { requireLogin } = useAuth()

  useLoad(() => {
    requireLogin()
  })

  return (
    <FeePaymentRegisterForm feeType='class' title='班费' defaultAmount={50} />
  )
}