# 读取 .pen 文件
$penPath = 'D:\校园班级事务智能管理助手\校园班级事务智能管理助手.pen'
$json = Get-Content -Raw -Path $penPath -Encoding UTF8 | ConvertFrom-Json

# 结果列表
$script:icons = @()
$script:parentMap = @{}
$script:nodeMap = @{}

function Test-ContainsEmoji {
    param([string]$text)
    if ([string]::IsNullOrEmpty($text)) { return $false }
    for ($i = 0; $i -lt $text.Length; $i++) {
        $code = [int]$text[$i]
        # BMP emoji ranges
        if ($code -ge 0x231A -and $code -le 0x231B) { return $true }
        if ($code -eq 0x2328) { return $true }
        if ($code -eq 0x23CF) { return $true }
        if ($code -ge 0x23E9 -and $code -le 0x23F3) { return $true }
        if ($code -ge 0x23F8 -and $code -le 0x23FA) { return $true }
        if ($code -eq 0x24C2) { return $true }
        if ($code -ge 0x25AA -and $code -le 0x25AB) { return $true }
        if ($code -eq 0x25B6 -or $code -eq 0x25C0) { return $true }
        if ($code -ge 0x25FB -and $code -le 0x25FE) { return $true }
        if ($code -ge 0x2600 -and $code -le 0x27EF) { return $true }
        if ($code -ge 0x2934 -and $code -le 0x2935) { return $true }
        if ($code -ge 0x2B00 -and $code -le 0x2BFF) { return $true }
        if ($code -eq 0x3030 -or $code -eq 0x303D) { return $true }
        if ($code -eq 0x3297 -or $code -eq 0x3299) { return $true }
        # Supplemental emoji (surrogate pairs)
        if ($code -ge 0xD800 -and $code -le 0xDBFF -and $i + 1 -lt $text.Length) {
            $low = [int]$text[$i + 1]
            if ($low -ge 0xDC00 -and $low -le 0xDFFF) {
                $cp = 0x10000 + (($code - 0xD800) * 0x400) + ($low - 0xDC00)
                if ($cp -ge 0x1F000 -and $cp -le 0x1FAFF) { return $true }
            }
        }
    }
    return $false
}

function Test-IsIconNode {
    param($node)
    $name = $node.name
    $type = $node.type
    $content = $node.content

    if ($name -eq 'Icon') { return $true }
    if ($name -eq 'DropdownIcon') { return $true }
    if ($name -eq 'Arrow') { return $true }
    if ($name -eq 'Radio') { return $true }
    if ($name -eq 'Check') { return $true }
    if ($type -eq 'text' -and $content -eq ([char]0x25CF)) { return $true }
    if ($type -eq 'text' -and (Test-ContainsEmoji $content)) { return $true }
    if ($type -eq 'text' -and $content -match '^[\>\u25B6\u25B7\u27A4\u276F\u203A]$') { return $true }
    if ($name -ne 'Status Icons' -and $name -match 'Icon|IconRight|IconLeft|IconTrailing|IconLeading') { return $true }
    if ($name -match '^(Back|Add|Plus|Search|Close|Menu|More|Dropdown|Setting|Settings|User|Home|Bell|Message|Chart|File|Download|Upload|Edit|Delete|Check)Icon$') { return $true }
    if ($name -match '^(More|Settings|Menu|Upload|Chart|Download|File|Search|User|Home|Bell|Message|Close|Back|Add|Plus|Delete|Edit)$') { return $true }
    return $false
}

