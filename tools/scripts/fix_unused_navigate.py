import os
import re

TARGET_PAGES = {
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

pages_dir = os.path.join('src', 'pages')
for fname in os.listdir(pages_dir):
    if not fname.endswith('.tsx'):
        continue
    if fname in TARGET_PAGES:
        continue
    path = os.path.join(pages_dir, fname)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    if 'const navigate = useNavigate();' not in content:
        continue
    # If navigate is actually used, leave it alone
    if re.search(r'\bnavigate\(', content):
        continue
    content = content.replace(
        'const navigate = useNavigate();',
        'const _navigate = useNavigate();'
    )
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Renamed unused navigate in {fname}')
