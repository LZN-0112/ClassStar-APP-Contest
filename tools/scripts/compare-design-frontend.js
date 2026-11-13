const fs = require('fs')
const path = require('path')

const designPath = path.join(__dirname, 'design_pages.json')
const frontendPath = path.join(__dirname, 'frontend_routes.json')
const outputPath = path.join(__dirname, 'discrepancy_report.md')

const design = JSON.parse(fs.readFileSync(designPath, 'utf8'))
const frontend = JSON.parse(fs.readFileSync(frontendPath, 'utf8'))

// 设计稿页面名称 -> 前端页面路径（人工映射，可扩展）
const designToFrontendMap = {
  '学生首页': 'pages/home/index',
  '班级首页': 'pages/class/index',
  '通知首页': 'pages/notice/index',
  '通知列表页': 'pages/notice/list',
  '通知详情页': 'pages/notice/detail',
  '数据看板页': 'pages/data/index',
  '个人中心': 'pages/settings/personal-center',
  '考勤列表页': 'pages/attendance/list',
  '考勤详情页': 'pages/attendance/detail',
  '签到页面': 'pages/attendance/check-in',
  '发起签到页': 'pages/attendance/create',
  '签到方式选择页': 'pages/attendance/method-select',
  '作业列表页': 'pages/homework/list',
  '作业详情页': 'pages/homework/detail',
  '作业提交页': 'pages/homework/submit',
  '发布作业页': 'pages/homework/publish',
  '活动列表页': 'pages/activity/list',
  '活动详情页': 'pages/activity/detail',
  '发布活动页': 'pages/activity/publish',
  '资料库页': 'pages/material/list',
  '资料详情页': 'pages/material/detail',
  '上传资料页': 'pages/material/upload',
  '文件列表页': 'pages/material/files',
  '随机抽签页': 'pages/random-draw/list',
  '更多功能页': 'pages/more/index',
  '班费记账页': 'pages/fee/add',
  '班费账本页': 'pages/fee/index',
  '投票列表页': 'pages/vote/list',
  '番茄钟专注页': 'pages/tomato/index',
  '任务看板': 'pages/task-board/index',
  '登录注册页': 'pages/auth/login',
  '注册页': 'pages/auth/register',
  '忘记密码页': 'pages/auth/reset-password',
  '身份选择页': 'pages/auth/identity-select',
  '创建加入班级页': 'pages/class/join-class',
  '导入学生名单页': 'pages/index/index',
  '班级设置页': 'pages/class/settings',
  '班级档案页': 'pages/class/archive',
  '班级电子档案页': 'pages/class/electronic-archive',
  '档案详情页': 'pages/class/archive-detail',
  '导出档案页': 'pages/class/archive-export',
  '成员列表页': 'pages/class/members',
  '成员详情页': 'pages/class/member-detail',
  '设置': 'pages/settings/settings',
  '账号与安全页': 'pages/settings/account-security',
  '隐私设置页': 'pages/settings/privacy-settings',
  '消息通知设置页': 'pages/settings/notification-settings',
  '再次提醒设置页': 'pages/notice/reminder',
  '通用设置页': 'pages/settings/general-settings',
  '关于页': 'pages/settings/about',
  '帮助与反馈页': 'pages/settings/help-feedback',
  '我的报名记录': 'pages/profile/signup',
  '我的报名页': 'pages/profile/signup-detail',
  '我的活动': 'pages/profile/activity',
  '我的考勤': 'pages/profile/attendance',
  '我的作业': 'pages/profile/homework',
  '收支报表页': 'pages/data/fee-report',
  '考勤报表页': 'pages/data/attendance-report',
  '学期报表页': 'pages/data/semester-report',
  '下载统计页': 'pages/material/download-stats',
  '发起投票页': 'pages/vote/create',
  '报名表单页': 'pages/activity/register',
  '报名统计页': 'pages/activity/register-stats',
  '缴费登记页': 'pages/fee/collection',
  '请假申请页': 'pages/attendance/leave-request',
  '请假审批页': 'pages/attendance/leave-approval',
  '延时申请页': 'pages/homework/delay-request',
  '工作交接页': 'pages/class/handover',
  '互动消息页': 'pages/notice/interaction',
  '通知统计页': 'pages/notice/statistics',
  '启动页': 'pages/onboarding/launch',
  '引导页': 'pages/onboarding/onboarding',
}

const frontendPagesByPath = {}
for (const p of frontend.pages) {
  frontendPagesByPath[p.pagePath] = p
}

let md = '# 设计稿与前端实现不一致项清单\n\n'
md += `生成时间：${new Date().toLocaleString('zh-CN')}\n\n`
md += `- 设计稿页面数：${design.total_pages}\n`
md += `- 前端注册页面数：${frontend.meta.registeredPages}\n\n`

// 1. 设计稿页面未在前端找到映射
md += '## 一、设计稿页面在前端缺失或映射未确认\n\n'
md += '| 设计稿页面 | 推断前端路径 | 状态 |\n|---|---|---|\n'
const missing = []
const uncertain = []
for (const page of design.pages) {
  const mapped = designToFrontendMap[page.name]
  if (!mapped) {
    uncertain.push(page.name)
    md += `| ${page.name} | - | 未映射 |\n`
  } else if (!frontendPagesByPath[mapped]) {
    missing.push({ design: page.name, path: mapped })
    md += `| ${page.name} | ${mapped} | 前端未注册 |\n`
  }
}
if (uncertain.length === 0 && missing.length === 0) {
  md += '| （无） | - | - |\n'
}
md += '\n'

