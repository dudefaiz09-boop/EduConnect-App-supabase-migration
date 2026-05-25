$ErrorActionPreference = 'Stop'

$BACKUP_DIR = $env:BACKUP_DIR
if (-not $BACKUP_DIR) {
  $BACKUP_DIR = Join-Path $PSScriptRoot '..' 'backups'
}
if (-not (Test-Path $BACKUP_DIR)) {
  New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
}

$SUPABASE_URL = $env:SUPABASE_URL
$SUPABASE_SERVICE_ROLE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $SUPABASE_URL -or -not $SUPABASE_SERVICE_ROLE_KEY) {
  Write-Host "ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set." -ForegroundColor Red
  exit 1
}

$TIMESTAMP = Get-Date -Format 'yyyyMMdd_HHmmss'
$BACKUP_FILE = Join-Path $BACKUP_DIR "educonnect_supabase_$TIMESTAMP.sql"

Write-Host "==> Backing up Supabase schema + data to $BACKUP_FILE" -ForegroundColor Cyan

$projectRef = if ($env:SUPABASE_PROJECT_REF) { $env:SUPABASE_PROJECT_REF } else { ($SUPABASE_URL -replace 'https://([^.]+)\..*', '$1') }

if (Get-Command 'supabase' -ErrorAction SilentlyContinue) {
  supabase db dump --project-ref $projectRef --file $BACKUP_FILE
  if ($LASTEXITCODE -ne 0) { throw 'supabase db dump failed' }
} else {
  Write-Host "Supabase CLI not found, using pg_dump via connection string..." -ForegroundColor Yellow
  $PG_CONN = $env:DATABASE_URL
  if (-not $PG_CONN) {
    Write-Host "ERROR: Supabase CLI not installed and DATABASE_URL not set. Set DATABASE_URL or install Supabase CLI." -ForegroundColor Red
    exit 1
  }
  pg_dump --no-owner --no-acl --file $BACKUP_FILE $PG_CONN
  if ($LASTEXITCode -ne 0) { throw 'pg_dump failed' }
}

Write-Host "Backup written: $BACKUP_FILE" -ForegroundColor Green

$METADATA_FILE = "$BACKUP_FILE.meta.json"
@{
  timestamp = $TIMESTAMP
  source = $SUPABASE_URL
  file = $BACKUP_FILE
  size_bytes = (Get-Item $BACKUP_FILE).Length
} | ConvertTo-Json | Set-Content $METADATA_FILE

Write-Host "Metadata written: $METADATA_FILE" -ForegroundColor Green

$RETENTION_DAYS = if ($env:BACKUP_RETENTION_DAYS) { [int]$env:BACKUP_RETENTION_DAYS } else { 30 }
$CUTOFF = (Get-Date).AddDays(-$RETENTION_DAYS)
Get-ChildItem -Path $BACKUP_DIR -Filter *.sql | Where-Object { $_.LastWriteTime -lt $CUTOFF } | ForEach-Object {
  Remove-Item -Path $_.FullName -Force
  Write-Host "Pruned old backup: $($_.Name)" -ForegroundColor DarkYellow
}
$METADATA_FILES = Get-ChildItem -Path $BACKUP_DIR -Filter *.meta.json | Where-Object { $_.LastWriteTime -lt $CUTOFF }
foreach ($mf in $METADATA_FILES) {
  Remove-Item -Path $mf.FullName -Force
}

Write-Host "Backup complete. Retention: $RETENTION_DAYS days" -ForegroundColor Green
