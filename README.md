# TiendaFlow

**De una idea a una oferta lista para vender.**

Plataforma SaaS multi-tenant para crear, lanzar y optimizar la venta de productos
digitales: producto → oferta → funnel → checkout → upsells → tracking → analytics.

---

## Arrancar en local

```bash
npm install
npm run dev          # http://localhost:3000
```

No hace falta configurar nada para empezar: la base SQLite se crea sola en
`./data/tiendaflow.db` la primera vez que arranca el servidor.

Creá tu cuenta en `/crear-cuenta` y, si querés ver la app con información
cargada, entrá a **Configuración → Datos → Cargar datos de demostración**.

### Variables de entorno

Copiá `.env.example` como `.env.local`. Todas son opcionales en desarrollo:

| Variable | Para qué sirve |
| --- | --- |
| `TIENDAFLOW_SESSION_SECRET` | Firma la cookie de sesión. **Obligatoria en producción.** |
| `TIENDAFLOW_DB_PATH` | Ubicación del archivo SQLite. |
| `ANTHROPIC_API_KEY` | Habilita la generación real con IA. Sin ella se usan borradores locales. |
| `ANTHROPIC_MODEL` | Modelo a usar (por defecto `claude-sonnet-5`). |

Ninguna de estas claves llega al navegador: se leen solo en el servidor.

---

## Qué está conectado y qué no

TiendaFlow no simula funcionalidad que no tiene. Esto es lo que hay hoy:

| Área | Estado |
| --- | --- |
| Autenticación, sesiones, recuperación de contraseña | **Funciona** (scrypt + cookie firmada HMAC) |
| Productos, ofertas, bonos, bumps, upsells, downsells | **Funciona** (CRUD completo) |
| Funnels, pasos, landings, editor visual | **Funciona** |
| Checkout público, órdenes, clientes, entrega | **Funciona** |
| Analytics, atribución UTM, insights | **Funciona** (sobre datos reales del workspace) |
| IA (producto, oferta, landing, anuncios, análisis) | **Funciona**; sin `ANTHROPIC_API_KEY` genera borradores locales y lo avisa en la UI |
| Cobros con Stripe / Mercado Pago | **Integración implementada**, requiere tus credenciales |
| Meta Pixel + API de Conversiones | **Integración implementada**, requiere tu Pixel ID y token |
| Almacenamiento de archivos | **No conectado.** Se registra nombre/tipo/peso, no el binario |
| Envío de emails | **No conectado.** La UI lo indica en cada punto donde haría falta |
| Verificación de dominios y SSL | **No conectado.** Se muestran los registros DNS; ningún dominio figura activo sin verificar |
| Facturación de la suscripción | **No conectada.** Podés cambiar de plan, no se cobra nada |

Cuando algo depende de una integración que no está configurada, la aplicación lo
dice explícitamente en vez de mostrar un cero o un éxito falso. Ejemplos:

- El ROAS aparece como `—` con la leyenda "Conectá Meta para medir inversión",
  no como `0.00x`.
- Si no hay proveedor de pago, el checkout guarda el pedido como **pendiente** y
  lo informa. Nunca marca una venta como pagada sin confirmación del proveedor.
- Todo contenido generado sin proveedor de IA aparece con el cartel
  "Borrador local, no generado por IA".

---

## Arquitectura

```
src/
├─ app/
│  ├─ (auth)/            ingresar · crear-cuenta · recuperar · restablecer
│  ├─ (app)/app/         panel privado (dashboard, productos, ofertas, funnels…)
│  ├─ actions/           server actions, agrupadas por dominio
│  ├─ f/[slug]/          páginas públicas del funnel (landing, checkout, upsells, gracias)
│  ├─ acceso/[token]/    página de acceso del comprador
│  ├─ bienvenida/        onboarding
│  └─ page.tsx           sitio de marketing
├─ components/
│  ├─ ui/                design system (botones, tablas, gráficos, toasts…)
│  ├─ shell/             sidebar, topbar, copiloto, búsqueda global
│  ├─ landing/           renderizador de secciones (editor + página pública)
│  └─ public/            pixel y tracker de visitas
└─ lib/
   ├─ db/                conexión SQLite + schema
   ├─ repo.ts            capa de acceso a datos (todo filtrado por workspace)
   ├─ auth.ts            hashing, sesiones, contexto autenticado
   ├─ analytics.ts       métricas derivadas de datos reales
   ├─ insights.ts        reglas de los insights del dashboard
   ├─ launch.ts          estado de Modo Lanzamiento y validaciones de publicación
   ├─ seed.ts            datos de demostración (marcados con is_demo)
   ├─ ai/                abstracción de proveedores de IA + tareas
   └─ integrations/      Meta (Pixel + CAPI) y proveedores de pago
```

