param(
    [Parameter(Mandatory)][string]$Destination,
    [switch]$ApplicationStopped
)
$ErrorActionPreference = 'Stop'
if (-not $ApplicationStopped) { throw '先停止后端，再传入 -ApplicationStopped，以保证数据库和文件一致。' }
. "$PSScriptRoot/Site-BackupCommon.ps1"
$backupRoot = [IO.Path]::GetFullPath($Destination)
if (Test-Path -LiteralPath $backupRoot) { throw '备份目标必须是尚不存在的新目录。' }
$folders = [ordered]@{
    uploads = (Get-SiteSetting 'UPLOAD_DIRECTORY' (Join-Path $repoRoot 'uploads'))
    music = (Get-SiteSetting 'MUSIC_DIRECTORY' (Join-Path (Get-SiteSetting 'UPLOAD_DIRECTORY' (Join-Path $repoRoot 'uploads')) 'music'))
    sourceMusic = (Get-SiteSetting 'MUSIC_SOURCE_DIRECTORY' (Join-Path $repoRoot 'frontend/public/music'))
    publicImages = (Join-Path $repoRoot 'frontend/public/images')
}
foreach ($folder in $folders.Values) {
    $absolute = [IO.Path]::GetFullPath($folder)
    if ($backupRoot.Equals($absolute, [StringComparison]::OrdinalIgnoreCase) -or $backupRoot.StartsWith($absolute.TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw '备份目录不能位于任何被备份目录内部。'
    }
}
Get-Command mysqldump -ErrorAction Stop | Out-Null
New-Item -ItemType Directory -Path $backupRoot | Out-Null
$previousPassword = $env:MYSQL_PWD
try {
    $env:MYSQL_PWD = Get-SiteSetting 'DB_PASSWORD' ''
    & mysqldump @dbArgs --single-transaction --routines --triggers --events --hex-blob --no-tablespaces --set-gtid-purged=OFF --default-character-set=utf8mb4 "--result-file=$backupRoot/database.sql" $databaseName
    if ($LASTEXITCODE -ne 0) { throw '数据库导出失败；该目录不能用于恢复。' }
    $present = @()
    foreach ($key in $folders.Keys) {
        $folder = [IO.Path]::GetFullPath($folders[$key])
        if (Test-Path -LiteralPath $folder) {
            Assert-NoLinks $folder
            Copy-Item -LiteralPath $folder -Destination (Join-Path $backupRoot $key) -Recurse
            $present += $key
        }
    }
    $files = @(Get-ChildItem -LiteralPath $backupRoot -Recurse -File | ForEach-Object {
        @{ path = [IO.Path]::GetRelativePath($backupRoot, $_.FullName).Replace('\', '/'); sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash }
    })
    @{ format = 1; createdAt = [DateTime]::UtcNow.ToString('o'); database = $databaseName; folders = $present; files = $files } |
        ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $backupRoot 'manifest.json') -Encoding utf8
    Write-Output "备份完成：$backupRoot；$($files.Count) 个文件。未包含 .env，请单独安全保管部署配置。"
} finally { $env:MYSQL_PWD = $previousPassword }
