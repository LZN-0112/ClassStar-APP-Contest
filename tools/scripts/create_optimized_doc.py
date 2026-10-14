from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.style import WD_STYLE_TYPE
from docx.oxml.ns import qn

# 创建文档
doc = Document()

# 设置页面边距
sections = doc.sections
for section in sections:
    section.top_margin = Cm(2.5)
    section.bottom_margin = Cm(2.5)
    section.left_margin = Cm(2.5)
    section.right_margin = Cm(2.5)

# 设置默认字体
doc.styles['Normal'].font.name = '宋体'
doc.styles['Normal']._element.rPr.rFonts.set(qn('w:eastAsia'), '宋体')
doc.styles['Normal'].font.size = Pt(12)
doc.styles['Normal'].paragraph_format.line_spacing = 1.5
doc.styles['Normal'].paragraph_format.first_line_indent = Cm(0.74)  # 2字符

# 创建一级标题样式
h1_style = doc.styles.add_style('Heading 1 Custom', WD_STYLE_TYPE.PARAGRAPH)
h1_style.font.name = '黑体'
h1_style._element.rPr.rFonts.set(qn('w:eastAsia'), '黑体')
h1_style.font.size = Pt(16)
h1_style.font.bold = True
h1_style.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
h1_style.paragraph_format.space_before = Pt(18)
h1_style.paragraph_format.space_after = Pt(12)
h1_style.paragraph_format.first_line_indent = Cm(0)

# 创建二级标题样式
h2_style = doc.styles.add_style('Heading 2 Custom', WD_STYLE_TYPE.PARAGRAPH)
h2_style.font.name = '黑体'
h2_style._element.rPr.rFonts.set(qn('w:eastAsia'), '黑体')
h2_style.font.size = Pt(14)
h2_style.font.bold = True
h2_style.paragraph_format.space_before = Pt(12)
h2_style.paragraph_format.space_after = Pt(6)
h2_style.paragraph_format.first_line_indent = Cm(0)

# 创建三级标题样式
h3_style = doc.styles.add_style('Heading 3 Custom', WD_STYLE_TYPE.PARAGRAPH)
h3_style.font.name = '黑体'
h3_style._element.rPr.rFonts.set(qn('w:eastAsia'), '黑体')
h3_style.font.size = Pt(12)
h3_style.font.bold = True
h3_style.paragraph_format.space_before = Pt(6)
h3_style.paragraph_format.space_after = Pt(3)
h3_style.paragraph_format.first_line_indent = Cm(0)

# 创建条例样式（无首行缩进）
list_style = doc.styles.add_style('List Style', WD_STYLE_TYPE.PARAGRAPH)
list_style.font.name = '宋体'
list_style._element.rPr.rFonts.set(qn('w:eastAsia'), '宋体')
list_style.font.size = Pt(12)
list_style.paragraph_format.line_spacing = 1.5
list_style.paragraph_format.first_line_indent = Cm(0)
list_style.paragraph_format.left_indent = Cm(0.74)

# 创建思维导图样式
mindmap_style = doc.styles.add_style('Mindmap Style', WD_STYLE_TYPE.PARAGRAPH)
mindmap_style.font.name = '微软雅黑'
mindmap_style._element.rPr.rFonts.set(qn('w:eastAsia'), '微软雅黑')
mindmap_style.font.size = Pt(11)
mindmap_style.paragraph_format.line_spacing = 1.3
mindmap_style.paragraph_format.first_line_indent = Cm(0)
mindmap_style.paragraph_format.left_indent = Cm(0.5)

# 创建重点强调样式
emphasis_style = doc.styles.add_style('Emphasis Style', WD_STYLE_TYPE.PARAGRAPH)
emphasis_style.font.name = '宋体'
emphasis_style._element.rPr.rFonts.set(qn('w:eastAsia'), '宋体')
emphasis_style.font.size = Pt(12)
emphasis_style.font.bold = True
emphasis_style.font.color.rgb = RGBColor(0, 51, 102)
emphasis_style.paragraph_format.line_spacing = 1.5
emphasis_style.paragraph_format.first_line_indent = Cm(0.74)

# 文档标题
title = doc.add_paragraph('校园班级事务智能管理助手', style='Heading 1 Custom')
title.runs[0].font.size = Pt(20)

