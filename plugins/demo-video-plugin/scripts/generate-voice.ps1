[CmdletBinding()]
param(
  [string]$Project = (Get-Location).Path,
  [string]$Voice = 'zh-CN-XiaoxiaoNeural',
  [string]$Rate = '+0%',
  [string]$Pitch = '+0Hz'
)
$ErrorActionPreference = 'Stop'
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) { throw 'Python 3.9+ was not found.' }
& python -c "import edge_tts" 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Installing Edge TTS…'
  & python -m pip install --upgrade edge-tts
  if ($LASTEXITCODE -ne 0) { throw 'Edge TTS installation failed. Check network access and pip configuration.' }
}
$script = Join-Path $PSScriptRoot 'tts-edge.py'
& python $script --project $Project --voice $Voice --rate $Rate --pitch $Pitch
if ($LASTEXITCODE -ne 0) { throw 'Edge TTS generation failed.' }
