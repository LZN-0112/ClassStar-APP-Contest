#!/usr/bin/env node
// -*- coding: utf-8 -*-
/**
 * 从 Pencil 设计稿提取页面信息，生成 design_pages.json
 * 基于已有的 design-labels.json 文本内容，补充可点击元素与跳转推断。
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = __dirname;
const DESIGN_LABELS = path.join(BASE_DIR, 'design-labels.json');
const OUTPUT = path.join(BASE_DIR, 'design_pages.json');

// 底部 TabBar 条目（从 Tab Bar 组件中提取）
const TAB_BAR_ITEMS = ['首页', '班级', '通知', '数据', '我的'];
const TAB_BAR_TARGET_ID = {
  '首页': 'RfR8C',
  '班级': 'B27EGT',
  '通知': 'N0D6Y',
  '数据': 'AGvb6',
  '我的': 'a3uMZY',
};

// 全局可点击文本 -> 目标页面名称
const GLOBAL_TEXT_TARGET = {
  '首页': '学生首页',
  '班级': '班级首页',
  '通知': '通知首页',
  '数据': '数据看板页',
  '我的': '个人中心',
  '签到': '签到页面',
  '作业': '作业列表页',
  '活动': '活动列表页',
  '资料': '资料库页',
  '更多': '更多功能页',
  '班费记账': '班费记账页',
  '抽签': '随机抽签页',
  '投票': '投票列表页',
  '番茄钟': '番茄钟专注页',
  '班级成员': '成员列表页',
  '班级资料库': '资料库页',
  '班级档案': '班级档案页',
  '上传资料': '上传资料页',
  '上传文件': '上传资料页',
  '发布通知': '发布通知页',
  '发起签到': '发起签到页',
  '发布活动': '发布活动页',
  '发布作业': '发布作业页',
  '发起投票': '发起投票页',
  '导入': '导入学生名单页',
  '导入学生名单': '导入学生名单页',
  '工作交接': '工作交接页',
  '班级设置': '班级设置页',
  '设置': '设置',
  '账号与安全': '账号与安全页',
  '消息通知设置': '消息通知设置页',
  '再次提醒设置': '再次提醒设置页',
  '隐私设置': '隐私设置页',
  '通用设置': '通用设置页',
  '帮助与反馈': '帮助与反馈页',
  '帮助反馈': '帮助与反馈页',
  '关于': '关于页',
  '退出登录': '登录注册页',
  '我的考勤': '我的考勤',
  '我的作业': '我的作业',
  '我的活动': '我的活动',
  '我的报名': '我的报名页',
  '我的报名记录': '我的报名记录',
  '任务看板': '任务看板',
  '数据看板': '数据看板页',
  '学期报表': '学期报表页',
  '考勤报表': '考勤报表页',
  '收支报表': '收支报表页',
  '班费账本': '班费账本页',
  '缴费登记': '缴费登记页',
  '延时申请': '延时申请页',
  '作业提交': '作业提交页',
  '报名统计': '报名统计页',
  '报名表单': '报名表单页',
  '档案详情': '档案详情页',
  '导出档案': '导出档案页',
  '下载统计': '下载统计页',
  '文件列表': '文件列表页',
  '资料详情': '资料详情页',
  '作业详情': '作业详情页',
  '活动详情': '活动详情页',
  '通知详情': '通知详情页',
  '通知列表': '通知列表页',
  '通知统计': '通知统计页',
  '请假申请': '请假申请页',
  '请假审批': '请假审批页',
  '签到方式选择': '签到方式选择页',
  '身份选择': '身份选择页',
  '创建加入班级': '创建加入班级页',
  '忘记密码': '忘记密码页',
  '注册': '注册页',
  '登录': '登录注册页',
  '重置密码': '忘记密码页',
  '成员详情': '成员详情页',
  '班级电子档案': '班级电子档案页',
  '互动消息': '互动消息页',
};

const ACTION_TEXTS = new Set([
  '保存', '保存设置', '保存记录', '提交', '提交报名', '提交作业', '提交申请',
  '提交反馈', '发布', '发布活动', '发布作业', '发布通知', '发布投票',
  '确认', '确认登记', '确认导出', '下一步', '去签到', '去投票', '立即报名',
  '上传', '上传凭证', '点击上传附件', '点击上传作业文件', '点击或拖拽文件到此处上传',
  '查看详情', '查看全部', '查看结果', '导出', '导出档案', '导出统计',
  '导出选项', '开始抽签', '删除', '编辑', '添加', '移除', '解散班级',
  '扫描二维码加入班级', '创建班级', '加入班级', '登录', '注册账号',
  '忘记密码', '已有账号？登录', '修改密码', '绑定手机', '绑定邮箱',
  '清除缓存', '给我们评分', '版本更新', '用户协议', '隐私政策',
  '通过', '驳回', '正选', '候补', '中签记录 >',
]);

const CONTEXT_TARGET = {
  '学生首页|查看全部': '通知列表页',
  '班级首页|设置': '班级设置页',
  '班级首页|班级成员': '成员列表页',
  '班级首页|班级资料库': '资料库页',
  '班级首页|班级档案': '班级档案页',
  '通知首页|查看全部': '通知列表页',
  '通知首页|发布': '发布通知页',
  '通知列表页|发布': '发布通知页',
  '考勤列表页|发起签到': '发起签到页',
  '作业列表页|发布作业': '发布作业页',
  '活动列表页|发布活动': '发布活动页',
  '投票列表页|去投票': '报名表单页',
  '班费账本页|班费记账': '班费记账页',
  '个人中心|设置': '设置',
  '个人中心|账号与安全': '账号与安全页',
  '个人中心|隐私设置': '隐私设置页',
  '个人中心|消息通知设置': '消息通知设置页',
  '个人中心|通用设置': '通用设置页',
  '个人中心|帮助与反馈': '帮助与反馈页',
  '个人中心|关于': '关于页',
  '设置|账号与安全': '账号与安全页',
  '设置|隐私设置': '隐私设置页',
  '设置|消息通知设置': '消息通知设置页',
  '设置|再次提醒设置': '再次提醒设置页',
  '设置|通用设置': '通用设置页',
  '设置|帮助与反馈': '帮助与反馈页',
  '设置|关于': '关于页',
};

function buildPageMaps(pages) {
  const idToName = {};
  const nameToId = {};
  for (const p of pages) {
    idToName[p.id] = p.name;
    nameToId[p.name] = p.id;
  }
  return { idToName, nameToId };
}

function inferTarget(pageName, text, maps) {
  const textClean = text.trim();
  if (!textClean) return null;

  const contextKey = `${pageName}|${textClean}`;
  if (CONTEXT_TARGET[contextKey]) {
    const targetName = CONTEXT_TARGET[contextKey];
    return {
      target_page_name: targetName,
      target_page_id: maps.nameToId[targetName] || null,
      confidence: 'high',
    };
  }

  if (GLOBAL_TEXT_TARGET[textClean]) {
    const targetName = GLOBAL_TEXT_TARGET[textClean];
    return {
      target_page_name: targetName,
      target_page_id: maps.nameToId[targetName] || null,
      confidence: 'medium',
    };
  }

  if (ACTION_TEXTS.has(textClean)) {
    return {
      target_page_name: null,
      target_page_id: null,
      confidence: 'action',
      note: '当前页操作或需弹窗确认',
    };
  }

  if (TAB_BAR_ITEMS.includes(textClean)) {
    const tid = TAB_BAR_TARGET_ID[textClean];
    return {
      target_page_name: maps.idToName[tid] || null,
      target_page_id: tid,
      confidence: 'high',
    };
  }

  return null;
}

function isClickableText(pageName, text) {
  const textClean = text.trim();
  if (!textClean) return false;
  if (GLOBAL_TEXT_TARGET[textClean]) return true;
  if (ACTION_TEXTS.has(textClean)) return true;
  if (TAB_BAR_ITEMS.includes(textClean)) return true;

  if (['通知首页', '通知列表页', '互动消息页'].includes(pageName) && textClean.includes('通知') && textClean.length > 2) return true;
  if (['作业列表页', '我的作业'].includes(pageName) && textClean.includes('作业') && textClean.length > 2) return true;
  if (['活动列表页', '我的活动'].includes(pageName) && (textClean.includes('活动') || textClean.includes('运动会') || textClean.includes('团建') || textClean.includes('晚会'))) return true;
  if (['考勤列表页', '我的考勤'].includes(pageName) && textClean.includes('签到')) return true;
  if (pageName === '投票列表页' && textClean.includes('投票') && textClean.length > 2) return true;
  if (pageName === '更多功能页' && ['班费记账', '抽签', '投票', '番茄钟'].includes(textClean)) return true;
  if (pageName === '个人中心' && textClean.startsWith('我的')) return true;
  if (pageName === '设置' && ['账号与安全', '隐私设置', '消息通知设置', '再次提醒设置', '通用设置', '帮助与反馈', '关于'].includes(textClean)) return true;

  if (/查看|上传|发布|发起|导入|导出|保存|提交|确认|下一步|登录|注册|设置/.test(textClean)) return true;
  return false;
}

function elementTypeFor(pageName, text) {
  if (TAB_BAR_ITEMS.includes(text)) return 'tab_bar_item';
  if (text.startsWith('我的') && GLOBAL_TEXT_TARGET[text]) return 'quick_action';
  if (['通知', '签到', '作业', '活动', '资料', '更多', '班费记账', '抽签', '投票', '番茄钟'].includes(text)) return 'quick_action';
  if (/提交|保存|发布|确认|下一步|登录|注册|去签到|去投票|立即报名|导出/.test(text)) return 'button';
  if (/查看|上传|发起|导入/.test(text)) return 'button';
  if (['设置', '班级设置页', '隐私设置页', '通用设置页', '账号与安全页'].includes(pageName)) return 'setting_row';
  if (['成员列表页', '通知列表页', '作业列表页', '活动列表页', '投票列表页', '我的作业', '我的活动', '我的报名页', '我的考勤', '考勤列表页', '班费账本页'].includes(pageName)) return 'list_item';
  return 'unknown';
}

function enrichPage(page, maps) {
  const pageName = page.name;
  const texts = page.texts || [];
  const clickable = [];
  const seen = new Set();

  for (const text of texts) {
    if (!isClickableText(pageName, text)) continue;
    const key = `${pageName}|${text}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const target = inferTarget(pageName, text, maps);
    const elem = { text, type: elementTypeFor(pageName, text) };
    if (target) elem.inferred_target = target;
    clickable.push(elem);
  }

  const tabBarCount = texts.filter(t => TAB_BAR_ITEMS.includes(t)).length;
  const hasTabBar = tabBarCount >= 3;

  const result = {
    id: page.id,
    name: pageName,
    width: page.width,
    height: page.height,
    key_texts: texts,
    clickable_elements: clickable,
    has_tab_bar: hasTabBar,
  };

  if (hasTabBar) {
    result.tab_bar_items = TAB_BAR_ITEMS.map(item => ({
      label: item,
      target_page_name: maps.idToName[TAB_BAR_TARGET_ID[item]] || null,
      target_page_id: TAB_BAR_TARGET_ID[item],
      is_current: texts.includes(item),
    }));
  }

  return result;
}

function main() {
  const pages = JSON.parse(fs.readFileSync(DESIGN_LABELS, 'utf8'));
  const maps = buildPageMaps(pages);
  const enriched = pages.map(p => enrichPage(p, maps));

  const output = {
    source_file: '校园班级事务智能管理助手.pen',
    generated_at: '2026-07-10',
    total_pages: enriched.length,
    tab_bar: {
      items: TAB_BAR_ITEMS.map(item => ({
        label: item,
        target_page_name: maps.idToName[TAB_BAR_TARGET_ID[item]] || null,
        target_page_id: TAB_BAR_TARGET_ID[item],
      })),
    },
    pages: enriched,
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2), 'utf8');
  console.log(`已生成 ${OUTPUT}`);
  console.log(`共处理 ${enriched.length} 个页面`);
}

main();
