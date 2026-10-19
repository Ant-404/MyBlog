$ErrorActionPreference = 'Stop'
$testRoot = Join-Path (Split-Path $PSScriptRoot -Parent) ('target/backup-test-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path "$testRoot/uploads", "$testRoot/music", "$testRoot/source" -Force | Out-Null
[IO.File]::WriteAllText("$testRoot/uploads/图片.txt", '图片测试内容')
[IO.File]::WriteAllText("$testRoot/music/library.json", '{}')
[IO.File]::WriteAllText("$testRoot/source/歌曲.txt", '歌曲测试内容')
$original = @{}
foreach ($name in @('UPLOAD_DIRECTORY', 'MUSIC_DIRECTORY', 'MUSIC_SOURCE_DIRECTORY')) { $original[$name] = [Environment]::GetEnvironmentVariable($name) }
function global:mysqldump {
    $result = @($args | Where-Object { $_ -like '--result-file=*' })[0].Substring(14)
    [IO.File]::WriteAllText($result, '-- Test-only database export')
    $global:LASTEXITCODE = 0
}
try {
    $env:UPLOAD_DIRECTORY = "$testRoot/uploads"
    $env:MUSIC_DIRECTORY = "$testRoot/music"
    $env:MUSIC_SOURCE_DIRECTORY = "$testRoot/source"
    & "$PSScriptRoot/Backup-Site.ps1" -Destination "$testRoot/backup" -ApplicationStopped
    & "$PSScriptRoot/Restore-Site.ps1" -Backup "$testRoot/backup"
    [IO.File]::AppendAllText("$testRoot/backup/music/library.json", 'tampered')
    $rejected = $false
    try { & "$PSScriptRoot/Restore-Site.ps1" -Backup "$testRoot/backup" } catch { $rejected = $true }
    if (-not $rejected) { throw '损坏的备份未被拒绝。' }
    [IO.File]::WriteAllText("$testRoot/backup/music/library.json", '{}')
    $manifestPath = "$testRoot/backup/manifest.json"
    $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    $manifest.files[0].path = '../outside.sql'
    $manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $manifestPath -Encoding utf8
    $rejected = $false
    try { & "$PSScriptRoot/Restore-Site.ps1" -Backup "$testRoot/backup" } catch { $rejected = $true }
    if (-not $rejected) { throw '越界路径未被拒绝。' }
    Write-Output 'PASS：目录打包、SHA256 校验、损坏检测与越界路径检测；数据库导出使用测试替身，未连接真实 MySQL。'
} finally {
    foreach ($name in $original.Keys) { [Environment]::SetEnvironmentVariable($name, $original[$name], 'Process') }
    Remove-Item Function:\mysqldump
}
