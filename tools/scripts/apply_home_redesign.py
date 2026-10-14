import json, os, subprocess, shutil

PEN = r"D:\校园班级事务智能管理助手\校园班级事务智能管理助手.pen"
TMP = r"D:\校园班级事务智能管理助手\design_tmp.pen"
OUT_PEN = r"D:\校园班级事务智能管理助手\design_out.pen"
OUT_DIR = r"D:\校园班级事务智能管理助手\exports\home_redesign_v2"
PENCIL_CMD = r"C:\Users\13929\.trae-cn\binaries\node\versions\24.16.0\pencil.cmd"

with open(PEN, "r", encoding="utf-8") as f:
    doc = json.load(f)

doc["version"] = "2.13"
doc.pop("fileToken", None)

os.makedirs(OUT_DIR, exist_ok=True)
with open(TMP, "w", encoding="utf-8") as f:
    json.dump(doc, f, ensure_ascii=False, indent=2)

# batch_design input uses single quotes inside to avoid escaping outer double quotes
batch_input = (
    "Update('pxk4P',{content:'早上好，张三'});"
    "Delete('iBkSI');"
    "Update('S3pwb9',{content:'早上好，张三',fontSize:20,fontWeight:'700',fontFamily:'$font-heading'});"
    "Update('w8qnMu',{content:'计算机科学与技术 2021级1班 · 学习委员',fontSize:13,opacity:0.9,fontFamily:'$font-body'});"
    "Insert('jNZ2M',{type:'path',name:'User Icon',width:24,height:24,x:12,y:12,layoutPosition:'absolute',geometry:'M8 7a4 4 0 1 0 8 0a4 4 0 0 0-8 0M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2',viewBox:[0,0,24,24],fill:'#00000000',stroke:'#FFFFFF',strokeWidth:2,strokeLinecap:'round',strokeLinejoin:'round'});"
    "Replace('O5uv4F',{type:'frame',name:'Todo Card',width:'fill_container',height:180,cornerRadius:12,fill:{type:'gradient',gradientType:'linear',rotation:135,colors:[{color:'#0057E0',position:0},{color:'#0062FF',position:1}]},layout:'vertical',padding:[20,20],gap:16,children:[{type:'frame',name:'Top Row',width:'fill_container',height:'fit_content',layout:'horizontal',justifyContent:'space_between',alignItems:'center',fill:'#00000000',children:[{type:'frame',name:'Left Text',width:'fit_content',height:'fit_content',layout:'vertical',gap:4,fill:'#00000000',children:[{type:'text',name:'Title',content:'今日待办',fill:'#FFFFFF',fontFamily:'$font-heading',fontSize:20,fontWeight:'700'},{type:'text',name:'Subtitle',content:'3 个待办事项等待处理',fill:'#FFFFFF',fontFamily:'$font-body',fontSize:12,opacity:0.8}]},{type:'frame',name:'Progress Box',width:'fit_content',height:'fit_content',layout:'vertical',gap:6,fill:'#00000000',alignItems:'end',children:[{type:'text',name:'Progress Label',content:'完成进度',fill:'#FFFFFF',fontFamily:'$font-caption',fontSize:11},{type:'frame',name:'Track',width:100,height:6,cornerRadius:3,fill:'#FFFFFF33',layout:'horizontal',children:[{type:'frame',name:'Fill',width:65,height:'fill_container',cornerRadius:3,fill:'#FFFFFF'}]}]}]},{type:'frame',name:'Bottom Row',width:'fill_container',height:'fit_content',layout:'horizontal',justifyContent:'space_between',alignItems:'center',fill:'#00000000',children:[{type:'frame',name:'View Button',width:'fit_content',height:'fit_content',layout:'horizontal',gap:4,padding:[8,12],cornerRadius:9999,fill:'#FFFFFF',alignItems:'center',children:[{type:'text',name:'Button Text',content:'查看待办事件',fill:'#0062FF',fontFamily:'$font-body',fontSize:13,fontWeight:'600'},{type:'path',name:'Chevron',width:16,height:16,geometry:'m9 6l6 6l-6 6',viewBox:[0,0,24,24],fill:'#00000000',stroke:'#0062FF',strokeWidth:2,strokeLinecap:'round',strokeLinejoin:'round'}]},{type:'frame',name:'Spacer',width:1,height:1,fill:'#00000000'}]}]});"
    "Update('jaqmP',{fill:'#FFFFFF',cornerRadius:12,padding:[16,16],gap:16,stroke:'#00000000',effect:{type:'shadow',shadowType:'outer',offset:{x:0,y:2},blur:8,color:'#0000000D'}});"
    "Update('lAVKd',{gap:16});"
    "Update('FYJ6d',{gap:16});"
    "feedWrapper=Insert('OvqAk',{type:'frame',name:'Feed Card',width:'fill_container',height:'fit_content',fill:'#FFFFFF',cornerRadius:12,padding:[16,16],gap:12,layout:'vertical',effect:{type:'shadow',shadowType:'outer',offset:{x:0,y:2},blur:8,color:'#0000000D'}});"
    "Move('TyTvY',feedWrapper,0);"
    "Move('yf1TN',feedWrapper,1);"
    "Move(feedWrapper,'OvqAk',3);"
    "Update('yf1TN',{fill:'#00000000',stroke:'#00000000',effect:{type:'shadow',enabled:false},padding:0});"
)

cmds = [
    f'batch_design({{ filePath: "{TMP.replace(chr(92),"/")}", input: "{batch_input}" }})',
    f'export_nodes({{ nodeIds: ["RfR8C"], outputDir: "{OUT_DIR.replace(chr(92),"/")}", scale: 2, format: "png" }})',
    'save()',
    'exit()',
]

cmds_path = r"D:\校园班级事务智能管理助手\design_cmds.txt"
with open(cmds_path, "w", encoding="utf-8") as f:
    f.write("\n".join(cmds) + "\n")

subprocess.run(
    [PENCIL_CMD, 'interactive', '-i', TMP, '-o', OUT_PEN],
    stdin=open(cmds_path, "r", encoding="utf-8"),
    cwd=r"D:\校园班级事务智能管理助手",
    check=False,
)

# copy result back to main file if it was written
if os.path.exists(OUT_PEN):
    shutil.copy2(OUT_PEN, PEN)
    print("saved to:", PEN)

png_path = os.path.join(OUT_DIR, "RfR8C.png")
print("exported file exists:", os.path.exists(png_path), png_path)
