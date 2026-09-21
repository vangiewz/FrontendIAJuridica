# Prepara la prueba en un celular Android por USB: ADB, adb reverse, comprobaciones y Metro.
#
#   .\scripts\start_android_usb.ps1
#   .\scripts\start_android_usb.ps1 -SinMetro     # solo ADB y comprobaciones
#
# Es seguro: no mata procesos, no toca el firewall, no cambia Git, no instala software,
# no modifica .env, no ejecuta consultas de IA y no lanza builds de EAS.
param([switch]$SinMetro)

$Paquete = "com.asistenciajuridica.civil"
$Frontend = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path (Split-Path -Parent $Frontend) "BackendIAJuridica"

function Ok($t)    { Write-Host "  OK     $t" -ForegroundColor Green }
function Falla($t) { Write-Host "  FALLA  $t" -ForegroundColor Red }
function Aviso($t) { Write-Host "  AVISO  $t" -ForegroundColor Yellow }
function Paso($t)  { Write-Host "`n== $t" -ForegroundColor Cyan }

# --- 1. ADB -----------------------------------------------------------------
Paso "ADB"
$adb = (Get-Command adb -ErrorAction SilentlyContinue).Source
if (-not $adb) {
    $candidatos = @(
        "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe",
        "C:\Android\platform-tools\adb.exe", "C:\platform-tools\adb.exe"
    ) + @(Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Filter "Google.PlatformTools*" -Directory -ErrorAction SilentlyContinue |
        ForEach-Object { Join-Path $_.FullName "platform-tools\adb.exe" })
    $adb = $candidatos | Where-Object { Test-Path $_ } | Select-Object -First 1
}
if (-not $adb) {
    Falla "No se encontro adb. Instalalo con:  winget install --id Google.PlatformTools -e"
    exit 1
}
$env:Path = "$(Split-Path -Parent $adb);$env:Path"
Ok (& $adb --version | Select-Object -First 1)

# --- 2. Celular ---------------------------------------------------------------
Paso "Celular"
$lineas = @(& $adb devices | Select-Object -Skip 1 | Where-Object { $_.Trim() })
if ($lineas.Count -eq 0) {
    Falla "No hay ningun dispositivo. Revisa: cable USB de datos, modo USB 'Transferencia de archivos' y Depuracion USB activada."
    exit 1
}
if ($lineas -match "unauthorized") {
    Falla "El celular esta 'unauthorized'. Mira la pantalla del celular y acepta 'Permitir depuracion USB'; luego vuelve a ejecutar este script."
    exit 1
}
if (-not ($lineas -match "\sdevice$")) {
    Falla "Estado inesperado: $($lineas -join ' | '). Prueba: adb kill-server; adb start-server"
    exit 1
}
Ok ($lineas -join " | ")

# --- 3. adb reverse -------------------------------------------------------------
Paso "adb reverse"
& $adb reverse tcp:8000 tcp:8000 | Out-Null
& $adb reverse tcp:8081 tcp:8081 | Out-Null
$reverse = (& $adb reverse --list) -join "`n"
foreach ($p in 8000, 8081) {
    if ($reverse -match "tcp:$p tcp:$p") { Ok "tcp:$p -> tcp:$p" } else { Falla "no quedo el reverse de $p" }
}

# --- 4. Backend y Ollama -----------------------------------------------------------
Paso "Backend (PC)"
try {
    $salud = Invoke-RestMethod "http://127.0.0.1:8000/api/v1/health" -TimeoutSec 5
    Ok "http://127.0.0.1:8000/api/v1/health -> $($salud.status), base: $($salud.database)"
} catch {
    Falla "El backend no responde en 127.0.0.1:8000. Arrancalo en OTRA terminal:"
    Write-Host "         cd `"$Backend`"" -ForegroundColor Gray
    Write-Host "         .\.venv\Scripts\Activate.ps1" -ForegroundColor Gray
    Write-Host "         uvicorn app.main:app --host 127.0.0.1 --port 8000" -ForegroundColor Gray
}
try {
    $modelos = (Invoke-RestMethod "http://127.0.0.1:11434/api/tags" -TimeoutSec 5).models.name
    Ok "Ollama activo. Modelos: $($modelos -join ', ')"
} catch { Aviso "Ollama no responde en 127.0.0.1:11434 (abre la aplicacion Ollama)." }

# --- 5. App instalada ------------------------------------------------------------------
Paso "Development build en el celular"
if ((& $adb shell pm list packages $Paquete) -match $Paquete) {
    Ok "instalada ($Paquete)"
    $instalada = $true
} else {
    Aviso "NO esta instalada. Hay que instalar el APK de la development build:  adb install -r RUTA\app.apk"
    Aviso "Para generarlo (una vez): npx eas-cli login  y luego  npm run build:android:dev  (ver README)."
    $instalada = $false
}

# --- 6. Metro ------------------------------------------------------------------------------
Paso "Metro (servidor de desarrollo)"
$metro = Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($metro) {
    Ok "ya hay un servidor en el puerto 8081 (PID $($metro.OwningProcess)); se reutiliza, no se toca."
} elseif ($SinMetro) {
    Aviso "Metro apagado (-SinMetro). Para arrancarlo:  cd `"$Frontend`"; npm run start:dev"
} else {
    Start-Process powershell -WorkingDirectory $Frontend -ArgumentList "-NoExit", "-Command", "npm run start:dev"
    Ok "Metro arrancando en una ventana nueva (npm run start:dev)."
}

# --- 7. Abrir la app ---------------------------------------------------------------------------
if ($instalada) {
    Paso "Abrir la app"
    & $adb shell monkey -p $Paquete -c android.intent.category.LAUNCHER 1 2>&1 | Out-Null
    Ok "lanzada. Si muestra el selector de servidores, elige http://127.0.0.1:8081 (o 'Enter URL manually')."
}
Write-Host ""
