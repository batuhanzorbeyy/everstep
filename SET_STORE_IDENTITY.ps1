param(
    [Parameter(Mandatory = $true)]
    [string]$IdentityName,

    [Parameter(Mandatory = $true)]
    [string]$Publisher,

    [Parameter(Mandatory = $true)]
    [string]$PublisherDisplayName
)

$ErrorActionPreference = 'Stop'
$manifestPath = Join-Path $PSScriptRoot 'Package.appxmanifest'

if ($IdentityName -notmatch '^[A-Za-z0-9.-]{3,50}$') {
    throw 'IdentityName geçersiz karakter veya uzunluk içeriyor.'
}
if ($Publisher -notmatch '^CN=[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}$') {
    throw 'Publisher değeri beklenen CN=GUID biçiminde değil.'
}
if ([string]::IsNullOrWhiteSpace($PublisherDisplayName) -or $PublisherDisplayName.Length -gt 50) {
    throw 'PublisherDisplayName boş olamaz ve 50 karakteri geçemez.'
}

if (-not (Test-Path $manifestPath)) {
    throw "Package.appxmanifest bulunamadı: $manifestPath"
}

[xml]$manifest = Get-Content -Path $manifestPath -Raw
$manifest.Package.Identity.Name = $IdentityName
$manifest.Package.Identity.Publisher = $Publisher
$manifest.Package.Properties.PublisherDisplayName = $PublisherDisplayName

$settings = New-Object System.Xml.XmlWriterSettings
$settings.Indent = $true
$settings.Encoding = New-Object System.Text.UTF8Encoding($false)
$writer = [System.Xml.XmlWriter]::Create($manifestPath, $settings)
try {
    $manifest.Save($writer)
}
finally {
    $writer.Dispose()
}

Write-Host "Store kimliği Package.appxmanifest dosyasına uygulandı." -ForegroundColor Green
Write-Host "Identity Name: $IdentityName"
Write-Host "Publisher: $Publisher"
Write-Host "Publisher display name: $PublisherDisplayName"
