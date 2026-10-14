import zipfile
import xml.etree.ElementTree as ET
import os

path = r'd:\校园班级事务智能管理助手\校园班级事务智能管理助手.docx'
if not os.path.exists(path):
    print('文件不存在')
else:
    with zipfile.ZipFile(path) as z:
        xml = z.read('word/document.xml')
    root = ET.fromstring(xml)
    ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    texts = []
    for p in root.findall('.//w:p', ns):
        para = ''.join(t.text or '' for t in p.findall('.//w:t', ns))
        if para.strip():
            texts.append(para)
    print('\n'.join(texts))