# 副标题
subtitle = doc.add_paragraph('——需求分析与功能设计报告', style='Heading 2 Custom')
subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER

doc.add_paragraph()

# ==================== 第一章 ====================
doc.add_paragraph('一、市场调研与竞品分析', style='Heading 1 Custom')

# 1.1 竞品详细分析
doc.add_paragraph('（一）竞品详细分析', style='Heading 2 Custom')

doc.add_paragraph('本次调研选取了4款具有代表性的班级管理类产品进行深度对比分析，涵盖了高校教学平台、微信小程序、家校互动平台和企业办公工具四大类型。', style='Normal')

# 竞品1：超星学习通
doc.add_paragraph('1. 超星学习通', style='Heading 3 Custom')

doc.add_paragraph('产品定位：高校综合性在线教学平台，是目前国内高校普及率最高的教学管理工具之一。', style='List Style')

doc.add_paragraph('核心优势：', style='Emphasis Style')
doc.add_paragraph('① 功能集成度高：整合了课程、作业、考试、签到、资源库等一体化功能，数据对接方便，能直接连接学校教务系统；', style='List Style')
doc.add_paragraph('② 教学资源丰富：拥有庞大的电子图书与期刊资源库，150G云盘满足资料存储需求；', style='List Style')
doc.add_paragraph('③ 多端同步支持：支持PC端、移动端多端同步，具备离线学习功能；', style='List Style')
doc.add_paragraph('④ 统计功能详尽：考勤、作业、成绩等数据统计全面，便于教师进行学情分析。', style='List Style')

doc.add_paragraph('主要不足：', style='Emphasis Style')
doc.add_paragraph('① 操作复杂度高：功能繁杂且部分存在重叠，发布签到步骤多，教师需学习多种签到模式，上手门槛高；', style='List Style')
doc.add_paragraph('② 用户体验较差：高峰期容易卡顿、闪退，界面设计陈旧，通知冗杂；', style='List Style')
doc.add_paragraph('③ 定位偏向教学：主要服务于教师教学管理，对班委日常行政事务管理支持不足；', style='List Style')
doc.add_paragraph('④ 下载门槛高：需安装独立APP，占用存储空间大，学生使用意愿随毕业快速下降。', style='List Style')

doc.add_paragraph('应用商店评价摘要：用户普遍认可其资源丰富性和教学功能全面性，但对卡顿、闪退、操作复杂等问题吐槽较多，评分呈现"功能强但体验差"的两极分化特点。', style='Normal')

# 竞品2：接龙管家
doc.add_paragraph('2. 接龙管家', style='Heading 3 Custom')

doc.add_paragraph('产品定位：微信小程序，专注于信息收集与接龙场景，用户规模突破2亿，已通过教育部备案。', style='List Style')

doc.add_paragraph('核心优势：', style='Emphasis Style')
doc.add_paragraph('① 轻量化即用即走：无需下载APP，微信内直接使用，操作极简，会用微信就会用；', style='List Style')
doc.add_paragraph('② 核心功能免费：发起接龙、按名单填写、防篡改水印拍照、数据一键导出等核心功能永久免费；', style='List Style')
doc.add_paragraph('③ 场景覆盖全面：支持十余种表单类型，二十余种题型，涵盖签到、作业、报名、投票等班委高频场景；', style='List Style')
doc.add_paragraph('④ 防作弊机制完善：水印拍照（带时间、地点、经纬度）、定位签到、名单核对等多重防代签设计；', style='List Style')
doc.add_paragraph('⑤ 数据导出便捷：Excel、Word、PDF、文件夹随心导出，文件自动按规则命名。', style='List Style')

doc.add_paragraph('主要不足：', style='Emphasis Style')
doc.add_paragraph('① 功能深度有限：以信息收集为主，缺乏班级管理的系统性功能，如班费记账、学期数据归档等；', style='List Style')
doc.add_paragraph('② 协作能力较弱：不支持多角色权限分工，班委间协作效率低；', style='List Style')
doc.add_paragraph('③ 数据碎片化：各接龙数据独立，无法形成完整的班级数据档案，期末汇总仍需手动整合；', style='List Style')
doc.add_paragraph('④ 高级功能收费：部分高级模板和功能需要开通会员，存在"用着用着跳出来要付费"的情况。', style='List Style')

