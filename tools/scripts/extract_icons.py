import json, re, os

def extract_and_save(src, dst):
    with open(src, 'r', encoding='utf-8') as f:
        t = f.read()
    s = re.search(r'"text":"(\[.*\])"', t, re.DOTALL).group(1)
    s = s.replace('\\"', '"')
    arr = json.loads(s)
    with open(dst, 'w', encoding='utf-8') as f:
        json.dump(arr, f, ensure_ascii=False)
    return len(arr)

base = r"C:\Users\13929\AppData\Local\Temp\trae\toolcall-output"
print('icons', extract_and_save(os.path.join(base, 'f28d03fa-4dc5-4f41-ad6e-2763525413f9.txt'), r'D:\校园班级事务智能管理助手\icons_global.json'))
print('list', extract_and_save(os.path.join(base, 'e5708b6b-861e-4c9e-a397-9be731b921cf.txt'), r'D:\校园班级事务智能管理助手\listitem_instances.json'))
