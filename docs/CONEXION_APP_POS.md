# Guía: Conectar mobile-app a SU backend (TaskLondon/backend)

Contexto completo de lo que se hizo y lo que falta, para retomar en cualquier momento.

## ⚠️ CORRECCIÓN IMPORTANTE (leer primero)

Al inicio de este trabajo se asumió, **erróneamente**, que `mobile-app` era la app del POS y que `TaskLondon/backend` era una versión vieja/simplificada de ese mismo POS. **Eso es incorrecto.**

La realidad, confirmada revisando el código:

- **`mobile-app`** es una app de **checklists / rutinas operativas** (rutinas, tareas, fotos de confirmación, incidencias, "establishments"). No tiene nada que ver con pedidos, mesas o cobros.
- **`TaskLondon/backend`** es su backend **correcto y real** — tiene exactamente las rutas que la app consume: `/auth`, `/establishments`, `/routines`, `/sections`, `/tasks`, `/runs`, `/incidents`, `/upload`.
- **`LondonApp/LondonCafe`** es un sistema **totalmente distinto**: el POS de caja/pedidos/mesas/inventario. No comparte base de datos ni rutas con `mobile-app`. Si `mobile-app` apunta ahí, el login y todo lo demás fallará porque esas rutas no existen en el POS.

**Por lo tanto: `mobile-app` debe apuntar siempre a `TaskLondon/backend`, nunca a `LondonApp`.** Todo lo de abajo que mencione "backend" se refiere a `TaskLondon/backend`.

## 1. Mapa de proyectos en el equipo

Hay **tres proyectos distintos** en el Escritorio, no confundirlos:

| Carpeta | Qué es | Usar con mobile-app? |
|---|---|---|
| `Desktop/TaskLondon/backend` | Backend real de la app de checklists/rutinas (Node+Express+Mongo) | **Sí, este es el correcto** |
| `Desktop/TaskLondon/mobile-app` | App móvil de checklists/rutinas | — |
| `Desktop/LondonApp/LondonCafe` | Clon del **POS real** (pedidos, mesas, caja, inventario), monorepo con `apps/api` y `apps/web` (interfaz de caja/mesero con impresoras — **NO tocar/borrar**, probablemente en uso real) | **No** — sistema aparte, sin relación con mobile-app |
| Producción en AWS | Ahí vive (o debería vivir) el backend real de checklists, en uso por el negocio | Con cuidado |

`TaskLondon/admin-web` (panel viejo sin usar, del proyecto de checklists) **ya se borró** y se subió (push) a ambos repos remotos.

## 2. Cómo la app móvil decide a qué backend conectarse

Código clave: `mobile-app/src/api/client.ts` líneas 6-14. Orden de prioridad:

1. Variable de entorno `EXPO_PUBLIC_API_URL` (de `mobile-app/.env`) — **gana siempre si existe**.
2. `app.json → expo.extra.apiUrl` (actualmente tiene un **placeholder**: `https://api.londoncafecdj.com`, con nota de que hay que reemplazarlo).
3. Si nada existe, cae a `http://localhost:4000` (solo sirve en emulador, no en celular físico).

### Diferencia clave entre modo prueba (Expo Go) y app instalada (build):
- **Expo Go / `npx expo start`**: lee `.env` en caliente, puedes cambiarlo y reiniciar sin recompilar.
- **App compilada/instalable (`eas build`)**: la URL queda **grabada dentro del build**. Si cambias el `.env` después de compilar, no sirve de nada — hay que recompilar.

## 3. ⚠️ Pendiente crítico: confirmar la URL real de AWS

Se encontraron **dos dominios distintos** mencionados en el código, y no se sabe cuál es el real:
- `app.json` (placeholder, NO usar tal cual): `https://api.londoncafecdj.com`
- Comentario en `LondonApp/LondonCafe/apps/api/src/index.ts` (mencionaba `POS_URL` de la app real): `api.londoncafejrz.com`

**Antes de continuar, hay que confirmar cuál es el dominio/IP pública correcta del backend en AWS.** No usar ninguno de los dos a ciegas.

## 4. Cómo probar TODO en local (sin tocar AWS)

Esto ya se dejó funcionando una vez (los procesos se detienen al cerrar sesión, hay que repetir estos pasos):

### 4.1 MongoDB local
Ya está instalado como servicio de Windows. Si está detenido:
```powershell
# PowerShell como Administrador
Start-Service MongoDB
Get-Service MongoDB   # debe decir "Running"
```

