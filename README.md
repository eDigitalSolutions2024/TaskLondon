# London Cafe CDJ — Rutinas Operativas

Manual operativo interactivo estructurado como **Rutina → Sección → Actividad → Evidencia**, no una lista plana de tareas.

## Estructura del proyecto

```
backend/      API REST (Node.js + Express + MongoDB)
admin-web/    Panel de administración (React + Vite) — crear/editar rutinas, secciones y actividades
mobile-app/   App de empleados (React Native + Expo) — ejecutar rutinas, cámara
```

## Modelo de datos

Colecciones separadas relacionadas por ID (ver `backend/src/models/`):

- **Establishment** — sucursal (ej. London Cafe CDJ)
- **User** — admin o employee, pertenece a una sucursal
- **Routine** — plantilla de rutina (Apertura, Operación, Cierre...)
- **RoutineSection** — sección dentro de una rutina, con `order` y `required`
- **Task** — actividad dentro de una sección, con `type` (checkbox, confirmation, temperature, quantity, selection, text, photo, photo_confirmation), `order`, `required`, `requiresPhoto`, `requiresComment`, `config`
- **RoutineRun** — una ejecución concreta de una rutina en un día
- **SectionRun** — progreso de una sección dentro de un run
- **TaskResult** — respuesta a una actividad dentro de un run
- **Incident** — incidencia reportada a nivel de actividad o de sección

## Levantar el backend

```bash
cd backend
cp .env.example .env    # ajustar MONGO_URI si es necesario
npm install
npm run seed             # carga datos de ejemplo (Apertura/Operación/Cierre)
npm run dev               # http://localhost:4000
```

Requiere MongoDB corriendo localmente (o ajustar `MONGO_URI` en `.env` a un cluster remoto).

Usuarios de prueba tras `npm run seed`:
- Admin: Nombre `Admin London Cafe CDJ` (sin contraseña requerida)
- Empleado: Nombre `Juan Pérez` (sin contraseña requerida)

## Levantar el panel de administración

```bash
cd admin-web
cp .env.example .env    # VITE_API_URL=http://localhost:4000
npm install
npm run dev
```

## Levantar la app de empleados

```bash
cd mobile-app
npm install
npx expo start
```

Ajustar la URL de la API en la configuración de Expo (`app.json` → `extra.apiUrl` o variable de entorno equivalente) para que apunte al backend (usar la IP de la máquina si se prueba en un dispositivo físico, no `localhost`).

## Flujo funcional

1. El administrador crea rutinas, secciones y actividades desde `admin-web` (sin tocar código).
2. El empleado abre `mobile-app`, ve las "Rutinas de hoy" con su progreso, entra a una rutina y navega por secciones.
3. Cada actividad se responde según su tipo y guarda evidencia (foto, comentario, valor).
4. El empleado puede reportar incidencias a nivel de actividad o de sección.
5. Al completar todas las secciones obligatorias, se muestra el resumen de la rutina y se puede finalizar.

## Pendiente para siguientes iteraciones

- Tests automatizados (backend y frontend).
- Migrar almacenamiento de fotos de disco local a S3/almacenamiento en la nube.
- Drag & drop real para reordenar secciones/actividades en el panel admin (hoy es con botones subir/bajar).
- Notificaciones push para recordar rutinas pendientes.
