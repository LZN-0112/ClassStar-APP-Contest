const fs = require('fs');
const path = require('path');

const base = 'd:\\校园班级事务智能管理助手\\campus-class-manage\\apps\\uniapp\\src\\pages';

const placeholders = [
  { path: 'vote/list.vue', title: '投票列表' },
  { path: 'vote/create.vue', title: '发起投票' },
  { path: 'tomato/index.vue', title: '番茄钟' },
  { path: 'class/settings.vue', title: '班级设置' },
  { path: 'class/members.vue', title: '班级成员' },
  { path: 'class/member-detail.vue', title: '成员详情' },
  { path: 'class/handover.vue', title: '工作交接' },
  { path: 'class/archive.vue', title: '班级档案' },
  { path: 'class/archive-detail.vue', title: '档案详情' },
  { path: 'class/e-archive.vue', title: '班级电子档案' },
  { path: 'class/export-archive.vue', title: '导出档案' },
  { path: 'material/detail.vue', title: '资料详情' },
  { path: 'material/files.vue', title: '文件列表' },
  { path: 'material/download-stats.vue', title: '下载统计' },
  { path: 'notice/statistics.vue', title: '通知统计' },
  { path: 'notice/reminder.vue', title: '再次提醒设置' },
  { path: 'notice/interaction.vue', title: '互动消息' },
  { path: 'attendance/leave-approval.vue', title: '请假审批' },
  { path: 'attendance/leave-apply.vue', title: '请假申请' },
  { path: 'attendance/report.vue', title: '考勤报表' },
  { path: 'attendance/method.vue', title: '签到方式选择' },
  { path: 'homework/submit.vue', title: '作业提交' },
  { path: 'homework/delay-apply.vue', title: '延时申请' },
  { path: 'fee/report.vue', title: '收支报表' },
  { path: 'fee/payment.vue', title: '缴费登记' },
  { path: 'activity/signup-stats.vue', title: '报名统计' },
  { path: 'activity/signup-form.vue', title: '活动报名' },
  { path: 'activity/my-signup.vue', title: '我的报名' },
  { path: 'data/report.vue', title: '学期报表' },
];

function makeVue(title) {
  return `<script setup lang="ts">
import StatusBar from '@/components/StatusBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import BackButton from '@/components/BackButton.vue'
<\/script>

<template>
  <view class="page">
    <StatusBar dark />

    <view class="header">
      <BackButton class="back" />
      <text class="title">${title}</text>
      <view class="action-placeholder" />
    </view>

    <scroll-view scroll-y class="content">
      <view class="placeholder">
        <AppIcon icon="lucide:construction" size="80rpx" color="#9CA3AF" />
        <text class="tip">${title}功能开发中</text>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  background-color: #F8F8F8;
}

.header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  height: 112rpx;
  padding: 0 24rpx;
  box-sizing: border-box;
  background-color: #FFFFFF;
}

.back,
.action-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80rpx;
  height: 80rpx;
}

.title {
  font-size: 36rpx;
  font-weight: 600;
  color: #1A1A1A;
}

.content {
  flex: 1;
  padding: 32rpx;
  box-sizing: border-box;
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
  padding: 160rpx 0;
}

.tip {
  font-size: 28rpx;
  color: #6B7280;
}
</style>
`;
}

for (const item of placeholders) {
  const filePath = path.join(base, item.path);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, makeVue(item.title));
    console.log('created', item.path);
  } else {
    console.log('exists', item.path);
  }
}
