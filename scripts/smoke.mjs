/**
 * Smoke test end-to-end de TiendaFlow.
 *
 * Recorre el journey completo del producto en un navegador real:
 * registro → onboarding → producto → oferta → bonos/bump/upsell → funnel →
 * landing con IA → publicación → checkout público → upsell → gracias.
 *
 * Uso: node scripts/smoke.mjs   (con el server escuchando en BASE_URL)
 */

import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const EMAIL = `smoke_${Date.now()}@ejemplo.test`;
const PASSWORD = "tiendaflow2026";

const steps = [];
let failures = 0;

async function step(name, fn) {
  const started = Date.now();
  try {
    await fn();
    steps.push({ name, ok: true, ms: Date.now() - started });
    console.log(`  ✓ ${name} (${Date.now() - started}ms)`);
  } catch (error) {
    failures += 1;
    steps.push({ name, ok: false, ms: Date.now() - started, error: String(error) });
    console.log(`  ✗ ${name}\n    ${String(error).split("\n")[0]}`);
  }
}

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
/**
 * Bloqueamos hosts externos (fuentes, pixel de Meta): no aportan al test y en
 * un entorno sin salida directa a internet dejan la carga colgada.
 */
async function blockExternal(ctx) {
  await ctx.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith("http://localhost") || url.startsWith("data:")) return route.continue();
    return route.abort();
  });
}

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await blockExternal(context);
const page = await context.newPage();

const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(`pageerror: ${error.message}`));

console.log(`\nTiendaFlow smoke test → ${BASE}\n`);

await step("Landing pública carga", async () => {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /lista para vender/i }).first().waitFor({ timeout: 15000 });
});

await step("Registro de usuario", async () => {
  await page.goto(`${BASE}/crear-cuenta`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="full_name"]', "Camila Smoke");
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/bienvenida", { timeout: 20000 });
});

await step("Onboarding en 3 pasos", async () => {
  await page.getByRole("button", { name: /Tengo un ebook/i }).click();
  await page.getByRole("button", { name: /^Siguiente$/ }).click();
  await page.getByRole("button", { name: /Meta Ads/i }).click();
  await page.getByRole("button", { name: /^Siguiente$/ }).click();
  await page.getByRole("button", { name: /Crear mi producto/i }).click();
  await page.getByRole("button", { name: /^Empezar$/ }).click();
  await page.waitForURL("**/app/productos/nuevo**", { timeout: 20000 });
});

await step("Crear producto (flujo de 6 pasos)", async () => {
  await page.getByRole("button", { name: /^Siguiente$/ }).click(); // origen → info
  await page.fill('input[placeholder="Guía de Hábitos Saludables"]', "Guía Smoke Test");
  await page.fill(
    'input[placeholder="El sistema de 21 días para sostener lo que empezás"]',
    "Un subtítulo de prueba",
  );
  await page.fill('input[placeholder="14900"]', "12000");
  for (let i = 0; i < 4; i += 1) {
    await page.getByRole("button", { name: /^Siguiente$/ }).click();
    await page.waitForTimeout(120);
  }
  await page.getByRole("button", { name: /^Crear producto$/ }).click();
  await page.waitForURL(/\/app\/productos\/[0-9a-f-]{36}/, { timeout: 20000 });
});

await step("Crear oferta con propuesta de IA", async () => {
  await page.getByRole("link", { name: /Construyamos tu oferta/i }).first().click();
  await page.waitForURL(/\/app\/ofertas\/nueva/, { timeout: 20000 });
  await page.getByRole("button", { name: /Crear oferta con IA/i }).click();
  await page.getByText(/Borrador local, no generado por IA/i).first().waitFor({ timeout: 20000 });
  await page.getByRole("button", { name: /^Crear oferta$/ }).click();
  await page.waitForURL(/\/app\/ofertas\/[0-9a-f-]{36}/, { timeout: 20000 });
});

await step("La oferta trae bonos, order bump y upsell aplicados", async () => {
  const bonuses = await page.getByRole("tab", { name: /Bonos/ }).textContent();
  const bump = await page.getByRole("tab", { name: /Order bump/ }).textContent();
  const upsell = await page.getByRole("tab", { name: /Upsells/ }).textContent();
  if (!/[1-9]/.test(bonuses ?? "")) throw new Error(`Sin bonos: ${bonuses}`);
  if (!/[1-9]/.test(bump ?? "")) throw new Error(`Sin order bump: ${bump}`);
  if (!/[1-9]/.test(upsell ?? "")) throw new Error(`Sin upsell: ${upsell}`);
});

await step("Publicar oferta", async () => {
  await page.getByRole("button", { name: /Publicar oferta/i }).click();
  await page.getByText(/Oferta publicada/i).first().waitFor({ timeout: 15000 });
});

