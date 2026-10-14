param([switch]$Packaged)
$ErrorActionPreference = 'Stop'
$backendPath = Split-Path $PSScriptRoot -Parent
$envPath = Join-Path $backendPath '.env'
if (Test-Path -LiteralPath $envPath) {
    foreach ($line in Get-Content -LiteralPath $envPath -Encoding utf8) {
        if ($line -match '^\s*([A-Z][A-Z0-9_]*)\s*=(.*)$') {
            [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2].Trim(), 'Process')
        }
    }
}
if (-not $env:DB_PASSWORD) { throw '请先在 backend/.env 中配置 DB_PASSWORD（参考 .env.example）' }
Push-Location $backendPath
try {
    if ($Packaged) { & java -jar 'target/myblog-backend-0.1.0.jar' }
    else { & mvn spring-boot:run }
    if ($LASTEXITCODE -ne 0) { throw "Backend exited with code $LASTEXITCODE" }
} finally { Pop-Location }
