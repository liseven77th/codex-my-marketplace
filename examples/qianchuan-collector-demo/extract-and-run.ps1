[CmdletBinding()]
param(
  [switch]$InstallDeps,
  [switch]$SkipVoice,
  [switch]$SkipCapture
)
$ErrorActionPreference = 'Stop'
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$Bundle = Join-Path $Here 'project-source.tar.xz'
$Workspace = Join-Path $Here 'workspace'
if (-not (Test-Path $Bundle)) { throw "Source bundle not found: $Bundle" }
if (-not (Get-Command tar -ErrorAction SilentlyContinue)) { throw 'tar.exe is required (included with Windows 10/11).' }
if (-not (Test-Path $Workspace)) { New-Item -ItemType Directory -Path $Workspace | Out-Null }
tar -xf $Bundle -C $Workspace
if ($LASTEXITCODE -ne 0) { throw 'Source bundle extraction failed.' }
$Runner = Join-Path $Workspace 'run-demo.ps1'
if (-not (Test-Path $Runner)) { throw "run-demo.ps1 not found after extracting $Bundle" }
$ArgsList = @('-NoProfile','-ExecutionPolicy','Bypass','-File',$Runner)
if ($InstallDeps) { $ArgsList += '-InstallDeps' }
if ($SkipVoice) { $ArgsList += '-SkipVoice' }
if ($SkipCapture) { $ArgsList += '-SkipCapture' }
& powershell @ArgsList
if ($LASTEXITCODE -ne 0) { throw "Demo execution failed with exit code $LASTEXITCODE" }
