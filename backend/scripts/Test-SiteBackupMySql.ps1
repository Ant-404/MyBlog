# Optional real round trip against a disposable MySQL instance, never the configured server.
$ErrorActionPreference = 'Stop'
$testRoot = [IO.Path]::GetFullPath((Join-Path (Split-Path $PSScriptRoot -Parent) ('target/mysql-backup-test-' + [guid]::NewGuid().ToString('N'))))
New-Item -ItemType Directory -Path "$testRoot/data", "$testRoot/uploads", "$testRoot/music", "$testRoot/source" -Force | Out-Null
$binary = (Get-Command mysqld -ErrorAction Stop).Source
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
$listener.Start()
$port = $listener.LocalEndpoint.Port
$listener.Stop()
$original = @{}
foreach ($name in @('DB_HOST','DB_PORT','DB_NAME','DB_USERNAME','DB_PASSWORD','MYSQL_PWD','UPLOAD_DIRECTORY','MUSIC_DIRECTORY','MUSIC_SOURCE_DIRECTORY')) { $original[$name] = [Environment]::GetEnvironmentVariable($name) }
$server = $null
try {
    & $binary --no-defaults --initialize-insecure "--datadir=$testRoot/data" "--log-error=$testRoot/initialize.log"
    if ($LASTEXITCODE -ne 0) { throw "MySQL 初始化失败，请检查 $testRoot/initialize.log" }
    $arguments = @('--no-defaults', "--datadir=$testRoot/data", "--port=$port", '--bind-address=127.0.0.1', '--mysqlx=0', "--log-error=$testRoot/server.log")
    $server = Start-Process -FilePath $binary -ArgumentList $arguments -WindowStyle Hidden -PassThru
    $env:MYSQL_PWD = ''
    $connection = @('--host=127.0.0.1', "--port=$port", '--user=root', '--default-character-set=utf8mb4')
    $ready = $false
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        & mysql @connection --execute='SELECT 1' 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        Start-Sleep -Milliseconds 500
    }
    if (-not $ready) { throw '临时 MySQL 未能启动。' }
    & mysql @connection --execute="ALTER USER 'root'@'localhost' IDENTIFIED BY 'Backup-Test-Password-2026'; CREATE DATABASE BackupFixture CHARACTER SET utf8mb4; CREATE TABLE BackupFixture.notes(id INT PRIMARY KEY,content TEXT); INSERT INTO BackupFixture.notes VALUES (1,'中文备份恢复验证');"
    if ($LASTEXITCODE -ne 0) { throw '创建测试数据失败。' }
    $env:DB_HOST = '127.0.0.1'; $env:DB_PORT = [string]$port; $env:DB_NAME = 'BackupFixture'; $env:DB_USERNAME = 'root'; $env:DB_PASSWORD = 'Backup-Test-Password-2026'; $env:MYSQL_PWD = $env:DB_PASSWORD
    $env:UPLOAD_DIRECTORY = "$testRoot/uploads"; $env:MUSIC_DIRECTORY = "$testRoot/music"; $env:MUSIC_SOURCE_DIRECTORY = "$testRoot/source"
    [IO.File]::WriteAllText("$testRoot/uploads/图片.txt", '图片内容')
    [IO.File]::WriteAllText("$testRoot/music/library.json", '{"test":"歌曲资料"}')
    [IO.File]::WriteAllText("$testRoot/source/歌曲.txt", '原始音乐')
    & "$PSScriptRoot/Backup-Site.ps1" -Destination "$testRoot/backup" -ApplicationStopped
    & "$PSScriptRoot/Restore-Site.ps1" -Backup "$testRoot/backup" -Apply -ApplicationStopped -TargetDatabase BackupRestored -Destination "$testRoot/restored"
    $content = & mysql @connection --batch --skip-column-names --execute='SELECT content FROM BackupRestored.notes WHERE id=1'
    if ($LASTEXITCODE -ne 0 -or $content -ne '中文备份恢复验证') { throw '中文 SQL 往返不一致。' }
    foreach ($folder in @('uploads','music','sourceMusic','publicImages')) {
        foreach ($file in Get-ChildItem -LiteralPath (Join-Path "$testRoot/backup" $folder) -Recurse -File) {
            $relative = [IO.Path]::GetRelativePath("$testRoot/backup", $file.FullName)
            if ((Get-FileHash -LiteralPath $file.FullName).Hash -ne (Get-FileHash -LiteralPath (Join-Path "$testRoot/restored" $relative)).Hash) { throw "恢复文件不一致：$relative" }
        }
    }
    $rejected = $false
    try { & "$PSScriptRoot/Restore-Site.ps1" -Backup "$testRoot/backup" -Apply -ApplicationStopped -TargetDatabase BackupRestored -Destination "$testRoot/another" } catch { $rejected = $true }
    if (-not $rejected) { throw '非空数据库未被拒绝。' }
    Write-Output 'PASS：独立临时 MySQL 真实导出/导入、中文内容、全部恢复文件哈希及非空数据库保护。现用 MySQL 未连接。'
} finally {
    if ($server -and -not $server.HasExited) {
        & mysqladmin --host=127.0.0.1 "--port=$port" --user=root shutdown 2>$null
        if (-not $server.WaitForExit(10000)) { Stop-Process -Id $server.Id }
    }
    foreach ($name in $original.Keys) { [Environment]::SetEnvironmentVariable($name, $original[$name], 'Process') }
}
