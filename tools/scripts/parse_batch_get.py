import json, re
path = 'C:/Users/13929/AppData/Local/Temp/trae/toolcall-output/ccbc472d-2d8c-4819-a56e-238be4adaac8.txt'
txt = open(path, 'r', encoding='utf-8').read()
# strip prefix and parse outer wrapper
prefix = 'The MCP server responded with: '
idx = txt.find(prefix)
wrapper = txt[idx+len(prefix):].strip()
outer = json.loads(wrapper)
arr = json.loads(outer[0]['text'])
print('total matched nodes', len(arr))
print('icon nodes', sum(1 for n in arr if n.get('type')=='icon'))
print('text Icon remaining', sum(1 for n in arr if n.get('type')=='text' and n.get('name')=='Icon'))
print('text Arrow remaining', sum(1 for n in arr if n.get('type')=='text' and n.get('name')=='Arrow'))
print('frame Icon remaining', sum(1 for n in arr if n.get('type')=='frame' and n.get('name')=='Icon'))
from collections import Counter
names = Counter(n.get('name','') for n in arr)
print('names:', dict(names))
glyphs = sorted(set(n.get('icon','') for n in arr if n.get('type')=='icon'))
print('distinct lucide glyphs', len(glyphs))
print(glyphs)
