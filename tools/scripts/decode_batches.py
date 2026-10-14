import json, os

base = r'D:\校园班级事务智能管理助手'
for name in ['icon_batch_v3_0_escaped.txt', 'icon_batch_v3_1_escaped.txt']:
    src = os.path.join(base, name)
    with open(src, 'r', encoding='utf-8') as f:
        data = json.loads(f.read())
    out = os.path.join(base, name.replace('_escaped.txt', '_plain.txt'))
    with open(out, 'w', encoding='utf-8') as f:
        f.write(data)
    print(out, 'lines', len(data.splitlines()))
