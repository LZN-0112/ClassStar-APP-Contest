import json
import uuid
import os

PEN = r"D:\校园班级事务智能管理助手\校园班级事务智能管理助手.pen"


def new_id():
    return uuid.uuid4().hex[:12]


def make_eye_icon_path():
    """tabler:eye 图标，24x24，灰色描边。"""
    return {
        "type": "path",
        "id": new_id(),
        "name": "Eye Icon",
        "width": 24,
        "height": 24,
        "viewBox": [0, 0, 24, 24],
        "fill": "#00000000",
        "stroke": "$text-secondary",
        "strokeWidth": 2,
        "strokeLinecap": "round",
        "strokeLinejoin": "round",
        "geometry": "M10 12a2 2 0 1 0 4 0a2 2 0 0 0-4 0 M21 12q-3.6 6-9 6t-9-6q3.6-6 9-6t9 6"
    }


def make_eye_button():
    """圆形眼睛图标按钮容器。"""
    return {
        "type": "frame",
        "id": new_id(),
        "name": "Eye Button",
        "width": 44,
        "height": 44,
        "fill": "#00000000",
        "cornerRadius": "$rounded-full",
        "justifyContent": "center",
        "alignItems": "center",
        "children": [make_eye_icon_path()]
    }


def make_input_field(placeholder, input_name, width="fill_container"):
    """直接构建普通输入框样式帧。"""
    return {
        "type": "frame",
        "id": new_id(),
        "name": input_name,
        "width": width,
        "height": 56,
        "fill": "$surface",
        "cornerRadius": "$rounded-lg",
        "stroke": "$border",
        "strokeWidth": 1,
        "effect": {
            "type": "shadow",
            "shadowType": "outer",
            "color": "$shadow-soft",
            "offset": {"x": 0, "y": 2},
            "blur": 8
        },
        "layout": "vertical",
        "gap": 8,
        "padding": [0, 16],
        "justifyContent": "center",
        "children": [
            {
                "type": "text",
                "id": new_id(),
                "name": "Placeholder",
                "fill": "$text-muted",
                "content": placeholder,
                "fontFamily": "$font-body",
                "fontSize": "$text-size-body",
                "fontWeight": "normal"
            }
        ]
    }


def make_password_input(placeholder, input_name):
    """带内嵌眼睛图标的密码输入框。"""
    return {
        "type": "frame",
        "id": new_id(),
        "name": input_name,
        "width": "fill_container",
        "height": 56,
        "fill": "$surface",
        "cornerRadius": "$rounded-lg",
        "stroke": "$border",
        "strokeWidth": 1,
        "effect": {
            "type": "shadow",
            "shadowType": "outer",
            "color": "$shadow-soft",
            "offset": {"x": 0, "y": 2},
            "blur": 8
        },
        "layout": "horizontal",
        "gap": 8,
        "padding": [0, 16],
        "justifyContent": "space_between",
        "alignItems": "center",
        "children": [
            {
                "type": "text",
                "id": new_id(),
                "name": "Placeholder",
                "fill": "$text-muted",
                "content": placeholder,
                "fontFamily": "$font-body",
                "fontSize": "$text-size-body",
                "fontWeight": "normal"
            },
            make_eye_button()
        ]
    }


def make_phone_input():
    """手机号输入框。"""
    return make_input_field("请输入手机号", "Phone Input", width="fill_container")


def main():
    with open(PEN, "r", encoding="utf-8") as f:
        doc = json.load(f)

    # 找到注册页
    register_page = None
    for child in doc["children"]:
        if child.get("id") == "a337168f4d34":
            register_page = child
            break
    if register_page is None:
        raise RuntimeError("未找到注册页 a337168f4d34")

    # 找到 Phone Frame 引用
    phone_frame_ref = None
    for child in register_page["children"]:
        if child.get("type") == "ref" and child.get("ref") == "lPWz4":
            phone_frame_ref = child
            break
    if phone_frame_ref is None:
        raise RuntimeError("注册页中未找到 Phone Frame 实例")

    descendants = phone_frame_ref.setdefault("descendants", {})

    # 重新构建注册页内容：使用垂直布局，干净有序
    register_content = {
        "type": "frame",
        "id": new_id(),
        "name": "Register Content",
        "width": "fill_container",
        "height": "fill_container",
        "fill": "$bg",
        "layout": "vertical",
        "padding": [24, 24, 0, 24],
        "gap": 24,
        "alignItems": "center",
        "children": [
            {
                "type": "frame",
                "id": new_id(),
                "name": "Header Text",
                "width": "fill_container",
                "height": "fit_content",
                "fill": "#00000000",
                "layout": "vertical",
                "gap": 12,
                "padding": [0, 0, 0, 32],
                "children": [
                    {
                        "type": "text",
                        "id": new_id(),
                        "name": "Title",
                        "fill": "$text-primary",
                        "content": "注册账号",
                        "fontFamily": "$font-heading",
                        "fontSize": "$text-size-hero",
                        "fontWeight": "700"
                    },
                    {
                        "type": "text",
                        "id": new_id(),
                        "name": "Subtitle",
                        "fill": "$text-secondary",
                        "content": "创建账号后继续管理班级事务",
                        "fontFamily": "$font-body",
                        "fontSize": "$text-size-body",
                        "fontWeight": "normal"
                    }
                ]
            },
            {
                "type": "frame",
                "id": new_id(),
                "name": "Form",
                "width": "fill_container",
                "height": "fit_content",
                "fill": "#00000000",
                "layout": "vertical",
                "gap": 16,
                "children": [
                    make_phone_input(),
                    make_password_input("请输入密码", "Password Input"),
                    make_password_input("请再次输入密码", "Confirm Password Input"),
                ]
            },
            {
                "type": "frame",
                "id": new_id(),
                "name": "Action Area",
                "width": "fill_container",
                "height": "fit_content",
                "fill": "#00000000",
                "layout": "vertical",
                "gap": 16,
                "padding": [16, 0, 0, 0],
                "alignItems": "center",
                "children": [
                    {
                        "id": new_id(),
                        "type": "ref",
                        "ref": "eV6B7",
                        "name": "Register Button",
                        "width": "fill_container",
                        "descendants": {
                            "OrH2l": {
                                "content": "注册"
                            }
                        }
                    },
                    {
                        "type": "text",
                        "id": new_id(),
                        "name": "Agreement",
                        "fill": "$text-muted",
                        "content": "登录即表示同意《用户协议》和《隐私政策》",
                        "textAlign": "center",
                        "fontFamily": "$font-caption",
                        "fontSize": "$text-size-caption",
                        "fontWeight": "normal"
                    }
                ]
            }
        ]
    }

    descendants["n9xLw"] = register_content

    # 删除注册页根级别多余的 Phone Input 帧（如果存在）
    register_page["children"] = [
        child for child in register_page["children"]
        if not (child.get("type") == "frame" and child.get("name") == "Phone Input" and child.get("id") == "NG8OI")
    ]

    with open(PEN, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)

    print("注册页已修复")


if __name__ == "__main__":
    main()