function Get-LucideIcon {
    param($node, $pageName, $parentName, $grandparentName)
    $name = $node.name
    $type = $node.type
    $content = $node.content

    # 1. 直接名称映射（最高优先级）
    switch -Regex ($name) {
        '^DropdownIcon$' { return 'chevron-down' }
        '^BackIcon$|^Back$' { return 'chevron-left' }
        '^AddIcon$|^PlusIcon$|^Add$|^Plus$' { return 'plus' }
        '^SearchIcon$|^Search$' { return 'search' }
        '^CloseIcon$|^XIcon$|^Close$' { return 'x' }
        '^MenuIcon$|^Menu$' { return 'menu' }
        '^MoreIcon$|^More$' { return 'more-horizontal' }
        '^SettingIcon$|^SettingsIcon$|^Settings$' { return 'settings' }
        '^UserIcon$|^User$' { return 'user' }
        '^HomeIcon$|^Home$' { return 'home' }
        '^BellIcon$|^NotificationIcon$|^Bell$' { return 'bell' }
        '^MessageIcon$|^Message$' { return 'message-circle' }
        '^ChartIcon$|^DataIcon$|^Chart$' { return 'bar-chart-3' }
        '^FileIcon$|^File$' { return 'file-text' }
        '^DownloadIcon$|^Download$' { return 'download' }
        '^UploadIcon$|^Upload$' { return 'upload' }
        '^EditIcon$|^Edit$' { return 'pencil' }
        '^DeleteIcon$|^TrashIcon$|^Delete$' { return 'trash-2' }
        '^CheckIcon$|^CheckedIcon$|^Check$' { return 'check' }
        '^Arrow$' { return 'chevron-right' }
        '^Radio$' { return 'circle-dot' }
    }

    # 2. 文本内容映射
    if ($type -eq 'text') {
        if ($content -eq ([char]0x25CF)) { return 'circle' }
        if ([regex]::IsMatch($content, "\uD83D\uDCC5")) { return 'calendar-clock' }
        if ([regex]::IsMatch($content, "\uD83D\uDCCD")) { return 'map-pin' }
        if ([regex]::IsMatch($content, "\uD83D\uDD14")) { return 'bell' }
        if ([regex]::IsMatch($content, "[\uD83D\uDC64\uD83D\uDC65\uD83E\uDDD1\uD83D\uDE4B]")) { return 'user' }
        if ([regex]::IsMatch($content, "\uD83C\uDFE0")) { return 'home' }
        if ([regex]::IsMatch($content, "[\u2709\uD83D\uDCAC]")) { return 'message-circle' }
        if ([regex]::IsMatch($content, "\u2699")) { return 'settings' }
        if ([regex]::IsMatch($content, "\uD83D\uDD0D")) { return 'search' }
        if ([regex]::IsMatch($content, "[\u2795\u271A]")) { return 'plus' }
        if ([regex]::IsMatch($content, "[\u2715\u2716\u274C]")) { return 'x' }
        if ([regex]::IsMatch($content, "[\u2713\u2714\u2611]")) { return 'check' }
        if ([regex]::IsMatch($content, "[\uD83D\uDCC1\uD83D\uDCC2\uD83D\uDCC4\uD83D\uDCC3]")) { return 'file-text' }
        if ([regex]::IsMatch($content, "[\uD83D\uDCCA\uD83D\uDCC8\uD83D\uDCC9]")) { return 'bar-chart-3' }
        if ([regex]::IsMatch($content, "[\uD83D\uDDD1\uD83E\uDEAE]")) { return 'trash-2' }
        if ([regex]::IsMatch($content, "[\u270F\uD83D\uDCDD]")) { return 'pencil' }
        if ([regex]::IsMatch($content, "[\u2B07\uD83D\uDD3D]")) { return 'chevron-down' }
        if ([regex]::IsMatch($content, "[\u2B05\u25C0]")) { return 'chevron-left' }
        if ([regex]::IsMatch($content, "[\u27A1\u25B6]")) { return 'chevron-right' }
        if ([regex]::IsMatch($content, "[\u2B06\uD83D\uDD3C]")) { return 'chevron-up' }
        if ([regex]::IsMatch($content, "[\u22EF\u22EE\u2630\u2261]")) { return 'more-horizontal' }
        if ([regex]::IsMatch($content, "[\uD83D\uDD12\uD83D\uDD10\uD83D\uDD13]")) { return 'lock' }
        if ([regex]::IsMatch($content, "[\uD83D\uDCE2\uD83D\uDCE3\uD83D\uDEA8]")) { return 'megaphone' }
        if ([regex]::IsMatch($content, "[\uD83D\uDCDA\uD83D\uDCD6\uD83D\uDCD5\uD83D\uDCD7\uD83D\uDCD8\uD83D\uDCD9]")) { return 'book-open' }
        if ([regex]::IsMatch($content, "[\uD83C\uDF93\uD83C\uDFEB]")) { return 'school' }
        if ([regex]::IsMatch($content, "\uD83D\uDCCC")) { return 'map-pin' }
        if ($content -match '^[\>\u25B6\u25B7\u27A4\u276F\u203A]$') { return 'chevron-right' }
    }

    # 3. 根据父节点/上下文语义推断
    $ctx = (@($pageName, $grandparentName, $parentName, $name) | Where-Object { $_ }) -join ' '
    $ctxLower = $ctx.ToLower()
    $parentLower = $parentName.ToLower()
    $pageLower = $pageName.ToLower()

    # 父级特定语义（高优先级）
    switch -Regex ($parentLower) {
        '学生|student|个人中心|profile' { return 'user' }
        '班委|committee|班长|团支书|学习委员|副班长|生活委员|体育委员' { return 'users' }
        '通知|announcement|notice' { return 'megaphone' }
        '签到|check-in|attendance|打卡' { return 'check-circle' }
        '作业|homework|assignment|task' { return 'clipboard-list' }
        '活动|activity|event' { return 'calendar-days' }
        '资料|material|document|file' { return 'folder-open' }
        '相册|photo|picture|image' { return 'image' }
        '照片' { return 'image' }
        '评优|award|honor' { return 'award' }
        '班费|fee|payment|pay|wallet' { return 'credit-card' }
        '记账|accounting' { return 'wallet' }
        '课程|course|curriculum' { return 'book-open' }
        '上传|upload|drop zone' { return 'upload' }
        '下载|download' { return 'download' }
        '请假|leave|absence' { return 'file-minus' }
        '证明|proof|attachment' { return 'paperclip' }
        '学期|semester|term' { return 'calendar' }
        '档案|archive|record' { return 'archive' }
        '青年大学习' { return 'book-open' }
        '班会' { return 'users' }
        '高数|数学' { return 'calculator' }
        '运动会|体育' { return 'trophy' }
        '期中|期末|考试|成绩' { return 'graduation-cap' }
        'todo' { return 'bell' }
        'excel' { return 'file-spreadsheet' }
        'qq|微信|wechat|社交' { return 'message-circle' }
        '教务|academic' { return 'school' }
    }

    # 页面/组件级语义
    switch -Regex ($ctxLower) {
        '首页|home|主页|main' { return 'home' }
        '班级|class|成员|member|users' { return 'users' }
        '消息|message|inbox' { return 'message-circle' }
        '数据|data|统计|statistics|analytics|report' { return 'bar-chart-3' }
        '我的|mine|account' { return 'user' }
        '设置|setting|preference' { return 'settings' }
        '搜索|search|查找|find' { return 'search' }
        '添加|add|新建|create|增加' { return 'plus' }
        '返回|back|上一页|previous' { return 'chevron-left' }
        '更多|more|菜单|menu' { return 'more-horizontal' }
        '下拉|dropdown|展开|expand' { return 'chevron-down' }
        '时间|time|日历|calendar|日期|date|schedule' { return 'calendar-clock' }
        '地点|location|地址|address|place' { return 'map-pin' }
        '编辑|edit|修改|modify' { return 'pencil' }
        '删除|delete|remove|trash' { return 'trash-2' }
        '文件|file|document|doc' { return 'file-text' }
        '下载|download' { return 'download' }
        '上传|upload' { return 'upload' }
        '通知|notification|bell|提醒|alert' { return 'bell' }
        '确认|check|完成|done|ok|success|selected' { return 'check' }
        '关闭|close|cancel|dismiss' { return 'x' }
        '用户|user|person|people' { return 'user' }
        '签到|check-in|attendance|打卡' { return 'check-circle' }
        '作业|homework|task|任务|assignment' { return 'clipboard-list' }
        '成绩|score|grade|exam|考试' { return 'graduation-cap' }
        '相册|album|photo|picture|image|gallery' { return 'image' }
        '公告|bulletin|notice' { return 'megaphone' }
        '投票|vote|survey|questionnaire' { return 'bar-chart-2' }
        '缴费|payment|fee|pay' { return 'credit-card' }
        '请假|leave|absence' { return 'file-minus' }
        '课程|course|curriculum|timetable' { return 'book-open' }
        '通讯录|contact|phonebook' { return 'contact' }
        '分享|share' { return 'share-2' }
        '收藏|favorite|star|collect' { return 'star' }
        '点赞|like|thumb' { return 'thumbs-up' }
        '评论|comment|reply' { return 'message-square' }
    }

    return 'circle'
}

