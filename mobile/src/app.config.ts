export default defineAppConfig({
  pages: [
    'pages/onboarding/launch/index',
    'pages/auth/login/index',
    'pages/auth/register/index',
    'pages/auth/reset/index',
    'pages/auth/wechat-bind/index',
    'pages/home/index',
    'pages/class-home/index',
    'pages/ai/index',
    'pages/notice/index',
    'pages/data/index',
    'pages/profile/index',
    // ---------- P3-0 新增：协议/加班级/引导 ----------
    'pages/auth/user-agreement/index',
    'pages/auth/privacy-policy/index',
    'pages/auth/join-class/index',
    'pages/auth/onboarding/index'
  ],
  subPackages: [
    // ---------- P3-0 新增：消息模块（分包） ----------
    {
      root: 'pages-sub/message',
      pages: ['list/index', 'detail/index', 'publish/index', 'stats/index', 'interaction/index']
    },
    // ---------- P3-2 新增：考勤模块（分包） ----------
    {
      root: 'pages-sub/attendance',
      pages: [
        'list/index',
        'publish/index',
        'check-in-detail/index',
        'leave-apply/index',
        'leave-approval/index',
        'report/index',
        'my/index'
      ]
    },
    // ---------- P3-4 新增：活动模块（分包） ----------
    {
      root: 'pages-sub/activity',
      pages: [
        'list/index',
        'publish/index',
        'detail/index',
        'registration-form/index',
        'my-registration/index',
        'registration-stats/index',
        'my/index'
      ]
    },
    // ---------- P3-5 新增：投票+抽签模块（分包） ----------
    {
      root: 'pages-sub/vote',
      pages: [
        'list/index',
        'publish/index',
        'options/index',
        'random-draw/index',
        'draw-rules/index',
        'draw-records/index',
        'draw-detail/index'
      ]
    },
    // ---------- P3-6 新增：班费模块（分包） ----------
    {
      root: 'pages-sub/fee',
      pages: [
        'ledger/index',
        'record/index',
        'report/index',
        'payment-register/index',
        'league-record/index',
        'league-register/index'
      ]
    },
    // ---------- P3-7 新增：资料+工具模块（分包） ----------
    {
      root: 'pages-sub/material',
      pages: [
        'library/index',
        'upload/index',
        'detail/index',
        'task-board/index',
        'task-detail/index',
        'publish-task/index',
        'pomodoro/index',
        'scan/index',
        'more-features/index',
        'repost-message/index'
      ]
    },
    // ---------- P3-8 新增：设置+班级管理模块（分包） ----------
    {
      root: 'pages-sub/settings',
      pages: [
        'index',
        'account-security/index',
        'change-password/index',
        'notification/index',
        'privacy/index',
        'general/index',
        'help-feedback/index',
        'about/index',
        'member-list/index',
        'member-detail/index',
        'import-students/index',
        'class-settings/index',
        'error-dashboard/index'
      ]
    },
    // ---------- P3-9 新增：档案模块（分包） ----------
    {
      root: 'pages-sub/archive',
      pages: [
        'class-archive/index',
        'detail/index',
        'file-list/index',
        'electronic/index',
        'export/index',
        'download-stats/index',
        'semester-report/index'
      ]
    },
    // ---------- homework 作业分包（阶段二下半：追加 5 个页面）----------
    {
      root: 'pages-sub/homework',
      pages: [
        'list/index',
        'publish/index',
        'detail/index',
        'submit/index',
        'my/index',
        'delay-apply/index',
        'offline-check/index',
        'batch-check/index',
        'screenshot-check/index',
        'check-result/index'
      ]
    }
  ],
  preloadRule: {
    'pages/home/index': {
      network: 'all',
      packages: ['pages-sub/attendance', 'pages-sub/homework', 'pages-sub/activity', 'pages-sub/vote']
    }
  },
  window: {
    backgroundTextStyle: 'light',
    // App 端为沉浸式布局：隐藏小程序原生导航栏，统一由页面内 NavBar / StatusBar 绘制
    navigationStyle: 'custom',
    navigationBarBackgroundColor: '#0062FF',
    navigationBarTitleText: '班务星',
    // 自定义导航下由 StatusBar 组件按页面明暗动态切换状态栏图标颜色
    navigationBarTextStyle: 'black',
    backgroundColor: '#F5F6F8',
    enablePullDownRefresh: false
  }
})