const offerUrl = page.url();

await step("Crear funnel", async () => {
  await page.goto(`${BASE}/app/funnels/nuevo`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /^Crear funnel$/ }).click();
  await page.waitForURL(/\/app\/funnels\/[0-9a-f-]{36}/, { timeout: 20000 });
  await page.getByText("Landing page").first().waitFor({ timeout: 10000 });
});

const funnelUrl = page.url().split("?")[0];

await step("Publicar sin proveedor de pago está bloqueado", async () => {
  await page.getByRole("button", { name: /Publicar funnel/i }).click();
  await page.getByText(/proveedor de pago conectado/i).first().waitFor({ timeout: 15000 });
});

await step("Conectar proveedor de pago (Mercado Pago)", async () => {
  await page.goto(`${BASE}/app/pagos`, { waitUntil: "domcontentloaded" });
  await page
    .locator("div")
    .filter({ hasText: /^Mercado Pago/ })
    .first()
    .waitFor({ timeout: 10000 });
  await page.getByRole("button", { name: /^Conectar$/ }).nth(1).click();
  await page.fill('input[name="public_key"]', "APP_USR-smoke-test-public-key");
  await page.fill('input[name="secret_key"]', "APP_USR-smoke-test-secret");
  await page.getByRole("button", { name: /Guardar credenciales/i }).click();
  await page.getByText(/Credenciales guardadas/i).first().waitFor({ timeout: 15000 });
});

await step("Configurar Meta Pixel", async () => {
  await page.goto(`${BASE}/app/integraciones/meta`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="pixel_id"]', "123456789012345");
  await page.fill('input[name="access_token"]', "EAAG-smoke-test-token");
  await page.getByRole("button", { name: /Guardar configuración/i }).click();
  await page.getByText(/Configuración guardada/i).first().waitFor({ timeout: 15000 });
});

await step("Generar landing con IA", async () => {
  await page.goto(funnelUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: /Editar página/i }).first().click();
  await page.waitForURL("**/app/landings/**", { timeout: 20000 });
  await page.getByRole("button", { name: /Generar landing con IA/i }).first().click();
  await page.getByRole("button", { name: /^Generar landing$/ }).click();
  await page.getByText(/Borrador local, no generado por IA/i).first().waitFor({ timeout: 25000 });
  const sections = await page.locator('aside ol li').count();
  if (sections < 5) throw new Error(`Se generaron solo ${sections} secciones`);
});

await step("Guardar y publicar la landing", async () => {
  await page.getByRole("button", { name: /^Publicar$/ }).click();
  await page.getByText(/Landing publicada/i).first().waitFor({ timeout: 20000 });
});

let publicUrl = "";

await step("Publicar el funnel", async () => {
  await page.goto(funnelUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Publicar funnel/i }).click();
  const link = page.getByRole("link", { name: /Ver funnel publicado/i }).first();
  await link.waitFor({ timeout: 20000 });
  publicUrl = (await link.getAttribute("href")) ?? "";
  if (!publicUrl.startsWith("/f/")) throw new Error(`URL pública inesperada: ${publicUrl}`);
});

await step("Modo Lanzamiento refleja el progreso", async () => {
  await page.goto(`${BASE}/app/lanzamiento`, { waitUntil: "domcontentloaded" });
  await page.getByText(/% listo/).first().waitFor({ timeout: 10000 });
  const text = await page.getByText(/% listo/).first().textContent();
  const value = Number((text ?? "").replace(/\D/g, ""));
  if (value < 60) throw new Error(`Progreso demasiado bajo: ${text}`);
});

/* --- Recorrido público, en una sesión limpia (como un visitante real) ---- */

const visitor = await browser.newContext({ viewport: { width: 390, height: 844 } });
await blockExternal(visitor);
const shop = await visitor.newPage();
shop.on("pageerror", (error) => consoleErrors.push(`visitante pageerror: ${error.message}`));

await step("Landing pública del funnel (mobile)", async () => {
  if (!publicUrl) throw new Error("No tenemos la URL pública del funnel");
  await shop.goto(`${BASE}${publicUrl}?utm_source=facebook&utm_medium=cpc&utm_campaign=smoke`, {
    waitUntil: "domcontentloaded",
  });
  await shop.locator("h1").first().waitFor({ timeout: 15000 });
});

await step("Ir al checkout y completar datos", async () => {
  if (!publicUrl) throw new Error("No tenemos la URL pública del funnel");
  await shop.goto(`${BASE}${publicUrl}/checkout?utm_source=facebook&utm_campaign=smoke`, {
    waitUntil: "domcontentloaded",
  });
  await shop.fill('input[name="full_name"]', "Visitante Smoke");
  await shop.fill('input[name="email"]', `comprador_${Date.now()}@ejemplo.test`);
  const bump = shop.locator('input[type="checkbox"]').first();
  if (await bump.count()) await bump.check();
  await shop.getByRole("button", { name: /Quiero mi acceso|Procesando/i }).click();
  await shop.waitForTimeout(4000);
});

