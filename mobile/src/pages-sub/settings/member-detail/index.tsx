// ============================================================
// 成员详情
// 1:1 对齐 front/src/pages/class/MemberDetail.tsx
// 名片 + 基本信息 + 身份设置 + 成员管理 + 三确认弹窗 + 三底部弹层
// ============================================================
import { useRef, useState } from 'react'
import { Image, Input, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useLoad } from '@tarojs/taro'

import { BottomSheet, ConfirmDialog, StatusBar } from '@/components/business'
import { Icon } from '@/components/ui'
import type { IconName } from '@/constants/icons'
import { classSettingsApi } from '@/services'
import { useUserStore } from '@/stores'
import './index.scss'

interface MemberDetailData {
  id: string
  userId: string
  name: string
  avatar?: string
  studentId?: string | null
  role: string
  roleLevel: 'owner' | 'admin' | 'member'
  isCommittee: boolean
  verifyStatus?: 'CONFIRMED' | 'PENDING' | 'UNVERIFIED'
  verifiedAt?: string | null
  joinedAt: string
}

const ROLE_LABEL: Record<string, string> = {
  owner: '群主',
  admin: '管理员',
  member: '成员'
}

const VERIFY_STATUS_TEXT: Record<string, string> = {
  CONFIRMED: '已确认',
  PENDING: '待确认',
  UNVERIFIED: '未核实'
}

const AVATAR_COLORS = ['#0062FF', '#10B981', '#F97316', '#8B5CF6', '#EF4444', '#0EA5E9']