### Multi-tenancy

Un usuario pertenece a un workspace, y **todo** cuelga del workspace: productos,
ofertas, funnels, clientes, órdenes, analytics, integraciones y dominios.

La garantía se aplica en dos lugares:

1. **`src/lib/repo.ts`** — toda función recibe `workspaceId` como primer
   argumento y lo incluye en el `WHERE`. Ninguna consulta puede devolver filas de
   otro workspace.
2. **`supabase/schema.sql`** — el equivalente Postgres trae Row Level Security
   por workspace, para que la garantía la aplique la base aunque una consulta se
   olvide del filtro.

Las páginas públicas del funnel no tienen sesión: resuelven el workspace desde el
slug del funnel, nunca desde datos enviados por el cliente. Los precios del
checkout se re-leen de la base antes de crear la orden.

### Base de datos

En desarrollo se usa **SQLite** a través del módulo `node:sqlite` de Node 22 — sin
dependencias nativas ni servicios externos. El schema vive en
`src/lib/db/schema.sql`.

Para desplegar sobre **Supabase / Postgres** está `supabase/schema.sql`, con las
mismas entidades más las policies de RLS. Ejecutalo con:

```bash
psql "$DATABASE_URL" -f supabase/schema.sql
```

Las 28 entidades del modelo: `users`, `workspaces`, `workspace_members`,
`sessions`, `password_reset_tokens`, `products`, `product_files`, `offers`,
`bonuses`, `order_bumps`, `upsells`, `downsells`, `funnels`, `funnel_steps`,
`landing_pages`, `landing_sections`, `customers`, `orders`, `order_items`,
`payments`, `campaigns`, `attribution_events`, `analytics_events`, `affiliates`,
`affiliate_links`, `commissions`, `integrations`, `domains`, `ai_generations`,
`subscriptions`, `notifications`.

### Capa de IA

`src/lib/ai/provider.ts` define la abstracción; `src/lib/ai/tasks.ts` define cada
tarea con su prompt, su esquema esperado y un **borrador local** construido con
los datos que ya cargó el usuario.

Con `ANTHROPIC_API_KEY` configurada, las tareas se resuelven contra el modelo.
Sin ella (o si el proveedor falla), se degrada al borrador local y devuelve
`isTemplate: true`, que la UI muestra como una advertencia visible. Agregar otro
proveedor es implementar el backend y registrarlo: el resto de la app no cambia.

Toda generación queda registrada en `ai_generations`.

### Seguridad

- Contraseñas con `scrypt` y salt por usuario; comparación en tiempo constante.
- Cookie de sesión `httpOnly`, `sameSite=lax`, `secure` en producción, firmada
  con HMAC-SHA256. El servidor se niega a arrancar en producción sin
  `TIENDAFLOW_SESSION_SECRET`.
- Login y recuperación devuelven el mismo mensaje exista o no la cuenta.
- Las credenciales de integraciones se guardan en `secret_config`, separadas de
  la configuración pública, y nunca se serializan al cliente.
- Toda server action valida entrada y devuelve errores en español; los errores
  inesperados se loguean en el servidor y devuelven un mensaje genérico.
- Los tokens de acceso a órdenes son aleatorios de 18 bytes y se verifican en
  cada paso del funnel post-compra.

---

## Recorrido del producto

```
Registro → Onboarding → Producto → Oferta → Bonos → Order bump → Upsell
   → Landing (IA) → Funnel → Checkout → Pagos → Tracking → Lanzamiento
   → Analytics → Optimización con IA
```

Cada pantalla empuja a la siguiente: al crear un producto te ofrece armar la
oferta; al publicar la oferta, el funnel; al terminar el funnel, el tracking y el
lanzamiento. **Modo Lanzamiento** (`/app/lanzamiento`) muestra los 8 pasos con su
estado real y exactamente qué falta en cada uno.

---

## Comandos

```bash
npm run dev         # desarrollo
npm run build       # build de producción
npm run start       # servidor de producción
npm run typecheck   # TypeScript sin emitir
npm run smoke       # test end-to-end en navegador (requiere el server levantado)
```

El smoke test (`scripts/smoke.mjs`) recorre el journey completo en Chromium:
registro, onboarding, creación de producto, oferta con IA, funnel, landing,
publicación, compra pública desde un contexto limpio, y las 16 pantallas del
panel.

---

## Accesibilidad y responsive

HTML semántico, navegación por teclado en menús y modales, `aria-*` en controles
compuestos, foco visible en toda la app y respeto por `prefers-reduced-motion`.

El panel es responsive con sidebar colapsable; las páginas públicas están
optimizadas para mobile —la mayor parte del tráfico de Meta Ads llega desde el
celular— con CTA fijo en el borde inferior, texto grande y controles amplios.
