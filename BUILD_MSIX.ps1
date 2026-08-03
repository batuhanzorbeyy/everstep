param(
    [string]$IdentityName = $env:MSIX_IDENTITY_NAME,
    [string]$Publisher = $env:MSIX_PUBLISHER,
    [string]$PublisherDisplayName = $env:MSIX_PUBLISHER_DISPLAY_NAME,
    [switch]$SkipTests,
    [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (-not $IdentityName) { $IdentityName = 'Zorbey.Everstep' }
if (-not $Publisher) { $Publisher = 'CN=7E9C97B3-EC5B-4A25-A7BF-3C59BAA59DF3' }
if (-not $PublisherDisplayName) { $PublisherDisplayName = 'Zorbey' }

if ($env:OS -ne 'Windows_NT') {
    throw 'MSIX paketi Windows 10/11 üzerinde oluşturulmalıdır.'
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js bulunamadı. Node.js 22 LTS veya daha yeni bir sürüm kurun.'
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw 'npm bulunamadı.'
}

if ($IdentityName -and $Publisher -and $PublisherDisplayName) {
    & (Join-Path $PSScriptRoot 'SET_STORE_IDENTITY.ps1') `
        -IdentityName $IdentityName `
        -Publisher $Publisher `
        -PublisherDisplayName $PublisherDisplayName
}
else {
    Write-Warning 'Partner Center kimlik değerleri verilmedi. Paket test amaçlı yer tutucu kimlikle üretilecek ve Store yüklemesine hazır olmayacaktır.'
}

if (-not $SkipInstall) {
    npm ci --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'npm install başarısız oldu.' }
}

if (-not $SkipTests) {
    npm run security:audit
    if ($LASTEXITCODE -ne 0) { throw 'Çalışma zamanı bağımlılık güvenlik denetimi başarısız oldu.' }

    npm test
    if ($LASTEXITCODE -ne 0) { throw 'Testler başarısız oldu.' }
}

npm run make:msix
if ($LASTEXITCODE -ne 0) { throw 'MSIX oluşturulamadı.' }

$packages = Get-ChildItem -Path (Join-Path $PSScriptRoot 'out\make') -Filter *.msix -Recurse -ErrorAction SilentlyContinue
if (-not $packages) {
    throw 'Derleme tamamlandı ancak .msix çıktısı bulunamadı.'
}

Write-Host ''
Write-Host 'Everstep MSIX başarıyla oluşturuldu:' -ForegroundColor Green
$packages | ForEach-Object { Write-Host $_.FullName }
