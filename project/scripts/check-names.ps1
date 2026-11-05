# Checks domain name candidates for availability through the Scriptorium Hostinger gateway (read only; no purchase).
# Usage (from the Scriptorium root):
#   powershell -ExecutionPolicy Bypass -File Projects\bus1idea\scripts\check-names.ps1 [-Candidates <json>] [-Out <csv>]
# Candidates: research\name-candidates.json ({ "tlds": [...], "names": [{ "name", "why" }] }).
# Writes a CSV (domain, available, why, checked) and prints a table. Every call is logged by the gateway.
param(
  [string]$Candidates = (Join-Path $PSScriptRoot '..\research\name-candidates.json'),
  [string]$Out = (Join-Path $PSScriptRoot '..\research\name-availability.csv')
)
$ErrorActionPreference = 'Stop'
$gateway = Join-Path $PSScriptRoot '..\..\..\Workshop\Hostinger\hostinger.ps1'
$cfg = Get-Content -Raw -LiteralPath $Candidates | ConvertFrom-Json
$today = Get-Date -Format 'yyyy-MM-dd'
$rows = @()
foreach ($c in $cfg.names) {
  $body = @{ domain = $c.name; tlds = @($cfg.tlds); with_alternatives = $false } | ConvertTo-Json -Compress
  $raw = & $gateway -Agent claude -Op domains.availability -Body $body 2>&1 | Out-String
  try {
    $start = $raw.IndexOf('[')
    $res = $raw.Substring($start) | ConvertFrom-Json
    foreach ($r in $res) {
      $rows += [pscustomobject]@{ domain = $r.domain; available = [bool]$r.is_available; why = $c.why; checked = $today }
    }
  } catch {
    $rows += [pscustomobject]@{ domain = "$($c.name) (error)"; available = $null; why = ($raw.Trim() -replace '\s+', ' ').Substring(0, [Math]::Min(120, $raw.Trim().Length)); checked = $today }
  }
}
$rows | Export-Csv -LiteralPath $Out -NoTypeInformation -Encoding UTF8
$rows | Sort-Object @{ e = { -not $_.available } }, domain | Format-Table domain, available, why -AutoSize | Out-String -Width 200
