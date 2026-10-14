#Requires -Version 5.1
<#
.SYNOPSIS
    Safely clean up node_modules and dist directories under campus-class-manage.
.DESCRIPTION
    Only removes recoverable directories (node_modules and dist).
    Business source code, configs, and documents are NOT touched.
    Supports -WhatIf preview mode and -Confirm.
.EXAMPLE
    .\cleanup-campus-class-manage-safe.ps1 -WhatIf
    Preview what will be deleted without actually deleting.
.EXAMPLE
    .\cleanup-campus-class-manage-safe.ps1
    Perform the actual cleanup.
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param()

$ErrorActionPreference = "Stop"

$projectRoot = "e:\校园班级事务智能管理助手"
$targetDir = Join-Path $projectRoot "campus-class-manage"

$itemsToRemove = @(
    Join-Path $targetDir "node_modules"
    Join-Path $targetDir "apps\web\node_modules"
    Join-Path $targetDir "apps\web\dist"
    Join-Path $targetDir "apps\uniapp\node_modules"
    Join-Path $targetDir "apps\uniapp\dist"
)

function Get-DirSizeBytes($path) {
    if (-not (Test-Path $path)) { return 0 }
    $sum = (Get-ChildItem -Path $path -Recurse -File -Force -ErrorAction SilentlyContinue |
            Measure-Object -Property Length -Sum).Sum
    return [long]($sum)
}

function Format-Size($bytes) {
    return "{0:N2} MB ({1:N2} GB)" -f ($bytes / 1MB), ($bytes / 1GB)
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " campus-class-manage Safe Cleanup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Project root: $projectRoot" -ForegroundColor Gray
Write-Host "Target dir:   $targetDir" -ForegroundColor Gray
Write-Host ""
Write-Host "This script will ONLY delete recoverable directories:" -ForegroundColor Yellow
Write-Host "  - node_modules  (recoverable via npm install)" -ForegroundColor Yellow
Write-Host "  - dist          (recoverable via npm run build)" -ForegroundColor Yellow
Write-Host ""

$totalBefore = [long]0
foreach ($item in $itemsToRemove) {
    $size = Get-DirSizeBytes $item
    $totalBefore += $size
    $exists = Test-Path $item
    $status = if ($exists) { "EXISTS" } else { "MISSING" }
    $color = if ($exists) { "White" } else { "DarkGray" }
    Write-Host ("[{0}] {1}" -f $status, $item) -ForegroundColor $color -NoNewline
    Write-Host ("  -> {0}" -f (Format-Size $size)) -ForegroundColor DarkGray
}

Write-Host ""
Write-Host ("Estimated releasable space: {0}" -f (Format-Size $totalBefore)) -ForegroundColor Green
Write-Host ""

if (-not $PSCmdlet.ShouldProcess("`ncampus-class-manage node_modules and dist directories", "DELETE")) {
    Write-Host "Operation cancelled (WhatIf mode or not confirmed)." -ForegroundColor Green
    Write-Host "To actually run the cleanup, execute:" -ForegroundColor Green
    Write-Host "  .\cleanup-campus-class-manage-safe.ps1" -ForegroundColor Yellow
    return
}

Write-Host ""
Write-Host "Starting cleanup..." -ForegroundColor Yellow

$successCount = 0
$failCount = 0
$released = [long]0

foreach ($item in $itemsToRemove) {
    if (-not (Test-Path $item)) {
        Write-Host ("  [SKIP] {0} (not found)" -f $item) -ForegroundColor DarkGray
        continue
    }

    $sizeBefore = Get-DirSizeBytes $item
    Write-Host ("  [DELETING] {0}" -f $item) -NoNewline -ForegroundColor White

    try {
        Get-ChildItem -Path $item -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object {
            if (-not $_.PSIsContainer) {
                Set-ItemProperty -Path $_.FullName -Name IsReadOnly -Value $false -ErrorAction SilentlyContinue
            }
        }
        [System.IO.Directory]::Delete($item, $true)

        $sizeAfter = Get-DirSizeBytes $item
        $itemReleased = $sizeBefore - $sizeAfter
        $released += $itemReleased
        $successCount++
        Write-Host " [OK]" -ForegroundColor Green
        Write-Host ("             Released: {0}" -f (Format-Size $itemReleased)) -ForegroundColor DarkGray
    }
    catch {
        $failCount++
        Write-Host " [FAILED]" -ForegroundColor Red
        Write-Host ("             Error: {0}" -f $_.Exception.Message) -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Cleanup completed" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ("Successfully deleted: {0} item(s)" -f $successCount) -ForegroundColor Green
if ($failCount -gt 0) {
    Write-Host ("Failed: {0} item(s)" -f $failCount) -ForegroundColor Red
}
Write-Host ("Total space released: {0}" -f (Format-Size $released)) -ForegroundColor Green
Write-Host ""
Write-Host "To restore UniApp build capability later:" -ForegroundColor Yellow
Write-Host "  cd e:\校园班级事务智能管理助手\campus-class-manage" -ForegroundColor Yellow
Write-Host "  npm install" -ForegroundColor Yellow
Write-Host "  cd apps\uniapp" -ForegroundColor Yellow
Write-Host "  npm run build:h5" -ForegroundColor Yellow
