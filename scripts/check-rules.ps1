<#
.SYNOPSIS
  Checks the rules reviews kept counting by hand, on the files changed since a base: comment budget and file length
  (constitution V, VIII), forward-only migrations (B5) and requirement IDs in new comments (VIII). Prints only
  failures; exits 1 when any check fails. CI runs it on every pull request, and check-changed.ps1 runs it too.
.EXAMPLE
  ./scripts/check-rules.ps1                    # against origin/measure-module
  ./scripts/check-rules.ps1 -Base origin/develop
  ./scripts/check-rules.ps1 -Justified $prBody # a 301-400 line file passes when this text names its path
#>
param([string]$Base = 'origin/measure-module', [string]$Justified = '')

$root = Split-Path -Parent $PSScriptRoot
$failures = [System.Collections.Generic.List[string]]::new()
$since = git -C $root merge-base $Base HEAD
if (-not $since) { Write-Output "No merge base with $Base"; exit 1 }

# Source files changed since the base, committed or not; generated code is left out.
$changed = @(@(git -C $root diff --name-only --diff-filter=ACMR $since -- backend frontend) +
  @(git -C $root ls-files --others --exclude-standard -- backend frontend) |
  Where-Object { $_ -and $_ -notmatch 'sqlcdb/|api/generated/' } |
  Where-Object { $_ -like 'backend/*.go' -or $_ -like 'backend/*.sql' -or $_ -match '^frontend/(src|e2e)/.*\.(ts|tsx|css)$' } |
  Sort-Object -Unique)
# With no paths, git diff and ls-files would read every file in the repository.
if ($changed.Count -eq 0) { exit 0 }

# Where a comment starts on a line, or -1. Tool directives (nolint, go:, eslint, stylelint, @ts-, goose, sqlc) are not comments.
function Get-CommentStart([string]$text, [bool]$sql) {
  $marker = if ($sql) { '(^|\s)--(?!\s*(\+goose|name:))' } else { '(^|[\s{(])(//(?!/\s*<|\s*(nolint|go:|eslint|@ts-|prettier-ignore))|/\*(?!\s*(eslint|stylelint)))' }
  $quoted = "'(?:[^'\\]|\\.)*'|`"(?:[^`"\\]|\\.)*`"|``[^``]*``"
  $code = [regex]::Replace($text, $quoted, { param($m) 'x' * $m.Value.Length })
  $match = [regex]::Match($code, $marker)
  if ($match.Success) { return $match.Index }
  return -1
}

foreach ($file in $changed) {
  $sql = $file -like '*.sql'
  $lines = @(Get-Content (Join-Path $root $file) | Where-Object { $_.Trim() -ne '' })
  $inBlock = $false
  $comments = 0
  foreach ($line in $lines) {
    $text = $line.Trim()
    if ($inBlock) { $comments++; $inBlock = -not $text.Contains('*/'); continue }
    $start = Get-CommentStart $text $sql
    if ($start -lt 0) { continue }
    $comments++
    $rest = $text.Substring($start)
    $inBlock = $rest.Contains('/*') -and -not $rest.Contains('*/')
  }
  $budget = [math]::Ceiling($lines.Count * 0.05)
  if ($comments -gt $budget) { $failures.Add("== Comment budget == $file has $comments comment lines, $budget allowed") }
  $named = $Justified.Contains($file)
  if ($lines.Count -gt 400 -or ($lines.Count -gt 300 -and -not $named)) {
    $failures.Add("== File length == $file has $($lines.Count) non-blank lines, 300 allowed (301-400 with a justification naming the file in the pull request)")
  }
  if ($file -like '*/migrations/*.sql' -and (Select-String -Path (Join-Path $root $file) -Pattern '\+goose Down' -Quiet)) {
    $failures.Add("== Migration == $file has a goose Down block; migrations are forward-only (B5)")
  }
}

# Requirement IDs in comments this change adds; a line moved unchanged within its file is not new.
$diff = @(git -C $root diff -U0 --diff-filter=ACMR $since -- $changed)
$removed = @{}
$file = ''
$header = $false
foreach ($line in $diff) {
  if ($line -like 'diff --git *') { $header = $true; continue }
  if ($header -and $line -like '+++ *') { $file = $line -replace '^\+\+\+ b/', ''; continue }
  if ($line -like '@@*') { $header = $false; continue }
  if (-not $header -and $line.StartsWith('-')) { $removed["$file|$($line.Substring(1).Trim())"] = $true }
}
$added = [System.Collections.Generic.List[object]]::new()
$number = 0
foreach ($line in $diff) {
  if ($line -like 'diff --git *') { $header = $true; continue }
  if ($header -and $line -like '+++ *') { $file = $line -replace '^\+\+\+ b/', ''; continue }
  if ($line -match '^@@ -\S+ \+(\d+)') { $header = $false; $number = [int]$Matches[1]; continue }
  if ($header -or -not $line.StartsWith('+')) { continue }
  $added.Add(@($file, $number, $line.Substring(1).Trim()))
  $number++
}
# Files not yet committed are missing from the diff: every line of them is new.
foreach ($file in @(git -C $root ls-files --others --exclude-standard -- $changed)) {
  $number = 0
  Get-Content (Join-Path $root $file) | ForEach-Object { $number++; $added.Add(@($file, $number, $_.Trim())) }
}
foreach ($line in $added) {
  $file, $number, $text = $line
  $start = Get-CommentStart $text ($file -like '*.sql')
  if ($start -lt 0 -and $text.StartsWith('*')) { $start = 0 }
  if ($start -ge 0 -and -not $removed.ContainsKey("$file|$text") -and $text.Substring($start) -match '\b(FR|NFR|SC)-\d+') {
    $failures.Add("== Requirement ID in a comment == ${file}:$number $($Matches[0]) belongs in the test name or the pull request")
  }
}

if ($failures.Count -gt 0) {
  $failures | ForEach-Object { Write-Output $_ }
  exit 1
}
exit 0