function avatarColor(name: string) {
  let sum = 0
  for (let i = 0; i < name.length; i += 1) sum += name.charCodeAt(i)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

export default function MemberDetailPage() {
  const memberIdRef = useRef('')

  useLoad((options) => {
    memberIdRef.current = options.memberId || ''
  })

  const currentClassId = useUserStore((s) => s.currentClassId)
  const currentUser = useUserStore((s) => s.userInfo)

  const isOwnerRole = currentUser?.roleLevel === 'owner'
  const canManage = isOwnerRole || currentUser?.roleLevel === 'admin'

  const [member, setMember] = useState<MemberDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'transfer' | 'reset' | 'remove' | null>(null)

  const [resetResult, setResetResult] = useState<{
    name: string
    phone: string | null
    tempPassword: string
  } | null>(null)

  const [profileSheetOpen, setProfileSheetOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editStudentId, setEditStudentId] = useState('')

  const [roleSheetOpen, setRoleSheetOpen] = useState(false)
  const [editRole, setEditRole] = useState('')

  const canEditRole = !!member && canManage && (member.roleLevel !== 'owner' || isOwnerRole)
  const canRemoveMember =
    !!member &&
    member.roleLevel !== 'owner' &&
    (isOwnerRole || member.roleLevel === 'member')

  const fetchMember = async (id: string) => {
    if (!currentClassId || !id) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await classSettingsApi.getMemberDetail(currentClassId, id)
      setMember((res as MemberDetailData) || null)
    } catch {
      setMember(null)
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    void fetchMember(memberIdRef.current)
  })

  const reload = async () => {
    await fetchMember(memberIdRef.current)
  }

  const goBack = () => {
    if (Taro.getCurrentPages().length > 1) Taro.navigateBack()
    else Taro.reLaunch({ url: '/pages/home/index' })
  }

  const openRoleSheet = () => {
    if (!member) return
    setEditRole(member.role || '')
    setRoleSheetOpen(true)
  }

  const updateDisplayRole = async () => {
    if (!currentClassId || !member || actionLoading) return
    const role = editRole.trim()
    if (!role) {
      Taro.showToast({ title: '请输入身份名称', icon: 'none' })
      return
    }
    setActionLoading(true)
    try {
      await classSettingsApi.updateMemberDisplayRole(currentClassId, member.userId, role)
      Taro.showToast({ title: '身份已更新', icon: 'none' })
      setRoleSheetOpen(false)
      await reload()
    } catch {
      // 请求层已统一 toast
    } finally {
      setActionLoading(false)
    }
  }

  const openProfileSheet = () => {
    if (!member) return
    setEditName(member.name || '')
    setEditStudentId(member.studentId || '')
    setProfileSheetOpen(true)
  }

  const verifyMember = async () => {
    if (!currentClassId || !member || actionLoading) return
    setActionLoading(true)
    try {
      await classSettingsApi.verifyMember(currentClassId, member.userId, 'CONFIRMED')
      Taro.showToast({ title: '已确认该成员身份', icon: 'none' })
      await reload()
    } catch {
      // 请求层已统一 toast
    } finally {
      setActionLoading(false)
    }
  }

  const updateMemberProfile = async () => {
    if (!currentClassId || !member || actionLoading) return
    const realName = editName.trim()
    const studentId = editStudentId.trim()
    if (!realName && !studentId) {
      Taro.showToast({ title: '请至少填写真实姓名或学号', icon: 'none' })
      return
    }
    setActionLoading(true)
    try {
      await classSettingsApi.updateMemberProfile(currentClassId, member.userId, {
        ...(realName ? { realName } : {}),
        ...(studentId ? { studentId } : {})
      })
      Taro.showToast({ title: '成员信息已更新', icon: 'none' })
      setProfileSheetOpen(false)
      await reload()
    } catch {
      // 请求层已统一 toast
    } finally {
      setActionLoading(false)
    }
  }

  const setRoleLevel = async (roleLevel: 'admin' | 'member') => {
    if (!currentClassId || !member || actionLoading) return
    setActionLoading(true)
    try {
      await classSettingsApi.updateMemberRoleLevel(currentClassId, member.userId, {
        roleLevel,
        role: roleLevel === 'admin' ? '管理员' : undefined
      })
      Taro.showToast({
        title: roleLevel === 'admin' ? '已设为管理员' : '已取消管理员',
        icon: 'none'
      })
      await reload()
    } catch {
      // 请求层已统一 toast
    } finally {
      setActionLoading(false)
    }
  }

  const resetPassword = async () => {
    if (!currentClassId || !member || actionLoading) return
    setActionLoading(true)
    try {
      const data = await classSettingsApi.resetMemberPassword(currentClassId, member.userId)
      setResetResult({
        name: data?.name || member.name,
        phone: data?.phone || null,
        tempPassword: data?.tempPassword || ''
      })
      setConfirmAction(null)
    } catch {
      // 请求层已统一 toast
    } finally {
      setActionLoading(false)
    }
  }

  const transferOwner = async () => {
    if (!currentClassId || !member || actionLoading) return
    setActionLoading(true)
    try {
      await classSettingsApi.transferOwner(currentClassId, member.userId)
      Taro.showToast({ title: '群主转让成功', icon: 'none' })
      setConfirmAction(null)
      setTimeout(() => goBack(), 600)
    } catch {
      // 请求层已统一 toast
    } finally {
      setActionLoading(false)
    }
  }

  const removeMember = async () => {
    if (!currentClassId || !member || actionLoading) return
    setActionLoading(true)
    try {
      await classSettingsApi.removeMember(currentClassId, member.id)
      Taro.showToast({ title: `已将 ${member.name} 移出班级`, icon: 'none' })
      setConfirmAction(null)
      setTimeout(() => goBack(), 600)
    } catch {
      // 请求层已统一 toast
    } finally {
      setActionLoading(false)
    }
  }

  const copyResetResult = async () => {
    if (!resetResult) return
    const text = `${resetResult.name} 的临时密码：${resetResult.tempPassword}${
      resetResult.phone ? `（登录手机号 ${resetResult.phone}）` : ''
    }`
    try {
      await Taro.setClipboardData({ data: text })
      Taro.showToast({ title: '已复制', icon: 'none' })
    } catch {
      Taro.showToast({ title: '复制失败，请手动记录', icon: 'none' })
    }
  }

  const badgeStyle = () => {
    if (member?.roleLevel === 'owner') return { backgroundColor: '#0062FF', color: '#FFFFFF' }
    if (member?.roleLevel === 'admin') return { backgroundColor: '#10B981', color: '#FFFFFF' }
    return { backgroundColor: '#F3F4F6', color: '#4B5563' }
  }

  const infoRows: { icon: IconName; label: string; value: string }[] = member
    ? [
        { icon: 'users', label: '所属班级', value: currentUser?.className || '—' },
        { icon: 'calendar', label: '加入时间', value: formatDate(member.joinedAt) },
        { icon: 'user', label: '学号', value: member.studentId || '未公开/未填写' },
        {
          icon: 'shield',
          label: '身份核实',
          value: member.verifyStatus ? VERIFY_STATUS_TEXT[member.verifyStatus] : '—'
        },
        {
          icon: member.roleLevel === 'member' ? 'shield' : 'shield-off',
          label: '成员身份',
          value: member.isCommittee ? '班委成员' : '普通成员'
        }
      ]
    : []

  return (
    <View className='mdetail'>
      <StatusBar />

      <View className='mdetail__body'>
        <View className='mdetail__spacer' />

        <View className='mdetail__header'>
          <View className='mdetail__back' onClick={goBack}>
            <Icon name='chevron-left' size={44} color='#1A1A1A' strokeWidth={2} />
          </View>
          <Text className='mdetail__header-title'>成员详情</Text>
        </View>

        {loading ? (
          <View className='mdetail__skeleton'>
            <View className='mdetail__skeleton-block mdetail__skeleton-block--lg' />
            <View className='mdetail__skeleton-block mdetail__skeleton-block--sm' />
          </View>
        ) : !member ? (
          <View className='mdetail__empty'>
            <View className='mdetail__empty-icon'>
              <Icon name='users' size={64} color='#0062FF' strokeWidth={1.5} />
            </View>
            <Text className='mdetail__empty-text'>
              {memberIdRef.current ? '成员信息加载失败' : '未选择成员'}
            </Text>
            <View className='mdetail__primary-btn' onClick={goBack}>
              <Text className='mdetail__primary-btn-text'>返回成员列表</Text>
            </View>
          </View>
        ) : (
          <View className='mdetail__content'>
            {/* 名片 */}
            <View className='mdetail__profile'>
              <View
                className={`mdetail__avatar ${member.avatar ? 'mdetail__avatar--img' : ''}`}
                style={{ backgroundColor: member.avatar ? '#F3F4F6' : avatarColor(member.name) }}
              >
                {member.avatar ? (
                  <Image className='mdetail__avatar-img' src={member.avatar} mode='aspectFill' />
                ) : (
                  <Text className='mdetail__avatar-text'>{member.name.charAt(0)}</Text>
                )}
              </View>
              <View className='mdetail__profile-info'>
                <View className='mdetail__name-row'>
                  <Text className='mdetail__name'>{member.name}</Text>
                  <View className='mdetail__badge' style={badgeStyle()}>
                    <Text className='mdetail__badge-text' style={{ color: badgeStyle().color }}>
                      {ROLE_LABEL[member.roleLevel]}
                    </Text>
                  </View>
                </View>
                <View className='mdetail__sub-row'>
                  <Icon name='user' size={28} color='#6B7280' strokeWidth={2} />
                  <Text className='mdetail__sub-text'>{member.role || '班级成员'}</Text>
                  {member.isCommittee ? (
                    <View className='mdetail__committee'>
                      <Text className='mdetail__committee-text'>班委</Text>
                    </View>
                  ) : null}
                  {member.userId === currentUser?.id ? (
                    <Text className='mdetail__self'>(我)</Text>
                  ) : null}
                </View>
              </View>
            </View>

            {/* 基本信息 */}
            <View className='mdetail__info'>
              {infoRows.map((row, idx) => (
                <View
                  className={`mdetail__info-row ${
                    idx < infoRows.length - 1 ? 'mdetail__info-row--line' : ''
                  }`}
                  key={row.label}
                >
                  <Icon name={row.icon} size={34} color='#9CA3AF' strokeWidth={2} />
                  <Text className='mdetail__info-label'>{row.label}</Text>
                  <Text className='mdetail__info-value'>{row.value}</Text>
                </View>
              ))}
            </View>

            {/* 身份设置 */}
            {canEditRole ? (
              <View className='mdetail__card'>
                <Text className='mdetail__card-title'>身份设置</Text>
                <View
                  className={`mdetail__action ${actionLoading ? 'mdetail__action--disabled' : ''}`}
                  onClick={() => {
                    if (!actionLoading) openRoleSheet()
                  }}
                >
                  <View className='mdetail__action-icon mdetail__action-icon--blue'>
                    <Icon name='user' size={36} color='#0062FF' strokeWidth={2} />
                  </View>
                  <View className='mdetail__action-main'>
                    <Text className='mdetail__action-title'>修改身份</Text>
                    <Text className='mdetail__action-desc'>
                      当前身份：{member.role || '未设置'}，如班长、团支书、学习委员
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* 成员管理 */}
            {canManage && member.roleLevel !== 'owner' && member.userId !== currentUser?.id ? (
              <View className='mdetail__card'>
                <Text className='mdetail__card-title'>成员管理</Text>

                {isOwnerRole ? (
                  <View className='mdetail__fragment'>
                    {member.roleLevel === 'member' ? (
                      <View
                        className={`mdetail__action ${actionLoading ? 'mdetail__action--disabled' : ''}`}
                        onClick={() => {
                          if (!actionLoading) void setRoleLevel('admin')
                        }}
                      >
                        <View className='mdetail__action-icon mdetail__action-icon--blue'>
                          <Icon name='shield' size={36} color='#0062FF' strokeWidth={2} />
                        </View>
                        <View className='mdetail__action-main'>
                          <Text className='mdetail__action-title'>设为管理员</Text>
                          <Text className='mdetail__action-desc'>可协助管理班级成员与考勤</Text>
                        </View>
                      </View>
                    ) : (
                      <View
                        className={`mdetail__action ${actionLoading ? 'mdetail__action--disabled' : ''}`}
                        onClick={() => {
                          if (!actionLoading) void setRoleLevel('member')
                        }}
                      >
                        <View className='mdetail__action-icon'>
                          <Icon name='shield-off' size={36} color='#6B7280' strokeWidth={2} />
                        </View>
                        <View className='mdetail__action-main'>
                          <Text className='mdetail__action-title'>取消管理员</Text>
                          <Text className='mdetail__action-desc'>恢复为普通成员权限</Text>
                        </View>
                      </View>
                    )}
                    <View
                      className={`mdetail__action ${actionLoading ? 'mdetail__action--disabled' : ''}`}
                      onClick={() => {
                        if (!actionLoading) setConfirmAction('transfer')
                      }}
                    >
                      <View className='mdetail__action-icon mdetail__action-icon--orange'>
                        <Icon name='crown' size={36} color='#F59E0B' strokeWidth={2} />
                      </View>
                      <View className='mdetail__action-main'>
                        <Text className='mdetail__action-title'>转让群主</Text>
                        <Text className='mdetail__action-desc'>转让后你将变为管理员</Text>
                      </View>
                    </View>
                  </View>
                ) : null}

                <View
                  className={`mdetail__action ${actionLoading ? 'mdetail__action--disabled' : ''}`}
                  onClick={() => {
                    if (!actionLoading) void verifyMember()
                  }}
                >
                  <View className='mdetail__action-icon mdetail__action-icon--green'>
                    <Icon name='shield' size={36} color='#10B981' strokeWidth={2} />
                  </View>
                  <View className='mdetail__action-main'>
                    <Text className='mdetail__action-title'>
                      {member.verifyStatus === 'CONFIRMED' ? '身份已确认' : '确认成员身份'}
                    </Text>
                    <Text className='mdetail__action-desc'>
                      {member.verifyStatus === 'CONFIRMED'
                        ? '该成员信息已核对无误'
                        : '核对无误后标记为已确认'}
                    </Text>
                  </View>
                </View>

                <View
                  className={`mdetail__action ${actionLoading ? 'mdetail__action--disabled' : ''}`}
                  onClick={() => {
                    if (!actionLoading) openProfileSheet()
                  }}
                >
                  <View className='mdetail__action-icon mdetail__action-icon--blue'>
                    <Icon name='edit' size={36} color='#0062FF' strokeWidth={2} />
                  </View>
                  <View className='mdetail__action-main'>
                    <Text className='mdetail__action-title'>修正姓名与学号</Text>
                    <Text className='mdetail__action-desc'>
                      成员填写有误时可代为修改，保存后视为已确认
                    </Text>
                  </View>
                </View>

                <View
                  className={`mdetail__action ${actionLoading ? 'mdetail__action--disabled' : ''}`}
                  onClick={() => {
                    if (!actionLoading) setConfirmAction('reset')
                  }}
                >
                  <View className='mdetail__action-icon'>
                    <Icon name='key-round' size={36} color='#6B7280' strokeWidth={2} />
                  </View>
                  <View className='mdetail__action-main'>
                    <Text className='mdetail__action-title'>重置登录密码</Text>
                    <Text className='mdetail__action-desc'>生成一次性临时密码，仅本页显示</Text>
                  </View>
                </View>

                {canRemoveMember ? (
                  <View
                    className={`mdetail__action ${actionLoading ? 'mdetail__action--disabled' : ''}`}
                    onClick={() => {
                      if (!actionLoading) setConfirmAction('remove')
                    }}
                  >
                    <View className='mdetail__action-icon mdetail__action-icon--danger'>
                      <Icon name='user-minus' size={36} color='#DC2626' strokeWidth={2} />
                    </View>
                    <View className='mdetail__action-main'>
                      <Text className='mdetail__action-title mdetail__action-title--danger'>
                        移出班级
                      </Text>
                      <Text className='mdetail__action-desc'>移除后该成员将无法访问班级内容</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        )}
      </View>

      <ConfirmDialog
        open={confirmAction === 'remove'}
        title={`确认将 ${member?.name ?? ''} 移出班级？`}
        description='移除后该成员将立即失去该班级的通知、作业、资料和考勤访问权限，如需重新加入需使用班级码。'
        confirmText='确认移除'
        danger
        loading={actionLoading}
        onCancel={() => {
          if (!actionLoading) setConfirmAction(null)
        }}
        onConfirm={() => void removeMember()}
      />

      <ConfirmDialog
        open={confirmAction === 'transfer'}
        title={`确认把群主转让给 ${member?.name ?? ''}？`}
        description='转让后你将成为管理员，仍可协助管理班级；此操作不可撤回。'
        confirmText='确认转让'
        danger
        loading={actionLoading}
        onCancel={() => {
          if (!actionLoading) setConfirmAction(null)
        }}
        onConfirm={() => void transferOwner()}
      />

      <ConfirmDialog
        open={confirmAction === 'reset'}
        title={`重置${member?.name ?? ''}的登录密码？`}
        description='重置后该成员所有设备会被退出登录，系统将生成一次性临时密码，仅本页显示一次。'
        confirmText='确认重置'
        danger
        loading={actionLoading}
        onCancel={() => {
          if (!actionLoading) setConfirmAction(null)
        }}
        onConfirm={() => void resetPassword()}
      />

      <BottomSheet
        open={profileSheetOpen}
        title='修正成员信息'
        maxHeight={480}
        onClose={() => {
          if (!actionLoading) setProfileSheetOpen(false)
        }}
        footer={
          <View className='mdetail__sheet-actions'>
            <View className='mdetail__sheet-btn mdetail__sheet-btn--ghost' onClick={() => setProfileSheetOpen(false)}>
              <Text className='mdetail__sheet-btn-text mdetail__sheet-btn-text--ghost'>取消</Text>
            </View>
            <View
              className={`mdetail__sheet-btn mdetail__sheet-btn--primary ${
                actionLoading ? 'mdetail__sheet-btn--disabled' : ''
              }`}
              onClick={() => {
                if (!actionLoading) void updateMemberProfile()
              }}
            >
              <Text className='mdetail__sheet-btn-text'>
                {actionLoading ? '保存中...' : '保存'}
              </Text>
            </View>
          </View>
        }
      >
        <View className='mdetail__form'>
          <Input
            className='mdetail__input'
            value={editName}
            maxlength={50}
            placeholder='真实姓名'
            placeholderClass='mdetail__placeholder'
            onInput={(e) => setEditName(e.detail.value)}
          />
          <Input
            className='mdetail__input'
            value={editStudentId}
            maxlength={30}
            placeholder='学号'
            placeholderClass='mdetail__placeholder'
            onInput={(e) => setEditStudentId(e.detail.value)}
          />
          <Text className='mdetail__form-tip'>
            保存后将以修改后的姓名和学号为准，并把该成员标记为「已确认」。
          </Text>
        </View>
      </BottomSheet>

      <BottomSheet
        open={roleSheetOpen}
        title='修改身份'
        maxHeight={480}
        onClose={() => {
          if (!actionLoading) setRoleSheetOpen(false)
        }}
        footer={
          <View className='mdetail__sheet-actions'>
            <View className='mdetail__sheet-btn mdetail__sheet-btn--ghost' onClick={() => setRoleSheetOpen(false)}>
              <Text className='mdetail__sheet-btn-text mdetail__sheet-btn-text--ghost'>取消</Text>
            </View>
            <View
              className={`mdetail__sheet-btn mdetail__sheet-btn--primary ${
                actionLoading ? 'mdetail__sheet-btn--disabled' : ''
              }`}
              onClick={() => {
                if (!actionLoading) void updateDisplayRole()
              }}
            >
              <Text className='mdetail__sheet-btn-text'>
                {actionLoading ? '保存中...' : '保存'}
              </Text>
            </View>
          </View>
        }
      >
        <View className='mdetail__form'>
          <Input
            className='mdetail__input'
            value={editRole}
            maxlength={20}
            placeholder='如 班长、团支书、学习委员'
            placeholderClass='mdetail__placeholder'
            onInput={(e) => setEditRole(e.detail.value)}
          />
          <Text className='mdetail__form-tip'>
            身份仅用于展示，不改变权限；「群主」「管理员」等权限角色请通过成员管理设置。
          </Text>
        </View>
      </BottomSheet>

      <BottomSheet
        open={!!resetResult}
        title='临时密码已生成'
        maxHeight={560}
        onClose={() => setResetResult(null)}
        footer={
          <View className='mdetail__sheet-actions'>
            <View className='mdetail__sheet-btn mdetail__sheet-btn--ghost' onClick={() => void copyResetResult()}>
              <Text className='mdetail__sheet-btn-text mdetail__sheet-btn-text--ghost'>复制</Text>
            </View>
            <View
              className='mdetail__sheet-btn mdetail__sheet-btn--primary'
              onClick={() => setResetResult(null)}
            >
              <Text className='mdetail__sheet-btn-text'>我已记录</Text>
            </View>
          </View>
        }
      >
        {resetResult ? (
          <View className='mdetail__reset'>
            <Text className='mdetail__reset-desc'>
              {resetResult.name}
              {resetResult.phone ? `（${resetResult.phone}）` : ''}
              请用下方临时密码登录，登录后立即修改密码。
            </Text>
            <View className='mdetail__reset-password'>
              <Text className='mdetail__reset-password-text'>{resetResult.tempPassword}</Text>
            </View>
            <Text className='mdetail__reset-warn'>关闭后无法再次查看，请先复制或记录</Text>
          </View>
        ) : null}
      </BottomSheet>
    </View>
  )
}