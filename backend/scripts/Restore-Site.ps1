param(
    [Parameter(Mandatory)][string]$Backup,
    [string]$TargetDatabase,
    [string]$Destination,
    [switch]$Apply,
    [switch]$ApplicationStopped
)
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/Site-BackupCommon.ps1"
$backupRoot = (Resolve-Path -LiteralPath $Backup).Path
Assert-NoLinks $backupRoot
$manifest = Get-Content -LiteralPath (Join-Path $backupRoot 'manifest.json') -Raw -Encoding utf8 | ConvertFrom-Json
if ($manifest.format -ne 1 -or -not $manifest.files.Count -or @($manifest.files | Where-Object path -eq 'database.sql').Count -ne 1) { throw '备份清单不完整。' }
$allowedFolders = @('uploads', 'music', 'sourceMusic', 'publicImages')
if (@($manifest.folders | Where-Object { $_ -notin $allowedFolders }).Count) { throw '未知备份目录。' }
foreach ($file in $manifest.files) {
    if ($file.path -ne 'database.sql' -and $file.path -notmatch '^(uploads|music|sourceMusic|publicImages)/') { throw '备份文件路径无效。' }
    $target = [IO.Path]::GetFullPath((Join-Path $backupRoot $file.path))
    if (-not $target.StartsWith($backupRoot.TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw '备份包含越界路径。' }
    if ((Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash -ne $file.sha256) { throw "文件校验失败：$($file.path)" }
}
$actual = @(Get-ChildItem -LiteralPath $backupRoot -Recurse -File | Where-Object FullName -ne (Join-Path $backupRoot 'manifest.json'))
if ($actual.Count -ne $manifest.files.Count) { throw '备份文件数量与清单不一致。' }
if (-not $Apply) { Write-Output "校验通过：$($actual.Count) 个文件。传入 -Apply -ApplicationStopped -TargetDatabase 新数据库名 -Destination 新目录 后才执行恢复。"; return }
if (-not $ApplicationStopped) { throw '恢复前请停止后端，并传入 -ApplicationStopped。' }
if (-not $Destination -or $TargetDatabase -notmatch '^[a-zA-Z0-9_]+$' -or $TargetDatabase -in @('mysql','sys','information_schema','performance_schema') -or $TargetDatabase -eq $databaseName) { throw '请指定新的恢复目录和不同于当前配置的数据库名。' }
$restoreRoot = [IO.Path]::GetFullPath($Destination)
if (Test-Path -LiteralPath $restoreRoot) { throw '恢复目录必须尚不存在。' }
Get-Command mysql -ErrorAction Stop | Out-Null
$previousPassword = $env:MYSQL_PWD
try {
    $env:MYSQL_PWD = Get-SiteSetting 'DB_PASSWORD' ''
    $tables = & mysql @dbArgs --batch --skip-column-names --execute="SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$TargetDatabase'"
    if ($LASTEXITCODE -ne 0 -or [int]$tables -ne 0) { throw '目标数据库必须为空，且连接必须成功。' }
    & mysql @dbArgs --execute="CREATE DATABASE IF NOT EXISTS $TargetDatabase CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
    if ($LASTEXITCODE -ne 0) { throw '创建目标数据库失败。' }
    # Stream UTF-8 SQL directly to the native process, avoiding PowerShell pipeline re-encoding.
    $info = [Diagnostics.ProcessStartInfo]::new((Get-Command mysql).Source)
    $info.UseShellExecute = $false
    $info.RedirectStandardInput = $true
    foreach ($arg in ($dbArgs + @('--default-character-set=utf8mb4', $TargetDatabase))) { $info.ArgumentList.Add($arg) }
    $process = [Diagnostics.Process]::Start($info)
    try {
        $sql = [IO.File]::OpenRead((Join-Path $backupRoot 'database.sql'))
        try { $sql.CopyTo($process.StandardInput.BaseStream) } finally { $sql.Dispose(); $process.StandardInput.Close() }
        $process.WaitForExit()
        if ($process.ExitCode -ne 0) { throw 'SQL 恢复失败；请检查新数据库，现有数据库未被修改。' }
    } finally { $process.Dispose() }
    New-Item -ItemType Directory -Path $restoreRoot | Out-Null
    foreach ($folder in $manifest.folders) { Copy-Item -LiteralPath (Join-Path $backupRoot $folder) -Destination (Join-Path $restoreRoot $folder) -Recurse }
    Write-Output "恢复完成：数据库 $TargetDatabase，文件 $restoreRoot。切换 DB_NAME、UPLOAD_DIRECTORY、MUSIC_DIRECTORY、MUSIC_SOURCE_DIRECTORY，替换前端 public/images 并重新构建后再启动。"
} finally { $env:MYSQL_PWD = $previousPassword }
