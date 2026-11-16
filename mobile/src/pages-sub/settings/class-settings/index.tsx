// ============================================================
// 班级设置
// 1:1 对齐 front/src/pages/class/ClassSettings.tsx
// 含：班级信息卡（班级码/复制/编辑/二维码）、公告、管理入口、
//     邀请、退出班级/解散班级、编辑/解散/二维码弹层
// ============================================================
import { useEffect, useState } from 'react'
import { Image, Input, Text, Textarea, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { BottomSheet, ConfirmDialog, StatusBar } from '@/components/business'
import { Icon } from '@/components/ui'
import type { IconName } from '@/constants/icons'
import { classSettingsApi, classesApi } from '@/services'
import type { ClassDetail } from '@/services/classes'
import { useUserStore } from '@/stores'
import './index.scss'

/** 组织类型（同 front/src/utils/org.ts） */
const ORG_TYPE_LABEL: Record<string, string> = {
  class: '班级',
  association: '社团',
  committee: '部门',
  club: '兴趣小组'
}

interface InfoRow {
  label: string
  value: string
}

interface ManageRow {
  title: string
  subtitle: string
  icon: IconName
  path: string
}

export default function ClassSettings() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const userInfo = useUserStore((s) => s.userInfo)
  const setCurrentClass = useUserStore((s) => s.setCurrentClass)

  const ownerRole = userInfo?.roleLevel === 'owner'
  const canManage = ownerRole || userInfo?.roleLevel === 'admin'

  const [classInfo, setClassInfo] = useState<ClassDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [leaving, setLeaving] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const [generatingQr, setGeneratingQr] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [form, setForm] = useState({ name: '', announcement: '', grade: '', major: '' })
  const [dissolveOpen, setDissolveOpen] = useState(false)
  const [dissolveInput, setDissolveInput] = useState('')
  const [dissolving, setDissolving] = useState(false)

  const fetchClass = async (id = currentClassId) => {
    if (!id) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await classesApi.getClassDetail(id)
      setClassInfo((data as ClassDetail) || null)
    } catch {
      setClassInfo(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchClass()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentClassId])

  useDidShow(() => {
    if (currentClassId) void fetchClass()
  })

  const goBack = () => {
    if (Taro.getCurrentPages().length > 1) Taro.navigateBack()
    else Taro.reLaunch({ url: '/pages/home/index' })
  }

  const copyText = (text: string, tip = '已复制') => {
    if (!text) return
    Taro.setClipboardData({
      data: text,
      success: () => Taro.showToast({ title: tip, icon: 'success' })
    })
  }

  const handleGenerateQr = async () => {
    if (!currentClassId || generatingQr) return
    setGeneratingQr(true)
    try {
      const res = await classSettingsApi.generateClassQrCode(currentClassId)
      const url = res?.qrCodeUrl
      if (url) setClassInfo((prev) => (prev ? { ...prev, qrCodeUrl: url } : prev))
      Taro.showToast({ title: '二维码已生成', icon: 'success' })
    } catch {
      // 请求层已统一 toast
    } finally {
      setGeneratingQr(false)
    }
  }

  const backToJoin = () => {
    setCurrentClass('')
    Taro.reLaunch({ url: '/pages/auth/join-class/index' })
  }

  const handleLeave = async () => {
    if (!currentClassId || leaving) return
    setLeaving(true)
    try {
      await classSettingsApi.leaveClass(currentClassId)
      Taro.showToast({ title: '已退出班级', icon: 'success' })
      setShowLeaveConfirm(false)
      setTimeout(backToJoin, 600)
    } catch {
      // 请求层已统一 toast
    } finally {
      setLeaving(false)
    }
  }

  const openEdit = () => {
    if (!classInfo) return
    setForm({
      name: classInfo.name || '',
      announcement: classInfo.announcement || '',
      grade: classInfo.grade || '',
      major: classInfo.major || ''
    })
    setEditOpen(true)
  }

  const handleSave = async () => {
    if (!currentClassId || !classInfo || saveLoading) return
    if (!form.name.trim()) {
      Taro.showToast({ title: '班级名称不能为空', icon: 'none' })
      return
    }
    setSaveLoading(true)
    try {
      const updated = (await classSettingsApi.updateClassInfo(currentClassId, {
        name: form.name.trim(),
        announcement: form.announcement,
        grade: form.grade,
        major: form.major
      })) as ClassDetail | null
      setClassInfo((prev) =>
        prev
          ? {
              ...prev,
              name: updated?.name ?? prev.name,
              announcement: updated?.announcement ?? form.announcement,
              grade: updated?.grade ?? form.grade,
              major: updated?.major ?? form.major
            }
          : prev
      )
      Taro.showToast({ title: '班级信息已更新', icon: 'success' })
      setEditOpen(false)
    } catch {
      // 请求层已统一 toast
    } finally {
      setSaveLoading(false)
    }
  }

  const handleDissolve = async () => {
    if (!currentClassId || !classInfo || dissolving) return
    if (dissolveInput.trim() !== classInfo.name.trim()) {
      Taro.showToast({ title: '请输入完整的班级名称以确认', icon: 'none' })
      return
    }
    setDissolving(true)
    try {
      await classSettingsApi.deleteClass(currentClassId)
      Taro.showToast({ title: '班级已解散', icon: 'success' })
      setDissolveOpen(false)
      setTimeout(backToJoin, 600)
    } catch {
      // 请求层已统一 toast
    } finally {
      setDissolving(false)
    }
  }

  const formattedCode = classInfo?.code
    ? classInfo.code.length > 4
      ? `${classInfo.code.slice(0, 4)} ${classInfo.code.slice(4)}`
      : classInfo.code
    : ''
  const orgLabel = ORG_TYPE_LABEL[classInfo?.orgType || 'class'] || '班级'
  const totalMembers = classInfo?.memberCount ?? 0

  const infoRows: InfoRow[] = [
    { label: '人数', value: `${totalMembers} 人` },
    { label: '年级', value: classInfo?.grade || '未填写' },
    { label: '专业/方向', value: classInfo?.major || '未填写' },
    { label: '组织类型', value: orgLabel }
  ]

  const manageRows: ManageRow[] = [
    {
      title: '班级成员',
      subtitle: `查看和管理 ${totalMembers} 位成员`,
      icon: 'users',
      path: '/pages-sub/settings/member-list/index'
    },
    ...(canManage
      ? [
          {
            title: '导入学生名单',
            subtitle: '支持 Excel、教务系统、班级群导入',
            icon: 'upload' as IconName,
            path: '/pages-sub/settings/import-students/index'
          }
        ]
      : []),
    {
      title: '班级资料库',
      subtitle: '文件、图片与常用资料',
      icon: 'folder-open',
      path: '/pages-sub/material/library/index'
    },
    {
      title: '班级档案',
      subtitle: '荣誉、活动与班级成长记录',
      icon: 'archive',
      path: '/pages-sub/archive/file-list/index'
    }
  ]

  return (
    <View className='classset'>
      <StatusBar />

      <View className='classset__body'>
        <View className='classset__spacer' />

        <View className='classset__header'>
          <View className='classset__back' onClick={goBack}>
            <Icon name='chevron-left' size={44} color='#1A1A1A' strokeWidth={2} />
          </View>
          <Text className='classset__header-title'>班级设置</Text>
        </View>

        {!currentClassId ? (
          <View className='classset__empty'>
            <View className='classset__empty-icon'>
              <Icon name='users' size={64} color='#0062FF' strokeWidth={1.5} />
            </View>
            <Text className='classset__empty-text'>你还没有加入班级</Text>
            <View
              className='classset__primary-btn'
              onClick={() => Taro.navigateTo({ url: '/pages/auth/join-class/index' })}
            >
              <Text className='classset__primary-btn-text'>去加入班级</Text>
            </View>
          </View>
        ) : loading ? (
          <View className='classset__skeleton'>
            <View className='classset__skeleton-block classset__skeleton-block--sm' />
            <View className='classset__skeleton-block classset__skeleton-block--lg' />
          </View>
        ) : classInfo ? (
          <>
            {/* 班级信息 */}
            <View className='classset__card'>
              <View className='classset__identity'>
                <View className='classset__logo'>
                  {classInfo.logoUrl ? (
                    <Image className='classset__logo-img' src={classInfo.logoUrl} mode='aspectFill' />
                  ) : (
                    <Text className='classset__logo-text'>{classInfo.name.charAt(0)}</Text>
                  )}
                </View>
                <View className='classset__identity-main'>
                  <Text className='classset__name'>{classInfo.name}</Text>
                  <View className='classset__identity-sub'>
                    <View className='classset__badge'>
                      <Text className='classset__badge-text'>{orgLabel}</Text>
                    </View>
                    <Text className='classset__identity-desc'>
                      {[classInfo.grade, classInfo.major].filter(Boolean).join(' · ') || '班级信息'}
                    </Text>
                  </View>
                </View>
                <View className='classset__identity-actions'>
                  {canManage ? (
                    <View className='classset__icon-btn classset__icon-btn--blue' onClick={openEdit}>
                      <Icon name='edit' size={36} color='#0062FF' strokeWidth={2} />
                    </View>
                  ) : null}
                  <View className='classset__icon-btn' onClick={() => setShowQr(true)}>
                    <Icon name='qrcode' size={40} color='#4B5563' strokeWidth={2} />
                  </View>
                </View>
              </View>

              <View className='classset__code'>
                <View className='classset__code-main'>
                  <Text className='classset__code-label'>班级码</Text>
                  <Text className='classset__code-value'>{formattedCode}</Text>
                </View>
                <View
                  className='classset__copy'
                  onClick={() => copyText(classInfo.code || '', '班级码已复制')}
                >
                  <Icon name='copy' size={28} color='#0062FF' strokeWidth={2} />
                  <Text className='classset__copy-text'>复制</Text>
                </View>
              </View>

              <View className='classset__grid'>
                {infoRows.map((row) => (
                  <View className='classset__grid-item' key={row.label}>
                    <Text className='classset__grid-label'>{row.label}</Text>
                    <Text className='classset__grid-value'>{row.value}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* 班级公告 */}
            {classInfo.announcement && classInfo.announcement.trim() ? (
              <View className='classset__card classset__card--announcement'>
                <View className='classset__announce-head'>
                  <View className='classset__announce-title-wrap'>
                    <View className='classset__announce-icon'>
                      <Icon name='bell' size={28} color='#F97316' strokeWidth={2} />
                    </View>
                    <Text className='classset__announce-title'>班级公告</Text>
                  </View>
                  {canManage ? (
                    <View className='classset__announce-tag'>
                      <Text className='classset__announce-tag-text'>班级主页可查看</Text>
                    </View>
                  ) : null}
                </View>
                <Text className='classset__announce-text'>{classInfo.announcement}</Text>
              </View>
            ) : null}

            {/* 管理入口 */}
            <View className='classset__card classset__card--manage'>
              <Text className='classset__section-title'>班级管理</Text>
              {manageRows.map((row, idx) => (
                <View
                  className={`classset__row ${idx < manageRows.length - 1 ? 'classset__row--line' : ''}`}
                  key={row.title}
                  onClick={() => Taro.navigateTo({ url: row.path })}
                >
                  <View className='classset__row-icon'>
                    <Icon name={row.icon} size={36} color='#4B5563' strokeWidth={2} />
                  </View>
                  <View className='classset__row-main'>
                    <Text className='classset__row-title'>{row.title}</Text>
                    <Text className='classset__row-subtitle'>{row.subtitle}</Text>
                  </View>
                  <Icon name='chevron-right' size={32} color='#C0C4CC' strokeWidth={2} />
                </View>
              ))}
            </View>

            {/* 邀请 */}
            <View className='classset__invite'>
              <View className='classset__invite-main'>
                <Text className='classset__invite-title'>邀请同学加入班级</Text>
                <Text className='classset__invite-desc'>分享班级码或二维码，同学即可加入</Text>
              </View>
              <View className='classset__invite-btn' onClick={() => setShowQr(true)}>
                <Icon name='qrcode' size={28} color='#FFFFFF' strokeWidth={2} />
                <Text className='classset__invite-btn-text'>二维码</Text>
              </View>
            </View>

            {/* 账号与班级 */}
            <View className='classset__card classset__card--account'>
              <Text className='classset__section-title'>账号与班级</Text>
              {ownerRole ? (
                <View className='classset__owner'>
                  <View className='classset__owner-tip'>
                    <Icon name='settings' size={32} color='#F97316' strokeWidth={2} />
                    <Text className='classset__owner-tip-text'>
                      你是群主，不能直接退出班级。如需退出，请先在成员列表中把群主转让给其他成员。
                    </Text>
                  </View>
                  <View
                    className='classset__owner-btn'
                    onClick={() => Taro.navigateTo({ url: '/pages-sub/settings/member-list/index' })}
                  >
                    <Text className='classset__owner-btn-text'>去成员列表转让群主</Text>
                  </View>
                  <View className='classset__divider' />
                  <View
                    className='classset__row classset__row--plain'
                    onClick={() => {
                      setDissolveInput('')
                      setDissolveOpen(true)
                    }}
                  >
                    <View className='classset__row-icon classset__row-icon--danger'>
                      <Icon name='trash-2' size={36} color='#DC2626' strokeWidth={2} />
                    </View>
                    <View className='classset__row-main'>
                      <Text className='classset__row-title classset__row-title--danger'>解散班级</Text>
                      <Text className='classset__row-subtitle'>解散后所有成员将无法访问该班级</Text>
                    </View>
                    <Icon name='chevron-right' size={32} color='#C0C4CC' strokeWidth={2} />
                  </View>
                </View>
              ) : (
                <View
                  className='classset__row classset__row--plain'
                  onClick={() => setShowLeaveConfirm(true)}
                >
                  <View className='classset__row-icon classset__row-icon--danger'>
                    <Icon name='log-out' size={36} color='#DC2626' strokeWidth={2} />
                  </View>
                  <View className='classset__row-main'>
                    <Text className='classset__row-title classset__row-title--danger'>退出班级</Text>
                    <Text className='classset__row-subtitle'>退出后将无法查看该班级内容</Text>
                  </View>
                  <Icon name='chevron-right' size={32} color='#C0C4CC' strokeWidth={2} />
                </View>
              )}
            </View>

            {!canManage ? (
              <Text className='classset__footer-note'>
                如需修改班级信息或公告，请联系群主或管理员
              </Text>
            ) : null}
          </>
        ) : (
          <View className='classset__empty'>
            <Icon name='door-open' size={80} color='#D1D5DB' strokeWidth={1.5} />
            <Text className='classset__empty-text'>班级信息加载失败</Text>
            <View className='classset__primary-btn' onClick={() => fetchClass()}>
              <Text className='classset__primary-btn-text'>重试</Text>
            </View>
          </View>
        )}
      </View>

      <ConfirmDialog
        open={showLeaveConfirm}
        title='确认退出该班级？'
        description='退出后将无法查看该班级的通知、作业、资料和考勤记录，如需重新加入需要使用新的班级码。'
        confirmText='确认退出'
        danger
        loading={leaving}
        onCancel={() => {
          if (!leaving) setShowLeaveConfirm(false)
        }}
        onConfirm={handleLeave}
      />

      {/* 编辑班级信息 */}
      <BottomSheet
        open={editOpen && !!classInfo}
        onClose={() => {
          if (!saveLoading) setEditOpen(false)
        }}
        title='编辑班级信息'
        footer={
          <View className='classset__sheet-actions'>
            <View
              className='classset__sheet-btn classset__sheet-btn--ghost'
              onClick={() => {
                if (!saveLoading) setEditOpen(false)
              }}
            >
              <Text className='classset__sheet-btn-text classset__sheet-btn-text--ghost'>取消</Text>
            </View>
            <View
              className={`classset__sheet-btn classset__sheet-btn--primary ${
                saveLoading || !form.name.trim() ? 'classset__sheet-btn--disabled' : ''
              }`}
              onClick={handleSave}
            >
              <Text className='classset__sheet-btn-text'>{saveLoading ? '保存中...' : '保存'}</Text>
            </View>
          </View>
        }
      >
        <View className='classset__form'>
          <View className='classset__field'>
            <Text className='classset__label'>班级名称</Text>
            <Input
              className='classset__input'
              value={form.name}
              maxlength={100}
              placeholder='请输入班级名称'
              placeholderClass='classset__placeholder'
              onInput={(e) => setForm((prev) => ({ ...prev, name: e.detail.value }))}
            />
          </View>

          <View className='classset__field-row'>
            <View className='classset__field classset__field--half'>
              <Text className='classset__label'>年级</Text>
              <Input
                className='classset__input'
                value={form.grade}
                maxlength={20}
                placeholder='如 2024级'
                placeholderClass='classset__placeholder'
                onInput={(e) => setForm((prev) => ({ ...prev, grade: e.detail.value }))}
              />
            </View>
            <View className='classset__field classset__field--half'>
              <Text className='classset__label'>专业/方向</Text>
              <Input
                className='classset__input'
                value={form.major}
                maxlength={100}
                placeholder='如 软件工程'
                placeholderClass='classset__placeholder'
                onInput={(e) => setForm((prev) => ({ ...prev, major: e.detail.value }))}
              />
            </View>
          </View>

          <View className='classset__field'>
            <View className='classset__label-row'>
              <Text className='classset__label'>班级公告</Text>
              <Text className='classset__counter'>{form.announcement.length}/2000</Text>
            </View>
            <Textarea
              className='classset__textarea'
              value={form.announcement}
              maxlength={2000}
              placeholder='发布班务提醒、活动安排等'
              placeholderClass='classset__placeholder'
              onInput={(e) => setForm((prev) => ({ ...prev, announcement: e.detail.value }))}
            />
          </View>
        </View>
      </BottomSheet>

      {/* 解散班级 */}
      <BottomSheet
        open={dissolveOpen && !!classInfo}
        onClose={() => {
          if (!dissolving) setDissolveOpen(false)
        }}
        title='解散班级'
        footer={
          <View className='classset__sheet-actions'>
            <View
              className='classset__sheet-btn classset__sheet-btn--ghost'
              onClick={() => {
                if (!dissolving) setDissolveOpen(false)
              }}
            >
              <Text className='classset__sheet-btn-text classset__sheet-btn-text--ghost'>取消</Text>
            </View>
            <View
              className={`classset__sheet-btn classset__sheet-btn--danger ${
                dissolving || dissolveInput.trim() !== classInfo?.name.trim()
                  ? 'classset__sheet-btn--disabled'
                  : ''
              }`}
              onClick={handleDissolve}
            >
              <Text className='classset__sheet-btn-text'>{dissolving ? '解散中...' : '确认解散'}</Text>
            </View>
          </View>
        }
      >
        <View className='classset__form'>
          <Text className='classset__dissolve-desc'>
            解散后，所有成员将立即无法访问该班级的通知、作业、资料和考勤数据。此操作不可撤销。
          </Text>
          <View className='classset__field'>
            <Text className='classset__label'>
              请输入班级名称 <Text className='classset__label-strong'>{classInfo?.name}</Text> 以确认
            </Text>
            <Input
              className='classset__input classset__input--danger'
              value={dissolveInput}
              placeholder={classInfo?.name}
              placeholderClass='classset__placeholder'
              onInput={(e) => setDissolveInput(e.detail.value)}
            />
          </View>
        </View>
      </BottomSheet>

      {/* 二维码弹窗 */}
      <BottomSheet
        open={showQr && !!classInfo}
        onClose={() => setShowQr(false)}
        title={classInfo?.name}
        footer={
          <View className='classset__sheet-actions'>
            <View
              className='classset__sheet-btn classset__sheet-btn--ghost'
              onClick={() => copyText(classInfo?.code || '', '班级码已复制')}
            >
              <Text className='classset__sheet-btn-text classset__sheet-btn-text--ghost'>复制班级码</Text>
            </View>
            <View
              className='classset__sheet-btn classset__sheet-btn--primary'
              onClick={() => setShowQr(false)}
            >
              <Text className='classset__sheet-btn-text'>关闭</Text>
            </View>
          </View>
        }
      >
        <View className='classset__qr'>
          {classInfo?.qrCodeUrl ? (
            <Image className='classset__qr-img' src={classInfo.qrCodeUrl} mode='aspectFit' />
          ) : (
            <View className='classset__qr-empty'>
              <Icon name='qrcode' size={64} color='#9CA3AF' strokeWidth={1.5} />
              <Text className='classset__qr-empty-text'>二维码未生成</Text>
              {canManage ? (
                <View className='classset__qr-gen' onClick={handleGenerateQr}>
                  <Text className='classset__qr-gen-text'>
                    {generatingQr ? '生成中...' : '生成二维码'}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
          <View className='classset__qr-meta'>
            <Text className='classset__qr-code'>班级码：{formattedCode}</Text>
            <Text className='classset__qr-tip'>同学扫描二维码或输入班级码即可加入</Text>
          </View>
        </View>
      </BottomSheet>
    </View>
  )
}