### 4.2 Backend correcto de mobile-app (TaskLondon/backend)
```bash
cd "C:\Users\User\Desktop\TaskLondon\backend"
npm install
npm run dev                     # levanta en http://localhost:4000 (nodemon)
```
Verificar que responde:
```bash
curl http://localhost:4000/health
# debe devolver: {"ok":true}
```

Nota: existe también un `npm run seed` (`node src/seed.js`) para poblar datos de prueba si la base está vacía.

#### ⚠️ Error común: `EADDRINUSE: address already in use 0.0.0.0:4000`

Significa que **ya hay algo corriendo en el puerto 4000** (puede ser un backend que quedó abierto de una sesión anterior, tuyo o de un asistente). No es un error real del código, solo un choque de puerto. Pasos para diagnosticar y resolver (PowerShell):

**1. Primero, revisa si en realidad ya está funcionando** (a veces no hace falta matar nada):
```powershell
curl http://localhost:4000/health
```
Si responde `{"ok":true}`, ya tienes un backend sano corriendo — no necesitas hacer más nada, solo úsalo.

**2. Si quieres saber qué proceso ocupa el puerto:**
```powershell
netstat -ano | findstr :4000
```
Devuelve algo como:
```
TCP    0.0.0.0:4000    0.0.0.0:0    LISTENING    2948
```
El último número (`2948` en el ejemplo) es el **PID** del proceso.

**3. (Opcional) Verifica qué es antes de matarlo:**
```powershell
Get-Process -Id 2948
```
Debería ser `node`. Si es otra cosa completamente distinta, investiga antes de matarlo.

**4. Mátalo:**
```powershell
taskkill /F /PID 2948
```

**5. Confirma que el puerto quedó libre:**
```powershell
netstat -ano | findstr :4000
```
Si no devuelve nada, ya está libre — corre `npm run dev` de nuevo.

**Nota sobre `nodemon`:** a veces al detener un proceso de `nodemon` (con Ctrl+C o matándolo desde fuera) puede quedar un proceso **hijo** de Node vivo, ocupando el puerto igual. Si después de matar el PID de `netstat` el error persiste, repite el paso 2 — puede aparecer un PID distinto (el hijo) y hay que matarlo también.

(Nota histórica: en un punto de este trabajo se levantó por error el backend del POS en `LondonApp/LondonCafe/apps/api` pensando que era el mismo proyecto. Ese backend **no sirve para mobile-app** — ver sección de corrección arriba. Si en algún momento se necesita levantar el POS real por otra razón, sus pasos eran: `cd LondonApp/LondonCafe && npm install --workspaces`, luego `cd apps/api && npm run seed && npm run dev`. Ojo: instalar `npm install` directo dentro de `apps/api` sin pasar por la raíz del monorepo rompe el hoisting de dependencias como `basic-ftp`.)

### 4.3 Encontrar tu IP local
```powershell
ipconfig
# Buscar "Dirección IPv4" del adaptador activo (Ethernet o Wi-Fi)
```
La IP usada la última vez fue `192.168.1.162` (puede cambiar si cambias de red).

### 4.4 Configurar mobile-app/.env (modo local)
Archivo `mobile-app/.env` (no existía, se creó nuevo; no está en git por `.gitignore`):
```
EXPO_PUBLIC_API_URL=http://TU_IP_LOCAL:4000
```

### 4.5 Levantar la app móvil
```bash
cd "C:\Users\User\Desktop\TaskLondon\mobile-app"
npm install
npx expo start
```
- Escanear el QR con la app **Expo Go** en el celular.
- El celular y la PC deben estar en la **misma red** (WiFi o LAN).
- Si el QR no aparece (por ejemplo corriendo en segundo plano/background), se puede entrar manualmente en Expo Go a: `exp://TU_IP_LOCAL:8081`

## 5. Cómo pasar a modo producción (AWS) — patrón recomendado

Usar el patrón de "URLs intercambiables" en el mismo `.env`, comentando la que no se use:

```
# --- PRODUCCIÓN (AWS) ---
EXPO_PUBLIC_API_URL=https://DOMINIO-REAL-CONFIRMADO

# --- LOCAL (backend clonado en LondonApp) ---
# EXPO_PUBLIC_API_URL=http://192.168.1.162:4000
```

Para alternar: comentar una línea y descomentar la otra con `#`, nunca las dos activas a la vez.

## 6. Para que la app funcione "desde cualquier lugar" e instalable (fuera de Expo Go)

1. Confirmar la URL real de AWS (paso 3).
2. Poner esa URL en `.env` como activa (paso 5) **antes** de compilar.
3. Compilar con EAS (ya hay `eas.json` configurado en `mobile-app`):
   ```bash
   cd "C:\Users\User\Desktop\TaskLondon\mobile-app"
   eas build --platform android   # o ios
   ```
