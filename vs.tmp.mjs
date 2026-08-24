import { chromium } from "playwright";

const BASE = "http://localhost:6601";
const OUT = process.env.OUT;

const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await context.newPage();

const errs = [];
page.on("pageerror", (e) => errs.push(e.message.split("\n")[0]));

async function paso(n, fn) {
  try {
    await fn();
    console.log(`  ok  ${n}`);
  } catch (e) {
    console.log(`  FALLA  ${n}\n      ${String(e).split("\n")[0]}`);
  }
}

await paso("cuenta nueva", async () => {
  await page.goto(`${BASE}/crear-cuenta`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="full_name"]', "Pago Real");
  await page.fill('input[name="email"]', `pago_${Date.now()}@ejemplo.test`);
  await page.fill('input[name="password"]', "tiendaflow2026");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(bienvenida|app)/, { timeout: 30000 });
});

await paso("Configuración → Plan", async () => {
  await page.goto(`${BASE}/app/configuracion`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await page.getByText(/^Plan$/).first().click();
  await page.waitForTimeout(2500);
});

await paso("Pasar a Creator → checkout de Stripe", async () => {
  await page.getByRole("button", { name: /Pasar a Creator/i }).first().click();
  // El toast dura unos segundos: hay que mirarlo antes de que se vaya.
  for (const espera of [1200, 1200, 1200]) {
    await page.waitForTimeout(espera);
    const toast = await page
      .locator('[role="status"], [role="alert"]')
      .allInnerTexts()
      .catch(() => []);
    if (toast.length) {
      console.log("      TOAST:", toast.join(" | ").replace(/\s+/g, " ").slice(0, 300));
      await page.screenshot({ path: `${OUT}/s-toast.png` });
      break;
    }
    if (/checkout\.stripe\.com/.test(page.url())) break;
  }
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });
  console.log(`      URL: ${page.url().slice(0, 60)}…`);
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${OUT}/s-checkout.png` });

  const texto = await page.locator("body").innerText();
  for (const esperado of ["TiendaFlow Creator", "9,00"]) {
    if (!texto.includes(esperado)) {
      console.log(`      OJO: no encontré "${esperado}" en el checkout`);
    } else {
      console.log(`      ✓ el checkout dice "${esperado}"`);
    }
  }
});

await paso("pagar con tarjeta de prueba", async () => {
  // 4242… es la tarjeta de prueba de Stripe: aprueba siempre, no mueve plata.
  await page.fill('input[name="email"]', "pago.prueba@ejemplo.test").catch(() => {});
  await page.fill('input[name="cardNumber"]', "4242424242424242");
  await page.fill('input[name="cardExpiry"]', "12 / 34");
  await page.fill('input[name="cardCvc"]', "123");
  await page.fill('input[name="billingName"]', "Pago Prueba");
  const pais = page.locator('select[name="billingCountry"]');
  if (await pais.count()) await pais.selectOption("AR").catch(() => {});
  const cp = page.locator('input[name="billingPostalCode"]');
  if (await cp.count()) await cp.fill("1414").catch(() => {});

  await page.screenshot({ path: `${OUT}/s-form.png` });
  await page.getByTestId("hosted-payment-submit-button").click();
  await page.waitForURL(/localhost:6601/, { timeout: 60000 });
  console.log(`      volvió a: ${page.url()}`);
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${OUT}/s-vuelta.png` });
});

await paso("el plan quedó activo", async () => {
  await page.goto(`${BASE}/app/configuracion`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await page.getByText(/^Plan$/).first().click();
  await page.waitForTimeout(3000);
  const texto = await page.locator("body").innerText();
  const plan = texto.match(/PLAN ACTUAL\s*\n\s*(\w+)/i)?.[1] ?? "?";
  console.log(`      plan actual: ${plan}`);
  await page.screenshot({ path: `${OUT}/s-plan.png` });
});

console.log("\nErrores:", errs.length ? errs.slice(0, 4) : "ninguno");
await browser.close();
