param([switch]$Check)
$ErrorActionPreference = 'Stop'
$backendPath = Split-Path $PSScriptRoot -Parent
$formatterPath = Join-Path $backendPath 'target/google-java-format-1.28.0.jar'
if (-not (Test-Path -LiteralPath $formatterPath)) {
    New-Item -ItemType Directory -Path (Join-Path $backendPath 'target') -Force | Out-Null
    Invoke-WebRequest -Uri 'https://repo.maven.apache.org/maven2/com/google/googlejavaformat/google-java-format/1.28.0/google-java-format-1.28.0-all-deps.jar' -OutFile $formatterPath
}
$javaFiles = @(Get-ChildItem -LiteralPath (Join-Path $backendPath 'src') -Filter '*.java' -File -Recurse | ForEach-Object { $_.FullName })
if ($Check) { & java -jar $formatterPath --dry-run --set-exit-if-changed @javaFiles }
else { & java -jar $formatterPath --replace @javaFiles }
if ($LASTEXITCODE -ne 0) { throw "Java formatting failed with code $LASTEXITCODE" }
