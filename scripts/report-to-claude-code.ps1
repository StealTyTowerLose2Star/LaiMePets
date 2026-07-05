param(
  [Parameter(Mandatory = $true)]
  [string]$Summary,

  [string[]]$ChangedFiles = @(),

  [string[]]$Verification = @(),

  [string[]]$FollowUps = @()
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$handoffPath = Join-Path $repoRoot ".claude\codex-handoff.md"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz"

function Format-ListBlock {
  param(
    [string[]]$Items,
    [string]$EmptyText
  )

  if ($Items.Count -eq 0) {
    return "- $EmptyText"
  }

  return ($Items | ForEach-Object { "- $_" }) -join [Environment]::NewLine
}

$entry = @"

## $timestamp

**Summary**
$Summary

**Changed Files**
$(Format-ListBlock -Items $ChangedFiles -EmptyText "No source changes")

**Verification**
$(Format-ListBlock -Items $Verification -EmptyText "Not run")

**Follow-ups / Risks**
$(Format-ListBlock -Items $FollowUps -EmptyText "None")
"@

if (-not (Test-Path $handoffPath)) {
  New-Item -ItemType Directory -Force -Path (Split-Path $handoffPath) | Out-Null
  @"
# Codex to Claude Code Handoff

This file records Codex CLI completion summaries for Claude Code.
"@ | Set-Content -Path $handoffPath -Encoding utf8
}

Add-Content -Path $handoffPath -Value $entry -Encoding utf8

Write-Host "Reported completion to $handoffPath"
