import "server-only";

import crypto from "node:crypto";

import { get, nowIso, run, transaction } from "@/lib/db";
import { landingTemplate } from "@/lib/landing-template";
import { id } from "@/lib/repo";
import { slugify } from "@/lib/utils";

/**
 * Datos de demostración.
 *
 * TODO lo que crea esta función queda marcado con `is_demo = 1`, se muestra con
 * la etiqueta "Demo" en la interfaz y se puede borrar de un clic desde
 * Configuración. Los nombres son claramente ficticios a propósito.
 */

const DEMO_PRODUCTS = [
  {
    name: "Guía de Hábitos Saludables",
    subtitle: "El sistema de 21 días para sostener lo que empezás",
    type: "ebook",
    price: 14900,
    audience: "personas que arrancan mil veces y abandonan a la semana",
    problem: "empezar con todo y abandonar a los pocos días",
    transformation: "una rutina que sostenés sin fuerza de voluntad",
    benefits: [
      "Armás una rutina realista para tu semana real",
      "Sabés qué hacer los días que no tenés ganas",
      "Medís el progreso sin obsesionarte",
      "Dejás de arrancar de cero cada lunes",
    ],
  },
  {
    name: "Manual de Productividad",
    subtitle: "Cómo cerrar el día con lo importante hecho",
    type: "ebook",
    price: 19900,
    audience: "profesionales que terminan el día sin haber avanzado en lo que importa",
    problem: "vivir apagando incendios y no avanzar en lo importante",
    transformation: "cerrar cada día con lo importante hecho",
    benefits: [
      "Ordenás la semana en 20 minutos",
      "Sabés qué sacar de la lista sin culpa",
      "Protegés bloques de trabajo profundo",
      "Bajás la carga mental de las tareas sueltas",
    ],
  },
  {
    name: "Recetas Rápidas",
    subtitle: "30 comidas caseras en menos de 20 minutos",
    type: "pdf",
    price: 9900,
    audience: "gente que llega tarde a casa y termina pidiendo delivery",
    problem: "no tener tiempo de cocinar y terminar pidiendo comida",
    transformation: "comer casero todos los días sin cocinar dos horas",
    benefits: [
      "30 recetas de menos de 20 minutos",
      "Lista de compras semanal ya armada",
      "Todo con ingredientes de supermercado",
      "Variantes para vegetarianos",
    ],
  },
] as const;

const DEMO_CUSTOMERS = [
  { full_name: "Camila Ferreyra", email: "camila.demo@ejemplo.test" },
  { full_name: "Nicolás Bermúdez", email: "nicolas.demo@ejemplo.test" },
  { full_name: "Rocío Paniagua", email: "rocio.demo@ejemplo.test" },
  { full_name: "Tomás Arriaga", email: "tomas.demo@ejemplo.test" },
  { full_name: "Lucía Montenegro", email: "lucia.demo@ejemplo.test" },
  { full_name: "Ezequiel Sandoval", email: "ezequiel.demo@ejemplo.test" },
  { full_name: "Valentina Roldán", email: "valentina.demo@ejemplo.test" },
  { full_name: "Franco Iturbe", email: "franco.demo@ejemplo.test" },
];

/** PRNG determinístico: la demo se ve igual cada vez que se carga. */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

export function hasDemoData(workspaceId: string): boolean {
  return Boolean(
    get<{ id: string }>(
      `SELECT id FROM products WHERE workspace_id = ? AND is_demo = 1 LIMIT 1`,
      workspaceId,
    ),
  );
}