doc.add_paragraph('应用商店评价摘要：36氪企服点评评分3.2分，用户普遍好评其操作简单、免费好用，是目前大学班委圈子里公认最高频的工具。', style='Normal')

# 竞品3：班级小管家
doc.add_paragraph('3. 班级小管家', style='Heading 3 Custom')

doc.add_paragraph('产品定位：家校互动学习软件，专注于K12阶段班级管理，拥有16余项功能模块。', style='List Style')

doc.add_paragraph('核心优势：', style='Emphasis Style')
doc.add_paragraph('① 功能模块丰富：作业收发、在线批改、每日打卡、问卷调查、成绩管理、班级云盘等十余项功能；', style='List Style')
doc.add_paragraph('② AI批改能力：具备AI作文批改功能，可从立意、结构、语言等维度给出分层反馈；', style='List Style')
doc.add_paragraph('③ 成绩私密发布：支持一键发布私密成绩，家长互不可见，保护学生隐私；', style='List Style')
doc.add_paragraph('④ 多角色支持：支持家属绑定、家委、课代表等多种角色代管班级。', style='List Style')

doc.add_paragraph('主要不足：', style='Emphasis Style')
doc.add_paragraph('① 广告过多：App内广告数量多，影响使用体验，用户吐槽"学生用的软件广告可以少一些"；', style='List Style')
doc.add_paragraph('② 稳定性问题：系统维护频繁且时常超时，音频文件存在显示时长错误、无法下载等问题；', style='List Style')
doc.add_paragraph('③ App体验差：用户反馈"APP比小程序难用多了"，部分功能显示"敬请期待"，功能不完整；', style='List Style')
doc.add_paragraph('④ 定位偏低龄：主要面向中小学家校场景，对大学班级的班委协作、社团活动等场景适配不足。', style='List Style')

doc.add_paragraph('应用商店评价摘要：App Store和应用宝评论中，用户对功能丰富度给予肯定，但普遍吐槽广告多、稳定性差、APP体验不如小程序。', style='Normal')

# 竞品4：钉钉/飞书
doc.add_paragraph('4. 钉钉/飞书', style='Heading 3 Custom')

doc.add_paragraph('产品定位：企业级协同办公平台，功能全面但偏向企业办公场景。', style='List Style')

doc.add_paragraph('核心优势：', style='Emphasis Style')
doc.add_paragraph('① 协作能力强：多人协作办公、视频会议、文档协同等功能成熟完善；', style='List Style')
doc.add_paragraph('② 打卡功能专业：定位打卡、人脸打卡等多种考勤方式，统计功能强大；', style='List Style')
doc.add_paragraph('③ 文件管理完善：支持大文件传输、云盘存储、版本管理，解决文件收集和共享问题；', style='List Style')
doc.add_paragraph('④ 组织架构清晰：支持多级组织架构，权限管理体系完善。', style='List Style')

doc.add_paragraph('主要不足：', style='Emphasis Style')
doc.add_paragraph('① 功能过于冗余：大量企业级功能对班级场景无用，学习成本高，界面复杂；', style='List Style')
doc.add_paragraph('② 校园适配不足：缺乏班费记账、活动报名、评优评先等校园特色功能；', style='List Style')
doc.add_paragraph('③ 使用门槛高：需要全员注册安装，学生接受度低，班级推广难度大；', style='List Style')
doc.add_paragraph('④ 氛围不匹配：企业办公的严肃氛围与校园班级的轻松环境格格不入。', style='List Style')

# 竞品对比总结
doc.add_paragraph('竞品对比总结：', style='Emphasis Style')
doc.add_paragraph('通过对四款产品的对比分析可以发现：现有产品要么偏向教学管理（学习通），要么偏向信息收集（接龙管家），要么偏向企业办公（钉钉/飞书），均未能针对大学班委的全场景事务管理提供一体化解决方案。班委日常需要在多个工具间频繁切换，数据零散难以整合，这正是本产品的核心切入机会。', style='Normal')

# 1.2 用户需求调研
doc.add_paragraph('（二）用户需求调研', style='Heading 2 Custom')

doc.add_paragraph('本次调研通过B站、抖音、知乎、微博等多个平台广泛收集用户反馈，累计分析相关视频、帖子、评论超过200条，总结出大学班级管理的核心痛点与真实需求。', style='Normal')

# 平台反馈汇总
doc.add_paragraph('1. 多平台用户反馈汇总', style='Heading 3 Custom')

