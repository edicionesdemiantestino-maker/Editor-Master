<#
.SYNOPSIS
  Genera un único archivo Markdown con el código fuente para auditoría externa (p. ej. ChatGPT).

.DESCRIPTION
  Concatena archivos relevantes (.ts, .tsx, .sql, .mjs de config) bajo el proyecto,
  con encabezados por ruta. Excluye node_modules, .next, binarios y lockfile.

  Uso (desde la raíz del repo):
    pwsh -File scripts/export-audit-bundle.ps1
    pwsh -File scripts/export-audit-bundle.ps1 -OutputPath ".\MI_BUNDLE.md"

.NOTA
  Si el bundle supera el límite de contexto del modelo, subí el .md por partes o
  usá la subida de archivos de ChatGPT.
#>
param(
  [string] $OutputPath = ""
)

$ErrorActionPreference = "Stop"
$rootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$root = $rootDir.Path
if (-not $OutputPath) {
  $OutputPath = Join-Path $root "AUDIT_BUNDLE.md"
}

function Append-FileSection {
  param([string]$RelativePath, [string]$FullPath)
  if (-not (Test-Path -LiteralPath $FullPath)) { return }
  $content = Get-Content -LiteralPath $FullPath -Raw -Encoding UTF8
  $null = $Global:sb.AppendLine("")
  $null = $Global:sb.AppendLine("---")
  $null = $Global:sb.AppendLine("## FILE: $RelativePath")
  $null = $Global:sb.AppendLine("")
  $null = $Global:sb.AppendLine('```')
  $null = $Global:sb.AppendLine($content.TrimEnd())
  $null = $Global:sb.AppendLine('```')
}

$Global:sb = [System.Text.StringBuilder]::new()
$null = $Global:sb.AppendLine('# Editor Maestro - bundle de codigo para auditoria')
$null = $Global:sb.AppendLine('')
$null = $Global:sb.AppendLine('Generado por: scripts/export-audit-bundle.ps1')
$null = $Global:sb.AppendLine("Raiz del repo: $root")
$null = $Global:sb.AppendLine('')
$null = $Global:sb.AppendLine('## Prompt sugerido para el auditor')
$null = $Global:sb.AppendLine('')
$prompt = @'
Sos un revisor senior de seguridad, arquitectura, performance y calidad de codigo (TypeScript/React/Next.js App Router).
Auditoria exhaustiva del repositorio adjunto en los bloques FILE:

1. Seguridad: secretos, RLS/Supabase, rutas API (/api/inpaint, /api/image-proxy, /api/export-print), CORS, validacion de input, XSS, CSRF, rate limits, abuso de costos (Replicate/sharp).
2. Arquitectura: capas (entities / features / services / app), acoplamiento, binarios sharp/pdfkit solo en servidor.
3. Correctness: Fabric y Zustand, exportacion (RGB/pdf-lib, CMYK/sharp+pdfkit, workers), inpainting/Replicate.
4. Performance: hilo principal, renders Fabric, imagenes grandes, memoria en export.
5. DX/Prod: tests (Vitest/Playwright), lint, observabilidad (logs estructurados), CI y despliegue (sharp nativo).

Priorizacion: P0/P1/P2 con acciones concretas y referencias FILE: ruta.
Responde en espanol con tablas donde ayude.
'@
$null = $Global:sb.AppendLine($prompt)

$rootFiles = @(
  "package.json",
  "tsconfig.json",
  "next.config.ts",
  "eslint.config.mjs",
  "postcss.config.mjs",
  ".env.example"
)
foreach ($rel in $rootFiles) {
  $full = Join-Path $root $rel
  Append-FileSection -RelativePath $rel -FullPath $full
}

# src completo
Get-ChildItem -Path (Join-Path $root "src") -Recurse -File |
  Where-Object {
    $_.Extension -in @(".ts", ".tsx") -and
    $_.FullName -notmatch "\\node_modules\\" -and
    $_.FullName -notmatch "\\.next\\"
  } |
  Sort-Object FullName |
  ForEach-Object {
    $rel = $_.FullName.Substring($root.Length).TrimStart("\")
    Append-FileSection -RelativePath $rel -FullPath $_.FullName
  }

# supabase migrations
$migDir = Join-Path $root "supabase\migrations"
if (Test-Path -LiteralPath $migDir) {
  Get-ChildItem -Path $migDir -Filter "*.sql" -File | Sort-Object Name | ForEach-Object {
    $rel = $_.FullName.Substring($root.Length).TrimStart("\")
    Append-FileSection -RelativePath $rel -FullPath $_.FullName
  }
}

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($OutputPath, $Global:sb.ToString(), $utf8NoBom)

$len = (Get-Item -LiteralPath $OutputPath).Length
Write-Host "OK: $OutputPath ($([math]::Round($len/1MB, 2)) MB)"
