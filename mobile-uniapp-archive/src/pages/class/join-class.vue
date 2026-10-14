<script setup lang="ts">
import { ref, computed } from 'vue'
import StatusBar from '@/components/StatusBar.vue'
import BackButton from '@/components/BackButton.vue'
import AppInput from '@/components/AppInput.vue'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/AppIcon.vue'
import { createClass, joinClass, updateStudentId } from '@/common/api/auth'
import { setCurrentClassId, setCurrentOrg } from '@/common/utils/class'
import type { OrgInfo } from '@/common/utils/class'

const classCode = ref('')
const className = ref('')
const joinLoading = ref(false)
const createLoading = ref(false)
const createModalOpen = ref(false)

// 学号补全弹窗
const studentIdModalOpen = ref(false)
const studentIdInput = ref('')

function skipStudentId() {
  studentIdModalOpen.value = false
  studentIdInput.value = ''
}

async function handleUpdateStudentId() {
  if (!studentIdInput.value.trim()) {
    uni.showToast({ title: '请输入学号', icon: 'none' })
    return
  }
  try {
    await updateStudentId({ studentId: studentIdInput.value.trim() })
    studentIdModalOpen.value = false
    studentIdInput.value = ''
    uni.showToast({ title: '学号更新成功', icon: 'success' })
  } catch (err) {
    const message = err instanceof Error ? err.message : '学号更新失败'
    uni.showToast({ title: message, icon: 'none' })
  }
}

// 组织类型选择
const selectedOrgType = ref<'class' | 'association' | 'committee' | 'club'>('class')
const orgCategory = ref('')
const orgDescription = ref('')

const orgTypes = [
  { value: 'class' as const, label: '班级', icon: 'lucide:school', color: '#2563EB' },
  { value: 'association' as const, label: '社团', icon: 'lucide:tent', color: '#A855F7' },
  { value: 'committee' as const, label: '部门', icon: 'lucide:users', color: '#EF4444' },
  { value: 'club' as const, label: '兴趣小组', icon: 'lucide:star', color: '#F59E0B' },
]

const categoryOptions = [
  '体育', '文艺', '学术', '志愿', '科技', '公益', '其他',
]

const showCategoryFields = computed(() => selectedOrgType.value === 'association' || selectedOrgType.value === 'club')

const orgTypeLabel = computed(() => {
  const found = orgTypes.find((o) => o.value === selectedOrgType.value)
  return found ? found.label : '班级'
})

interface CreatedClass {
  id: string
  name: string
  code: string
  qrCodeUrl: string
  orgType?: string
}

const createdClass = ref<CreatedClass | null>(null)
const displayed = computed(() => createdClass.value)

function goBack() {
  uni.navigateBack({ delta: 1 })
}

function filterCode(value: string) {
  return value.replace(/\D/g, '').slice(0, 6)
}

function openCreateModal() {
  className.value = ''
  selectedOrgType.value = 'class'
  orgCategory.value = ''
  orgDescription.value = ''
  createModalOpen.value = true
}

function closeCreateModal() {
  createModalOpen.value = false
}

function enterHome(data: CreatedClass) {
  setCurrentClassId(data.id)
  const orgInfo: OrgInfo = {
    id: data.id,
    name: data.name,
    orgType: data.orgType || 'class',
  }
  setCurrentOrg(orgInfo)
  uni.reLaunch({ url: `/pages/home/index?classId=${data.id}` })
}

async function handleJoin() {
  if (!/^\d{6}$/.test(classCode.value)) {
    uni.showToast({ title: '请输入 6 位组织邀请码', icon: 'none' })
    return
  }
  if (joinLoading.value) return
  joinLoading.value = true
  try {
    const data = await joinClass({ code: classCode.value })
    const created: CreatedClass = {
      id: data.id,
      name: data.name,
      code: data.code,
      qrCodeUrl: data.qrCodeUrl,
      orgType: data.orgType || 'class',
    }
    enterHome(created)
    uni.showToast({ title: `成功加入：${data.name || ''}`, icon: 'success' })
  } catch (err) {
    const message = err instanceof Error ? err.message : '加入失败，请检查邀请码'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    joinLoading.value = false
  }
}

async function handleCreate() {
  const name = className.value.trim()
  if (!name) {
    uni.showToast({ title: `请输入${orgTypeLabel.value}名称`, icon: 'none' })
    return
  }
  if (createLoading.value) return
  createLoading.value = true
  try {
    const data = await createClass({
      name,
      orgType: selectedOrgType.value,
      category: orgCategory.value || undefined,
      description: orgDescription.value || undefined,
    })
    const created: CreatedClass = {
      id: data.id,
      name: data.name,
      code: data.code,
      qrCodeUrl: data.qrCodeUrl,
      orgType: data.orgType || 'class',
    }
    createdClass.value = created
    enterHome(created)
    createModalOpen.value = false
    uni.showToast({ title: `${orgTypeLabel.value}创建成功`, icon: 'success' })
  } catch (err) {
    const message = err instanceof Error ? err.message : `创建${orgTypeLabel.value}失败，请稍后重试`
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    createLoading.value = false
  }
}