await step("El checkout no simula un cobro exitoso con credenciales falsas", async () => {
  const body = await shop.locator("body").textContent();
  const failedHonestly = /No pudimos cobrar tu pedido|estado pendiente/i.test(body ?? "");
  const wentToUpsell = /Oferta única|Última oportunidad/i.test(body ?? "");
  if (!failedHonestly && !wentToUpsell) {
    throw new Error(`Estado inesperado del checkout: ${(body ?? "").slice(0, 200)}`);
  }
  if (/¡Listo! Ya es tuyo/i.test(body ?? "")) {
    throw new Error("El checkout marcó la compra como completada sin cobro real");
  }
});

await step("La orden quedó registrada en el panel del vendedor", async () => {
  await page.goto(`${BASE}/app/ventas`, { waitUntil: "domcontentloaded" });
  await page.getByText(/Visitante Smoke|TF-/).first().waitFor({ timeout: 15000 });
});

/* --- Recorrido de todas las pantallas del panel --------------------------- */

const routes = [
  "/app",
  "/app/productos",
  "/app/ofertas",
  "/app/funnels",
  "/app/landings",
  "/app/ventas",
  "/app/clientes",
  "/app/ia",
  "/app/marketing",
  "/app/analytics",
  "/app/afiliados",
  "/app/pagos",
  "/app/integraciones",
  "/app/dominios",
  "/app/configuracion",
  "/app/lanzamiento",
];

for (const route of routes) {
  await step(`Carga ${route}`, async () => {
    const response = await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
    if (!response || response.status() >= 400) {
      throw new Error(`HTTP ${response?.status()}`);
    }
    await page.locator("h1").first().waitFor({ timeout: 12000 });
  });
}

await step("Cargar datos de demostración", async () => {
  await page.goto(`${BASE}/app/configuracion`, { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: /^Datos$/ }).click();
  await page.getByRole("button", { name: /Cargar datos de demostración/i }).click();
  await page.getByText(/Datos cargados/i).first().waitFor({ timeout: 45000 });
});

await step("El dashboard muestra métricas con los datos demo", async () => {
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.getByText(/Facturación/).first().waitFor({ timeout: 15000 });
  const body = await page.locator("body").textContent();
  if (!/Demo/.test(body ?? "")) throw new Error("Los datos demo no están etiquetados como Demo");
});

await step("Analytics calcula sobre los datos demo", async () => {
  await page.goto(`${BASE}/app/analytics?rango=30d`, { waitUntil: "domcontentloaded" });
  await page.getByText(/Take rate order bump/i).waitFor({ timeout: 15000 });
});

await step("Búsqueda global encuentra el producto", async () => {
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="search"]', "Smoke");
  await page.getByText("Guía Smoke Test").first().waitFor({ timeout: 15000 });
});

await step("El copiloto responde con contexto real", async () => {
  await page.getByRole("button", { name: /TiendaFlow AI/i }).first().click();
  await page.getByRole("textbox", { name: /Mensaje para TiendaFlow AI/i }).fill("¿Por dónde arranco?");
  await page.getByRole("button", { name: /^Enviar$/ }).click();
  await page.getByText(/proveedor de IA conectado/i).first().waitFor({ timeout: 20000 });
});

await step("Cerrar sesión", async () => {
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.locator("header").getByRole("button").last().click();
  await page.getByRole("menuitem", { name: /Cerrar sesión/i }).click();
  await page.waitForURL("**/ingresar", { timeout: 15000 });
});

await step("Las rutas protegidas redirigen sin sesión", async () => {
  await page.goto(`${BASE}/app/productos`, { waitUntil: "domcontentloaded" });
  if (!page.url().includes("/ingresar")) {
    throw new Error(`No redirigió: ${page.url()}`);
  }
});

await browser.close();

console.log("\n─────────────────────────────────────────");
console.log(`${steps.length - failures}/${steps.length} pasos OK`);

const realErrors = consoleErrors.filter(
  (message) =>
    !message.includes("fbevents.js") &&
    !message.includes("facebook.net") &&
    !message.includes("favicon") &&
    !message.includes("fonts.googleapis"),
);
if (realErrors.length) {
  console.log(`\n${realErrors.length} errores de consola:`);
  for (const error of realErrors.slice(0, 12)) console.log(`  · ${error.slice(0, 200)}`);
}

process.exit(failures ? 1 : 0);
