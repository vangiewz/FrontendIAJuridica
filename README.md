# Frontend

Aplicación móvil y web del Sistema Inteligente de Asistencia Jurídica Civil Boliviana,
construida con Expo (SDK 57) + React Native + react-native-web (una sola base de código).

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run start` | Servidor de desarrollo (Metro). Con `expo-dev-client` instalado apunta a la **development build**. |
| `npm run start:dev` | Igual, explícitamente para la development build. |
| `npm run start:go` | Servidor de desarrollo para **Expo Go** (sin dictado por voz). |
| `npm run web` | Versión web. |
| `npm run typecheck` | TypeScript (`tsc --noEmit`). |
| `npm run test:logica` | Pruebas de la lógica pura (URL del backend, lectura en voz alta, idioma y errores del dictado). No necesitan dispositivo. |
| `npm run build:android:dev` | Compila la development build de Android en la nube de EAS (necesita cuenta; ver más abajo). |

## Conectar el celular con el backend

Sirve igual para Expo Go y para la development build. El celular y la PC deben estar en la **misma red**
(misma wifi, o la PC por cable al mismo router).

1. **Backend escuchando en la red local.** Por defecto `uvicorn` escucha solo en `127.0.0.1`, y desde el
   celular `localhost` es el propio celular. Arráncalo así:

   ```
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

2. **Firewall de Windows.** Sin esto el celular no llega a la PC. En PowerShell **como administrador**:

   ```
   Get-NetConnectionProfile          # ¿la red es Public o Private? (mira InterfaceAlias)
   ```

   Si la red es **Public**, cámbiala a Private (una red de casa/laboratorio de confianza), usando el
   `InterfaceAlias` que muestre el comando anterior:

   ```
   Set-NetConnectionProfile -InterfaceAlias "Ethernet 2" -NetworkCategory Private
   ```

   Y abre los dos puertos (backend y servidor de desarrollo de Expo) para redes privadas:

   ```
   New-NetFirewallRule -DisplayName "Backend juridico 8000" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow -Profile Private
   New-NetFirewallRule -DisplayName "Expo Metro 8081"       -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow -Profile Private
   ```

3. **Comprobar la conexión** desde el navegador del celular: `http://IP_DE_TU_PC:8000/api/v1/health`
   debe responder `{"status":"ok",...}`. La IP de la PC es la «Dirección IPv4» de `ipconfig`.
   Si no responde, revisa los pasos 1 y 2.

### ¿A qué servidor se conecta la app?

Hay **una sola variable**: `EXPO_PUBLIC_API_URL`.

**Ningún `.env` se versiona.** En Vercel la variable está cargada en el panel del proyecto; en
tu máquina va en un `.env` que creás vos. El archivo no existe al clonar el repo, y no hace
falta para trabajar: sin él la app se las arregla sola.

Un `.env` típico, donde se comenta una línea u otra según a dónde quieras apuntar:

```bash
# Backend de esta PC (para probar el APK en el teléfono)
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000

# Produccion
# EXPO_PUBLIC_API_URL=https://ia-juridica-api.azurewebsites.net
```

Si no hay variable, la app decide sola, en este orden:

1. **El host del servidor de Metro**, con el puerto 8000. Solo existe mientras corre
   `expo start`, así que esta rama es siempre desarrollo: el backend está en la misma PC que
   sirve la app, y el teléfono la encuentra **sin configurar nada**.
2. **Producción**, si no hay Metro. Es el caso de un APK repartido y el del build de Vercel.

**Desde el teléfono, `127.0.0.1` no sirve**: ahí esa dirección es el teléfono mismo. Si querés
apuntar a tu PC desde un APK instalado, poné la IP de la PC en la red (`ipconfig` → IPv4 del
adaptador Wi-Fi), con el teléfono en la misma red y el Firewall de Windows dejando entrar al
puerto 8000.

No hay ninguna IP escrita en el código. Con cable USB también sirve `adb reverse tcp:8000 tcp:8000`
junto con `EXPO_PUBLIC_API_URL=http://localhost:8000`.

## Levantar Android por USB con ADB

Requisitos: celular con *Depuración USB* activada, cable de datos, `adb`
(`winget install --id Google.PlatformTools -e`) y la development build instalada (ver más abajo).

```powershell
# Terminal 1 - backend (Ollama debe estar abierto)
cd ..\BackendIAJuridica
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --host 127.0.0.1 --port 8000

# Terminal 2 - frontend: ADB, reverse, comprobaciones y Metro, todo en uno
cd FrontendIAJuridica
.\scripts\start_android_usb.ps1
```

El script equivale a `adb devices`, `adb reverse tcp:8000 tcp:8000`, `adb reverse tcp:8081 tcp:8081`
y `npm run start:dev`. Abre la app **Asistencia Juridica Civil** en el celular (el script la lanza si está
instalada); si pide un servidor, `http://127.0.0.1:8081`. Si el celular sale como `unauthorized`,
acepta *Permitir depuración USB* en su pantalla.