function saveQrImage() {
  if (!displayed.value?.qrCodeUrl) return
  uni.downloadFile({
    url: displayed.value.qrCodeUrl,
    success: (res) => {
      if (res.statusCode === 200) {
        uni.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => uni.showToast({ title: '已保存到相册', icon: 'success' }),
          fail: () => uni.showToast({ title: '保存失败', icon: 'none' }),
        })
      }
    },
    fail: () => uni.showToast({ title: '下载失败', icon: 'none' }),
  })
}

function goImport() {
  const id = createdClass.value?.id
  if (id) {
    uni.reLaunch({ url: `/pages/index/index?classId=${id}` })
  } else {
    uni.reLaunch({ url: '/pages/index/index' })
  }
}
</script>

<template>
  <view class="page">
    <StatusBar />
    <view class="back-wrapper">
      <BackButton @click="goBack" />
    </view>

    <view class="content">
      <view class="header">
        <text class="title">加入或创建组织</text>
        <text class="subtitle">输入邀请码加入，或创建新组织</text>
      </view>

      <view class="form">
        <AppInput
          :modelValue="classCode"
          type="tel"
          placeholder="请输入 6 位组织邀请码"
          :maxlength="6"
          @update:modelValue="classCode = filterCode($event)"
          @confirm="handleJoin"
        />

        <AppButton
          :loading="joinLoading"
          @click="handleJoin"
        >
          加入组织
        </AppButton>
      </view>

      <view class="divider">
        <view class="divider-line" />
        <text class="divider-text">或</text>
        <view class="divider-line" />
      </view>

      <view
        class="create-button"
        @click="openCreateModal"
      >
        <text class="create-button-text">创建新组织</text>
      </view>

      <view
        v-if="displayed"
        class="invite-card"
      >
        <text class="invite-title">组织创建成功</text>
        <text class="invite-name">{{ displayed.name }}</text>
        <text class="invite-code">邀请码：{{ displayed.code }}</text>
        <image
          v-if="displayed.qrCodeUrl"
          class="qr-image"
          :src="displayed.qrCodeUrl"
          mode="aspectFit"
          @longpress="saveQrImage"
        />
        <text class="qr-tip">长按二维码保存图片</text>
        <AppButton @click="goImport">
          导入成员名单
        </AppButton>
      </view>
    </view>

    <!-- 创建组织弹窗 -->
    <view
      v-if="createModalOpen"
      class="modal-wrapper"
    >
      <view class="modal-mask-bg" @click="closeCreateModal" />
      <view
        class="modal-content"
        @click.stop
        @touchstart.stop
        @mousedown.stop
      >
        <text class="modal-title">创建新组织</text>
        
        <!-- 组织类型选择 -->
        <view class="org-type-selector">
          <view
            v-for="org in orgTypes"
            :key="org.value"
            class="org-type-item"
            :class="{ active: selectedOrgType === org.value }"
            @click="selectedOrgType = org.value"
          >
            <AppIcon :icon="org.icon" size="48rpx" :color="org.color" />
            <text class="org-type-label">{{ org.label }}</text>
          </view>
        </view>
        
        <AppInput
          :modelValue="className"
          :placeholder="`请输入${orgTypeLabel}名称`"
          @update:modelValue="className = $event"
          @confirm="handleCreate"
        />
        
        <!-- 分类和简介（仅社团/兴趣小组显示） -->
        <view v-if="showCategoryFields" class="extra-fields">
          <view class="category-selector">
            <text class="category-label">分类：</text>
            <view class="category-options">
              <view
                v-for="cat in categoryOptions"
                :key="cat"
                class="category-option"
                :class="{ active: orgCategory === cat }"
                @click="orgCategory = cat"
              >
                <text>{{ cat }}</text>
              </view>
            </view>
          </view>
          
          <AppInput
            :modelValue="orgDescription"
            placeholder="组织简介（选填）"
            :maxlength="200"
            @update:modelValue="orgDescription = $event"
          />
        </view>
        
        <view class="modal-actions">
          <view
            class="modal-btn modal-btn-cancel"
            @click="closeCreateModal"
          >
            <text>取消</text>
          </view>
          <view
            class="modal-btn modal-btn-confirm"
            @click="handleCreate"
          >
            <text>{{ createLoading ? '创建中...' : '创建' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 学号补全弹窗 -->
    <view
      v-if="studentIdModalOpen"
      class="modal-wrapper"
    >
      <view class="modal-mask-bg" @click="skipStudentId" />
      <view
        class="modal-content"
        @click.stop
        @touchstart.stop
        @mousedown.stop
      >
        <text class="modal-title">补全学号</text>
        <text class="modal-desc">为了更好地管理班级事务，建议您填写学号</text>
        <AppInput
          :modelValue="studentIdInput"
          placeholder="请输入学号"
          @update:modelValue="studentIdInput = $event"
          @confirm="handleUpdateStudentId"
        />
        <view class="modal-actions">
          <view
            class="modal-btn modal-btn-cancel"
            @click="skipStudentId"
          >
            <text>跳过</text>
          </view>
          <view
            class="modal-btn modal-btn-confirm"
            @click="handleUpdateStudentId"
          >
            <text>确认</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100vh;
  background-color: var(--bg);
}

.back-wrapper {
  position: absolute;
  left: 24rpx;
  top: 100rpx;
  z-index: 10;
}

.content {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 0 48rpx;
  box-sizing: border-box;
}

.header {
  margin-top: 180rpx;
  margin-bottom: 80rpx;
}

.title {
  display: block;
  font-family: var(--font-heading);
  font-size: var(--text-size-display);
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
  margin-bottom: 16rpx;
}

.subtitle {
  display: block;
  font-size: var(--text-size-body);
  color: var(--text-secondary);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.divider {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  margin: 48rpx 0;
}

.divider-line {
  width: 200rpx;
  height: 2rpx;
  background-color: var(--border);
}

.divider-text {
  font-size: var(--text-size-caption);
  color: var(--text-secondary);
}

.create-button {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 112rpx;
  border-radius: var(--rounded-lg);
  background-color: var(--accent-50);
  border: 2rpx solid var(--border);
}

.create-button-text {
  font-size: var(--text-size-body);
  font-weight: 600;
  color: var(--accent);
}

.invite-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  margin-top: 48rpx;
  padding: 40rpx;
  border-radius: var(--rounded-lg);
  background-color: var(--accent-50);
  border: 2rpx solid var(--border-subtle);
}

.invite-title {
  font-size: var(--text-size-subhead);
  font-weight: 600;
  color: var(--text-primary);
}

.invite-name {
  font-size: var(--text-size-body);
  color: var(--text-secondary);
}

.invite-code {
  font-size: var(--text-size-body);
  font-weight: 600;
  color: var(--accent);
}

.qr-image {
  width: 240rpx;
  height: 240rpx;
  background-color: var(--surface);
}

.qr-tip {
  font-size: var(--text-size-caption);
  color: var(--text-muted);
}

.modal-wrapper {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-mask-bg {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 100;
}

.modal-content {
  position: relative;
  z-index: 101;
  display: inline-flex;
  flex-direction: column;
  gap: 32rpx;
  width: 560rpx;
  max-width: calc(100vw - 96rpx);
  height: auto;
  padding: 48rpx;
  border-radius: 24rpx;
  background-color: var(--surface);
  box-sizing: border-box;
}

.modal-title {
  font-size: var(--text-size-subhead);
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
}

.modal-actions {
  display: flex;
  flex-direction: row;
  gap: 24rpx;
}

.modal-btn {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  border-radius: var(--rounded-lg);
}

.modal-btn-cancel {
  background-color: var(--border-subtle);
}

.modal-btn-cancel text {
  font-size: var(--text-size-body);
  color: var(--text-secondary);
}

.modal-btn-confirm {
  background-color: var(--accent);
}

.modal-btn-confirm text {
  font-size: var(--text-size-body);
  font-weight: 600;
  color: var(--text-inverse);
}

/* 组织类型选择器 */
.org-type-selector {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  margin-bottom: 8rpx;
}

.org-type-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24rpx 16rpx;
  border: 2rpx solid var(--border);
  border-radius: var(--rounded-lg);
  background-color: var(--surface);
  transition: all 0.2s;
}

.org-type-item.active {
  border-color: var(--accent);
  background-color: var(--accent-50);
}

.org-type-label {
  margin-top: 8rpx;
  font-size: var(--text-size-caption);
  color: var(--text-secondary);
}

.org-type-item.active .org-type-label {
  color: var(--accent);
  font-weight: 600;
}

/* 分类和简介字段 */
.extra-fields {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.category-selector {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.category-label {
  font-size: var(--text-size-caption);
  color: var(--text-secondary);
}

.category-options {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.category-option {
  padding: 12rpx 24rpx;
  border: 2rpx solid var(--border);
  border-radius: var(--rounded-full);
  background-color: var(--surface);
  font-size: var(--text-size-caption);
  color: var(--text-secondary);
  transition: all 0.2s;
}

.category-option.active {
  border-color: var(--accent);
  background-color: var(--accent-50);
  color: var(--accent);
  font-weight: 600;
}
</style>
