from PIL import Image
img = Image.open(r'd:\校园班级事务智能管理助手\扭蛋机.png')
print('Mode:', img.mode, 'Size:', img.size)
has_alpha = img.mode == 'RGBA'
print('Has alpha:', has_alpha)
if has_alpha:
    alpha = img.split()[-1]
    vals = list(alpha.getdata())
    print('Min alpha:', min(vals), 'Max alpha:', max(vals))
    print('Unique alpha samples:', sorted(set(vals))[:20])
