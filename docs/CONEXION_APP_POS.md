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
