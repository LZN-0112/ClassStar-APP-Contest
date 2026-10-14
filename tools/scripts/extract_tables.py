import zipfile
import xml.etree.ElementTree as ET
import os

path = r'd:\校园班级事务智能管理助手\校园班级事务智能管理助手.docx'
with zipfile.ZipFile(path) as z:
    xml = z.read('word/document.xml')
root = ET.fromstring(xml)
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

# Extract tables
tables = root.findall('.//w:tbl', ns)
for ti, tbl in enumerate(tables, 1):
    print(f'--- Table {ti} ---')
    for tr in tbl.findall('.//w:tr', ns):
        cells = []
        for tc in tr.findall('.//w:tc', ns):
            text = ''.join(t.text or '' for t in tc.findall('.//w:t', ns))
            cells.append(text.strip())
        print('\t'.join(cells))
    print()