doc.add_paragraph('B站/抖音平台：', style='Emphasis Style')
doc.add_paragraph('① "班委高效办公技巧"相关视频播放量超百万，用户高度关注效率工具推荐；', style='List Style')
doc.add_paragraph('② 吐槽类视频中，"通知被刷屏淹没"、"收作业整理到半夜"、"统计报名人数永远对不上"是最高频的三大槽点；', style='List Style')
doc.add_paragraph('③ 工具测评类内容显示，接龙管家是目前班委圈子的"国民级工具"，但用户普遍期待有更集成化的解决方案。', style='List Style')

doc.add_paragraph('知乎/微博平台：', style='Emphasis Style')
doc.add_paragraph('① "当了四年大学班干部，我流的泪比高中三年加起来都多"这类话题引发广泛共鸣；', style='List Style')
doc.add_paragraph('② 班委普遍反映"夹在老师和同学中间两头为难"，既要传达要求又要顾及同学感受；', style='List Style')
doc.add_paragraph('③ 班费透明度问题是班级矛盾的高发区，"班费花在哪里不知道，心里不踏实"是学生普遍诉求。', style='List Style')

doc.add_paragraph('问卷调研数据：', style='Emphasis Style')
doc.add_paragraph('① 超过80%的班委认为日常事务占用了过多学习时间；', style='List Style')
doc.add_paragraph('② 75%的学生认为班级管理中信息不透明是主要问题，尤其体现在评优评奖和班费收支上；', style='List Style')
doc.add_paragraph('③ 班委职责划分模糊是普遍问题，"什么事都找班长"现象严重。', style='List Style')

# 班委核心痛点
doc.add_paragraph('2. 班委核心痛点总结', style='Heading 3 Custom')

doc.add_paragraph('① 通知传达效率低：发通知后群里瞬间99+消息刷屏，重要信息全淹没，无法确认谁已读谁未读；', style='List Style')
doc.add_paragraph('② 材料收集工作量大：收作业、收截图、收证明材料，格式五花八门，还要逐个核对命名，整理到半夜；', style='List Style')
doc.add_paragraph('③ 考勤签到难度大：代签现象普遍，手动点名耗时耗力，期末统计考勤数据更是巨大工程；', style='List Style')
doc.add_paragraph('④ 班费管理矛盾多：记账不透明容易引发猜疑，对账繁琐，期末公示工作量大；', style='List Style')
doc.add_paragraph('⑤ 活动组织麻烦多：报名统计改了又改，人数永远对不上，活动签到和费用代收分开操作效率低；', style='List Style')
doc.add_paragraph('⑥ 数据归档压力大：期末要手动汇总一学期的所有数据，评优评先、工作总结、向辅导员汇报都需要，数据零散难以追溯；', style='List Style')
doc.add_paragraph('⑦ 班委协作效率低：职责划分模糊，工作交接困难，换届后资料容易断层。', style='List Style')

# 学生核心需求
doc.add_paragraph('3. 学生核心需求总结', style='Heading 3 Custom')

doc.add_paragraph('① 信息透明化：班费收支、评优标准、考勤情况等信息公开可查，减少猜疑和矛盾；', style='List Style')
doc.add_paragraph('② 操作便捷化：最好不用下载新APP，微信就能用，操作简单不复杂；', style='List Style')
doc.add_paragraph('③ 通知不遗漏：重要通知能及时收到，不会被群消息刷屏淹没；', style='List Style')
doc.add_paragraph('④ 资料好查找：课程资料、班级文件能分类存放，随时可查，不会过期失效；', style='List Style')
doc.add_paragraph('⑤ 隐私有保障：个人成绩、考勤等敏感信息只有自己和班委可见，保护隐私。', style='List Style')

# 1.3 市场机会与挑战
doc.add_paragraph('（三）市场机会与挑战', style='Heading 2 Custom')

doc.add_paragraph('1. 核心竞争机会', style='Heading 3 Custom')

