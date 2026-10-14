import json
import sys
import os

def escape_batch(name):
    base_dir = r'D:\校园班级事务智能管理助手'
    src = os.path.join(base_dir, f'icon_batch_{name}.txt')
    dst = os.path.join(base_dir, f'icon_batch_{name}_escaped.txt')
    with open(src, 'r', encoding='utf-8') as f:
        content = f.read()
    lines = [ln for ln in content.splitlines() if ln.strip()]
    payload = '\n'.join(lines)
    with open(dst, 'w', encoding='utf-8') as f:
        f.write(json.dumps(payload, ensure_ascii=False))
    print(f'Escaped {len(lines)} lines to {dst}')

if __name__ == '__main__':
    for n in sys.argv[1:]:
        escape_batch(n)
