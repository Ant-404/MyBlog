# Shared by backup and restore; process settings take precedence over backend/.env.
$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$siteSettings = @{}
$envFile = Join-Path $repoRoot 'backend/.env'
if (Test-Path -LiteralPath $envFile) {
    foreach ($line in Get-Content -LiteralPath $envFile -Encoding utf8) {
        if ($line -match '^\s*([A-Z][A-Z0-9_]*)\s*=(.*)$') { $siteSettings[$Matches[1]] = $Matches[2].Trim() }
    }
}
function Get-SiteSetting([string]$Name, [string]$Fallback) {
    $value = [Environment]::GetEnvironmentVariable($Name, 'Process')
    if ($value) { return $value }
    if ($siteSettings[$Name]) { return $siteSettings[$Name] }
    return $Fallback
}
function Assert-NoLinks([string]$Folder) {
    $items = @((Get-Item -LiteralPath $Folder -Force)) + @(Get-ChildItem -LiteralPath $Folder -Recurse -Force)
    if ($items | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }) { throw '备份/恢复目录不能包含符号链接或目录联接。' }
}
$databaseName = Get-SiteSetting 'DB_NAME' 'MyBlog'
if ($databaseName -notmatch '^[a-zA-Z0-9_]+$') { throw '数据库名称只支持英文、数字与下划线。' }
$dbArgs = @(('--host=' + (Get-SiteSetting 'DB_HOST' '127.0.0.1')), ('--port=' + (Get-SiteSetting 'DB_PORT' '3306')), ('--user=' + (Get-SiteSetting 'DB_USERNAME' 'root')))