doc.add_paragraph('① 全场景一体化设计：融合教学工具、办公工具、小程序的各自优势，打造班委专属的全场景管理平台，解决班委在微信群、接龙小程序、Excel、网盘间频繁切换的痛点；', style='List Style')
doc.add_paragraph('② 效率痛点精准切入：班费透明记账、活动全流程管理、班级学期数据归档、班委分工协作等高频事务，目前仍依赖Excel+微信群的原始方式，手工统计工作量大、出错率高，且透明度不足，存在巨大的效率提升空间；', style='List Style')
doc.add_paragraph('③ 数据价值深度挖掘：班委期末需要手动汇总一学期的考勤、作业、活动、班费数据，用于评优评选、工作总结、向辅导员汇报。现有工具无法自动生成完整班级档案，数据零散难以追溯，这是差异化竞争的核心突破口；', style='List Style')
doc.add_paragraph('④ 校园场景深度适配：针对大学班级的特点，设计班委分工、第二课堂、评优评先等特色功能，区别于通用型工具。', style='List Style')

doc.add_paragraph('2. 主要竞争挑战', style='Heading 3 Custom')

doc.add_paragraph('① 下载门槛高，用户生命周期短：微信小程序无需下载、即用即走。而独立APP下载门槛高，且大学生用户生命周期仅4年，毕业即流失，长期留存难度大；', style='List Style')
doc.add_paragraph('② 免费工具的降维打击：接龙管家、腾讯文档等主流工具的核心功能均免费开放，独立APP难以通过基础功能收费，盈利空间有限；', style='List Style')
doc.add_paragraph('③ 官方系统的对接壁垒：若无法对接高校教务系统，学生名单、课表、成绩等基础数据需要手动导入，使用门槛显著上升；', style='List Style')
doc.add_paragraph('④ 基础功能同质化严重：签到、收作业、通知发布等基础功能技术门槛低，小程序可快速跟进复刻。若没有核心差异化能力，APP很容易被轻量化工具替代。', style='List Style')

# ==================== 第二章 ====================
doc.add_paragraph('二、产品核心功能体系', style='Heading 1 Custom')

doc.add_paragraph('基于以上市场调研和用户需求分析，本产品构建了"基础功能+差异化功能"的双层功能体系，既满足班级日常管理的基础需求，又通过核心差异化功能构建竞争壁垒。', style='Normal')

# 2.1 基础功能模块
doc.add_paragraph('（一）基础功能模块', style='Heading 2 Custom')

# 班级通知
doc.add_paragraph('1. 班级通知一键发布', style='Heading 3 Custom')
doc.add_paragraph('① 支持文字、附件、图片多格式通知，实时统计已读/未读人员，对未读成员可一键提醒；', style='List Style')
doc.add_paragraph('② 重要通知支持"签字确认"模式，生成电子确认凭证自动留档；', style='List Style')
doc.add_paragraph('③ 历史通知按学期、类型分类归档，支持关键词搜索回溯，解决群消息被刷屏淹没的问题。', style='List Style')

# 考勤签到
doc.add_paragraph('2. 考勤签到自动统计', style='Heading 3 Custom')
doc.add_paragraph('① 支持定位签到（划定教室地理范围）、二维码签到、水印拍照签到、口令签到等多种模式，多重防代签机制；', style='List Style')
doc.add_paragraph('② 导入班级名单后自动匹配，已签/未签人员可视化展示，支持一键催签；', style='List Style')
doc.add_paragraph('③ 考勤数据自动汇总，按日/周/学期生成统计报表，支持一键导出Excel；', style='List Style')
doc.add_paragraph('④ 内置请假审批流程，请假数据自动同步到考勤统计。', style='List Style')

# 作业收集
doc.add_paragraph('3. 线上作业统一收集', style='Heading 3 Custom')
doc.add_paragraph('① 支持全格式文件上传，自动按"学号-姓名"规则批量重命名；', style='List Style')
doc.add_paragraph('② 可设置提交截止时间，超时自动关闭提交通道，支持延时提交申请；', style='List Style')
doc.add_paragraph('③ 提交进度实时追踪，一键催交未完成人员，所有作业可批量导出压缩包；', style='List Style')
doc.add_paragraph('④ 作业按课程分类归档，学期末可统一打包留存。', style='List Style')

# 班费记账
doc.add_paragraph('4. 班费收支透明记账', style='Heading 3 Custom')
doc.add_paragraph('① 收支流水实时记录，支持上传票据凭证，班级全员可查看（权限可控）；', style='List Style')
doc.add_paragraph('② 支持班长+生活委员双权限多人记账，对账更透明；', style='List Style')
doc.add_paragraph('③ 自动生成月度/学期收支报表，结余自动计算，支持导出公示；', style='List Style')
doc.add_paragraph('④ 支持班费缴纳线上登记，自动匹配缴费人员名单。', style='List Style')

