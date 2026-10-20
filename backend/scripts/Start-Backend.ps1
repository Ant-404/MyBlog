param(
    [switch]$Packaged,
    [ValidateSet('development', 'prod-windows', 'prod-linux')]
    [string]$Environment = 'development'
)
$ErrorActionPreference = 'Stop'
$backendPath = Split-Path $PSScriptRoot -Parent
# Spring reads the selected file itself, preserving real environment variable precedence.
$profile = if ($Environment -eq 'development') { 'default' } else { $Environment }
Push-Location $backendPath
try {
    if ($Packaged) { & java -jar 'target/myblog-backend-0.1.0.jar' "--spring.profiles.active=$profile" }
    else { & mvn spring-boot:run "-Dspring-boot.run.profiles=$profile" }
    if ($LASTEXITCODE -ne 0) { throw "Backend exited with code $LASTEXITCODE" }
} finally { Pop-Location }
