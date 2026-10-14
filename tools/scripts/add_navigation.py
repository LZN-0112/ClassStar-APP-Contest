import os
import re

PAGES_DIR = os.path.join('src', 'pages')

TARGETS = {
    'Messages.tsx',
    'InteractionMessages.tsx',
    'MessageList.tsx',
    'MessageDetail.tsx',
    'PublishMessage.tsx',
    'MessageStats.tsx',
    'AttendanceList.tsx',
    'PublishAttendance.tsx',
    'AttendanceDetail.tsx',
    'CheckIn.tsx',
    'CheckInMethod.tsx',
    'LeaveApply.tsx',
    'LeaveApproval.tsx',
    'AttendanceReport.tsx',
    'MyAttendance.tsx',
    'RandomDraw.tsx',
}

# Route used for list/record cards by file
LIST_ITEM_ROUTE = {
    'Messages.tsx': '/message-detail',
    'InteractionMessages.tsx': '/message-detail',
    'MessageList.tsx': '/message-detail',
    'AttendanceList.tsx': '/attendance-detail',
    'MyAttendance.tsx': '/attendance-detail',
}


def add_click(tag_open: str, action: str) -> str:
    if 'onClick=' in tag_open:
        return tag_open
    return tag_open + f' onClick={{() => {action}}}'


def add_click_to_div(content: str, name: str, action: str, count: int = 0) -> str:
    pattern = re.compile(
        rf'(<div\s+data-pencil-name="{re.escape(name)}"\s+className="[^"]*")(\s*>)',
        re.S,
    )

    def repl(m: re.Match) -> str:
        return add_click(m.group(1), action) + m.group(2)

    return pattern.sub(repl, content, count=count)


def add_click_to_svg(content: str, name: str, action: str, count: int = 0) -> str:
    pattern = re.compile(
        rf'(<svg\s+data-pencil-name="{re.escape(name)}"\s+[^>]*)(\s*>)',
        re.S,
    )

    def repl(m: re.Match) -> str:
        return add_click(m.group(1), action) + m.group(2)

    return pattern.sub(repl, content, count=count)


def add_click_to_height_cards(content: str, route: str, heights: set[str]) -> str:
    pattern = re.compile(
        r'(<div\s+data-pencil-name="([^"]+)"\s+className="[^"]*h-\[(?P<h>\d+)px\][^"]*")(\s*>)',
        re.S,
    )

    def repl(m: re.Match) -> str:
        if m.group('h') not in heights:
            return m.group(0)
        return add_click(m.group(1), f"navigate('{route}')") + m.group(4)

    return pattern.sub(repl, content)


def process_file(fname: str, content: str) -> str:
    # Bottom navigation (present on Messages and RandomDraw)
    content = add_click_to_div(content, '首页', "navigate('/home')")
    content = add_click_to_div(content, '班级', "navigate('/class-home')")
    content = add_click_to_div(content, '通知', "navigate('/messages')")
    content = add_click_to_div(content, '数据', "navigate('/data-dashboard')")
    content = add_click_to_div(content, '我的', "navigate('/profile')")

    # Back arrow
    content = add_click_to_svg(content, 'Back', 'navigate(-1)')

    if fname == 'Messages.tsx':
        content = add_click_to_div(content, 'Tab Inactive', "navigate('/interaction-messages')")

    if fname == 'InteractionMessages.tsx':
        content = add_click_to_div(content, 'Tab 通知', "navigate('/messages')")
        content = add_click_to_div(content, 'Tab 作业', "navigate('/homework-list')")
        content = add_click_to_div(content, 'Tab 活动', "navigate('/activity-list')")
        content = add_click_to_div(content, 'Tab 互动', "navigate('/interaction-messages')")

    # Header publish/create actions
    if fname == 'MessageList.tsx':
        content = add_click_to_div(content, 'Publish', "navigate('/publish-message')")
    if fname == 'AttendanceList.tsx':
        content = add_click_to_div(content, 'Create', "navigate('/publish-attendance')")

    # Primary action buttons
    if fname == 'PublishMessage.tsx':
        content = add_click_to_div(content, 'Publish', "navigate('/message-list')")
    if fname == 'PublishAttendance.tsx':
        content = add_click_to_div(content, 'Publish Button', "navigate('/attendance-list')")
    if fname == 'MessageDetail.tsx':
        content = add_click_to_div(content, 'Confirm Button', "navigate('/message-list')")
    if fname == 'CheckIn.tsx':
        content = add_click_to_div(content, 'Checkin Button', "navigate('/attendance-list')")
        content = add_click_to_div(content, 'Leave Button', "navigate('/leave-apply')")
    if fname == 'LeaveApply.tsx':
        content = add_click_to_div(content, 'Submit Button', "navigate('/attendance-list')")
    if fname == 'LeaveApproval.tsx':
        content = add_click_to_div(content, 'Approve', "navigate('/attendance-list')")
        content = add_click_to_div(content, 'Reject', "navigate('/attendance-list')")
    if fname == 'MessageStats.tsx':
        content = add_click_to_div(content, 'Remind Button', 'navigate(-1)')
    if fname == 'AttendanceDetail.tsx':
        content = add_click_to_div(content, 'Remind Button', 'navigate(-1)')
    if fname == 'AttendanceReport.tsx':
        content = add_click_to_div(content, 'Export Button', 'navigate(-1)')
    if fname == 'RandomDraw.tsx':
        content = add_click_to_div(content, 'Rules Button', 'navigate(-1)')
        content = add_click_to_div(content, 'Start Button', 'navigate(-1)')

    # Check-in method options
    if fname == 'CheckInMethod.tsx':
        content = add_click_to_div(content, '定位签到', "navigate('/check-in')")
        content = add_click_to_div(content, '二维码签到', "navigate('/check-in')")
        content = add_click_to_div(content, '水印拍照签到', "navigate('/check-in')")
        content = add_click_to_div(content, '口令签到', "navigate('/check-in')")

    # List / record cards
    if fname in LIST_ITEM_ROUTE:
        route = LIST_ITEM_ROUTE[fname]
        if fname == 'Messages.tsx' or fname == 'InteractionMessages.tsx':
            content = add_click_to_height_cards(content, route, {'76'})
        else:
            content = add_click_to_height_cards(content, route, {'80'})

    return content


if __name__ == '__main__':
    os.chdir(r'd:\校园班级事务智能管理助手\front')
    for fname in sorted(TARGETS):
        path = os.path.join(PAGES_DIR, fname)
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        new_content = process_file(fname, content)
        if new_content != content:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f'Added navigation to {fname}')
        else:
            print(f'No changes for {fname}')