URL del backend: por USB `EXPO_PUBLIC_API_URL=http://127.0.0.1:8000` (ya está en `.env.local`, ignorado
por git); por LAN `EXPO_PUBLIC_API_URL=http://IP_PC:8000`; sin la variable la app deduce la IP de la PC.
Tras cambiarla hay que reiniciar Metro con `-c`.

## Probar con Expo Go (sin dictado por voz)

Útil para revisar la app en general. Necesita Expo Go actualizado desde la tienda (SDK 57).

```
npm run start:go
```

Escanea el QR con Expo Go. El micrófono explica que el dictado necesita la development build; se puede
dictar con el micrófono del teclado del teléfono. La lectura de respuestas en voz alta sí funciona.

## Probar development build en Android

Expo Go no incluye el reconocimiento de voz (es código nativo), así que el dictado necesita una
**development build**: una versión de esta misma app compilada con ese código, que se conecta a Metro
como Expo Go. El proyecto ya está preparado: `expo-dev-client`, permiso de micrófono, HTTP en la red
local y `eas.json` con el perfil `development` (paquete `com.asistenciajuridica.civil`).

### Requisitos

- Node y `npm install` hecho en esta carpeta.
- Un celular Android (recomendado Android 13 o superior para el dictado sin internet).
- Una de estas dos vías para compilar:
  - **A) Sin Android SDK — EAS (en la nube).** Cuenta gratuita en <https://expo.dev>.
  - **B) Con Android SDK — local.** Android Studio, JDK 17, variable `ANDROID_HOME`, y el celular con
    «Depuración USB» conectado por cable (`adb devices` debe listarlo).

### Opción A — EAS (no necesita Android SDK)

```
npx eas-cli login
npm run build:android:dev
```

(`npm run build:android:dev` equivale a `eas build --profile development --platform android`.)

- La primera vez pregunta si crear el proyecto en EAS (responde que sí; agrega `extra.eas.projectId` y
  `owner` a `app.json`) y si generar el keystore de Android (responde que sí).
- EAS incluye los cambios sin confirmar y los archivos nuevos que no estén en `.gitignore`: no hace falta
  hacer commit para compilar.
- Al terminar (suele tardar entre 10 y 20 minutos) muestra un enlace y un QR al `.apk`.

**Instalar:** abre el enlace en el celular, descarga el APK y ábrelo. Android pedirá permitir «instalar apps
desconocidas» al navegador. También sirve `adb install ruta/al/app.apk`.

### Opción B — Local (con Android SDK)

```
npx expo run:android
```

Genera `android/` (está en `.gitignore`), compila, instala en el celular conectado y arranca Metro. Si la
ruta del proyecto es larga, Windows puede fallar por el límite de 260 caracteres: clona el repositorio en
una ruta corta (p. ej. `C:\app`).

### Levantar todo y probar

