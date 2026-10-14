import json
import uuid
import os
import shutil

PEN = r"D:\校园班级事务智能管理助手\校园班级事务智能管理助手.pen"
BAK = r"D:\校园班级事务智能管理助手\校园班级事务智能管理助手.pen.bak"


def new_id():
    return uuid.uuid4().hex[:12]


def find_node(children, node_id):
    for child in children:
        if child.get("id") == node_id:
            return child
    return None


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


def make_password_row(input_ref_id, placeholder, input_name):
    """横向密码输入框容器：左侧输入框 + 右侧眼睛按钮。"""
    return {
        "type": "frame",
        "id": new_id(),
        "name": f"{input_name} Row",
        "width": "fill_container",
        "height": 56,
        "fill": "#00000000",
        "layout": "horizontal",
        "gap": 12,
        "alignItems": "center",
        "children": [
            {
                "id": input_ref_id,
                "type": "ref",
                "ref": "p1Ykr",
                "name": input_name,
                "width": "fill_container",
                "descendants": {
                    "uwUcZ": {
                        "content": placeholder
                    }
                }
            },
            make_eye_button()
        ]
    }


def main():
    # 备份原文件
    shutil.copy2(PEN, BAK)

    with open(PEN, "r", encoding="utf-8") as f:
        doc = json.load(f)

    # ---------- 1. 注册页修改 ----------
    register_page = find_node(doc["children"], "a337168f4d34")
    if register_page is None:
        raise RuntimeError("未找到注册页 a337168f4d34")

    phone_frame_ref = find_node(register_page["children"], "2b5a1e208ef6")
    if phone_frame_ref is None or phone_frame_ref.get("type") != "ref":
        raise RuntimeError("注册页中未找到 Phone Frame 实例")

    descendants = phone_frame_ref.setdefault("descendants", {})
    register_content = descendants.get("n9xLw")
    if register_content is None:
        raise RuntimeError("注册页 Phone Frame 中未找到 Screen Area 替换内容")

    reg_children = register_content["children"]

    # 替换密码输入框
    pwd_index = None
    for i, child in enumerate(reg_children):
        if child.get("id") == "6f4a1d8dfbd4":
            pwd_index = i
            break
    if pwd_index is None:
        raise RuntimeError("注册页中未找到密码输入框 6f4a1d8dfbd4")
    reg_children[pwd_index] = make_password_row(
        "6f4a1d8dfbd4", "请输入密码", "Password Input"
    )

    # 替换确认密码输入框
    confirm_index = None
    for i, child in enumerate(reg_children):
        if child.get("id") == "5e942f95ea0c":
            confirm_index = i
            break
    if confirm_index is None:
        raise RuntimeError("注册页中未找到确认密码输入框 5e942f95ea0c")
    reg_children[confirm_index] = make_password_row(
        "5e942f95ea0c", "请再次输入密码", "Confirm Password Input"
    )

    # ---------- 2. 登录注册页修改 ----------
    login_page = find_node(doc["children"], "T8iiRd")
    if login_page is None:
        raise RuntimeError("未找到登录注册页 T8iiRd")

    login_phone_frame_ref = find_node(login_page["children"], "k7AiM")
    if login_phone_frame_ref is None or login_phone_frame_ref.get("type") != "ref":
        raise RuntimeError("登录注册页中未找到 Phone Frame 实例")

    login_descendants = login_phone_frame_ref.setdefault("descendants", {})
    login_content = login_descendants.get("n9xLw")
    if login_content is None:
        raise RuntimeError("登录注册页 Phone Frame 中未找到 Screen Area 替换内容")

    login_children = login_content["children"]

    # 找到手机号输入框和登录按钮的位置
    phone_input_index = None
    login_btn_index = None
    for i, child in enumerate(login_children):
        cid = child.get("id")
        if cid == "Wb69S":
            phone_input_index = i
        elif cid == "wkjOa":
            login_btn_index = i

    if phone_input_index is None:
        raise RuntimeError("登录注册页中未找到手机号输入框 Wb69S")
    if login_btn_index is None:
        raise RuntimeError("登录注册页中未找到登录按钮 wkjOa")

    # 在手机号输入框下方、验证码行上方插入登录方式切换
    toggle_row = {
        "type": "frame",
        "id": new_id(),
        "name": "Login Method Toggle",
        "width": "fill_container",
        "height": "fit_content",
        "layout": "horizontal",
        "gap": 8,
        "justifyContent": "end",
        "alignItems": "center",
        "children": [
            {
                "type": "text",
                "id": new_id(),
                "name": "Password Login",
                "content": "密码登录",
                "fill": "$text-muted",
                "fontFamily": "$font-caption",
                "fontSize": "$text-size-caption"
            },
            {
                "type": "text",
                "id": new_id(),
                "name": "Separator",
                "content": "|",
                "fill": "$text-muted",
                "fontFamily": "$font-caption",
                "fontSize": "$text-size-caption"
            },
            {
                "type": "text",
                "id": new_id(),
                "name": "Code Login",
                "content": "验证码登录",
                "fill": "$accent",
                "fontFamily": "$font-caption",
                "fontSize": "$text-size-caption"
            }
        ]
    }
    login_children.insert(phone_input_index + 1, toggle_row)

    # 重新计算登录按钮索引（因为上面插入了一个元素）
    login_btn_index = None
    for i, child in enumerate(login_children):
        if child.get("id") == "wkjOa":
            login_btn_index = i
            break

    # 在登录按钮右下方插入忘记密码/注册账号链接
    forgot_link = {
        "type": "text",
        "id": new_id(),
        "name": "Forgot Password Link",
        "content": "忘记密码 | 注册账号",
        "fill": "$text-secondary",
        "fontFamily": "$font-caption",
        "fontSize": "$text-size-caption",
        "textAlign": "right",
        "textGrowth": "fixed-width",
        "width": "fill_container"
    }
    login_children.insert(login_btn_index + 1, forgot_link)

    # 保存修改后的 .pen
    with open(PEN, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)

    print("修改完成")
    print("- 注册页：两个密码输入框已添加眼睛图标按钮")
    print("- 登录注册页：已添加登录方式切换和忘记密码/注册账号链接")
    print(f"原文件已备份至: {BAK}")


if __name__ == "__main__":
    main()
