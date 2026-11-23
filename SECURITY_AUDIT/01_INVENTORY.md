# 01 — Inventario de Activos y Superficie de Ataque

## 1. Resumen del Entorno Auditado
Repositorio principal: `TesorApp` (monorepo de plataforma contable y financiera multi-congregacional).

| Aplicación / Componente | Ruta en Repositorio | Tecnologías Principales | Estado | Hosting / Infraestructura |
| :--- | :--- | :--- | :--- | :--- |
| **TesorApp Backend API** | `backend/` | NestJS 10, TypeScript 5.3, Prisma ORM 5.10, Passport-JWT, bcryptjs, expr-eval, ExcelJS | Producción | Vercel Serverless (`backend-zeta-rouge-39.vercel.app`) |
| **TesorApp Frontend Desktop** | `frontend-desktop/` | React 18, TypeScript 5.2, Vite 5.1, Tailwind CSS 3.4, Axios, Chart.js, ExcelJS, jsPDF | Producción | Vercel Static/Edge (`tesor-app-nine.vercel.app`) |
| **TesorApp Frontend Mobile (PWA)** | `frontend-mobile/` | React 18, TypeScript 5.2, Vite 5.1, Tailwind CSS 3.4, Axios | Producción / Secundaria | Vercel Static/Edge (rewrites hacia backend) |
| **Base de Datos** | `backend/prisma/schema.prisma`, `supabase/` | PostgreSQL gestionado en Supabase (Connection Pooler PgBouncer) | Producción | Supabase Cloud |
| **Automatización Keepalive & CI** | `.github/workflows/`, `scripts/keepalive.js` | GitHub Actions, Node.js | Producción | GitHub Actions |

## 2. Modelos de Datos y Activos Sensibles
- **Identidad y Acceso**: `Usuario` (`id`, `correo`, `contrasena_hash`, `rol` [`tesorero`, `secretario`, `iglesia`, `presbitero`], `iglesia_id`, `activo`).
- **Estructura Organizacional**: `Iglesia`, `Tabla`, `CamposPorTabla`, `PermisoEdicion`.
- **Operación Financiera**: `Periodo`, `CampoPlantilla` (fórmulas, redondeo, acumulables, fondos/tránsito), `Valor`, `InformePeriodo`, `Gasto`, `IngresoFondo`.
- **Auditoría**: `HistorialCambios`.

## 3. Superficies de Ataque Identificadas
1. **API REST Pública (HTTPS)**:
   - Autenticación: `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`.
   - Operación Contable: `/valores/*`, `/iglesias/*`, `/campos/*`, `/tablas/*`, `/periodos/*`, `/permisos/*`, `/informes/*`.
   - Fondos y Reportes: `/gastos/*`, `/reportes/*` (incluyendo exportación Excel), `/historial`.
   - Asistente Analítico: `POST /ai/copilot`.
   - Salud/Keepalive: `GET /health`, `GET /ping`.
2. **Frontend SPA (Desktop & Mobile)**:
   - Landing Page pública y modal de autenticación.
   - Almacenamiento de token JWT en `localStorage`.
   - Evaluación de expresiones matemáticas en cliente (`useFormulaEvaluation.ts`).
3. **Infraestructura y Base de Datos**:
   - Cabeceras HTTP en Vercel, políticas CORS, conexión PostgreSQL/Supabase y funciones `SECURITY DEFINER`.