# 活动报名
doc.add_paragraph('5. 课余活动在线报名', style='Heading 3 Custom')
doc.add_paragraph('① 自定义报名表单字段，支持名额限制、报名截止时间、取消报名设置；', style='List Style')
doc.add_paragraph('② 报名数据自动统计，可联动活动签到，生成完整活动参与记录；', style='List Style')
doc.add_paragraph('③ 支持活动费用代收、报名名单一键导出。', style='List Style')

# 资料共享
doc.add_paragraph('6. 学习资料云端共享', style='Heading 3 Custom')
doc.add_paragraph('① 按课程、学期、资料类型建立分级文件夹；', style='List Style')
doc.add_paragraph('② 支持大文件上传与永久存储，解决群文件过期失效的痛点；', style='List Style')
doc.add_paragraph('③ 精细化权限管理（班委可编辑上传，普通学生仅查看下载），支持资料下载统计与关键词搜索。', style='List Style')

# 2.2 差异化竞争力功能
doc.add_paragraph('（二）差异化竞争力功能（构建核心壁垒）', style='Heading 2 Custom')

# 班委协作
doc.add_paragraph('1. 班委分工协作体系', style='Heading 3 Custom')
doc.add_paragraph('① 支持班长、学习委员、生活委员、团支书等多角色权限分配，各角色分管对应功能模块；', style='List Style')
doc.add_paragraph('② 操作全程留痕，班委换届工作交接可一键移交；', style='List Style')
doc.add_paragraph('③ 内置班委任务看板，支持事务分配、截止时间设置、进度追踪。', style='List Style')

# 数据归档
doc.add_paragraph('2. 班级数据自动归档与报表生成', style='Heading 3 Custom')
doc.add_paragraph('① 学期末自动汇总全学期考勤、作业提交、活动参与、班费收支全量数据；', style='List Style')
doc.add_paragraph('② 一键生成班级工作总结报表、评优评先支撑材料，直接解决班委期末汇报痛点；', style='List Style')
doc.add_paragraph('③ 支持按学年导出完整班级电子档案，永久留存。', style='List Style')

# 校园适配
doc.add_paragraph('3. 校园场景深度适配', style='Heading 3 Custom')
doc.add_paragraph('① 支持课表导入/教务系统对接，自动关联上课考勤提醒；', style='List Style')
doc.add_paragraph('② 第二课堂活动报名与学分登记联动；', style='List Style')
doc.add_paragraph('③ 内置班级通讯录、同学生日提醒、常用通知模板。', style='List Style')

# 双端协同
doc.add_paragraph('4. 双端协同模式', style='Heading 3 Custom')
doc.add_paragraph('采用"班委端APP+学生端小程序"双端设计：学生通过微信小程序即可完成签到、查通知、交作业等轻量化操作，无需下载APP，降低使用门槛；班委通过APP进行后台管理、数据统计、协作办公，保证管理效率。完美平衡了"学生端轻量化"与"班委端专业化"的双重需求。', style='Normal')

# ==================== 第三章 ====================
doc.add_paragraph('三、功能需求思维导图', style='Heading 1 Custom')

doc.add_paragraph('以下为产品功能需求的思维导图（文字版），清晰展示功能模块的层级关系与逻辑结构：', style='Normal')

doc.add_paragraph()

