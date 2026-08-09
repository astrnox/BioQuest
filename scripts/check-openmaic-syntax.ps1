$ErrorActionPreference = 'Stop'
$base = 'd:\bioquest'
Set-Location $base

$files = @(
  'vendor\openmaic\openmaic-emitter.js',
  'vendor\openmaic\openmaic-cn.js',
  'vendor\openmaic\openmaic-geometry.js',
  'vendor\openmaic\openmaic-element.js',
  'vendor\openmaic\openmaic-json-repair.js',
  'vendor\openmaic\openmaic-actions-types.js',
  'vendor\openmaic\openmaic-action-parser.js',
  'vendor\openmaic\openmaic-store.js',
  'vendor\openmaic\openmaic-stage-store.js',
  'vendor\openmaic\openmaic-canvas-store.js',
  'vendor\openmaic\openmaic-whiteboard-history-store.js',
  'vendor\openmaic\openmaic-playback.js',
  'vendor\openmaic\openmaic-action-engine.js',
  'vendor\openmaic\openmaic-derived-state.js',
  'vendor\openmaic\openmaic-stream-buffer.js',
  'vendor\openmaic\openmaic-agent-loop.js',
  'vendor\openmaic\openmaic-types.js',
  'vendor\openmaic\openmaic-constants.js',
  'vendor\openmaic\openmaic-browser-tts.js'
)

# Use node to syntax-check each file (since node is more JS-aware)
foreach ($f in $files) {
  $full = Join-Path $base $f
  if (Test-Path $full) {
    # node --check exits 0 on valid syntax
    $output = node --check $full 2>&1
    if ($LASTEXITCODE -ne 0) {
      Write-Host "SYNTAX FAIL: $f" -ForegroundColor Red
      Write-Host $output
    } else {
      $lines = (Get-Content $full).Count
      Write-Host "OK: $f ($lines lines)" -ForegroundColor Green
    }
  } else {
    Write-Host "MISSING: $f" -ForegroundColor Yellow
  }
}
