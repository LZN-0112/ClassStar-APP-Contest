const fs = require('fs')
const path = require('path')

const uniapp = path.join(__dirname, '..', 'campus-class-manage', 'apps', 'uniapp', 'src')
const pagesJson = JSON.parse(fs.readFileSync(path.join(uniapp, 'pages.json'), 'utf8'))
const routes = pagesJson.pages.map(p => p.path)

const routeMap = {
  '启动页': 'pages/onboarding/launch',
  '引导页': 'pages/onboarding/onboarding',
  '登录注册页': 'pages/auth/login',
  '注册页': 'pages/auth/register',
  '忘记密码页': 'pages/auth/reset-password',
  '身份选择页': 'pages/auth/identity-select',
  '创建加入班级页': 'pages/class/join-class',
  '导入学生名单页': 'pages/index/index',
  '学生首页': 'pages/home/index',
  '班级首页': 'pages/class/index',
  '通知首页': 'pages/notice/index',
  '通知列表页': 'pages/notice/list',
  '通知详情页': 'pages/notice/detail',
  '发布通知页': 'pages/notice/publish',
  '通知统计页': 'pages/notice/statistics',
  '互动消息页': 'pages/notice/interaction',
  '再次提醒设置页': 'pages/notice/reminder',
  '考勤列表页': 'pages/attendance/list',
  '考勤详情页': 'pages/attendance/detail',
  '发起签到页': 'pages/attendance/create',
  '签到页面': 'pages/attendance/check-in',
  '签到方式选择页': 'pages/attendance/method',
  '请假审批页': 'pages/attendance/leave-approval',
  '请假申请页': 'pages/attendance/leave-apply',
  '考勤报表页': 'pages/attendance/report',
  '作业列表页': 'pages/homework/list',
  '作业详情页': 'pages/homework/detail',
  '发布作业页': 'pages/homework/publish',
  '作业提交页': 'pages/homework/submit',
  '延时申请页': 'pages/homework/delay-apply',
  '活动列表页': 'pages/activity/list',
  '活动详情页': 'pages/activity/detail',
  '发布活动页': 'pages/activity/publish',
  '报名统计页': 'pages/activity/signup-stats',
  '报名表单页': 'pages/activity/signup-form',
  '我的报名页': 'pages/activity/my-signup',
  '我的报名记录': 'pages/activity/my-signup',
  '资料库页': 'pages/material/list',
  '上传资料页': 'pages/material/upload',
  '资料详情页': 'pages/material/detail',
  '文件列表页': 'pages/material/files',
  '下载统计页': 'pages/material/download-stats',
  '随机抽签页': 'pages/random-draw/list',
  '班费账本页': 'pages/fee/index',
  '班费记账页': 'pages/fee/add',
  '收支报表页': 'pages/fee/report',
  '缴费登记页': 'pages/fee/payment',
  '投票列表页': 'pages/vote/list',
  '发起投票页': 'pages/vote/create',
  '番茄钟专注页': 'pages/tomato/index',
  '任务看板': 'pages/task-board/index',
  '数据看板页': 'pages/data/index',
  '学期报表页': 'pages/data/report',
  '班级档案页': 'pages/class/archive',
  '档案详情页': 'pages/class/archive-detail',
  '班级电子档案页': 'pages/class/e-archive',
  '导出档案页': 'pages/class/export-archive',
  '成员列表页': 'pages/class/members',
  '成员详情页': 'pages/class/member-detail',
  '工作交接页': 'pages/class/handover',
  '班级设置页': 'pages/class/settings',
  '个人中心': 'pages/settings/personal-center',
  '设置': 'pages/settings/settings',
  '账号与安全页': 'pages/settings/account-security',
  '通用设置页': 'pages/settings/general-settings',
  '消息通知设置页': 'pages/settings/notification-settings',
  '隐私设置页': 'pages/settings/privacy-settings',
  '帮助与反馈页': 'pages/settings/help-feedback',
  '关于页': 'pages/settings/about',
  '我的考勤': 'pages/profile/attendance',
  '我的作业': 'pages/profile/homework',
  '我的活动': 'pages/profile/activity',
  '我的报名记录': 'pages/profile/signup',
  '更多功能页': 'pages/more/index',
}

const design = JSON.parse(fs.readFileSync(path.join(__dirname, 'design-labels.json'), 'utf8'))
const rows = []
for (const s of design) {
  if (['Phone Frame', 'Background Layer', 'Landscape Photo', 'Content'].includes(s.name)) continue
  const route = routeMap[s.name]
  const registered = route ? routes.includes(route) : false
  const filePath = route ? path.join(uniapp, route + '.vue') : null
  const exists = filePath ? fs.existsSync(filePath) : false
  const isPlaceholder = exists && fs.readFileSync(filePath, 'utf8').includes('开发中')
  rows.push({
    id: s.id,
    name: s.name,
    route,
    registered,
    exists,
    isPlaceholder,
    texts: s.texts.slice(0, 8),
  })
}

const missingRoutes = rows.filter(r => r.route && !r.registered)
const missingFiles = rows.filter(r => r.route && !r.exists)
const placeholders = rows.filter(r => r.isPlaceholder)

console.log('=== 设计稿页面映射 ===')
console.table(rows.map(r => ({ name: r.name, route: r.route, registered: r.registered ? '是' : '否', exists: r.exists ? '是' : '否', placeholder: r.isPlaceholder ? '是' : '否', preview: r.texts.join(' / ') })))
console.log('\n=== 未注册路由 ===')
console.log(missingRoutes.map(r => `${r.name} -> ${r.route}`).join('\n') || '无')
console.log('\n=== 缺少文件 ===')
console.log(missingFiles.map(r => `${r.name} -> ${r.route}`).join('\n') || '无')
console.log('\n=== 占位页面 ===')
console.log(placeholders.map(r => `${r.name} -> ${r.route}`).join('\n') || '无')
