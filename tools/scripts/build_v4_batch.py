import os

base = r'D:\校园班级事务智能管理助手'
src = os.path.join(base, 'icon_batch_v3_0_plain.txt')
with open(src, 'r', encoding='utf-8') as f:
    lines = f.read().splitlines()

# Skip Tab Bar component lines (kDswP) and the List Item arrow mob6e (already handled via Delete+Insert)
filtered = []
for line in lines:
    if 'kDswP/' in line:
        continue
    if 'Replace("mob6e"' in line:
        continue
    filtered.append(line)

out = os.path.join(base, 'icon_batch_v4_plain.txt')
with open(out, 'w', encoding='utf-8') as f:
    f.write('\n'.join(filtered))
print(out, len(filtered))