// 2. TabBar 一致性
md += '## 二、底部 TabBar 一致性\n\n'
md += '| 标签 | 设计稿目标 | 前端当前目标 | 状态 |\n|---|---|---|---|\n'
const designTabMap = {}
for (const item of design.tab_bar.items) {
  designTabMap[item.label] = designToFrontendMap[item.target_page_name]
}
const frontendTabMap = {}
for (const t of frontend.tabBar.tabs) {
  frontendTabMap[t.label] = t.path.replace(/^\//, '')
}
for (const label of Object.keys(designTabMap)) {
  const designPath = designTabMap[label]
  const frontendPath = frontendTabMap[label]
  const status = designPath === frontendPath ? '一致' : '不一致'
  md += `| ${label} | ${designPath || '-'} | ${frontendPath || '-'} | ${status} |\n`
}
md += '\n'

// 3. 关键页面跳转差异
md += '## 三、关键页面跳转差异\n\n'

function getFrontendOutgoing(pagePath) {
  const p = frontendPagesByPath[pagePath]
  return p ? p.outgoing : []
}

function describeJump(pageName, designTargets, frontendTargets) {
  const rows = []
  for (const dt of designTargets) {
    const match = frontendTargets.find(t => t.target && dt.path && normalize(t.target).includes(normalize(dt.path)))
    rows.push({
      trigger: dt.text,
      designTarget: dt.path,
      frontendTarget: match ? match.target : '未找到',
      status: match ? '一致' : '不一致'
    })
  }
  return rows
}

function normalize(p) {
  return (p || '').replace(/^\//, '').replace(/\?.*$/, '')
}

function getDesignTargets(pageName) {
  const page = design.pages.find(p => p.name === pageName)
  if (!page) return []
  return (page.clickable_elements || []).map(e => ({
    text: e.text,
    path: e.inferred_target && e.inferred_target.target_page_name ? designToFrontendMap[e.inferred_target.target_page_name] : null,
    confidence: e.inferred_target ? e.inferred_target.confidence : 'unknown'
  })).filter(e => e.path)
}

const keyPages = [
  { name: '学生首页', path: 'pages/home/index' },
  { name: '通知首页', path: 'pages/notice/index' },
  { name: '班级首页', path: 'pages/class/index' },
  { name: '数据看板页', path: 'pages/data/index' },
  { name: '考勤列表页', path: 'pages/attendance/list' },
  { name: '作业列表页', path: 'pages/homework/list' },
  { name: '活动列表页', path: 'pages/activity/list' },
  { name: '资料库页', path: 'pages/material/list' },
  { name: '随机抽签页', path: 'pages/random-draw/list' },
  { name: '更多功能页', path: 'pages/more/index' },
  { name: '个人中心', path: 'pages/settings/personal-center' },
]

for (const kp of keyPages) {
  md += `### ${kp.name}\n\n`
  md += `前端路径：\`${kp.path}\`\n\n`
  md += '| 触发元素 | 设计稿跳转目标 | 前端当前跳转目标 | 状态 |\n|---|---|---|---|\n'
  const designTargets = getDesignTargets(kp.name)
  const frontendTargets = getFrontendOutgoing(kp.path)
  const rows = describeJump(kp.name, designTargets, frontendTargets)
  if (rows.length === 0) {
    md += '| （无明确可推断跳转） | - | - | - |\n'
  } else {
    for (const r of rows) {
      md += `| ${r.trigger} | ${r.designTarget || '-'} | ${r.frontendTarget || '-'} | ${r.status} |\n`
    }
  }
  md += '\n'
}

// 4. 设计稿含 TabBar 但前端未在对应路径显示 TabBar
md += '## 四、TabBar 显示范围差异\n\n'
md += '设计稿中以下页面底部显示 TabBar，但前端当前 TabBar 只在 5 个根页面路径显示，子页面不显示：\n\n'
md += '| 设计稿页面 | 前端路径 | 说明 |\n|---|---|---|\n'
for (const page of design.pages) {
  if (page.has_tab_bar) {
    const mapped = designToFrontendMap[page.name]
    const isTabRoot = ['pages/home/index', 'pages/class/index', 'pages/notice/index', 'pages/data/index', 'pages/settings/personal-center'].includes(mapped)
    if (mapped && !isTabRoot) {
      md += `| ${page.name} | ${mapped} | 设计稿显示 TabBar，前端子页不显示 |\n`
    }
  }
}
md += '\n'

// 5. 路由配置异常
md += '## 五、前端路由配置异常\n\n'
md += '| 页面 | 问题 | 当前代码 | 建议 |\n|---|---|---|---|\n'
md += '| 设置页再次提醒 | 跳转路径与 pages.json 注册路径不一致 | `/pages/settings/reminder-settings` | 统一为 `/pages/notice/reminder` 或修正 pages.json |\n'
md += '| 班级首页菜单 | 设计稿未显示“班级成员/班级资料库/班级档案”菜单 | 存在 3 个菜单入口 | 需视觉核对，若设计稿确实无此菜单应移除 |\n'
md += '| 随机抽签页 | 设计稿显示底部 TabBar，前端未显示 | - | 检查是否应为 Tab 页或保留 TabBar |\n'
md += '\n'

fs.writeFileSync(outputPath, md, 'utf8')
console.log('不一致报告已生成：', outputPath)
