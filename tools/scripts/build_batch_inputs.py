import json, os

base = r'D:\校园班级事务智能管理助手'
pen_file = r'D:\校园班级事务智能管理助手\校园班级事务智能管理助手.pen'

for name in ['v3_0', 'v3_1']:
    plain = os.path.join(base, f'icon_batch_{name}_plain.txt')
    with open(plain, 'r', encoding='utf-8') as f:
        content = f.read()
    payload = {"filePath": pen_file, "input": content}
    out = os.path.join(base, f'batch_input_{name}.json')
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False)
    print(out, 'commands', len(content.splitlines()))
