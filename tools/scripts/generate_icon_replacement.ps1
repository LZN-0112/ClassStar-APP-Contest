# PowerShell implementation of icon replacement batch_design generator
# Reads icon_replacement_plan.json and the .pen file, outputs icon_batch_*.txt

$WORK_DIR = (Get-Location).Path
$PLAN_FILE = Join-Path $WORK_DIR "icon_replacement_plan.json"
$PEN_FILE = (Get-ChildItem -Path $WORK_DIR -Filter "*.pen" | Select-Object -First 1).FullName
if (-not $PEN_FILE) {
    throw "No .pen file found in $WORK_DIR"
}
$OUT_DIR = $WORK_DIR

# Icon name mapping: standard Lucide -> Pencil-supported Lucide name
$NAME_MAP = @{
    "home" = "house"
    "bar-chart" = "trending-up"
    "bar-chart-3" = "trending-up"
    "pie-chart" = "trending-up"
    "check-circle" = "circle-check"
    "check-circle-2" = "circle-check"
    "check-square" = "square-check"
    "more-horizontal" = "more-horizontal"
    "more-vertical" = "more-vertical"
    "more" = "more-horizontal"
    "clock" = "calendar-clock"
    "filter" = "sliders-horizontal"
    "sliders" = "sliders-horizontal"
    "announcement" = "megaphone"
    "unlock" = "lock"
    "cart" = "shopping-cart"
    "circle-dot" = "circle-dot"
    "file-spreadsheet" = "file-spreadsheet"
    "school" = "school"
    "building-2" = "building-2"
    "graduation-cap" = "graduation-cap"
    "clipboard-list" = "clipboard-list"
    "calendar-days" = "calendar-days"
    "calendar-clock" = "calendar-clock"
    "megaphone" = "megaphone"
    "folder-open" = "folder-open"
    "credit-card" = "credit-card"
    "wallet" = "wallet"
}

# Fallbacks for names known to fail
$FAIL_FALLBACK = @{
    "more-horizontal" = "menu"
    "more-vertical" = "menu"
    "unlock" = "lock"
    "clock" = "calendar-clock"
    "bar-chart" = "trending-up"
    "pie-chart" = "trending-up"
    "filter" = "sliders-horizontal"
    "sliders" = "sliders-horizontal"
    "announcement" = "megaphone"
}

# Semantic overrides for specific contexts
$SEMANTIC_OVERRIDES = @{
    # Tab bar items (parentId, nodeName)
    "JWxau|Icon" = "house"
    "xkHfH|Icon" = "users"
    "eqBCj|Icon" = "message-circle"
    "weN33|Icon" = "trending-up"
    "nfv2a|Icon" = "user"
    # Identity selection cards (parentId, nodeName)
    "PhhZf|Icon" = "user"
    "WBUDf|Icon" = "users"
    # Committee role cards (parentId, nodeName)
    "CIhM0|Icon" = "user"
    "oUcuF|Icon" = "users"
    "KLceu|Icon" = "book-open"
    "U0chlT|Icon" = "user-check"
    "iy6II|Icon" = "bed-double"
    "J5wkH|Icon" = "trophy"
}

# Known Pencil-supported icon names
$VALID_NAMES = @{
    "users" = $true; "message-circle" = $true; "user" = $true; "chevron-right" = $true; "plus" = $true; "search" = $true; "bell" = $true
    "calendar" = $true; "map-pin" = $true; "check" = $true; "x" = $true; "settings" = $true; "menu" = $true; "trash" = $true; "pencil" = $true
    "file-text" = $true; "download" = $true; "upload" = $true; "folder" = $true; "house" = $true; "trash-2" = $true; "circle" = $true
    "disc" = $true; "trending-up" = $true; "activity" = $true; "circle-check" = $true; "square-check" = $true; "circle-dot" = $true
    "dot" = $true; "chevron-left" = $true; "chevron-down" = $true; "chevron-up" = $true; "arrow-right" = $true
    "arrow-left" = $true; "arrow-up" = $true; "arrow-down" = $true; "file-spreadsheet" = $true; "school" = $true; "building" = $true
    "building-2" = $true; "graduation-cap" = $true; "clipboard-list" = $true; "clipboard-check" = $true; "calendar-days" = $true
    "calendar-clock" = $true; "bookmark" = $true; "heart" = $true; "star" = $true; "sliders-horizontal" = $true; "log-out" = $true
    "log-in" = $true; "user-plus" = $true; "user-minus" = $true; "user-cog" = $true; "cog" = $true; "wallet" = $true; "credit-card" = $true
    "banknote" = $true; "receipt" = $true; "megaphone" = $true; "mail" = $true; "inbox" = $true; "send" = $true; "paperclip" = $true; "image" = $true
    "image-plus" = $true; "file-plus" = $true; "folder-open" = $true; "folder-plus" = $true; "lock" = $true; "eye" = $true; "eye-off" = $true
    "refresh-cw" = $true; "rotate-cw" = $true; "repeat" = $true; "reply" = $true; "share-2" = $true; "link" = $true; "external-link" = $true
    "copy" = $true; "check-check" = $true; "printer" = $true; "smartphone" = $true; "tablet" = $true; "monitor" = $true; "globe" = $true; "map" = $true
    "navigation" = $true; "compass" = $true; "flag" = $true; "tag" = $true; "tags" = $true; "shopping-cart" = $true
    "book-open" = $true; "book" = $true; "user-check" = $true; "bed-double" = $true; "trophy" = $true; "clock" = $true; "alarm-clock" = $true
    "watch" = $true; "calendar-x" = $true; "file-minus" = $true; "file-plus-2" = $true; "folder-minus" = $true; "folder-x" = $true
    "bell-ring" = $true; "bell-dot" = $true; "message-square" = $true; "volume-2" = $true; "volume-x" = $true
}

