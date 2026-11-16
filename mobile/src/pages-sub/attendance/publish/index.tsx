// ============================================================
// 发起签到
// 1:1 对齐 front/src/pages/attendances/PublishAttendance.tsx
// ============================================================
import { useEffect, useMemo, useRef, useState } from 'react'
import { Input as TaroInput, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { DateTimePicker, PageHeader } from '@/components/business'
import { Icon } from '@/components/ui'
import { attendanceApi } from '@/services'
import { useAuth } from '@/utils'
import { getLocation } from '@/utils/native'
import './index.scss'

type Method = 'gps' | 'qr' | 'face' | 'code'
type Duration = number | 'custom'

const METHODS: {
  key: Method
  name: string
  desc: string
  icon: string
  tint: string
  color: string
}[] = [
  {
    key: 'gps',
    name: '定位签到',
    desc: '需到达指定范围',
    icon: 'map-pin',
    tint: 'attpublish__method-icon--gps',
    color: '#0062FF'
  },
  {
    key: 'qr',
    name: '扫码签到',
    desc: '现场扫描二维码',
    icon: 'qrcode',
    tint: 'attpublish__method-icon--qr',
    color: '#059669'
  },
  {
    key: 'face',
    name: '拍照签到',
    desc: '自拍水印留证',
    icon: 'camera',
    tint: 'attpublish__method-icon--face',
    color: '#EA580C'
  },
  {
    key: 'code',
    name: '口令签到',
    desc: '输入 4 位口令',
    icon: 'key-round',
    tint: 'attpublish__method-icon--code',
    color: '#DC2626'
  }
]

const TITLE_PRESETS = ['班会签到', '课堂签到', '活动签到', '晚自习']
const DURATIONS = [5, 10, 30, 60]
const RADIUS_OPTIONS = [100, 200, 500, 1000]

/** Date → 选择器所需的本地时间字符串 */
function toDateTimeInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function parseLocal(value: string) {
  return new Date(value.replace(' ', 'T'))
}

interface SuccessInfo {
  id: string | null
  title: string
  methodName: string
  durationText: string
}

export default function AttendancePublish() {
  const { user, requireAuth } = useAuth()
  const classId = user?.classId

  const [title, setTitle] = useState('')
  const [method, setMethod] = useState<Method>('gps')
  const [location, setLocation] = useState('')
  const [duration, setDuration] = useState<Duration>(10)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [code, setCode] = useState('')
  const [checkRadius, setCheckRadius] = useState(500)
  const [gpsLat, setGpsLat] = useState<number | null>(null)
  const [gpsLng, setGpsLng] = useState<number | null>(null)
  const [locating, setLocating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [success, setSuccess] = useState<SuccessInfo | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useLoad(() => {
    if (!requireAuth('committee')) {
      setTimeout(() => Taro.navigateBack(), 1500)
    }
  })

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    []
  )

  const methodMeta = METHODS.find((m) => m.key === method) ?? METHODS[0]
  const methodName = methodMeta.name

  const missing = useMemo(() => {
    const list: string[] = []
    if (!title.trim()) list.push('填写签到标题')
    if (method === 'gps' && (gpsLat == null || gpsLng == null)) list.push('获取签到定位')
    if (method === 'code' && code.length !== 4) list.push('设置 4 位口令')
    if (duration === 'custom') {
      if (!startTime || !endTime) list.push('选择签到时段')
      else if (parseLocal(endTime) <= parseLocal(startTime)) list.push('结束时间需晚于开始时间')
      else if (parseLocal(startTime).getTime() < Date.now() - 60 * 1000)
        list.push('开始时间不能早于当前时间')
    }
    return list
  }, [title, method, gpsLat, gpsLng, code, duration, startTime, endTime])

  const canPublish = missing.length === 0 && !!classId
  const durationText = duration === 'custom' ? '自定义时段' : `持续 ${duration} 分钟`

  const handleLocate = async () => {
    if (locating) return
    setLocating(true)
    try {
      const pos = await getLocation()
      setGpsLat(pos.latitude)
      setGpsLng(pos.longitude)
      Taro.showToast({ title: '定位成功', icon: 'success' })
    } catch {
      Taro.showToast({ title: '定位失败，请在系统设置中允许定位权限', icon: 'none' })
    } finally {
      setLocating(false)
    }
  }

  const handleRandomCode = () => {
    setCode(String(Math.floor(1000 + Math.random() * 9000)))
  }

  const goDetail = (id: string | null) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (id && classId) {
      Taro.redirectTo({
        url: `/pages-sub/attendance/check-in-detail/index?classId=${classId}&attendanceId=${id}`
      })
    } else {
      Taro.navigateBack()
    }
  }

  const handlePublish = async () => {
    if (!classId) {
      Taro.showToast({ title: '未找到班级信息', icon: 'none' })
      return
    }
    if (!canPublish) {
      Taro.showToast({ title: `请先${missing[0]}`, icon: 'none' })
      return
    }

    const startAt = duration === 'custom' ? parseLocal(startTime) : new Date()
    const endAt =
      duration === 'custom'
        ? parseLocal(endTime)
        : new Date(startAt.getTime() + duration * 60000)

    setPublishing(true)
    try {
      const body: Parameters<typeof attendanceApi.publish>[1] = {
        title: title.trim(),
        method,
        startTime: startAt.toISOString(),
        endTime: endAt.toISOString()
      }
      if (location.trim()) body.location = location.trim()
      if (method === 'gps') {
        body.latitude = gpsLat ?? undefined
        body.longitude = gpsLng ?? undefined
        body.checkRadius = checkRadius
      }
      if (method === 'code') body.code = code

      const created = (await attendanceApi.publish(classId, body)) as { id?: string } | null
      const id = created?.id ?? null

      setSuccess({ id, title: title.trim(), methodName, durationText })
      timerRef.current = setTimeout(() => goDetail(id), 1800)
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '发布失败，请稍后重试',
        icon: 'none'
      })
    } finally {
      setPublishing(false)
    }
  }

  if (success) {
    return (
      <View className='attpublish attpublish--success'>
        <View className='attpublish__glow' />
        <View className='attpublish__success-card'>
          <View className='attpublish__success-badge'>
            <View className='attpublish__success-ring' />
            <View className='attpublish__success-circle'>
              <Icon name='check' size={80} color='#FFFFFF' strokeWidth={3} />
            </View>
          </View>
          <Text className='attpublish__success-title'>签到发布成功</Text>
          <Text className='attpublish__success-sub'>{success.title}</Text>
          <View className='attpublish__success-pill'>
            <Icon name='check' size={28} color='#16A34A' strokeWidth={3} />
            <Text className='attpublish__success-pill-text'>
              {success.methodName} · {success.durationText}
            </Text>
          </View>
        </View>

        <View className='attpublish__success-actions'>
          <View
            className='attpublish__success-primary'
            onClick={() => goDetail(success.id)}
          >
            <Text className='attpublish__success-primary-text'>查看签到详情</Text>
          </View>
          <View
            className='attpublish__success-secondary'
            onClick={() => {
              if (timerRef.current) clearTimeout(timerRef.current)
              Taro.navigateBack()
            }}
          >
            <Text className='attpublish__success-secondary-text'>返回签到列表</Text>
          </View>
        </View>
        <Text className='attpublish__success-tip'>正在自动进入签到详情…</Text>
      </View>
    )
  }

  return (
    <View className='attpublish'>
      <PageHeader title='发起签到' variant='a' barBg='#F5F7FA' />

      <View className='attpublish__content'>
        {/* 签到主题 */}
        <View className='attpublish__section'>
          <View className='attpublish__section-head'>
            <View className='attpublish__section-badge'>
              <Icon name='sparkles' size={28} color='#0062FF' strokeWidth={2.2} />
            </View>
            <Text className='attpublish__section-title'>签到主题</Text>
            <Text className='attpublish__section-hint'>必填</Text>
          </View>
          <View className='attpublish__section-body'>
            <View className='attpublish__presets'>
              {TITLE_PRESETS.map((p) => (
                <View
                  key={p}
                  className={`attpublish__preset ${
                    title === p ? 'attpublish__preset--active' : ''
                  }`}
                  onClick={() => setTitle(p)}
                >
                  <Text className='attpublish__preset-text'>{p}</Text>
                </View>
              ))}
            </View>
            <TaroInput
              className='attpublish__input attpublish__input--mt'
              value={title}
              maxlength={30}
              placeholder='输入签到标题，如：周三班会签到'
              placeholderClass='attpublish__placeholder'
              onInput={(e) => setTitle(e.detail.value)}
            />
          </View>
        </View>

        {/* 签到方式 */}
        <View className='attpublish__section'>
          <View className='attpublish__section-head'>
            <View className='attpublish__section-badge'>
              <Icon name='map-pin' size={28} color='#0062FF' strokeWidth={2.2} />
            </View>
            <Text className='attpublish__section-title'>签到方式</Text>
            <Text className='attpublish__section-hint'>选一种</Text>
          </View>
          <View className='attpublish__section-body'>
            <View className='attpublish__methods'>
              {METHODS.map((m) => {
                const active = method === m.key
                return (
                  <View
                    key={m.key}
                    className={`attpublish__method ${
                      active ? 'attpublish__method--active' : ''
                    }`}
                    onClick={() => setMethod(m.key)}
                  >
                    <View className={`attpublish__method-icon ${m.tint}`}>
                      <Icon name={m.icon} size={36} color={m.color} strokeWidth={2} />
                    </View>
                    <View className='attpublish__method-text'>
                      <Text className='attpublish__method-name'>{m.name}</Text>
                      <Text className='attpublish__method-desc'>{m.desc}</Text>
                    </View>
                    {active ? (
                      <View className='attpublish__method-check'>
                        <Icon name='check' size={24} color='#FFFFFF' strokeWidth={3} />
                      </View>
                    ) : null}
                  </View>
                )
              })}
            </View>
          </View>
        </View>

        {/* 签到要求 */}
        <View className='attpublish__section'>
          <View className='attpublish__section-head'>
            <View className='attpublish__section-badge'>
              <Icon name={methodMeta.icon} size={28} color='#0062FF' strokeWidth={2.2} />
            </View>
            <Text className='attpublish__section-title'>签到要求</Text>
            <Text className='attpublish__section-hint'>{methodName}</Text>
          </View>
          <View className='attpublish__section-body'>
            {method === 'gps' ? (
              <View className='attpublish__gps'>
                {gpsLat != null && gpsLng != null ? (
                  <View className='attpublish__located'>
                    <View className='attpublish__located-icon'>
                      <Icon name='check' size={32} color='#FFFFFF' strokeWidth={3} />
                    </View>
                    <View className='attpublish__located-text'>
                      <Text className='attpublish__located-title'>已获取当前位置</Text>
                      <Text className='attpublish__located-coords'>
                        {gpsLat.toFixed(4)}, {gpsLng.toFixed(4)}
                      </Text>
                    </View>
                    <Text className='attpublish__located-action' onClick={handleLocate}>
                      {locating ? '定位中…' : '重新定位'}
                    </Text>
                  </View>
                ) : (
                  <View className='attpublish__locate-btn' onClick={handleLocate}>
                    <Icon
                      name={locating ? 'refresh' : 'navigation'}
                      size={32}
                      color='#0062FF'
                      strokeWidth={2}
                    />
                    <Text className='attpublish__locate-btn-text'>
                      {locating ? '正在获取定位…' : '获取当前位置'}
                    </Text>
                  </View>
                )}
                <View className='attpublish__radius'>
                  <View className='attpublish__radius-head'>
                    <Text className='attpublish__radius-label'>有效范围</Text>
                    <Text className='attpublish__radius-hint'>超出范围将无法签到</Text>
                  </View>
                  <View className='attpublish__radius-options'>
                    {RADIUS_OPTIONS.map((r) => (
                      <View
                        key={r}
                        className={`attpublish__radius-item ${
                          checkRadius === r ? 'attpublish__radius-item--active' : ''
                        }`}
                        onClick={() => setCheckRadius(r)}
                      >
                        <Text className='attpublish__radius-item-text'>
                          {r >= 1000 ? '1 km' : `${r} m`}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            ) : null}

            {method === 'code' ? (
              <View>
                <View className='attpublish__code-row'>
                  <TaroInput
                    className='attpublish__code-input'
                    type='number'
                    value={code}
                    maxlength={4}
                    placeholder='0000'
                    placeholderClass='attpublish__code-placeholder'
                    onInput={(e) => setCode(e.detail.value.replace(/\D/g, '').slice(0, 4))}
                  />
                  <View className='attpublish__code-random' onClick={handleRandomCode}>
                    <Icon name='dices' size={32} color='#0062FF' strokeWidth={2} />
                    <Text className='attpublish__code-random-text'>随机</Text>
                  </View>
                </View>
                <Text className='attpublish__code-tip'>
                  口令为 4 位数字，发布后请当面告知到场同学
                </Text>
              </View>
            ) : null}

            {method === 'qr' || method === 'face' ? (
              <View className='attpublish__hintbox'>
                <View className='attpublish__hintbox-icon'>
                  <Icon name={methodMeta.icon} size={28} color='#475569' strokeWidth={2} />
                </View>
                <Text className='attpublish__hintbox-text'>
                  {method === 'qr'
                    ? '发布后会在签到详情页生成专属二维码，同学现场扫码即可完成签到。'
                    : '同学需现场拍摄带时间水印的照片并提交，照片将作为签到凭证保存。'}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* 签到地点 */}
        <View className='attpublish__section'>
          <View className='attpublish__section-head'>
            <View className='attpublish__section-badge'>
              <Icon name='map-pin' size={28} color='#0062FF' strokeWidth={2.2} />
            </View>
            <Text className='attpublish__section-title'>签到地点</Text>
            <Text className='attpublish__section-hint'>选填</Text>
          </View>
          <View className='attpublish__section-body'>
            <TaroInput
              className='attpublish__input'
              value={location}
              maxlength={40}
              placeholder='例如：教学楼 A301'
              placeholderClass='attpublish__placeholder'
              onInput={(e) => setLocation(e.detail.value)}
            />
          </View>
        </View>

        {/* 签到时间 */}
        <View className='attpublish__section'>
          <View className='attpublish__section-head'>
            <View className='attpublish__section-badge'>
              <Icon name='clock' size={28} color='#0062FF' strokeWidth={2.2} />
            </View>
            <Text className='attpublish__section-title'>签到时间</Text>
            <Text className='attpublish__section-hint'>{durationText}</Text>
          </View>
          <View className='attpublish__section-body'>
            <View className='attpublish__durations'>
              {DURATIONS.map((d) => (
                <View
                  key={d}
                  className={`attpublish__duration ${
                    duration === d ? 'attpublish__duration--active' : ''
                  }`}
                  onClick={() => setDuration(d)}
                >
                  <Text className='attpublish__duration-text'>{d} 分钟</Text>
                </View>
              ))}
              <View
                className={`attpublish__duration ${
                  duration === 'custom' ? 'attpublish__duration--active' : ''
                }`}
                onClick={() => {
                  if (duration !== 'custom') {
                    if (!startTime) {
                      const now = new Date()
                      setStartTime(toDateTimeInput(now))
                      setEndTime(toDateTimeInput(new Date(now.getTime() + 10 * 60000)))
                    }
                    setDuration('custom')
                  }
                }}
              >
                <Text className='attpublish__duration-text'>自定义</Text>
              </View>
            </View>

            {duration === 'custom' ? (
              <View className='attpublish__time-fields'>
                <View className='attpublish__time-field'>
                  <Text className='attpublish__time-label'>开始</Text>
                  <View className='attpublish__time-picker'>
                    <DateTimePicker
                      mode='datetime'
                      value={startTime}
                      onChange={setStartTime}
                      placeholder='选择开始时间'
                    />
                  </View>
                </View>
                <View className='attpublish__time-field'>
                  <Text className='attpublish__time-label'>结束</Text>
                  <View className='attpublish__time-picker'>
                    <DateTimePicker
                      mode='datetime'
                      value={endTime}
                      onChange={setEndTime}
                      placeholder='选择结束时间'
                    />
                  </View>
                </View>
              </View>
            ) : (
              <View className='attpublish__time-tip'>
                <View className='attpublish__time-dot' />
                <Text className='attpublish__time-tip-text'>
                  发布后立即开始 · 持续 {duration} 分钟
                </Text>
                <Text className='attpublish__time-tip-hint'>无需填时间</Text>
              </View>
            )}
          </View>
        </View>

        {/* 签到规则说明 */}
        <View className='attpublish__rules'>
          <View className='attpublish__rules-head'>
            <Icon name='shield' size={32} color='#1E40AF' strokeWidth={2.2} />
            <Text className='attpublish__rules-title'>签到规则</Text>
          </View>
          <View className='attpublish__rules-list'>
            <Text className='attpublish__rules-item'>· 签到期间可在详情页一键提醒未签到同学</Text>
            <Text className='attpublish__rules-item'>· 无法到场的同学可在签到结束前提交请假申请</Text>
            <Text className='attpublish__rules-item'>· 签到结果自动计入班级出勤统计</Text>
          </View>
        </View>
      </View>

      {/* 吸底操作栏 */}
      <View className='attpublish__footer'>
        <View className='attpublish__footer-status'>
          <Text className='attpublish__footer-status-text'>
            {!classId
              ? '未找到班级信息'
              : canPublish
                ? `将以「${methodName}」发布 · ${durationText}`
                : `还需：${missing[0]}`}
          </Text>
          {missing.length > 1 ? (
            <Text className='attpublish__footer-count'>共 {missing.length} 项待完善</Text>
          ) : null}
        </View>
        <View
          className={`attpublish__submit ${canPublish ? '' : 'attpublish__submit--disabled'}`}
          onClick={() => {
            if (!publishing) void handlePublish()
          }}
        >
          {publishing ? (
            <View className='attpublish__submit-loading'>
              <Icon name='refresh' size={32} color='#FFFFFF' strokeWidth={2} />
            </View>
          ) : null}
          <Text className='attpublish__submit-text'>
            {publishing ? '发布中…' : '发布签到'}
          </Text>
        </View>
      </View>
    </View>
  )
}