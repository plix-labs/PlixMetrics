# PlixMetrics Windows Build Script
# This script builds the full application and creates a Windows installer.
#
# Requirements:
#   - Node.js 20+ (for building)
#   - Inno Setup 6+ (for creating the installer)
#
# Usage:
#   .\scripts\build-win.ps1
#

param(
    [string]$NodeVersion = "20.18.1",
    [string]$InnoSetupPath = "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe"
)

$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not $ROOT) { $ROOT = (Get-Location).Path }

# Resolve to project root (this script is in scripts/)
$ROOT = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path "$ROOT\package.json")) {
    $ROOT = (Get-Location).Path
}

$BUILD_DIR = "$ROOT\build-win"
$NODE_DIR = "$BUILD_DIR\node"
$APP_DIR = "$BUILD_DIR\app"
$CACHE_DIR = "$ROOT\.build-cache"

# Read version from package.json
$packageJson = Get-Content "$ROOT\package.json" | ConvertFrom-Json
$VERSION = $packageJson.version

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  PlixMetrics Windows Build v$VERSION" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# ─── Step 1: Clean build directory ────────────────────────────────
Write-Host "[1/7] Cleaning build directory..." -ForegroundColor Yellow
if (Test-Path $BUILD_DIR) {
    Remove-Item -Recurse -Force $BUILD_DIR
}
New-Item -ItemType Directory -Path $BUILD_DIR -Force | Out-Null
New-Item -ItemType Directory -Path $APP_DIR -Force | Out-Null

# ─── Step 2: Build Frontend ──────────────────────────────────────
Write-Host "[2/7] Installing dependencies & Building frontend..." -ForegroundColor Yellow
Push-Location $ROOT
npm install
npm run build
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }
Pop-Location

# ─── Step 3: Build Server ────────────────────────────────────────
Write-Host "[3/7] Installing server dependencies & Building server..." -ForegroundColor Yellow
Push-Location "$ROOT\server"
npm install
npm run build
if ($LASTEXITCODE -ne 0) { throw "Server build failed" }
Pop-Location

# ─── Step 4: Download Node.js Portable ───────────────────────────
Write-Host "[4/7] Preparing Node.js portable v$NodeVersion..." -ForegroundColor Yellow
$nodeZip = "$CACHE_DIR\node-v$NodeVersion-win-x64.zip"
$nodeExtracted = "$CACHE_DIR\node-v$NodeVersion-win-x64"

if (-not (Test-Path $CACHE_DIR)) {
    New-Item -ItemType Directory -Path $CACHE_DIR -Force | Out-Null
}

if (-not (Test-Path $nodeZip)) {
    $nodeUrl = "https://nodejs.org/dist/v$NodeVersion/node-v$NodeVersion-win-x64.zip"
    Write-Host "  Downloading Node.js from $nodeUrl..." -ForegroundColor Gray
    Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeZip -UseBasicParsing
    Write-Host "  Download complete." -ForegroundColor Green
} else {
    Write-Host "  Using cached Node.js download." -ForegroundColor Gray
}

if (-not (Test-Path $nodeExtracted)) {
    Write-Host "  Extracting Node.js..." -ForegroundColor Gray
    Expand-Archive -Path $nodeZip -DestinationPath $CACHE_DIR -Force
}

# Copy only what we need (node.exe + essential files)
New-Item -ItemType Directory -Path $NODE_DIR -Force | Out-Null
Copy-Item "$nodeExtracted\node.exe" "$NODE_DIR\node.exe"

Write-Host "  Node.js portable ready." -ForegroundColor Green

# ─── Step 5: Assemble Application ────────────────────────────────
Write-Host "[5/7] Assembling application..." -ForegroundColor Yellow

# Frontend build output
Copy-Item -Recurse "$ROOT\dist" "$APP_DIR\dist"

# Server compiled output
New-Item -ItemType Directory -Path "$APP_DIR\server" -Force | Out-Null
Copy-Item -Recurse "$ROOT\server\dist" "$APP_DIR\server\dist"
Copy-Item "$ROOT\server\package.json" "$APP_DIR\server\package.json"
Copy-Item "$ROOT\server\package-lock.json" "$APP_DIR\server\package-lock.json"

# Install production-only server dependencies using system npm
Write-Host "  Installing production dependencies..." -ForegroundColor Gray
Push-Location "$APP_DIR\server"
npm ci --omit=dev
if ($LASTEXITCODE -ne 0) { throw "Server dependency install failed" }
Pop-Location

# Tray application (now a simple launcher without dependencies)
New-Item -ItemType Directory -Path "$APP_DIR\scripts\tray" -Force | Out-Null
Copy-Item "$ROOT\scripts\tray\tray.js" "$APP_DIR\scripts\tray\tray.js"

# Create minimal package.json for tray (no dependencies needed)
$trayPackageJson = @{
    name = "plixmetrics-launcher"
    version = $VERSION
    type = "module"
} | ConvertTo-Json
$trayPackageJson | Set-Content "$APP_DIR\scripts\tray\package.json"


# Root package.json (for version info)
Copy-Item "$ROOT\package.json" "$APP_DIR\package.json"

# Icon
if (Test-Path "$ROOT\public\plixmetrics.ico") {
    Copy-Item "$ROOT\public\plixmetrics.ico" "$APP_DIR\plixmetrics.ico"
}

Write-Host "  Application assembled." -ForegroundColor Green

# ─── Step 6: Create Launcher ─────────────────────────────────────
Write-Host "[6/7] Creating launcher..." -ForegroundColor Yellow

$launcherContent = @"
@echo off
title PlixMetrics
set PLIXMETRICS_NODE=%~dp0node\node.exe
set DATA_DIR=%APPDATA%\PlixMetrics
set NODE_ENV=production
set PORT=8282

"%~dp0node\node.exe" "%~dp0app\scripts\tray\tray.js"
"@

$launcherContent | Set-Content "$BUILD_DIR\PlixMetrics.bat" -Encoding ASCII

Write-Host "  Launcher created." -ForegroundColor Green

# ─── Step 7: Build Installer ─────────────────────────────────────
Write-Host "[7/7] Building installer..." -ForegroundColor Yellow

if ((Test-Path $InnoSetupPath) -or (Get-Command $InnoSetupPath -ErrorAction SilentlyContinue)) {
    & $InnoSetupPath /DAppVersion=$VERSION /DSourceDir=$BUILD_DIR /DOutputDir=$ROOT\releases "$ROOT\scripts\installer.iss"
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "================================================" -ForegroundColor Green
        Write-Host "  BUILD SUCCESSFUL!" -ForegroundColor Green
        Write-Host "  Installer: $ROOT\releases\PlixMetrics-Setup-v$VERSION.exe" -ForegroundColor Green
        Write-Host "================================================" -ForegroundColor Green
    } else {
        Write-Host "  Inno Setup compilation failed!" -ForegroundColor Red
    }
} else {
    Write-Host "  Inno Setup not found at: $InnoSetupPath" -ForegroundColor Red
    Write-Host "  Download from: https://jrsoftware.org/isdl.php" -ForegroundColor Yellow
    Write-Host "  Build directory ready at: $BUILD_DIR" -ForegroundColor Yellow
    Write-Host "  You can run Inno Setup manually on: $ROOT\scripts\installer.iss" -ForegroundColor Yellow
}

Write-Host ""