function Resolve-Fill($fill) {
    if ($null -eq $fill) { return '$text-primary' }
    $fill = "$fill".Trim()
    if ($fill -eq '' -or $fill -eq '#00000000' -or $fill -eq '$surface' -or $fill -eq '$bg' -or $fill -eq '$surface-elevated') {
        return '$text-primary'
    }
    if ($fill -eq '$border' -or $fill -eq '$border-subtle') {
        return '$text-muted'
    }
    if ($fill -like '$text-*') {
        return $fill
    }
    $accentColors = @('$accent', '$accent-secondary', '$accent-tertiary', '$accent-clay', '$accent-sage', '$accent-terracotta', '$accent-ochre')
    if ($accentColors -contains $fill) {
        return $fill
    }
    # Other colors (hex, etc.) -> $text-primary
    return '$text-primary'
}

function Resolve-IconName($raw, $parentName, $nodeName, $parentId) {
    if ($nodeName -eq 'Radio') {
        return 'circle'
    }
    $key1 = "$parentId|$nodeName"
    $key2 = "$parentName|$nodeName"
    if ($SEMANTIC_OVERRIDES.ContainsKey($key1)) {
        $name = $SEMANTIC_OVERRIDES[$key1]
    } elseif ($SEMANTIC_OVERRIDES.ContainsKey($key2)) {
        $name = $SEMANTIC_OVERRIDES[$key2]
    } elseif ($NAME_MAP.ContainsKey($raw)) {
        $name = $NAME_MAP[$raw]
    } else {
        $name = $raw
    }

    if (-not $VALID_NAMES.ContainsKey($name)) {
        if ($FAIL_FALLBACK.ContainsKey($name)) {
            $name = $FAIL_FALLBACK[$name]
        }
    }

    if (-not $VALID_NAMES.ContainsKey($name)) {
        if ($raw -in @("bar-chart", "bar-chart-3", "pie-chart", "chart", "activity")) {
            $name = "trending-up"
        } elseif ($raw -in @("check-circle", "check-circle-2", "check-square")) {
            $name = "check"
        } elseif ($raw -in @("more-horizontal", "more-vertical", "more")) {
            $name = "menu"
        } elseif ($raw -in @("clock", "time")) {
            $name = "calendar"
        } elseif ($raw -in @("filter", "sliders")) {
            $name = "sliders-horizontal"
        } elseif ($raw -in @("announcement")) {
            $name = "megaphone"
        } elseif ($raw -in @("unlock")) {
            $name = "lock"
        } elseif ($raw -in @("cart")) {
            $name = "shopping-cart"
        } elseif ($raw -in @("circle-dot")) {
            $name = "circle-dot"
        } elseif ($raw -in @("home", "house")) {
            $name = "house"
        } else {
            $name = "circle"
        }
    }
    return $name
}

function Build-ParentMap($doc) {
    $script:parentMap = @{}

    function Walk-Node($node, $parentId, $ancestors, $rootId) {
        $nid = $node.id
        if ($nid) {
            $script:parentMap[$nid] = @{
                parent_id = $parentId
                node = $node
                ancestors = @($ancestors)
                root_id = $rootId
            }
        }
        $newAncestors = $ancestors + @($node)
        if ($node.children) {
            foreach ($child in $node.children) {
                if ($child -is [System.Collections.IDictionary] -or $child -is [PSCustomObject]) {
                    Walk-Node $child $nid $newAncestors $rootId
                }
            }
        }
        $descendants = $node.descendants
        if ($descendants) {
            foreach ($did in $descendants.PSObject.Properties.Name) {
                $dnode = $descendants.$did
                if ($dnode -is [System.Collections.IDictionary] -or $dnode -is [PSCustomObject]) {
                    $script:parentMap[$did] = @{
                        parent_id = $nid
                        node = $dnode
                        ancestors = $newAncestors
                        root_id = $rootId
                        is_descendant = $true
                    }
                }
            }
        }
    }

    foreach ($child in $doc.children) {
        Walk-Node $child $null @() $child.id
    }
    return $script:parentMap
}