function Test-NeedsSelectedFill {
    param($node, $pageName, $parentName)
    $ctx = (@($pageName, $parentName, $node.name) | Where-Object { $_ }) -join ' '
    $ctxLower = $ctx.ToLower()
    # 仅对底部导航、Tab 栏或明确标识为选中态的图标启用填充样式
    if ($ctxLower -match 'tab|nav|bottom|navigation|选中|active|selected|current') { return $true }
    if ($node.name -match 'Tab|Nav|Active|Selected') { return $true }
    return $false
}

function Get-SafeProp {
    param($node, $prop, $default = '')
    if ($node.PSObject.Properties[$prop]) {
        return $node.$prop
    }
    return $default
}

function Walk-Tree {
    param($node, $parentId)
    if ($node.id) {
        $script:parentMap[$node.id] = $parentId
        $script:nodeMap[$node.id] = $node
    }
    if ($node.children) {
        foreach ($child in $node.children) {
            Walk-Tree $child $node.id
        }
    }
    if ($node.descendants) {
        foreach ($prop in $node.descendants.PSObject.Properties) {
            $child = $prop.Value
            $childId = if ($child.id) { $child.id } else { $prop.Name }
            $script:parentMap[$childId] = $parentId
            $script:nodeMap[$childId] = $child
            Walk-Tree $child $node.id
        }
    }
}

