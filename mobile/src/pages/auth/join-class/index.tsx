import { useEffect, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { classesApi } from '@/services'
import { useUserStore } from '@/stores'
import { Button, Icon, Input } from '@/components/ui'
import { NavBar, Modal } from '@/components/business'
import { scanCode } from '@/utils/native'
import './index.scss'

interface OrgTypeOption {
  key: string
  label: string
  icon: string
}

const ORG_TYPES: OrgTypeOption[] = [
  { key: 'class', label: '班级', icon: 'school' },
  { key: 'association', label: '社团', icon: 'users' },
  { key: 'committee', label: '部门', icon: 'file-text' },
  { key: 'club', label: '兴趣小组', icon: 'sparkles' }
]

export default function JoinClass() {
  const setCurrentClass = useUserStore((s) => s.setCurrentClass)

  const [classCode, setClassCode] = useState('')
  const [studentId, setStudentId] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [scanLoading, setScanLoading] = useState(false)

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [className, setClassName] = useState('')
  const [createOrgType, setCreateOrgType] = useState('class')
  const [createLoading, setCreateLoading] = useState(false)
  const [createdClass, setCreatedClass] = useState<classesApi.ClassInfo | null>(null)
  const [joinedClass, setJoinedClass] = useState<classesApi.ClassInfo | null>(null)

  const [myClasses, setMyClasses] = useState<classesApi.ClassInfo[]>([])

  // 页面加载时获取当前用户已加入的班级列表
  useEffect(() => {
    let cancelled = false
    const fetchMyClasses = async () => {
      try {
        const list = await classesApi.getMyClasses()
        if (cancelled) return
        setMyClasses(list || [])
        if (list && list.length > 0) {
          setJoinedClass(list[0])
        }
      } catch {
        // 静默失败，不阻塞加入操作
      }
    }
    fetchMyClasses()
    return () => {
      cancelled = true
    }
  }, [])

  const displayed = createdClass || joinedClass

  const alreadyMember =
    classCode.length === 6 && myClasses.some((c) => c.code === classCode)

  const handleJoin = async () => {
    if (!/^\d{6}$/.test(classCode)) {
      Taro.showToast({ title: '请输入 6 位班级邀请码', icon: 'none' })
      return
    }
    if (alreadyMember) {
      Taro.showToast({ title: '已是该班级成员', icon: 'none' })
      return
    }
    if (joinLoading) return
    setJoinLoading(true)
    try {
      const payload: { code: string; studentId?: string } = { code: classCode }
      if (studentId.trim()) payload.studentId = studentId.trim()
      const data = await classesApi.joinClass(payload)
      Taro.showToast({
        title: `成功加入班级：${data.name || '班级'}`,
        icon: 'none'
      })
      setCurrentClass(data.id)
      setTimeout(() => {
        Taro.switchTab({ url: '/pages/home/index' })
      }, 500)
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '加入班级失败，请检查邀请码',
        icon: 'none'
      })
    } finally {
      setJoinLoading(false)
    }
  }

  const handleScan = async () => {
    if (scanLoading) return
    setScanLoading(true)
    try {
      const result = await scanCode()
      // 二维码内容可能为纯邀请码，也可能为带班级码的 URL，提取其中的 6 位数字码
      const match = /(\d{6})/.exec(result || '')
      const code = match ? match[1] : ''
      if (!code) {
        Taro.showToast({ title: '未识别到有效班级邀请码', icon: 'none' })
        return
      }
      setClassCode(code)
      Taro.showToast({ title: `已识别邀请码 ${code}`, icon: 'none' })
      // 识别后自动尝试加入
      setJoinLoading(true)
      try {
        const payload: { code: string; studentId?: string } = { code }
        if (studentId.trim()) payload.studentId = studentId.trim()
        const data = await classesApi.joinClass(payload)
        Taro.showToast({ title: `成功加入班级：${data.name || '班级'}`, icon: 'none' })
        setCurrentClass(data.id)
        setTimeout(() => {
          Taro.switchTab({ url: '/pages/home/index' })
        }, 500)
      } catch (err) {
        Taro.showToast({
          title: err instanceof Error ? err.message : '加入班级失败，请核对邀请码',
          icon: 'none'
        })
      } finally {
        setJoinLoading(false)
      }
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '扫码失败，请重试',
        icon: 'none'
      })
    } finally {
      setScanLoading(false)
    }
  }

  const handleCreate = async () => {
    const label = ORG_TYPES.find((t) => t.key === createOrgType)?.label || '组织'
    if (!className.trim()) {
      Taro.showToast({ title: `请输入${label}名称`, icon: 'none' })
      return
    }
    if (createLoading) return
    setCreateLoading(true)
    try {
      const data = await classesApi.createClass({
        name: className.trim(),
        orgType: createOrgType
      })
      setCreatedClass(data)
      setCreateModalOpen(false)
      setClassName('')
      setCurrentClass(data.id)
      Taro.showToast({ title: `${label}创建成功`, icon: 'none' })
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : `创建${label}失败，请稍后重试`,
        icon: 'none'
      })
    } finally {
      setCreateLoading(false)
    }
  }

  const enterClass = () => {
    Taro.switchTab({ url: '/pages/home/index' })
  }

  return (
    <View className='join-class'>
      <NavBar title='加入班级' showBack onBack={() => Taro.navigateBack()} />

      <View className='join-class__content'>
        <Text className='join-class__title'>加入或创建班级</Text>
        <Text className='join-class__subtitle'>输入班级码加入，或创建新班级</Text>

        <View className='join-class__card'>
          <View className='join-class__field'>
            <Input
              value={classCode}
              type='number'
              maxLength={6}
              placeholder='请输入 6 位班级邀请码'
              onChange={(v) => setClassCode(v.replace(/\D/g, '').slice(0, 6))}
            />
          </View>

          <View className='join-class__field'>
            <Input
              value={studentId}
              type='text'
              maxLength={20}
              placeholder='学号（如班级已导入名单请填写）'
              onChange={(v) => setStudentId(v.slice(0, 20))}
            />
          </View>

          <View className='join-class__scan-row' onClick={handleScan}>
            <Icon name='scan-line' size={40} color='#0062ff' strokeWidth={2} />
            <Text className='join-class__scan-text'>
              {scanLoading ? '扫码中...' : '扫一扫，扫码加入班级'}
            </Text>
          </View>

          {alreadyMember && (
            <View className='join-class__member-hint'>
              <Icon name='check' size={28} color='#0062ff' strokeWidth={3} />
              <Text>已是该班级成员</Text>
            </View>
          )}

          <Button
            type='primary'
            size='lg'
            block
            loading={joinLoading}
            onClick={handleJoin}
          >
            加入班级
          </Button>
        </View>

        <View className='join-class__divider'>
          <View className='join-class__divider-line' />
          <Text className='join-class__divider-text'>或</Text>
          <View className='join-class__divider-line' />
        </View>

        <View className='join-class__create-btn' onClick={() => setCreateModalOpen(true)}>
          <Icon name='plus' size={40} color='#0062ff' strokeWidth={2.5} />
          <Text className='join-class__create-text'>创建新班级</Text>
        </View>

        {displayed && (
          <View className='join-class__invite'>
            <Text className='join-class__invite-title'>
              {createdClass ? '创建成功，分享班级邀请' : '已加入班级'}
            </Text>
            <View className='join-class__invite-code'>
              <Icon name='qrcode' size={40} color='#0062ff' strokeWidth={2} />
              <Text>
                班级码：{displayed.code ? displayed.code.slice(0, 3) : ''}{' '}
                {displayed.code ? displayed.code.slice(3) : ''}
              </Text>
            </View>
            <Text className='join-class__invite-hint'>扫描二维码加入班级</Text>
            <View className='join-class__invite-enter'>
              <Button type='primary' size='lg' block onClick={enterClass}>
                进入班级
              </Button>
            </View>
          </View>
        )}

        <View className='join-class__skip' onClick={enterClass}>
          <Text className='join-class__skip-text'>跳过，稍后再加入班级</Text>
        </View>
      </View>

      {/* 创建班级弹窗 */}
      <Modal
        visible={createModalOpen}
        title='创建新组织'
        onClose={() => setCreateModalOpen(false)}
      >
        <View className='join-class__form'>
          <View className='join-class__org-grid'>
            {ORG_TYPES.map((t) => {
              const active = createOrgType === t.key
              return (
                <View
                  key={t.key}
                  className={`join-class__org-item ${active ? 'join-class__org-item--active' : ''}`}
                  onClick={() => setCreateOrgType(t.key)}
                >
                  <Icon
                    name={t.icon}
                    size={40}
                    strokeWidth={2}
                    className={`${active ? 'join-class__org-icon join-class__org-icon--active' : 'join-class__org-icon'}`}
                  />
                  <Text
                    className={`join-class__org-label ${active ? 'join-class__org-label--active' : ''}`}
                  >
                    {t.label}
                  </Text>
                </View>
              )
            })}
          </View>

          <Input
            value={className}
            type='text'
            placeholder={`请输入${ORG_TYPES.find((t) => t.key === createOrgType)?.label || '组织'}名称`}
            onChange={(v) => setClassName(v)}
          />

          <View className='join-class__modal-actions'>
            <View className='join-class__modal-btn'>
              <Button size='lg' block type='ghost' onClick={() => setCreateModalOpen(false)}>
                取消
              </Button>
            </View>
            <View className='join-class__modal-btn'>
              <Button size='lg' block type='primary' loading={createLoading} onClick={handleCreate}>
                创建
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}