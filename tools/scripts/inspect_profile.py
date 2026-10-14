#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json, os
PEN = r'D:\校园班级事务智能管理助手\校园班级事务智能管理助手.pen'
with open(PEN, 'r', encoding='utf-8') as f:
    doc = json.load(f)

def find_node(root, nid):
    if isinstance(root, dict):
        if root.get('id') == nid:
            return root
        for k in ['children','pages','descendants']:
            v = root.get(k)
            if isinstance(v, list):
                for c in v:
                    r = find_node(c, nid)
                    if r: return r
            elif isinstance(v, dict):
                for c in v.values():
                    r = find_node(c, nid)
                    if r: return r
    elif isinstance(root, list):
        for c in root:
            r = find_node(c, nid)
            if r: return r
    return None

page = find_node(doc, 'a3uMZY')
if not page:
    print('Page not found')
else:
    print('Page keys:', list(page.keys()))
    print('Page name:', page.get('name'))
    print('Page width:', page.get('width'), 'height:', page.get('height'))
    def dump(node, depth=0):
        if not isinstance(node, dict): return
        print('  '*depth + f"{node.get('type','?')} {node.get('id','')} {node.get('name','')[:30]} w={node.get('width','')} h={node.get('height','')} fill={node.get('fill','')} x={node.get('x','')} y={node.get('y','')} ref={node.get('ref','')}")
        for c in node.get('children',[]):
            dump(c, depth+1)
        if node.get('descendants'):
            for did, dnode in node.get('descendants',{}).items():
                print('  '*(depth+1) + f'DESC {did}:')
                dump(dnode, depth+2)
    dump(page)