export function seedDemoWorkspace(workspaceId: string) {
  if (hasDemoData(workspaceId)) return;

  const random = makeRandom(0x7f0001);
  const now = nowIso();

  transaction(() => {
    const productIds: string[] = [];

    for (const product of DEMO_PRODUCTS) {
      const productId = id();
      productIds.push(productId);
      run(
        `INSERT INTO products (id, workspace_id, name, subtitle, description, short_description, type,
           status, category, audience, main_problem, transformation, benefits, cover_url, cover_style,
           base_price, currency, delivery_type, delivery_message, source, outline, is_demo, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,'active','Desarrollo personal',?,?,?,?,NULL,?,?,'ARS','download',?,'demo',NULL,1,?,?)`,
        productId,
        workspaceId,
        product.name,
        product.subtitle,
        `${product.subtitle}.\n\nEste es un producto de demostración de TiendaFlow: los textos son de ejemplo para que veas cómo se ve la plataforma con datos cargados.`,
        product.subtitle,
        product.type,
        product.audience,
        product.problem,
        product.transformation,
        JSON.stringify(product.benefits),
        JSON.stringify({ from: "#6D5DFB", to: "#22D3EE" }),
        product.price,
        `¡Listo! Descargá tu ${product.name} desde el botón de abajo.`,
        now,
        now,
      );

      run(
        `INSERT INTO product_files (id, workspace_id, product_id, file_name, file_type, file_size, storage_key, position, created_at)
         VALUES (?,?,?,?,?,?,NULL,0,?)`,
        id(),
        workspaceId,
        productId,
        `${slugify(product.name)}.pdf`,
        "application/pdf",
        2_400_000,
        now,
      );
    }

    // --- Oferta principal --------------------------------------------------
    const offerId = id();
    const mainProduct = DEMO_PRODUCTS[0];
    run(
      `INSERT INTO offers (id, workspace_id, product_id, name, slug, headline, promise, benefits,
         cta_text, guarantee, price, compare_at_price, currency, status, is_demo, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'ARS','active',1,?,?)`,
      offerId,
      workspaceId,
      productIds[0],
      "Oferta Hábitos Saludables",
      "oferta-habitos-saludables",
      "Armá una rutina que puedas sostener, aunque ya hayas abandonado mil veces",
      "En 21 días vas a tener una rutina adaptada a tu semana real, no a una semana ideal.",
      JSON.stringify(mainProduct.benefits),
      "Quiero mi acceso ahora",
      "Garantía de 7 días. Si no es para vos, te devolvemos el 100%.",
      14900,
      24900,
      now,
      now,
    );

    const bonuses = [
      { name: "Checklist de 21 días", description: "Para imprimir y tachar cada día.", value: 6900 },
      { name: "Plantilla de seguimiento", description: "Editable en Google Sheets.", value: 4900 },
      { name: "Guía de recaídas", description: "Qué hacer cuando cortás la racha.", value: 5900 },
    ];
    bonuses.forEach((bonus, index) => {
      run(
        `INSERT INTO bonuses (id, workspace_id, offer_id, product_id, name, description, value,
           image_url, file_name, status, position, created_at, updated_at)
         VALUES (?,?,?,NULL,?,?,?,NULL,NULL,'active',?,?,?)`,
        id(),
        workspaceId,
        offerId,
        bonus.name,
        bonus.description,
        bonus.value,
        index,
        now,
        now,
      );
    });

    const bumpId = id();
    run(
      `INSERT INTO order_bumps (id, workspace_id, offer_id, product_id, name, description,
         checkbox_label, price, image_url, active, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,NULL,1,?,?)`,
      bumpId,
      workspaceId,
      offerId,
      productIds[2],
      "Recetas Rápidas",
      "30 comidas caseras de menos de 20 minutos para acompañar tus nuevos hábitos.",
      "Sí, quiero agregar Recetas Rápidas por $3.900",
      3900,
      now,
      now,
    );

    const upsellId = id();
    run(
      `INSERT INTO upsells (id, workspace_id, offer_id, product_id, name, headline, description,
         price, compare_at_price, accept_label, decline_label, position, active, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,1,1,?,?)`,
      upsellId,
      workspaceId,
      offerId,
      productIds[1],
      "Manual de Productividad",
      "Sumale el sistema para que los hábitos no choquen con tu agenda",
      "El Manual de Productividad ordena tu semana para que la rutina nueva entre sin pelearse con el trabajo.",
      19900,
      29900,
      "Sí, sumalo a mi pedido",
      "No gracias, seguir sin esto",
      now,
      now,
    );

    run(
      `INSERT INTO downsells (id, workspace_id, upsell_id, product_id, name, headline, description,
         price, compare_at_price, accept_label, decline_label, active, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,'Dale, lo quiero así','No, gracias',1,?,?)`,
      id(),
      workspaceId,
      upsellId,
      productIds[1],
      "Manual de Productividad — versión esencial",
      "Llevate solo los 3 módulos centrales",
      "La misma base del Manual, sin las plantillas avanzadas.",
      9900,
      19900,
      now,
      now,
    );

    // --- Funnel ------------------------------------------------------------
    const funnelId = id();
    run(
      `INSERT INTO funnels (id, workspace_id, product_id, offer_id, name, slug, status, traffic_source,
         published_url, is_demo, created_at, updated_at)
       VALUES (?,?,?,?,?,?,'published','meta_ads',?,1,?,?)`,
      funnelId,
      workspaceId,
      productIds[0],
      offerId,
      "Funnel Hábitos Saludables",
      "funnel-habitos-saludables",
      `/f/funnel-habitos-saludables--${funnelId.slice(0, 6)}`,
      now,
      now,
    );

    const stepDefs = [
      { type: "landing", name: "Landing page" },
      { type: "checkout", name: "Checkout" },
      { type: "upsell", name: "Upsell — Manual de Productividad" },
      { type: "downsell", name: "Downsell — versión esencial" },
      { type: "thankyou", name: "Gracias" },
    ];
    const stepIds: string[] = [];
    stepDefs.forEach((step, index) => {
      const stepId = id();
      stepIds.push(stepId);
      run(
        `INSERT INTO funnel_steps (id, workspace_id, funnel_id, type, name, position, config, published, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,1,?,?)`,
        stepId,
        workspaceId,
        funnelId,
        step.type,
        step.name,
        index,
        JSON.stringify({}),
        now,
        now,
      );
    });

    // Landing con secciones
    const pageId = id();
    run(
      `INSERT INTO landing_pages (id, workspace_id, funnel_step_id, offer_id, name, slug, status, theme,
         seo_title, seo_description, created_at, updated_at)
       VALUES (?,?,?,?,?,?,'published',?,?,?,?,?)`,
      pageId,
      workspaceId,
      stepIds[0],
      offerId,
      "Landing Hábitos Saludables",
      "landing-habitos-saludables",
      JSON.stringify({ accent: "#6D5DFB" }),
      "Guía de Hábitos Saludables",
      "El sistema de 21 días para sostener lo que empezás.",
      now,
      now,
    );

    // La landing demo usa exactamente la misma plantilla base que recibe
    // cualquier producto nuevo: si el demo mostrara otra cosa, estaríamos
    // enseñando una estructura que después nadie encuentra.
    const sections = landingTemplate({
      product: {
        name: mainProduct.name,
        subtitle: mainProduct.subtitle,
        description: null,
        audience: mainProduct.audience,
        main_problem: mainProduct.problem,
        transformation: mainProduct.transformation,
        benefits: JSON.stringify(mainProduct.benefits),
      },
      offer: {
        headline: "Armá una rutina que puedas sostener",
        promise:
          "El sistema de 21 días que se adapta a tu semana real, no a una semana ideal.",
        benefits: JSON.stringify(mainProduct.benefits),
        cta_text: "Quiero mi acceso ahora",
        guarantee: "Garantía de 7 días",
        price: 14900,
        compare_at_price: 24900,
        currency: "ARS",
      },
      bonuses,
      workspaceName: "Tienda Demo",
    });

    sections.forEach((section, index) => {
      run(
        `INSERT INTO landing_sections (id, workspace_id, landing_page_id, type, position, content, visible, created_at, updated_at)
         VALUES (?,?,?,?,?,?,1,?,?)`,
        id(),
        workspaceId,
        pageId,
        section.type,
        index,
        JSON.stringify(section.content),
        now,
        now,
      );
    });

    // --- Campaña -----------------------------------------------------------
    run(
      `INSERT INTO campaigns (id, workspace_id, funnel_id, name, platform, objective, status,
         utm_source, utm_medium, utm_campaign, daily_budget, spend, impressions, clicks, is_demo, created_at, updated_at)
       VALUES (?,?,?,?,'meta','conversiones','active','facebook','cpc','habitos-frio-01',12000,?,?,?,1,?,?)`,
      id(),
      workspaceId,
      funnelId,
      "Hábitos — Tráfico frío",
      186400,
      412_500,
      8_640,
      now,
      now,
    );

    // --- Clientes, órdenes y eventos (últimos 45 días) ---------------------
    const customerIds: string[] = [];
    for (const customer of DEMO_CUSTOMERS) {
      const customerId = id();
      customerIds.push(customerId);
      run(
        `INSERT INTO customers (id, workspace_id, email, full_name, phone, country, status,
           total_spent, orders_count, last_purchase_at, is_demo, created_at, updated_at)
         VALUES (?,?,?,?,NULL,'AR','new',0,0,NULL,1,?,?)`,
        customerId,
        workspaceId,
        customer.email,
        customer.full_name,
        now,
        now,
      );
    }

    const utmSets = [
      { utm_source: "facebook", utm_medium: "cpc", utm_campaign: "habitos-frio-01" },
      { utm_source: "instagram", utm_medium: "cpc", utm_campaign: "habitos-frio-01" },
      { utm_source: "directo", utm_medium: null, utm_campaign: null },
    ];

    for (let dayOffset = 44; dayOffset >= 0; dayOffset -= 1) {
      const day = new Date(Date.now() - dayOffset * 86400_000);
      const weekday = day.getDay();
      const weekendFactor = weekday === 0 || weekday === 6 ? 0.65 : 1;
      const growth = 1 + (44 - dayOffset) * 0.012;
      const visitors = Math.round((90 + random() * 70) * weekendFactor * growth);
      const checkoutViews = Math.round(visitors * (0.24 + random() * 0.08));
      const sales = Math.max(0, Math.round(checkoutViews * (0.22 + random() * 0.12)));

      // page_view sobre la landing
      for (let i = 0; i < visitors; i += 1) {
        const at = new Date(day.getTime() + Math.floor(random() * 86400_000)).toISOString();
        const sessionKey = crypto.randomUUID();
        run(
          `INSERT INTO analytics_events (id, workspace_id, funnel_id, funnel_step_id, order_id,
             session_key, name, value, metadata, is_demo, created_at)
           VALUES (?,?,?,?,NULL,?,'page_view',0,NULL,1,?)`,
          id(),
          workspaceId,
          funnelId,
          stepIds[0],
          sessionKey,
          at,
        );
        if (i < checkoutViews) {
          run(
            `INSERT INTO analytics_events (id, workspace_id, funnel_id, funnel_step_id, order_id,
               session_key, name, value, metadata, is_demo, created_at)
             VALUES (?,?,?,?,NULL,?,'page_view',0,NULL,1,?)`,
            id(),
            workspaceId,
            funnelId,
            stepIds[1],
            sessionKey,
            at,
          );
          run(
            `INSERT INTO analytics_events (id, workspace_id, funnel_id, funnel_step_id, order_id,
               session_key, name, value, metadata, is_demo, created_at)
             VALUES (?,?,?,?,NULL,?,'initiate_checkout',0,NULL,1,?)`,
            id(),
            workspaceId,
            funnelId,
            stepIds[1],
            sessionKey,
            at,
          );
        }
        run(
          `INSERT INTO attribution_events (id, workspace_id, funnel_id, order_id, session_key,
             utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer, landing_path, created_at)
           VALUES (?,?,?,NULL,?,?,?,?,NULL,NULL,NULL,?,?)`,
          id(),
          workspaceId,
          funnelId,
          sessionKey,
          utmSets[i % utmSets.length].utm_source,
          utmSets[i % utmSets.length].utm_medium,
          utmSets[i % utmSets.length].utm_campaign,
          `/f/funnel-habitos-saludables--${funnelId.slice(0, 6)}`,
          at,
        );
      }

      for (let s = 0; s < sales; s += 1) {
        const at = new Date(day.getTime() + Math.floor(random() * 86400_000)).toISOString();
        const customerId = customerIds[Math.floor(random() * customerIds.length)];
        const utm = utmSets[Math.floor(random() * utmSets.length)];
        const withBump = random() < 0.31;
        const withUpsell = random() < 0.18;
        const bumpTotal = withBump ? 3900 : 0;
        const upsellTotal = withUpsell ? 19900 : 0;
        const orderId = id();
        const total = 14900 + bumpTotal + upsellTotal;

        run(
          `INSERT INTO orders (id, workspace_id, customer_id, offer_id, funnel_id, affiliate_id, reference,
             status, subtotal, bump_total, upsell_total, total, currency, access_token,
             utm_source, utm_medium, utm_campaign, utm_content, utm_term, is_demo, created_at, updated_at)
           VALUES (?,?,?,?,?,NULL,?,?,?,?,?,?,'ARS',?,?,?,?,NULL,NULL,1,?,?)`,
          orderId,
          workspaceId,
          customerId,
          offerId,
          funnelId,
          `TF-DEMO-${dayOffset}${s}${Math.floor(random() * 900 + 100)}`,
          random() < 0.94 ? "paid" : random() < 0.5 ? "pending" : "refunded",
          14900,
          bumpTotal,
          upsellTotal,
          total,
          crypto.randomBytes(12).toString("base64url"),
          utm.utm_source,
          utm.utm_medium,
          utm.utm_campaign,
          at,
          at,
        );

        run(
          `INSERT INTO order_items (id, workspace_id, order_id, product_id, kind, name, quantity, unit_price, downloads_count, created_at)
           VALUES (?,?,?,?,'main',?,1,14900,?,?)`,
          id(),
          workspaceId,
          orderId,
          productIds[0],
          DEMO_PRODUCTS[0].name,
          Math.floor(random() * 3),
          at,
        );
        if (withBump) {
          run(
            `INSERT INTO order_items (id, workspace_id, order_id, product_id, kind, name, quantity, unit_price, downloads_count, created_at)
             VALUES (?,?,?,?,'bump',?,1,3900,0,?)`,
            id(),
            workspaceId,
            orderId,
            productIds[2],
            DEMO_PRODUCTS[2].name,
            at,
          );
        }
        if (withUpsell) {
          run(
            `INSERT INTO order_items (id, workspace_id, order_id, product_id, kind, name, quantity, unit_price, downloads_count, created_at)
             VALUES (?,?,?,?,'upsell',?,1,19900,0,?)`,
            id(),
            workspaceId,
            orderId,
            productIds[1],
            DEMO_PRODUCTS[1].name,
            at,
          );
        }

        run(
          `INSERT INTO payments (id, workspace_id, order_id, provider, provider_payment_id, status,
             amount, currency, error_message, raw_payload, created_at, updated_at)
           VALUES (?,?,?,'demo',NULL,'approved',?,'ARS',NULL,NULL,?,?)`,
          id(),
          workspaceId,
          orderId,
          total,
          at,
          at,
        );

        run(
          `INSERT INTO analytics_events (id, workspace_id, funnel_id, funnel_step_id, order_id,
             session_key, name, value, metadata, is_demo, created_at)
           VALUES (?,?,?,?,?,?,'purchase',?,NULL,1,?)`,
          id(),
          workspaceId,
          funnelId,
          stepIds[1],
          orderId,
          crypto.randomUUID(),
          total,
          at,
        );
      }
    }

    // Consolidar totales por cliente
    run(
      `UPDATE customers SET
         orders_count = (SELECT COUNT(*) FROM orders o WHERE o.customer_id = customers.id AND o.status = 'paid'),
         total_spent = (SELECT COALESCE(SUM(total),0) FROM orders o WHERE o.customer_id = customers.id AND o.status = 'paid'),
         last_purchase_at = (SELECT MAX(created_at) FROM orders o WHERE o.customer_id = customers.id AND o.status = 'paid')
       WHERE workspace_id = ? AND is_demo = 1`,
      workspaceId,
    );
    run(
      `UPDATE customers SET status = CASE
         WHEN total_spent >= 80000 THEN 'high_value'
         WHEN orders_count > 1 THEN 'returning'
         WHEN orders_count = 1 THEN 'active'
         ELSE 'new' END
       WHERE workspace_id = ? AND is_demo = 1`,
      workspaceId,
    );

    // --- Afiliados ---------------------------------------------------------
    const affiliateId = id();
    run(
      `INSERT INTO affiliates (id, workspace_id, full_name, email, status, commission_rate, is_demo, created_at, updated_at)
       VALUES (?,?,?,?,'active',30,1,?,?)`,
      affiliateId,
      workspaceId,
      "Sofía Grimaldi (demo)",
      "sofia.demo@ejemplo.test",
      now,
      now,
    );
    run(
      `INSERT INTO affiliate_links (id, workspace_id, affiliate_id, funnel_id, code, clicks, conversions, revenue, created_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      id(),
      workspaceId,
      affiliateId,
      funnelId,
      `sofia-demo-${crypto.randomBytes(2).toString("hex")}`,
      1240,
      38,
      566_200,
      now,
    );
    run(
      `INSERT INTO commissions (id, workspace_id, affiliate_id, order_id, amount, status, created_at)
       VALUES (?,?,?,NULL,?,'pending',?)`,
      id(),
      workspaceId,
      affiliateId,
      169_860,
      now,
    );

    run(
      `INSERT INTO notifications (id, workspace_id, user_id, type, title, body, href, read_at, created_at)
       VALUES (?,?,NULL,'info',?,?,?,NULL,?)`,
      id(),
      workspaceId,
      "Cargamos datos de demostración",
      "Todo lo que ves marcado como Demo es ficticio. Podés borrarlo desde Configuración cuando quieras.",
      "/app/configuracion",
      now,
    );
  });
}