1. **Backend** (en `BackendIAJuridica`), escuchando en la red:

   ```
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

2. **Metro** para la development build (en esta carpeta):

   ```
   npm run start:dev
   ```

3. En el celular abre la app **Asistencia Juridica Civil** (la development build, no Expo Go). Aparece el
   selector de servidores de desarrollo: elige el de tu PC o usa «Enter URL manually» / escanea el QR de
   Metro. La app carga y se conecta sola al backend.
4. **Comprobar la conexión LAN:** en el asistente no debe aparecer el aviso rojo «Sin conexión con el
   servidor local». Si aparece, revisa la sección «Conectar el celular con el backend».

### Comprobar el paquete de voz en español sin conexión

El dictado usa reconocimiento **en el dispositivo** solo si el español está instalado en el teléfono.
Si no, Android usa su reconocedor del sistema, que **puede consultar servidores de Google**; la app lo avisa.

- **Desde la app:** toca el micrófono. Si dice «Reconocimiento en tu teléfono, sin internet», ya está
  instalado. Si dice «puede usar internet», toca **«Instalar español sin conexión»** y acepta el cuadro de
  descarga del sistema (necesita wifi solo esa vez).
- **A mano (Android 13+):** Ajustes → Seguridad y privacidad → Más ajustes de privacidad → *Android System
  Intelligence* → Reconocimiento de voz en el dispositivo → Español.
- **Prueba definitiva de que es local:** activa el **modo avión** (sin wifi ni datos) y dicta en el campo
  de texto. El dictado no necesita la PC, así que funciona igual; si transcribe, es reconocimiento local.
  Desactiva el modo avión antes de enviar la consulta.

### Probar el micrófono

1. Toca el 🎤 (o «Dictar mi consulta por voz»). La primera vez Android pide permiso del micrófono.
2. Aparece «Te escucho…» con el círculo que late. Di: *«¿Cuál es la diferencia entre mora e
   incumplimiento de una obligación?»* y toca **Listo** (también se detiene solo al callar).
3. «Transcribiendo…» y el texto aparece **en el campo**, con el aviso «Texto dictado: revísalo…».
   **No se envía solo.** Corrígelo si hace falta y toca Enviar.
4. Pruebas de error (la app debe seguir usable en todas): rechazar el permiso, no hablar, cancelar, ir a
   segundo plano mientras escucha. El campo de texto y el teclado funcionan siempre.

Para depurar, en la terminal de Metro aparecen líneas `[dictado] ...` (idioma elegido, si es local,
eventos del reconocedor). Solo en builds de desarrollo.

### Probar la lectura en voz alta

1. Cuando llegue una respuesta, toca **Escuchar respuesta**. Lee con la voz del teléfono; no dice
   identificadores internos ni «art.» (dice «artículo»).
2. Toca **Detener** para cortarla; el botón permite volver a reproducirla.
3. Cambia de pestaña o abre una fuente mientras suena: se detiene sola.
4. Si dice que no hay voz en español: Ajustes → Idioma y entrada → Salida de texto a voz → instala el
   español de «Servicios de voz de Google». Las voces que requieren internet se descartan a propósito.

## Voz: qué usa cada función

| Función | Cómo | Requiere |
|---|---|---|
| Leer la respuesta en voz alta | `expo-speech`: voz del propio teléfono | Funciona en Expo Go |
| Dictar la consulta | `expo-speech-recognition`: reconocedor nativo de Android | **Development build** |

Ninguna de las dos usa APIs de voz en la nube (ni OpenAI, ni Google Cloud, ni Azure, ni AWS).

## Generar el APK

Dos caminos. El de la nube no necesita instalar nada; el local te deja compilar desde Android
Studio o la consola.

### Opción A — EAS, en la nube

```bash
npx eas-cli build --profile preview --platform android
```

Tarda 10–20 minutos y devuelve un enlace de descarga. Necesita cuenta de Expo.

### Opción B — Local, con Android SDK

Requisitos: **JDK 17**, Android SDK, y **CMake 3.31.6**.

> **La versión de CMake no es opcional.** El SDK trae por defecto la 3.22.1, que incluye
> ninja 1.10.2 — una versión que no sabe manejar rutas de más de 260 caracteres en Windows. El
> codegen C++ de React Native genera rutas de ~367, así que el build muere con
> `ninja: error: ... Filename longer than 260 characters`, aunque tengas `LongPathsEnabled=1`
> en el registro. El soporte llegó en ninja 1.11, que viene con CMake 3.31.
>
> Se instala una vez, desde el SDK Manager de Android Studio (pestaña *SDK Tools* → *Show
> Package Details* → CMake 3.31.6) o por consola:
>
> ```bash
> sdkmanager "cmake;3.31.6"
> ```
>
> El proyecto ya pide esa versión en `app.json` (`expo-build-properties` →
> `android.cmakeVersion`), así que no hay que configurar nada más.

```bash
npx expo prebuild --clean --platform android
cd android
./gradlew assembleRelease      # en Windows: .\gradlew assembleRelease
```

El APK queda en `android/app/build/outputs/apk/release/`.

Para trabajarlo desde Android Studio, abrí la carpeta **`android/`**, no la raíz del proyecto.

La carpeta `android/` **no se versiona**: la genera `expo prebuild` a partir de `app.json`. Si
algo se ve raro (permisos viejos, configuración que no toma), `--clean` la regenera de cero.

### Firmar el release

`plugins/withReleaseSigning.js` hace que un `assembleRelease` **nunca** se firme con la clave de
debug. Necesita un archivo `android-release.properties` en la raíz del proyecto (está en el
`.gitignore`, no se sube):

```properties
storeFile=C:/ruta/a/tu/keystore.jks
storePassword=...
keyAlias=...
keyPassword=...
```

Si preferís tenerlo fuera del repo, apuntá la variable de entorno `ANDROID_RELEASE_PROPERTIES`
a su ruta. Si no existe ninguno de los dos, el build de release falla con un mensaje que explica
qué falta — a propósito, para que nunca salga un APK firmado con debug.

Para una prueba rápida sin keystore, `./gradlew assembleDebug` no necesita nada de esto.

## Despliegue PWA (Web)

La app puede desplegarse en Vercel como PWA con soporte offline y notificaciones de actualización.

### Construcción

El proceso de build, definido en `vercel.json`, ejecuta tres pasos en orden:

1. `npx expo export -p web` — compila la web a `dist/`.
2. `node scripts/inyectar-pwa.mjs` — agrega al `dist/index.html` el enlace al manifiesto, el
   `theme-color` y el `apple-touch-icon`. Hace falta porque Expo **ignora `app/+html.tsx`** en
   modo SPA, que es el que usa este proyecto.
3. `npx workbox generateSW workbox-config.js` — genera el service worker con el precache del
   shell. **No cachea `/api/v1/**`**: los datos los maneja la caché de TanStack Query.

### Pruebas

Para probar la PWA offline en tu máquina:
```bash
npx expo export -p web
node scripts/inyectar-pwa.mjs
npx workbox generateSW workbox-config.js
npx serve dist
```
1. Abre `http://localhost:3000` en el navegador.
2. Abre las herramientas de desarrollo > Application > Service Workers (debería aparecer `sw.js` activo).
3. Apaga la red del navegador (Network > Offline) y recarga la página: la app debe cargar mostrando el banner de "Sin conexión".