function Get-PageName {
    param($nodeId)
    $currentId = $nodeId
    while ($currentId) {
        if (-not $script:nodeMap.ContainsKey($currentId)) { break }
        $current = $script:nodeMap[$currentId]
        $parentIdVal = $script:parentMap[$currentId]
        if (-not $parentIdVal) {
            return $current.name
        }
        $currentId = $parentIdVal
    }
    return ''
}

function Get-ParentInfo {
    param($nodeId)
    $parentIdVal = $script:parentMap[$nodeId]
    if (-not $parentIdVal) { return @{ id = ''; name = '' } }
    $pnode = $script:nodeMap[$parentIdVal]
    return @{ id = $parentIdVal; name = $pnode.name }
}

function Find-Icons {
    param($node)
    if (Test-IsIconNode $node) {
        $pageName = Get-PageName $node.id
        $parent = Get-ParentInfo $node.id
        $grandparentName = ''
        if ($parent.id) {
            $gp = Get-ParentInfo $parent.id
            $grandparentName = $gp.name
        }

        $width = Get-SafeProp $node 'width' ''
        $height = Get-SafeProp $node 'height' ''
        $fill = Get-SafeProp $node 'fill' ''
        $stroke = Get-SafeProp $node 'stroke' ''
        $strokeWidth = Get-SafeProp $node 'strokeWidth' ''
        $content = Get-SafeProp $node 'content' ''

        $lucide = Get-LucideIcon $node $pageName $parent.name $grandparentName
        $needsSelected = Test-NeedsSelectedFill $node $pageName $parent.name

        $iconObj = [PSCustomObject]@{
            id                = $node.id
            type              = $node.type
            name              = $node.name
            parentId          = $parent.id
            parentName        = $parent.name
            pageName          = $pageName
            width             = $width
            height            = $height
            fill              = $fill
            stroke            = $stroke
            strokeWidth       = $strokeWidth
            content           = $content
            lucideIcon        = $lucide
            needsSelectedFill = $needsSelected
        }
        $script:icons += $iconObj
    }

    if ($node.children) {
        foreach ($child in $node.children) {
            Find-Icons $child
        }
    }
    if ($node.descendants) {
        foreach ($prop in $node.descendants.PSObject.Properties) {
            Find-Icons $prop.Value
        }
    }
}

foreach ($child in $json.children) {
    Walk-Tree $child $null
}
foreach ($child in $json.children) {
    Find-Icons $child
}

$outputPath = 'D:\校园班级事务智能管理助手\icon_replacement_plan.json'
$mdPath = 'D:\校园班级事务智能管理助手\icon_replacement_plan.md'

$script:icons | ConvertTo-Json -Depth 10 | Out-File -Encoding utf8 $outputPath

$mdLines = @()
$mdLines += '| ID | 类型 | 名称 | 父节点 | 页面/组件 | 尺寸 | Fill | Stroke | 当前内容 | Lucide 图标 | 需选中态填充 |'
$mdLines += '|----|------|------|--------|-----------|------|------|--------|----------|-------------|----------------|'
foreach ($icon in $script:icons) {
    $size = "$($icon.width) x $($icon.height)"
    $fill = $icon.fill -replace '\|', '\\|'
    $stroke = $icon.stroke -replace '\|', '\\|'
    $content = $icon.content -replace '\|', '\\|'
    $mdLines += "| $($icon.id) | $($icon.type) | $($icon.name) | $($icon.parentName) | $($icon.pageName) | $size | $fill | $stroke | $content | $($icon.lucideIcon) | $($icon.needsSelectedFill) |"
}
$mdLines += ''
$mdLines += "**优化图标总数：$($script:icons.Count)**"
$mdLines | Out-File -Encoding utf8 $mdPath

Write-Host "找到图标节点数量: $($script:icons.Count)"
Write-Host "JSON 输出: $outputPath"
Write-Host "Markdown 输出: $mdPath"
