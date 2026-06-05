# demo/record.ps1 — records the happy-path test and exports an MP4
# Run from the repo root:  .\demo\record.ps1
# Custom output name:      .\demo\record.ps1 -Out docs/deploy-demo.mp4
# Dark mode:               .\demo\record.ps1 -Theme dark
# Light + dark:            .\demo\record.ps1 -Theme both
param(
  [string]$Out = "demo/demo.mp4",
  [ValidateSet("system", "light", "dark", "both")]
  [string]$Theme = "system"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Resolve repo root (parent of this script's directory)
$root = Split-Path $PSScriptRoot -Parent
Push-Location $root

try {
  $themes = if ($Theme -eq "both") { @("light", "dark") } else { @($Theme) }
  $originalDemoTheme = [Environment]::GetEnvironmentVariable("DEMO_THEME", "Process")
  $originalDemoRecording = [Environment]::GetEnvironmentVariable("DEMO_RECORDING", "Process")
  [Environment]::SetEnvironmentVariable("DEMO_RECORDING", "1", "Process")

  foreach ($themeName in $themes) {
    if ($themeName -eq "system") {
      [Environment]::SetEnvironmentVariable("DEMO_THEME", $null, "Process")
      $themeOut = $Out
    } else {
      [Environment]::SetEnvironmentVariable("DEMO_THEME", $themeName, "Process")
      $outItem = Get-Item -LiteralPath $Out -ErrorAction SilentlyContinue
      $outDir = if ($outItem) { $outItem.DirectoryName } else { Split-Path $Out -Parent }
      if (-not $outDir) { $outDir = "." }
      $outName = [IO.Path]::GetFileNameWithoutExtension($Out)
      $outExt = [IO.Path]::GetExtension($Out)
      if (-not $outExt) { $outExt = ".mp4" }
      $themeOut = Join-Path $outDir "$outName-$themeName$outExt"
    }

    # Run Playwright
    Write-Host "Running happy-path demo test ($themeName)..." -ForegroundColor Cyan
    npx playwright test happy-path --config=demo/playwright.config.ts
    if ($LASTEXITCODE -ne 0) {
      Write-Error "Playwright test failed — aborting."
      exit 1
    }

    # Find the newest video.webm
    $webm = Get-ChildItem -Path "test-results" -Filter "video.webm" -Recurse |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1

    if (-not $webm) {
      Write-Error "No video.webm found in test-results/."
      exit 1
    }

    Write-Host "Found: $($webm.FullName)" -ForegroundColor Green

    # Convert to MP4
    Write-Host "Converting to $themeOut ..." -ForegroundColor Cyan
    ffmpeg -y -i $webm.FullName `
      -vf "scale=1280:800:flags=lanczos" `
      -c:v libx264 -preset slow -crf 18 `
      -pix_fmt yuv420p -movflags +faststart `
      $themeOut

    if ($LASTEXITCODE -ne 0) {
      Write-Error "ffmpeg conversion failed."
      exit 1
    }

    Write-Host "Done -> $themeOut" -ForegroundColor Green
  }
} finally {
  [Environment]::SetEnvironmentVariable("DEMO_THEME", $originalDemoTheme, "Process")
  [Environment]::SetEnvironmentVariable("DEMO_RECORDING", $originalDemoRecording, "Process")
  Pop-Location
}
