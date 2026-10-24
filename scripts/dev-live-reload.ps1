<#
.SYNOPSIS
    DonateConnect — Local Android Live Reload Launcher
.DESCRIPTION
    Launches Vite development server and runs the Capacitor Android app in live-reload mode
    without permanently altering capacitor.config.ts or committing any dev server IP to git.
    Supports both USB port forwarding (adb reverse) and same-network Wi-Fi.
#>

[CmdletBinding()]
param (
    [ValidateSet('usb', 'wifi')]
    [string]$Mode = 'usb',

    [string]$CustomIp
)

$ErrorActionPreference = 'Stop'

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   DonateConnect — Android Live Reload Development Tool   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Locate active local IPv4 address
$LocalIp = $CustomIp
if (-not $LocalIp) {
    try {
        $ipObj = Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi*','Ethernet*' -ErrorAction SilentlyContinue |
            Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
            Select-Object -First 1
        if ($ipObj) {
            $LocalIp = $ipObj.IPAddress
        }
    } catch {}
}

if (-not $LocalIp) {
    $LocalIp = 'localhost'
}

Write-Host "`n[1/3] Network Environment:" -ForegroundColor Yellow
Write-Host "   - Detected Laptop IP: $LocalIp" -ForegroundColor Gray
Write-Host "   - Live Reload Mode:   $($Mode.ToUpper())" -ForegroundColor Gray

# 2. Check for connected Android device via ADB
Write-Host "`n[2/3] Checking Connected Android Devices (ADB)..." -ForegroundColor Yellow
$adbCmd = Get-Command adb -ErrorAction SilentlyContinue
if ($adbCmd) {
    $devices = & adb devices | Select-String -Pattern "\bdevice\b" | Where-Object { $_ -notmatch "List of devices" }
    if ($devices) {
        Write-Host "   [+] Found connected Android device(s):" -ForegroundColor Green
        $devices | ForEach-Object { Write-Host "       - $_" -ForegroundColor Green }

        if ($Mode -eq 'usb') {
            Write-Host "   [+] Setting up USB reverse port forwarding (tcp:5173 -> tcp:5173)..." -ForegroundColor Cyan
            & adb reverse tcp:5173 tcp:5173
            & adb reverse tcp:8080 tcp:8080
            Write-Host "   [+] Port forwarding active. App can reach Vite dev server via localhost:5173." -ForegroundColor Green
        }
    } else {
        Write-Host "   [!] No USB Android device detected via 'adb devices'." -ForegroundColor Yellow
        Write-Host "       If testing over Wi-Fi, ensure your phone and laptop are on the same Wi-Fi network." -ForegroundColor Gray
        $Mode = 'wifi'
    }
} else {
    Write-Host "   [!] 'adb' executable not found in PATH. Using Wi-Fi network mode." -ForegroundColor Yellow
    $Mode = 'wifi'
}

# 3. Launch live reload
Write-Host "`n[3/3] Starting Vite + Capacitor Live Reload..." -ForegroundColor Yellow
Write-Host "   [i] Web changes (React, CSS, TSX) reload INSTANTLY on your phone." -ForegroundColor Gray
Write-Host "   [!] Native changes (plugins, permissions, Java) require rebuilding the APK." -ForegroundColor DarkYellow
Write-Host "   [!] capacitor.config.ts will remain clean and untouched.`n" -ForegroundColor Green

$frontendDir = Join-Path $PSScriptRoot "..\frontend"
Set-Location $frontendDir

if ($Mode -eq 'usb') {
    Write-Host "Executing: npx cap run android -l --forwardPorts 5173:5173" -ForegroundColor Cyan
    & npx cap run android -l --forwardPorts 5173:5173
} else {
    Write-Host "Executing: npx cap run android -l --host $LocalIp" -ForegroundColor Cyan
    & npx cap run android -l --host $LocalIp
}