# 思维导图
mindmap_lines = [
    '┌─────────────────────────────────────────────────────────┐',
    '│              校园班级事务智能管理助手                    │',
    '└──────────────────────────┬──────────────────────────────┘',
    '                           │',
    '          ┌────────────────┼────────────────┐',
    '          │                │                │',
    '    ┌─────┴─────┐    ┌─────┴─────┐    ┌─────┴─────┐',
    '    │ 市场调研层 │    │ 基础功能层 │    │ 差异化功能 │',
    '    └─────┬─────┘    └─────┬─────┘    └─────┬─────┘',
    '          │                │                │',
    '    ┌─────┴─────┐    ┌─────┴─────┐    ┌─────┴─────┐',
    '    │ 竞品分析  │    │ 通知管理  │    │ 班委协作  │',
    '    │ 4款产品   │    │ 一键发布  │    │ 分工体系  │',
    '    └───────────┘    └───────────┘    └───────────┘',
    '          │                │                │',
    '    ┌─────┴─────┐    ┌─────┴─────┐    ┌─────┴─────┐',
    '    │ 用户调研  │    │ 考勤签到  │    │ 数据归档  │',
    '    │ 多平台    │    │ 自动统计  │    │ 自动报表  │',
    '    └───────────┘    └───────────┘    └───────────┘',
    '          │                │                │',
    '    ┌─────┴─────┐    ┌─────┴─────┐    ┌─────┴─────┐',
    '    │ 机会挑战  │    │ 作业收集  │    │ 校园适配  │',
    '    │ SWOT分析  │    │ 统一管理  │    │ 深度定制  │',
    '    └───────────┘    └───────────┘    └───────────┘',
    '                           │                │',
    '                      ┌────┴────┐     ┌────┴────┐',
    '                      │ 班费记账 │     │ 双端协同 │',
    '                      │ 透明公开 │     │ APP+小程序│',
    '                      └─────────┘     └─────────┘',
    '                           │',
    '                      ┌────┴────┐',
    '                      │ 活动报名 │',
    '                      │ 全流程  │',
    '                      └─────────┘',
    '                           │',
    '                      ┌────┴────┐',
    '                      │ 资料共享 │',
    '                      │ 云存储  │',
    '                      └─────────┘',
]

for line in mindmap_lines:
    p = doc.add_paragraph(line, style='Mindmap Style')
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER

doc.add_paragraph()

# 功能模块详细展开
doc.add_paragraph('功能模块详细展开：', style='Emphasis Style')

doc.add_paragraph('【基础功能层】—— 满足班级日常管理刚需', style='Heading 3 Custom')
doc.add_paragraph('├── 班级通知管理：多格式发布 / 已读统计 / 签字确认 / 分类归档', style='Mindmap Style')
doc.add_paragraph('├── 考勤签到系统：多模式签到 / 防代签 / 自动统计 / 请假联动', style='Mindmap Style')
doc.add_paragraph('├── 作业收集管理：全格式支持 / 自动命名 / 进度追踪 / 批量导出', style='Mindmap Style')
doc.add_paragraph('├── 班费收支记账：流水记录 / 票据凭证 / 双权限 / 自动报表', style='Mindmap Style')
doc.add_paragraph('├── 活动报名管理：自定义表单 / 名额限制 / 费用代收 / 签到联动', style='Mindmap Style')
doc.add_paragraph('└── 学习资料共享：分级文件夹 / 永久存储 / 权限管理 / 全文搜索', style='Mindmap Style')

doc.add_paragraph('【差异化功能层】—— 构建核心竞争壁垒', style='Heading 3 Custom')
doc.add_paragraph('├── 班委分工协作：多角色权限 / 操作留痕 / 一键交接 / 任务看板', style='Mindmap Style')
doc.add_paragraph('├── 数据自动归档：全量汇总 / 工作总结 / 评优支撑 / 电子档案', style='Mindmap Style')
doc.add_paragraph('├── 校园深度适配：课表导入 / 第二课堂 / 通讯录 / 生日提醒', style='Mindmap Style')
doc.add_paragraph('└── 双端协同模式：班委端APP（专业管理）+ 学生端小程序（轻量使用）', style='Mindmap Style')

doc.add_paragraph()

# 结语
doc.add_paragraph('四、总结', style='Heading 1 Custom')

doc.add_paragraph('本需求分析报告基于充分的市场调研和用户反馈，通过对4款主流竞品的深度对比分析，以及对B站、抖音、知乎等多平台用户真实需求的广泛收集，明确了校园班级事务智能管理助手的产品定位与功能体系。产品以"班委全场景事务管理"为核心切入点，通过基础功能满足日常刚需，通过差异化功能构建竞争壁垒，采用双端协同模式平衡使用门槛与管理效率，致力于成为大学班委的专属效率工具。', style='Normal')

doc.add_paragraph('下一阶段将基于本需求分析，开展前端界面设计工作，将功能需求转化为具体的产品交互方案。', style='Normal')

# 保存文档
doc.save(r'D:\校园班级事务智能管理助手\校园班级事务智能管理助手_优化版.docx')
print('文档生成成功！')