4. Esto genera un instalable (APK/IPA o link de descarga) que ya trae la URL de AWS grabada — funciona con datos móviles, sin necesidad de estar en la misma red que la PC.

## 7. Precauciones (sistema en producción, uso real del negocio)

- **Nunca** apuntar pruebas destructivas (borrar productos, mesas, ventas de prueba) contra la URL de AWS — ahí hay datos reales del negocio.
- Antes de probar contra AWS, idealmente hacer pruebas de solo lectura primero (login, ver menú) antes de flujos que escriban datos (crear orden, cobrar).
- No se ha tocado nada de AWS ni de la base de datos de producción hasta este punto — todo lo hecho fue en entorno local aislado.
- `apps/web` dentro de `LondonApp/LondonCafe` **no se debe borrar** — es la interfaz de caja usada con impresoras físicas, muy probablemente en uso activo del negocio.

## 8. Estado de los repos de Git

- Remoto `edigital` → `https://github.com/eDigitalSolutions2024/TaskLondon.git`
- Remoto `origin` → `https://github.com/jose-esquivel-dev/TaskLondon_Dev.git`
- Ambos están sincronizados al mismo commit tras borrar `admin-web`.
- El archivo `mobile-app/.env` con la IP local **no se sube a git** (ignorado), así que cada quien configura el suyo.

## 9. Historial con fotos (modo solo-lectura) — implementado

El admin ahora puede, desde la pestaña **Historial** de la app móvil, tocar cualquier rutina de cualquier día y ver, tarea por tarea, el estado (Bien/Falla/N/A), el comentario y las fotos de evidencia reales de ESE día — antes esto no funcionaba (ver bug abajo).

**Archivos tocados:**
- `mobile-app/src/navigation/types.ts` — se agregó `historyRunId` y `readOnly` a los params de navegación.
- `mobile-app/src/screens/HomeScreen.tsx` — al tocar una rutina del historial, ahora manda el `runId` real de esa ejecución + `readOnly: true`. También se agregó paginación del historial de 4 en 4 días (botón "Ver 4 días más", tope 91 días).
- `mobile-app/src/screens/RoutineDetailScreen.tsx` — si recibe `historyRunId`, carga esa ejecución puntual con `getRun` directo (antes SIEMPRE usaba `startRun`, que trae/crea la rutina de HOY sin importar qué día tocaras — ese era el bug original de fondo). Oculta botones de edición/incidencias en modo lectura.
- `mobile-app/src/screens/SectionDetailScreen.tsx` — propaga `readOnly` a cada tarea, oculta botones de incidencia.
- `mobile-app/src/components/task-inputs/StandardTaskInput.tsx` — nueva vista de solo lectura por tarea (badge de estado + comentario + fotos), sin botones de edición.
- `mobile-app/src/components/PhotoViewerModal.tsx` (nuevo) — visor de foto a pantalla completa, se abre al tocar cualquier miniatura (tanto en historial como al subir una foto nueva).

### 🐛 Bug encontrado y corregido: "tarjeta en blanco" en el Historial

**Síntoma:** al abrir una rutina completada desde el Historial, cada tarea mostraba el título pero la tarjeta se veía enorme y en blanco hacia abajo, bloqueando el scroll (se alcanzaba a ver el inicio de la siguiente tarea pero no se podía seguir bajando bien).

**Causa real:** en `StandardTaskInput.tsx`, la vista de solo-lectura reutilizó el estilo `photoThumb` (`width: "100%", height: "100%"`) para mostrar la miniatura de la foto, PERO sin envolverlo en un contenedor de tamaño fijo (a diferencia del modo edición, que sí usa `photoThumbWrapper` de 90x90). Un `Image` con `height: "100%"` sin un padre con altura definida se expande sin control en React Native — eso generaba el bloque gigante en blanco.

**Fix:** se agregó `readOnlyPhotoThumbWrapper` (90x90, con `overflow: hidden`) como contenedor de la miniatura en modo lectura, igual que ya existía para el modo edición. Confirmado con `npx tsc --noEmit` sin errores.

**Cómo se diagnosticó:** no había datos completados en la BD local para reproducir, así que se simuló el flujo completo vía `curl` directo al backend (login → iniciar rutina real "Apertura" → completar sus 17 tareas con foto/comentario → finalizar) para confirmar que el backend entregaba los datos perfectamente (`value`, `comment`, `photoUrl`, `photoUrls` todos presentes) — eso descartó el backend y apuntó a un bug puramente de renderizado en el frontend.