function Is-InsideReusableComponent($parentMap, $nid) {
    $info = $parentMap[$nid]
    if (-not $info) { return $false }
    foreach ($anc in $info.ancestors) {
        if ($anc.reusable -eq $true) {
            return $true
        }
    }
    return $false
}

$plan = Get-Content $PLAN_FILE -Raw -Encoding UTF8 | ConvertFrom-Json
$pen = Get-Content $PEN_FILE -Raw -Encoding UTF8 | ConvertFrom-Json
$parentMap = Build-ParentMap $pen

$componentIcons = @()
$screenIcons = @()

foreach ($item in $plan) {
    $nid = $item.id
    $rawIcon = if ($item.lucideIcon) { $item.lucideIcon } else { "circle" }
    $parentName = if ($item.parentName) { $item.parentName } else { "" }
    $nodeName = if ($item.name) { $item.name } else { "" }
    $parentId = if ($item.parentId) { $item.parentId } else { "" }
    $iconName = Resolve-IconName $rawIcon $parentName $nodeName $parentId

    $fill = Resolve-Fill $item.fill

    $width = if ($item.width) { $item.width } else { 24 }
    $height = if ($item.height) { $item.height } else { 24 }
    try { $width = [int]$width } catch { $width = 24 }
    try { $height = [int]$height } catch { $height = 24 }

    if ($item.type -eq "text") {
        $width = 24
        $height = 24
    }

    $inComponent = Is-InsideReusableComponent $parentMap $nid
    if ($inComponent) {
        $componentIcons += [PSCustomObject]@{
            id = $nid
            parent_id = $parentMap[$nid].parent_id
            icon_name = $iconName
            fill = $fill
            width = $width
            height = $height
            item = $item
        }
    } else {
        $screenIcons += [PSCustomObject]@{
            id = $nid
            icon_name = $iconName
            fill = $fill
            width = $width
            height = $height
        }
    }
}

$screenLines = @()
foreach ($icon in $screenIcons) {
    $screenLines += 'Replace("{0}", {{type:"icon", name:"Icon", library:"lucide", icon:"{1}", width:{2}, height:{3}, fill:"{4}"}})' -f $icon.id, $icon.icon_name, $icon.width, $icon.height, $icon.fill
}

$componentGroups = @()
foreach ($icon in $componentIcons) {
    $parentId = $icon.parent_id
    $varName = "icon_" + ($icon.id -replace "-", "_" -replace "/", "_")
    $group = @(
        'Delete("{0}")' -f $icon.id
        '{0} = Insert("{1}", {{type:"icon", name:"Icon", library:"lucide", icon:"{2}", width:{3}, height:{4}, fill:"{5}"}})' -f $varName, $parentId, $icon.icon_name, $icon.width, $icon.height, $icon.fill
        'Move({0}, "{1}", 0)' -f $varName, $parentId
    )
    $componentGroups += ,$group
}

$chunkSize = 30
$chunks = @()
$currentChunk = @()

# Add screen icon lines first
foreach ($line in $screenLines) {
    if ($currentChunk.Count -ge $chunkSize) {
        $chunks += $currentChunk -join "`n"
        $currentChunk = @()
    }
    $currentChunk += $line
}

# Add component icon groups (keep each group intact)
foreach ($group in $componentGroups) {
    if ($currentChunk.Count + $group.Count -gt $chunkSize) {
        $chunks += $currentChunk -join "`n"
        $currentChunk = @()
    }
    $currentChunk += $group
}

if ($currentChunk.Count -gt 0) {
    $chunks += $currentChunk -join "`n"
}

$totalOperations = $screenLines.Count
foreach ($group in $componentGroups) { $totalOperations += $group.Count }

Write-Host "Total icons: $($plan.Count)"
Write-Host "Screen icons (Replace): $($screenIcons.Count)"
Write-Host "Component icons (Delete+Insert+Move): $($componentIcons.Count)"
Write-Host "Total operations: $totalOperations"
Write-Host "Chunks: $($chunks.Count)"

$batchFiles = @()
for ($i = 0; $i -lt $chunks.Count; $i++) {
    $outPath = Join-Path $OUT_DIR "icon_batch_$($i + 1).txt"
    $chunks[$i] | Out-File -FilePath $outPath -Encoding UTF8 -NoNewline
    Add-Content -Path $outPath -Value "" -Encoding UTF8 -NoNewline
    $batchFiles += $outPath
    $opCount = ($chunks[$i].Split("`n")).Count
    Write-Host "Wrote $outPath ($opCount operations)"
}

$summary = @{
    total = $plan.Count
    screen_icons = $screenIcons.Count
    component_icons = $componentIcons.Count
    total_operations = $totalOperations
    chunks = $chunks.Count
    batch_files = $batchFiles
} | ConvertTo-Json -Depth 10

$summaryPath = Join-Path $OUT_DIR "icon_replacement_summary.json"
$summary | Out-File -FilePath $summaryPath -Encoding UTF8 -NoNewline
Write-Host "Wrote summary to $summaryPath"
