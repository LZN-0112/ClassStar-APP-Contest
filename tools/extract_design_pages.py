#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从 Pencil 设计稿提取页面信息，生成 design_pages.json
基于已有的 design-labels.json 文本内容，补充可点击元素与跳转推断。
"""

import json
import re
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).parent
DESIGN_LABELS = BASE_DIR / "design-labels.json"
OUTPUT = BASE_DIR / "design_pages.json"

# 页面 ID -> 页面名称（从 design-labels.json 自动构建，同时保留一份兜底映射）
PAGE_ID_TO_NAME: dict[str, str] = {}
PAGE_NAME_TO_ID: dict[str, str] = {}

# 底部 TabBar 条目（从 Tab Bar 组件中提取）
TAB_BAR_ITEMS = ["首页", "班级", "通知", "数据", "我的"]
TAB_BAR_TARGET_ID = {
    "首页": "RfR8C",
    "班级": "B27EGT",
    "通知": "N0D6Y",
    "数据": "AGvb6",
    "我的": "a3uMZY",
}

# 全局可点击文本 -> 目标页面名称（用于推断）
GLOBAL_TEXT_TARGET: dict[str, str] = {
    # TabBar
    "首页": "学生首页",
    "班级": "班级首页",
    "通知": "通知首页",
    "数据": "数据看板页",
    "我的": "个人中心",
    # 快捷入口 / 菜单
    "通知": "通知首页",
    "签到": "签到页面",
    "作业": "作业列表页",
    "活动": "活动列表页",
    "资料": "资料库页",
    "更多": "更多功能页",
    "班费记账": "班费记账页",
    "抽签": "随机抽签页",
    "投票": "投票列表页",
    "番茄钟": "番茄钟专注页",
    # 列表/卡片跳转
    "班级成员": "成员列表页",
    "班级资料库": "资料库页",
    "班级档案": "班级档案页",
    "上传资料": "上传资料页",
    "上传文件": "上传资料页",
    "发布通知": "发布通知页",
    "发起签到": "发起签到页",
    "发布活动": "发布活动页",
    "发布作业": "发布作业页",
    "发起投票": "发起投票页",
    "导入": "导入学生名单页",
    "导入学生名单": "导入学生名单页",
    "工作交接": "工作交接页",
    "班级设置": "班级设置页",
    "设置": "设置",
    "账号与安全": "账号与安全页",
    "消息通知设置": "消息通知设置页",
    "再次提醒设置": "再次提醒设置页",
    "隐私设置": "隐私设置页",
    "通用设置": "通用设置页",
    "帮助与反馈": "帮助与反馈页",
    "帮助反馈": "帮助与反馈页",
    "关于": "关于页",
    "退出登录": "登录注册页",
    "我的考勤": "我的考勤",
    "我的作业": "我的作业",
    "我的活动": "我的活动",
    "我的报名": "我的报名页",
    "我的报名记录": "我的报名记录",
    "任务看板": "任务看板",
    "数据看板": "数据看板页",
    "学期报表": "学期报表页",
    "考勤报表": "考勤报表页",
    "收支报表": "收支报表页",
    "班费账本": "班费账本页",
    "缴费登记": "缴费登记页",
    "延时申请": "延时申请页",
    "作业提交": "作业提交页",
    "报名统计": "报名统计页",
    "报名表单": "报名表单页",
    "档案详情": "档案详情页",
    "导出档案": "导出档案页",
    "下载统计": "下载统计页",
    "文件列表": "文件列表页",
    "资料详情": "资料详情页",
    "作业详情": "作业详情页",
    "活动详情": "活动详情页",
    "通知详情": "通知详情页",
    "通知列表": "通知列表页",
    "通知统计": "通知统计页",
    "请假申请": "请假申请页",
    "请假审批": "请假审批页",
    "签到方式选择": "签到方式选择页",
    "身份选择": "身份选择页",
    "创建加入班级": "创建加入班级页",
    "忘记密码": "忘记密码页",
    "注册": "注册页",
    "登录": "登录注册页",
    "重置密码": "忘记密码页",
    "成员详情": "成员详情页",
    "班级电子档案": "班级电子档案页",
    "互动消息": "互动消息页",
}

# 动作类文本 -> 视为按钮/操作，目标需结合当前页或常见页推断
ACTION_TEXTS = {
    "保存", "保存设置", "保存记录", "提交", "提交报名", "提交作业", "提交申请",
    "提交反馈", "发布", "发布活动", "发布作业", "发布通知", "发布投票",
    "确认", "确认登记", "确认导出", "下一步", "去签到", "去投票", "立即报名",
    "上传", "上传凭证", "点击上传附件", "点击上传作业文件", "点击或拖拽文件到此处上传",
    "查看详情", "查看全部", "查看结果", "导出", "导出档案", "导出统计",
    "导出选项", "开始抽签", "删除", "编辑", "添加", "移除", "解散班级",
    "扫描二维码加入班级", "创建班级", "加入班级", "登录", "注册账号",
    "忘记密码", "已有账号？登录", "修改密码", "绑定手机", "绑定邮箱",
    "清除缓存", "给我们评分", "版本更新", "用户协议", "隐私政策",
    "通过", "驳回", "正选", "候补", "中签记录 >",
}

# 某些文本在特定页面出现，应指向特定目标
CONTEXT_TARGET: dict[tuple[str, str], str] = {
    # (source_page_name, text) -> target_page_name
    ("学生首页", "查看全部"): "通知列表页",
    ("班级首页", "设置"): "班级设置页",
    ("班级首页", "班级成员"): "成员列表页",
    ("班级首页", "班级资料库"): "资料库页",
    ("班级首页", "班级档案"): "班级档案页",
    ("通知首页", "查看全部"): "通知列表页",
    ("通知首页", "发布"): "发布通知页",
    ("通知列表页", "发布"): "发布通知页",
    ("考勤列表页", "发起签到"): "发起签到页",
    ("作业列表页", "发布作业"): "发布作业页",
    ("活动列表页", "发布活动"): "发布活动页",
    ("投票列表页", "去投票"): "报名表单页",
    ("班费账本页", "班费记账"): "班费记账页",
    ("个人中心", "设置"): "设置",
    ("个人中心", "账号与安全"): "账号与安全页",
    ("个人中心", "隐私设置"): "隐私设置页",
    ("个人中心", "消息通知设置"): "消息通知设置页",
    ("个人中心", "通用设置"): "通用设置页",
    ("个人中心", "帮助与反馈"): "帮助与反馈页",
    ("个人中心", "关于"): "关于页",
    ("设置", "账号与安全"): "账号与安全页",
    ("设置", "隐私设置"): "隐私设置页",
    ("设置", "消息通知设置"): "消息通知设置页",
    ("设置", "再次提醒设置"): "再次提醒设置页",
    ("设置", "通用设置"): "通用设置页",
    ("设置", "帮助与反馈"): "帮助与反馈页",
    ("设置", "关于"): "关于页",
}


def build_page_maps(pages: list[dict]) -> None:
    for p in pages:
        PAGE_ID_TO_NAME[p["id"]] = p["name"]
        PAGE_NAME_TO_ID[p["name"]] = p["id"]


def infer_target(page_name: str, text: str) -> dict[str, Any] | None:
    """根据当前页面和文本推断可点击元素的跳转目标。"""
    text_clean = text.strip()
    if not text_clean:
        return None

    # 优先使用上下文敏感映射
    key = (page_name, text_clean)
    if key in CONTEXT_TARGET:
        target_name = CONTEXT_TARGET[key]
        return {
            "target_page_name": target_name,
            "target_page_id": PAGE_NAME_TO_ID.get(target_name),
            "confidence": "high",
        }

    # 全局映射
    if text_clean in GLOBAL_TEXT_TARGET:
        target_name = GLOBAL_TEXT_TARGET[text_clean]
        return {
            "target_page_name": target_name,
            "target_page_id": PAGE_NAME_TO_ID.get(target_name),
            "confidence": "medium",
        }

    # 动作类文本：视为当前页操作或无法确定目标
    if text_clean in ACTION_TEXTS:
        return {
            "target_page_name": None,
            "target_page_id": None,
            "confidence": "action",
            "note": "当前页操作或需弹窗确认",
        }

    # TabBar 条目兜底
    if text_clean in TAB_BAR_ITEMS:
        tid = TAB_BAR_TARGET_ID.get(text_clean)
        return {
            "target_page_name": PAGE_ID_TO_NAME.get(tid),
            "target_page_id": tid,
            "confidence": "high",
        }

    return None


def is_clickable_text(page_name: str, text: str) -> bool:
    """判断文本是否可能是可点击元素。"""
    text_clean = text.strip()
    if text_clean in GLOBAL_TEXT_TARGET:
        return True
    if text_clean in ACTION_TEXTS:
        return True
    if text_clean in TAB_BAR_ITEMS:
        return True
    # 列表项、通知、作业、活动等具体条目在页面中通常可点击
    if page_name in {"通知首页", "通知列表页", "互动消息页"} and "通知" in text_clean and len(text_clean) > 2:
        return True
    if page_name in {"作业列表页", "我的作业"} and "作业" in text_clean and len(text_clean) > 2:
        return True
    if page_name in {"活动列表页", "我的活动"} and ("活动" in text_clean or "运动会" in text_clean or "团建" in text_clean or "晚会" in text_clean):
        return True
    if page_name in {"考勤列表页", "我的考勤"} and "签到" in text_clean:
        return True
    if page_name == "投票列表页" and "投票" in text_clean and len(text_clean) > 2:
        return True
    if page_name == "更多功能页" and text_clean in {"班费记账", "抽签", "投票", "番茄钟"}:
        return True
    if page_name == "个人中心" and text_clean.startswith("我的"):
        return True
    if page_name == "设置" and text_clean in {"账号与安全", "隐私设置", "消息通知设置", "再次提醒设置", "通用设置", "帮助与反馈", "关于"}:
        return True
    # 常见可点击关键词
    if re.search(r"查看|上传|发布|发起|导入|导出|保存|提交|确认|下一步|登录|注册|设置", text_clean):
        return True
    return False


def element_type_for(page_name: str, text: str) -> str:
    if text in TAB_BAR_ITEMS:
        return "tab_bar_item"
    if text.startswith("我的") and text in GLOBAL_TEXT_TARGET:
        return "quick_action"
    if text in {"通知", "签到", "作业", "活动", "资料", "更多", "班费记账", "抽签", "投票", "番茄钟"}:
        return "quick_action"
    if re.search(r"提交|保存|发布|确认|下一步|登录|注册|去签到|去投票|立即报名|导出", text):
        return "button"
    if "查看" in text or "上传" in text or "发起" in text or "导入" in text:
        return "button"
    if page_name in {"设置", "班级设置页", "隐私设置页", "通用设置页", "账号与安全页"}:
        return "setting_row"
    if page_name in {"成员列表页", "通知列表页", "作业列表页", "活动列表页", "投票列表页", "我的作业", "我的活动", "我的报名页", "我的考勤", "考勤列表页", "班费账本页"}:
        return "list_item"
    return "unknown"


def enrich_page(page: dict) -> dict:
    page_name = page["name"]
    texts = page.get("texts", [])
    clickable = []
    seen = set()

    for text in texts:
        if not text or not is_clickable_text(page_name, text):
            continue
        key = (page_name, text)
        if key in seen:
            continue
        seen.add(key)

        target = infer_target(page_name, text)
        elem = {
            "text": text,
            "type": element_type_for(page_name, text),
        }
        if target:
            elem["inferred_target"] = target
        clickable.append(elem)

    # 特殊页：启动页无点击，引导页可能有“下一步/开始使用”但未在文本中体现，保持文本原样
    has_tab_bar = any(t in TAB_BAR_ITEMS for t in texts) and len([t for t in texts if t in TAB_BAR_ITEMS]) >= 3

    result = {
        "id": page["id"],
        "name": page_name,
        "width": page.get("width"),
        "height": page.get("height"),
        "key_texts": texts,
        "clickable_elements": clickable,
        "has_tab_bar": has_tab_bar,
    }
    if has_tab_bar:
        result["tab_bar_items"] = [
            {
                "label": item,
                "target_page_name": PAGE_ID_TO_NAME.get(TAB_BAR_TARGET_ID[item]),
                "target_page_id": TAB_BAR_TARGET_ID[item],
                "is_current": item in texts and texts.count(item) >= 1,
            }
            for item in TAB_BAR_ITEMS
        ]
    return result


def main() -> None:
    pages = json.loads(DESIGN_LABELS.read_text(encoding="utf-8"))
    build_page_maps(pages)

    enriched = [enrich_page(p) for p in pages]

    output = {
        "source_file": "校园班级事务智能管理助手.pen",
        "generated_at": "2026-07-10",
        "total_pages": len(enriched),
        "tab_bar": {
            "items": [
                {"label": item, "target_page_name": PAGE_ID_TO_NAME.get(TAB_BAR_TARGET_ID[item]), "target_page_id": TAB_BAR_TARGET_ID[item]}
                for item in TAB_BAR_ITEMS
            ]
        },
        "pages": enriched,
    }

    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"已生成 {OUTPUT}")
    print(f"共处理 {len(enriched)} 个页面")


if __name__ == "__main__":
    main()
