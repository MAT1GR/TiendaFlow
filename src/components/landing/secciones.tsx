import type { ReactNode } from "react";

import {
  Bajada,
  Band,
  Cta,
  Figura,
  Kicker,
  Multiline,
  Precio,
  Titulo,
  cards,
  lines,
  str,
  type LiveProofData,
} from "@/components/landing/piezas";
import { Reloj } from "@/components/landing/reloj";
import { Icon } from "@/components/ui/icon";
import { cn, relativeTime } from "@/lib/utils";

/**
 * Las trece secciones de la estructura canónica.
 *
 * Toda página de TiendaFlow tiene estas y en este orden (ver `estructuras.ts`).
 * Están en un archivo aparte de `blocks.tsx` porque no son "algunos bloques
 * más": son LA página, y leerlas de arriba abajo tiene que contar el mismo
 * recorrido que hace alguien que llega desde un anuncio.
 *
 * Tres reglas que atraviesan todo lo de abajo:
 *
 *  1. **La densidad es parte de la estructura.** Cada campo tiene una extensión
 *     esperada —un titular de once palabras, una descripción de dos frases— y
 *     el diseño está calibrado para eso. Un campo que viene con el triple de
 *     texto no rompe el layout, pero deja de verse como esta página.
 *  2. **El precio aparece cuatro veces.** Hero, resumen, último llamado y botón
 *     fijo. En una página que se lee en diagonal, la oferta tiene que estar a la
 *     vista en cualquier punto donde alguien decida.
 *  3. **Los datos que la app no tiene no se dibujan.** Un puntaje, un contador
 *     sin fecha o una lista de compradores vacía no se rellenan con un ejemplo
 *     verosímil: la pieza no sale.
 */

export interface SeccionCtx {
  ctaHref?: string;
  priceLabel?: string;
  compareLabel?: string;
  live?: LiveProofData;
  /** `true` en la vista previa del editor. Ver `blocks.tsx`. */
  editor?: boolean;
}

export const SECCIONES_CANONICAS = new Set([
  "announcement_bar",
  "hero",
  "bonuses",
  "benefits",
  "problems",
  "social_proof",
  "pricing",
  "features",
  "guarantee",
  "faq",
  "cta",
  "footer",
  "sticky_cta",
]);

/* -------------------------------------------------------------------------- */
/* Piezas que solo usa esta estructura                                         */
/* -------------------------------------------------------------------------- */

/**
 * Las cinco estrellas del puntaje.
 *
 * Rellenas y no de contorno: cinco estrellas dibujadas con línea se leen como
 * cinco estrellas *vacías*, o sea como un puntaje de cero. El ícono del sistema
 * es de trazo —así se ven bien en la app—, así que acá va el path a mano.
 *
 * Doradas siempre. Es el único color de estas páginas que no sale del tema: una
 * estrella verde o terracota deja de leerse como una calificación.
 */
function Estrellas({ size = 16 }: { size?: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => (
        <svg key={index} width={size} height={size} viewBox="0 0 24 24" fill="#FBBF24">
          <path d="m12 3.5 2.6 5.6 6 .8-4.4 4.2 1.1 6L12 17.3l-5.3 2.8 1.1-6-4.4-4.2 6-.8L12 3.5Z" />
        </svg>
      ))}
    </span>
  );
}

/**
 * Si lo que dice la columna derecha es "no pagás por esto".
 *
 * Se mira el texto y no un campo aparte porque el que lo escribe es el
 * vendedor, en el panel: puede poner "GRATIS", "Gratis", "Incluida" o "de
 * regalo", y todas quieren decir lo mismo. Un campo booleano al lado lo
 * obligaría a mantener dos cosas sincronizadas para que el color salga bien.
 */
function esRegalo(value: string): boolean {
  return /gratis|inclu|regalo|bonus|sin cargo/i.test(value);
}

/**
 * Una fila de "esto entra y esto vale".
 *
 * La comparten el hero, el resumen de precio y el último llamado. Que sea la
 * misma pieza en los tres lados no es ahorro de código: es lo que hace que el
 * que baja por la página reconozca la cuenta que ya leyó arriba en vez de tener
 * que volver a interpretarla.
 */
function FilaDeValor({
  name,
  value,
  before,
  icon = "check",
}: {
  name: string;
  value?: string;
  before?: string;
  icon?: "check" | "gift" | "shield";
}) {
  return (
    <div className="flex items-center gap-2.5 text-[14px]">
      <span
        className="grid size-5 shrink-0 place-items-center rounded-full"
        style={{ backgroundColor: "var(--tf-accent)", color: "var(--tf-on-accent)" }}
        aria-hidden="true"
      >
        <Icon name={icon} size={12} />
      </span>

      <span className="min-w-0 flex-1 font-semibold" style={{ color: "var(--tf-text)" }}>
        {name}
      </span>

      {before || value ? (
        <span className="flex shrink-0 flex-col items-end leading-tight">
          {before ? (
            <s className="text-[11.5px]" style={{ color: "var(--tf-muted)" }}>
              {before}
            </s>
          ) : null}
          {value ? (
            <span
              className="text-[12.5px] font-extrabold"
              /*
               * El verde es de lo que no se paga, no de todos los números.
               *
               * Pintando también el precio del producto, la columna quedaba
               * entera del mismo color y se perdía la única distinción que la
               * fila tiene que hacer: esto lo pagás, esto viene incluido.
               */
              style={{ color: esRegalo(value) ? "var(--tf-accent-2)" : "var(--tf-text)" }}
            >
              {value}
            </span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

/** Una cajita de alerta con su punto que late. Cupos y contador la comparten. */
function CajaRoja({ children, latido }: { children: ReactNode; latido?: boolean }) {
  return (
    <div
      className="flex items-center justify-center gap-2.5 border px-3 py-2.5 text-[13.5px] font-bold"
      style={{
        backgroundColor: "color-mix(in srgb, var(--tf-accent) 8%, var(--tf-bg))",
        borderColor: "color-mix(in srgb, var(--tf-accent) 25%, transparent)",
        color: "var(--tf-accent-deep)",
        borderRadius: "var(--tf-radius)",
      }}
    >
      {latido ? (
        <span
          className="tf-latido size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: "var(--tf-accent)" }}
          aria-hidden="true"
        />
      ) : null}
      {children}
    </div>
  );
}

/** Los sellos de abajo del botón: entrega, pago seguro, garantía. */
function Sellos({ items, className }: { items: string[]; className?: string }) {
  if (!items.length) return null;

  return (
    <ul className={cn("flex flex-wrap items-center justify-center gap-x-5 gap-y-2", className)}>
      {items.map((item, index) => (
        <li
          key={index}
          className="flex items-center gap-1.5 text-[12.5px] font-bold"
          style={{ color: "var(--tf-muted)" }}
        >
          <Icon name="check" size={13} />
          {item}
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */

export function SeccionCanonica({
  section,
  ctx,
}: {
  section: { type: string; content: Record<string, unknown> };
  ctx: SeccionCtx;
}): ReactNode {
  const c = section.content ?? {};
  const { ctaHref, priceLabel, compareLabel, live, editor } = ctx;

  const precio = priceLabel ?? str(c, "price_label");
  const tachado = compareLabel ?? str(c, "compare_label");

  switch (section.type) {
    /* ------------------------------------------------------------------ 1 */
    /*
     * La barra de arriba de todo.
     *
     * Es lo primero que se ve y dura una línea. Dice por qué conviene hoy y,
     * si hay una fecha real de cierre, cuánto falta. Sin fecha se dibuja igual
     * pero sin reloj: un contador que arranca de nuevo en cada visita es una
     * mentira que la página repite todo el día.
     */
    case "announcement_bar": {
      const deadline = str(c, "deadline");

      return (
        <div
          className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2.5 text-center text-[12px] font-extrabold uppercase"
          style={{
            backgroundColor: "var(--tf-accent-deep)",
            color: "#FFFFFF",
            letterSpacing: "0.09em",
          }}
        >
          <span>{str(c, "message", "Oferta por tiempo limitado")}</span>
          {deadline ? (
            <span className="flex items-center gap-1.5 normal-case">
              <span className="opacity-80">{str(c, "timer_label", "Termina en")}</span>
              <Reloj
                deadline={deadline}
                expired={str(c, "expired", "La oferta cerró")}
                compacto
              />
            </span>
          ) : null}
        </div>
      );
    }

    /* ------------------------------------------------------------------ 2 */
    /*
     * El encabezado, que en esta estructura es casi una página entera.
     *
     * El titular y la bajada van arriba, centrados y a todo el ancho, porque
     * son lo único que se lee sí o sí. Abajo, dos columnas: la portada a la
     * izquierda y a la derecha una tarjeta que contesta, en este orden, las
     * cinco preguntas que se hacen en los primeros diez segundos — qué es,
     * cuánto lo valoran otros, cuánto sale, qué me llevo además y hasta cuándo.
     *
     * Poner el precio arriba es la decisión que separa esta estructura de una
     * página que "presenta" el producto: acá la oferta no es el final del
     * recorrido, es la puerta de entrada, y todo lo que sigue existe para
     * sostenerla.
     */
    case "hero": {
      const bonos = cards(c, "bonuses").filter((bono) => bono.name);
      const deadline = str(c, "deadline");
      const viendo = live?.viewers ?? 0;

      return (
        <Band ancho className="pt-10 @2xl:pt-14">
          <div className="mx-auto max-w-3xl text-center">
            <Titulo as="h1">{str(c, "headline", "Tu titular principal")}</Titulo>
            <Bajada>{str(c, "subheadline")}</Bajada>
          </div>

          <div className="mt-10 grid items-center gap-8 @3xl:grid-cols-2 @3xl:gap-12">
            <div className="flex justify-center @3xl:justify-end">
              <Figura
                url={str(c, "image")}
                alt={str(c, "image_alt", "Portada del producto")}
                className="aspect-[4/5] w-full max-w-[20rem] @3xl:max-w-[24rem]"
              />
            </div>

            <div>
              {str(c, "product_name") ? (
                <h2
                  className="text-[20px] font-extrabold leading-tight @2xl:text-[23px]"
                  style={{ color: "var(--tf-text)", fontFamily: "var(--tf-display)" }}
                >
                  {str(c, "ebook_label") ? (
                    <span style={{ color: "var(--tf-muted)" }}>{str(c, "ebook_label")} </span>
                  ) : null}
                  {str(c, "product_name")}
                </h2>
              ) : null}

              {str(c, "rating_value") ? (
                <div className="mt-3 flex items-center gap-2">
                  <Estrellas size={17} />
                  <span className="text-[13px] font-bold" style={{ color: "var(--tf-muted)" }}>
                    {str(c, "rating_value")}
                    {str(c, "rating_note") ? ` (${str(c, "rating_note")})` : ""}
                  </span>
                </div>
              ) : null}

              <div
                className="mt-4 border p-5 @2xl:p-7"
                style={{
                  backgroundColor: "var(--tf-bg)",
                  borderColor: "var(--tf-line)",
                  borderRadius: "var(--tf-radius-lg)",
                  boxShadow: "0 18px 45px -22px rgb(0 0 0 / 0.35)",
                }}
              >
                {str(c, "urgency_text") ? (
                  <span
                    className="inline-block rounded-full border px-3 py-1.5 text-[11px] font-extrabold uppercase"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--tf-accent) 8%, var(--tf-bg))",
                      borderColor: "color-mix(in srgb, var(--tf-accent) 22%, transparent)",
                      color: "var(--tf-accent-deep)",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {str(c, "urgency_text")}
                  </span>
                ) : null}

                <div className="mt-4">
                  <Precio valor={precio} tachado={tachado} />
                </div>

                {bonos.length > 0 ? (
                  <div className="mt-4 flex flex-col gap-2">
                    {bonos.map((bono, index) => (
                      <FilaDeValor
                        key={index}
                        icon="gift"
                        name={bono.name}
                        before={bono.value_before}
                        value={bono.value || "GRATIS"}
                      />
                    ))}
                  </div>
                ) : null}

                {str(c, "savings") ? (
                  <p
                    className="mt-4 text-[13.5px] font-extrabold"
                    style={{ color: "var(--tf-accent-2)" }}
                  >
                    {str(c, "savings")}
                  </p>
                ) : null}

                {str(c, "slots_note") ? (
                  <div className="mt-5">
                    <CajaRoja latido>{str(c, "slots_note")}</CajaRoja>
                  </div>
                ) : null}

                {deadline ? (
                  <div className="mt-3">
                    <CajaRoja>
                      <span>{str(c, "timer_label", "Oferta termina en")}</span>
                      <span
                        className="rounded px-2 py-0.5 text-[15px]"
                        style={{ backgroundColor: "var(--tf-accent)", color: "#FFFFFF" }}
                      >
                        <Reloj
                          deadline={deadline}
                          expired={str(c, "expired", "cerrada")}
                          compacto
                        />
                      </span>
                    </CajaRoja>
                  </div>
                ) : null}

                <Cta
                  label={str(c, "cta", "Quiero mi acceso")}
                  href={ctaHref}
                  grande
                  suelto
                  className="mt-6"
                />

                <Sellos items={lines(c, "trust")} className="mt-5" />
              </div>

              {viendo > 1 ? (
                <p
                  className="mt-4 flex items-center justify-center gap-2 text-[13px]"
                  style={{ color: "var(--tf-muted)" }}
                >
                  <span
                    className="tf-latido size-2 rounded-full"
                    style={{ backgroundColor: "var(--tf-accent-2)" }}
                    aria-hidden="true"
                  />
                  <strong style={{ color: "var(--tf-text)" }}>{viendo} personas</strong>
                  {str(c, "viewers_note", "viendo este producto ahora")}
                </p>
              ) : null}
            </div>
          </div>
        </Band>
      );
    }

    /* ------------------------------------------------------------------ 3 */
    /*
     * Los bonos, en tarjetas numeradas con su valor tachado.
     *
     * Van antes de explicar qué hay adentro del producto, que es contraintuitivo
     * y deliberado: quien llegó desde un anuncio ya sabe más o menos qué está
     * mirando, y lo que inclina la decisión no es una explicación más sino
     * descubrir que además se lleva otras cuatro cosas.
     */
    case "bonuses": {
      const items = cards(c, "items").filter((item) => item.name);
      if (!items.length) return null;

      return (
        <Band tono="suave">
          <Kicker>{str(c, "kicker")}</Kicker>
          <Titulo>{str(c, "title", "Además te llevás estos regalos")}</Titulo>
          <Bajada>{str(c, "subtitle")}</Bajada>

          <div className="mt-9 flex flex-col gap-4">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex flex-col gap-4 border p-5 @xl:flex-row @xl:items-start"
                style={{
                  backgroundColor: "var(--tf-bg)",
                  borderColor: "var(--tf-line)",
                  borderRadius: "var(--tf-radius-lg)",
                  boxShadow: "0 10px 30px -20px rgb(0 0 0 / 0.35)",
                }}
              >
                <span
                  className="grid size-11 shrink-0 place-items-center text-[14px] font-extrabold"
                  style={{
                    backgroundColor: "var(--tf-accent)",
                    color: "var(--tf-on-accent)",
                    borderRadius: "var(--tf-radius)",
                  }}
                >
                  #{index + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-extrabold" style={{ color: "var(--tf-text)" }}>
                    {item.name}
                  </p>
                  {item.description ? (
                    <p
                      className="mt-2 text-[14px] leading-relaxed"
                      style={{ color: "var(--tf-muted)" }}
                    >
                      {item.description}
                    </p>
                  ) : null}
                </div>

                <div className="shrink-0 text-left @xl:text-right">
                  {item.value ? (
                    <s className="block text-[12.5px]" style={{ color: "var(--tf-muted)" }}>
                      Valor: {item.value}
                    </s>
                  ) : null}
                  <span
                    className="mt-0.5 inline-block text-[14px] font-extrabold"
                    style={{ color: "var(--tf-accent-2)" }}
                  >
                    GRATIS
                  </span>
                </div>
              </div>
            ))}
          </div>

          {str(c, "total_value") ? (
            <p className="mt-7 text-center text-[15px]" style={{ color: "var(--tf-muted)" }}>
              {str(c, "total_label", "Estos bonos tienen un valor total de")}{" "}
              <strong className="text-[17px]" style={{ color: "var(--tf-accent)" }}>
                {str(c, "total_value")}
              </strong>
            </p>
          ) : null}
        </Band>
      );
    }

    /* ------------------------------------------------------------------ 4 */
    /* Qué hay adentro: cuatro tarjetas con emoji, título corto y dos frases. */
    case "benefits": {
      const items = cards(c, "items").filter((item) => item.title || item.description);

      return (
        <Band ancho tono="surface">
          <Titulo>{str(c, "title", "¿Qué vas a encontrar adentro?")}</Titulo>
          <Bajada>{str(c, "subtitle")}</Bajada>

          <div className="mt-9 grid gap-4 @2xl:grid-cols-2">
            {items.map((item, index) => (
              <div
                key={index}
                className="border p-6"
                style={{
                  backgroundColor: "var(--tf-bg)",
                  borderColor: "var(--tf-line)",
                  borderRadius: "var(--tf-radius-lg)",
                }}
              >
                {item.emoji ? (
                  <span className="text-[30px] leading-none" aria-hidden="true">
                    {item.emoji}
                  </span>
                ) : null}
                <p
                  className="mt-3 text-[17px] font-extrabold leading-snug"
                  style={{ color: "var(--tf-text)" }}
                >
                  {item.title}
                </p>
                {item.description ? (
                  <p
                    className="mt-2 text-[14.5px] leading-relaxed"
                    style={{ color: "var(--tf-muted)" }}
                  >
                    {item.description}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Band>
      );
    }

    /* ------------------------------------------------------------------ 5 */
    /*
     * Los dolores, con una cruz roja cada uno.
     *
     * La cruz importa: la lista de beneficios de arriba usa el mismo formato de
     * tarjeta, y sin un símbolo que las distinga las dos secciones se leen como
     * la misma cosa dos veces. Acá el ícono dice "esto es lo que te pasa hoy".
     */
    case "problems": {
      const items = cards(c, "items").filter((item) => item.title || item.description);

      return (
        <Band ancho>
          <Titulo>{str(c, "title", "¿Te sentís identificado?")}</Titulo>
          <Bajada>{str(c, "subtitle")}</Bajada>

          <div className="mt-9 grid gap-4 @2xl:grid-cols-2">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-3.5 border p-5"
                style={{
                  backgroundColor: "var(--tf-surface)",
                  borderColor: "var(--tf-line)",
                  borderRadius: "var(--tf-radius-lg)",
                }}
              >
                <span
                  className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[13px] font-black"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--tf-accent) 12%, var(--tf-bg))",
                    color: "var(--tf-accent)",
                  }}
                  aria-hidden="true"
                >
                  ✕
                </span>
                <div className="min-w-0">
                  <p
                    className="text-[15.5px] font-extrabold leading-snug"
                    style={{ color: "var(--tf-text)" }}
                  >
                    {item.title}
                  </p>
                  {item.description ? (
                    <p
                      className="mt-1.5 text-[14px] leading-relaxed"
                      style={{ color: "var(--tf-muted)" }}
                    >
                      {item.description}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {str(c, "closing") ? (
            <p
              className="mx-auto mt-8 max-w-xl text-center text-[16px] font-extrabold"
              style={{ color: "var(--tf-text)" }}
            >
              <Multiline text={str(c, "closing")} />
            </p>
          ) : null}
        </Band>
      );
    }

    /* ------------------------------------------------------------------ 6 */
    /*
     * Los testimonios, como capturas de una conversación.
     *
     * Un testimonio tipeado en una tarjeta lo escribe cualquiera; leído dentro
     * de un chat —con su hora, su burbuja y su respuesta— se lee como algo que
     * pasó. Ese es todo el argumento del formato.
     *
     * Lo que el formato NO hace es fabricar el contenido: los nombres y las
     * frases los carga el vendedor con lo que realmente le escribieron. Si no
     * cargó ninguno, la sección no sale en la página publicada.
     */
    case "social_proof": {
      const items = cards(c, "items").filter((item) => item.text);
      const stats = cards(c, "stats").filter((stat) => stat.value);

      if (!items.length && !stats.length) {
        if (!editor) return null;
        return (
          <Band tono="surface" className="py-9">
            <p
              className="mx-auto max-w-xl border border-dashed px-4 py-3 text-center text-[13px]"
              style={{
                borderColor: "var(--tf-accent)",
                color: "var(--tf-accent)",
                borderRadius: "var(--tf-radius)",
              }}
            >
              Cargá los mensajes reales que recibiste. Mientras no haya ninguno, esta sección no
              sale en tu página.
            </p>
          </Band>
        );
      }

      const pregunta = str(c, "question", "¿Cómo te fue con el material?");
      const respuesta = str(c, "closing_reply");

      return (
        <Band ancho tono="surface">
          <Kicker>{str(c, "kicker")}</Kicker>
          <Titulo>{str(c, "title", "Lo que dicen quienes ya lo tienen")}</Titulo>

          {items.length > 0 ? (
            <div className="tf-carrusel -mx-5 mt-9 px-5 pb-3">
              {items.map((item, index) => (
                <article
                  key={index}
                  className="overflow-hidden border"
                  style={{
                    borderColor: "var(--tf-line)",
                    borderRadius: "var(--tf-radius-lg)",
                    backgroundColor: "var(--tf-bg)",
                    boxShadow: "0 18px 45px -25px rgb(0 0 0 / 0.4)",
                  }}
                >
                  {/* La cabecera del chat: avatar con la inicial, nombre y estado. */}
                  <header
                    className="flex items-center gap-2.5 px-3.5 py-3"
                    style={{ backgroundColor: "var(--tf-surface)" }}
                  >
                    <span
                      className="grid size-9 shrink-0 place-items-center rounded-full text-[14px] font-extrabold"
                      style={{ backgroundColor: "var(--tf-accent)", color: "#FFFFFF" }}
                      aria-hidden="true"
                    >
                      {item.name?.trim().charAt(0).toUpperCase() || "?"}
                    </span>
                    <span className="min-w-0 leading-tight">
                      <span
                        className="block truncate text-[14px] font-bold"
                        style={{ color: "var(--tf-text)" }}
                      >
                        {item.name}
                      </span>
                      <span className="block text-[11.5px]" style={{ color: "var(--tf-muted)" }}>
                        {item.status || "en línea"}
                      </span>
                    </span>
                  </header>

                  <div
                    className="flex flex-col gap-2 px-3.5 py-4"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--tf-accent-soft) 18%, var(--tf-bg))",
                    }}
                  >
                    <p
                      className="max-w-[82%] self-end rounded-xl rounded-br-sm px-3 py-2 text-[13px] leading-snug"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--tf-accent-2) 22%, #FFFFFF)",
                        color: "var(--tf-text)",
                      }}
                    >
                      {pregunta}
                    </p>

                    <p
                      className="max-w-[92%] self-start rounded-xl rounded-bl-sm px-3 py-2.5 text-[13px] leading-relaxed"
                      style={{ backgroundColor: "#FFFFFF", color: "var(--tf-text)" }}
                    >
                      {item.text}
                    </p>

                    {respuesta ? (
                      <p
                        className="max-w-[82%] self-end rounded-xl rounded-br-sm px-3 py-2 text-[13px] leading-snug"
                        style={{
                          backgroundColor: "color-mix(in srgb, var(--tf-accent-2) 22%, #FFFFFF)",
                          color: "var(--tf-text)",
                        }}
                      >
                        {respuesta}
                      </p>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {stats.length > 0 ? (
            <div className="mt-9 grid grid-cols-3 gap-3">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <p
                    className="text-[clamp(1.5rem,5cqw,2.1rem)] font-extrabold leading-none"
                    style={{ color: "var(--tf-accent)", letterSpacing: "-0.03em" }}
                  >
                    {stat.value}
                  </p>
                  <p
                    className="mt-1.5 text-[12px] font-bold uppercase"
                    style={{ color: "var(--tf-muted)", letterSpacing: "0.06em" }}
                  >
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </Band>
      );
    }

    /* ------------------------------------------------------------------ 7 */
    /*
     * La cuenta completa, sobre fondo oscuro.
     *
     * Es el corazón de la página y el punto donde cambia el fondo: hasta acá se
     * explicó, de acá en adelante se cobra. Suma todo lo que entra, muestra el
     * valor de lista tachado y recién después el precio de hoy — en ese orden,
     * porque leer el número grande antes del tachado lo convierte en un costo y
     * leerlo después lo convierte en un descuento.
     */
    case "pricing": {
      const items = cards(c, "items").filter((item) => item.name);

      return (
        <Band tono="oscuro">
          <Titulo>{str(c, "title", "Todo lo que incluye tu compra")}</Titulo>
          <Bajada>{str(c, "subtitle")}</Bajada>

          <div
            className="mx-auto mt-10 max-w-xl border p-6 @2xl:p-8"
            style={{
              backgroundColor: "var(--tf-surface)",
              borderColor: "var(--tf-line)",
              borderRadius: "var(--tf-radius-lg)",
            }}
          >
            <div className="flex flex-col gap-3">
              {items.map((item, index) => (
                <FilaDeValor
                  key={index}
                  name={item.name}
                  value={item.value}
                  icon={item.value === "INCLUIDA" ? "shield" : "check"}
                />
              ))}
            </div>

            <div className="my-6 border-t" style={{ borderColor: "var(--tf-line)" }} />

            <div className="text-center">
              {str(c, "total_value") ? (
                <>
                  <p className="text-[13px]" style={{ color: "var(--tf-muted)" }}>
                    {str(c, "total_label", "Valor total regular")}
                  </p>
                  <s
                    className="mt-1 block text-[22px] font-semibold"
                    style={{ color: "var(--tf-muted)" }}
                  >
                    {str(c, "total_value")}
                  </s>
                </>
              ) : null}

              <p
                className="mt-5 text-[12.5px] font-extrabold uppercase"
                style={{ color: "var(--tf-accent-soft)", letterSpacing: "0.1em" }}
              >
                {str(c, "today_label", "Oferta de hoy")}
              </p>
              <p
                className="mt-1 text-[clamp(2.6rem,10cqw,3.6rem)] font-extrabold leading-none"
                style={{
                  color: "var(--tf-text)",
                  fontFamily: "var(--tf-display)",
                  letterSpacing: "-0.03em",
                }}
              >
                {precio || "$0"}
              </p>
              {str(c, "note") ? (
                <p className="mt-2 text-[13px]" style={{ color: "var(--tf-muted)" }}>
                  {str(c, "note")}
                </p>
              ) : null}

              <Cta label={str(c, "cta", "Quiero mi acceso")} href={ctaHref} grande suelto className="mt-6" />

              {str(c, "savings") ? (
                <span
                  className="mt-5 inline-flex rounded-full px-4 py-2 text-[13.5px] font-extrabold"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--tf-accent-2) 22%, transparent)",
                    color: "color-mix(in srgb, var(--tf-accent-2) 70%, #FFFFFF)",
                  }}
                >
                  {str(c, "savings")}
                </span>
              ) : null}
            </div>
          </div>

          {str(c, "trust_note") ? (
            <p
              className="mt-6 flex items-center justify-center gap-2 text-center text-[13px]"
              style={{ color: "var(--tf-muted)" }}
            >
              <Icon name="shield" size={15} />
              {str(c, "trust_note")}
            </p>
          ) : null}
        </Band>
      );
    }

    /* ------------------------------------------------------------------ 8 */
    /* Cómo se usa, en tres pasos de una frase cada uno. Sigue sobre oscuro. */
    case "features": {
      const items = cards(c, "items").filter((item) => item.title || item.description);

      return (
        <Band ancho tono="muy-oscuro">
          <Titulo>{str(c, "title", "Cómo lo usás")}</Titulo>
          <Bajada>{str(c, "subtitle")}</Bajada>

          <div className="mt-10 grid gap-5 @2xl:grid-cols-3">
            {items.map((item, index) => (
              <div key={index} className="text-center @2xl:text-left">
                <span
                  className="mx-auto grid size-12 place-items-center rounded-full text-[19px] font-extrabold @2xl:mx-0"
                  style={{ backgroundColor: "var(--tf-accent)", color: "#FFFFFF" }}
                >
                  {index + 1}
                </span>
                <p
                  className="mt-4 text-[16px] font-extrabold"
                  style={{ color: "var(--tf-text)" }}
                >
                  {item.title}
                </p>
                {item.description ? (
                  <p
                    className="mt-2 text-[14px] leading-relaxed"
                    style={{ color: "var(--tf-muted)" }}
                  >
                    {item.description}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Band>
      );
    }

    /* ------------------------------------------------------------------ 9 */
    case "guarantee":
      return (
        <Band>
          <div
            className="mx-auto max-w-2xl border-2 p-8 text-center"
            style={{
              borderColor: "var(--tf-accent-2)",
              backgroundColor: "var(--tf-bg)",
              borderRadius: "var(--tf-radius-lg)",
            }}
          >
            <span
              className="mx-auto grid size-16 place-items-center rounded-full"
              style={{
                backgroundColor: "color-mix(in srgb, var(--tf-accent-2) 14%, var(--tf-bg))",
                color: "var(--tf-accent-2)",
              }}
              aria-hidden="true"
            >
              <Icon name="shield" size={30} />
            </span>

            <Titulo className="!mt-5">{str(c, "title", "Garantía de 7 días")}</Titulo>

            {str(c, "text") ? (
              <p
                className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed"
                style={{ color: "var(--tf-muted)" }}
              >
                <Multiline text={str(c, "text")} />
              </p>
            ) : null}

            {str(c, "seal") ? (
              <span
                className="mt-6 inline-flex rounded-full px-5 py-2.5 text-[12.5px] font-extrabold uppercase"
                style={{
                  backgroundColor: "var(--tf-accent-2)",
                  color: "#FFFFFF",
                  letterSpacing: "0.06em",
                }}
              >
                {str(c, "seal")}
              </span>
            ) : null}
          </div>
        </Band>
      );

    /* ----------------------------------------------------------------- 10 */
    case "faq": {
      const items = cards(c, "items").filter((item) => item.question);

      return (
        <Band tono="surface">
          <Titulo>{str(c, "title", "Preguntas frecuentes")}</Titulo>
          <Bajada>{str(c, "subtitle")}</Bajada>

          <div className="mt-9 flex flex-col gap-3">
            {items.map((item, index) => (
              <details
                key={index}
                className="group border px-5"
                style={{
                  backgroundColor: "var(--tf-bg)",
                  borderColor: "var(--tf-line)",
                  borderRadius: "var(--tf-radius)",
                }}
              >
                <summary
                  className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-extrabold [&::-webkit-details-marker]:hidden"
                  style={{ color: "var(--tf-text)" }}
                >
                  {item.question}
                  <Icon
                    name="chevronDown"
                    size={18}
                    className="shrink-0 transition-transform group-open:rotate-180"
                  />
                </summary>
                {item.answer ? (
                  <p
                    className="pb-5 text-[14.5px] leading-relaxed"
                    style={{ color: "var(--tf-muted)" }}
                  >
                    {item.answer}
                  </p>
                ) : null}
              </details>
            ))}
          </div>
        </Band>
      );
    }

    /* ----------------------------------------------------------------- 11 */
    /*
     * El último llamado, con la oferta repetida entera.
     *
     * Es la cuarta vez que aparece el precio y la tercera los bonos. Quien llegó
     * hasta acá leyendo todo ya lo sabe; quien llegó scrolleando hasta el final
     * —que son más— lo está viendo por primera vez.
     */
    case "cta": {
      const bonos = cards(c, "bonuses").filter((bono) => bono.name);

      return (
        <Band>
          <div
            className="border-2 p-7 text-center @2xl:p-10"
            style={{
              borderColor: "var(--tf-accent)",
              backgroundColor: "color-mix(in srgb, var(--tf-accent) 5%, var(--tf-bg))",
              borderRadius: "var(--tf-radius-lg)",
            }}
          >
            <Titulo>{str(c, "headline", "Empezá hoy")}</Titulo>
            <Bajada>{str(c, "subheadline")}</Bajada>

            <div className="mt-7 flex justify-center">
              <Precio valor={precio} tachado={tachado} />
            </div>

            {bonos.length > 0 ? (
              <div className="mx-auto mt-6 flex max-w-sm flex-col gap-2 text-left">
                {str(c, "bonus_note") ? (
                  <p
                    className="text-center text-[12.5px] font-extrabold uppercase"
                    style={{ color: "var(--tf-accent)", letterSpacing: "0.07em" }}
                  >
                    {str(c, "bonus_note")}
                  </p>
                ) : null}
                {bonos.map((bono, index) => (
                  <FilaDeValor
                    key={index}
                    icon="gift"
                    name={bono.name}
                    value={bono.value || "GRATIS"}
                  />
                ))}
              </div>
            ) : null}

            {str(c, "savings") ? (
              <p
                className="mt-5 text-[14px] font-extrabold"
                style={{ color: "var(--tf-accent-2)" }}
              >
                {str(c, "savings")}
              </p>
            ) : null}

            <Cta label={str(c, "cta", "Quiero mi acceso")} href={ctaHref} grande className="mt-6" />

            <Sellos items={lines(c, "trust")} className="mt-6" />
          </div>
        </Band>
      );
    }

    /* ----------------------------------------------------------------- 12 */
    /*
     * El pie, con los legales adentro.
     *
     * Términos y privacidad van en un `<details>` y no en una ventana modal: es
     * la misma información, se puede leer sin salir de la página, funciona sin
     * JavaScript y es lo que un buscador puede indexar.
     */
    case "footer": {
      const legales = cards(c, "legal").filter((item) => item.title && item.text);

      return (
        <Band tono="oscuro" className="!py-12">
          <div className="text-center">
            {str(c, "brand") ? (
              <p
                className="text-[16px] font-extrabold uppercase"
                style={{ color: "var(--tf-text)", letterSpacing: "0.1em" }}
              >
                {str(c, "brand")}
              </p>
            ) : null}

            {str(c, "text") ? (
              <p className="mt-3 text-[13px] leading-relaxed" style={{ color: "var(--tf-muted)" }}>
                <Multiline text={str(c, "text")} />
              </p>
            ) : null}
          </div>

          {legales.length > 0 ? (
            <div className="mx-auto mt-7 flex max-w-xl flex-col gap-2">
              {legales.map((item, index) => (
                <details
                  key={index}
                  className="group border px-4"
                  style={{ borderColor: "var(--tf-line)", borderRadius: "var(--tf-radius)" }}
                >
                  <summary
                    className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 text-[13px] font-bold [&::-webkit-details-marker]:hidden"
                    style={{ color: "var(--tf-text)" }}
                  >
                    {item.title}
                    <Icon
                      name="chevronDown"
                      size={15}
                      className="shrink-0 transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <p
                    className="pb-4 text-[12.5px] leading-relaxed"
                    style={{ color: "var(--tf-muted)" }}
                  >
                    <Multiline text={item.text} />
                  </p>
                </details>
              ))}
            </div>
          ) : null}

          {live?.purchases.length ? (
            <p
              className="mt-7 text-center text-[12px]"
              style={{ color: "var(--tf-muted)" }}
            >
              Última compra: <strong>{live.purchases[0].name}</strong>
              {live.purchases[0].place ? ` de ${live.purchases[0].place}` : ""} ·{" "}
              {relativeTime(live.purchases[0].at)}
            </p>
          ) : null}
        </Band>
      );
    }

    /* ----------------------------------------------------------------- 13 */
    /*
     * El botón que sigue al que lee.
     *
     * `sticky` y no `fixed`: pegado a la ventana taparía el editor entero y
     * habría que dibujarlo distinto en la vista previa y en la página real.
     * Pegado al final de su contenedor hace lo mismo en los dos lados con un
     * solo renderizador.
     */
    case "sticky_cta": {
      const deadline = str(c, "deadline");

      return (
        <div
          className="sticky bottom-0 z-30 border-t px-4 py-2.5"
          style={{
            borderColor: "var(--tf-line)",
            backgroundColor: "var(--tf-bg)",
            boxShadow: "0 -10px 30px -12px rgb(0 0 0 / 0.3)",
          }}
        >
          <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="min-w-0 leading-tight">
              {deadline ? (
                <span
                  className="flex items-center gap-1.5 text-[11.5px] font-bold"
                  style={{ color: "var(--tf-accent-deep)" }}
                >
                  {str(c, "timer_label", "Termina en")}
                  <Reloj deadline={deadline} expired={str(c, "expired", "cerrada")} compacto />
                </span>
              ) : null}

              <span className="flex items-baseline gap-2">
                <Precio valor={precio} tachado={tachado} chico />
              </span>

              {str(c, "pack_label") ? (
                <span
                  className="block text-[11px] font-extrabold uppercase"
                  style={{ color: "var(--tf-muted)", letterSpacing: "0.06em" }}
                >
                  {str(c, "pack_label")}
                </span>
              ) : null}
            </div>

            <div className="min-w-[9rem] flex-1 @sm:max-w-[16rem]">
              <Cta
                label={str(c, "cta", "Lo quiero")}
                href={ctaHref}
                suelto
                className="!py-3 !text-[14px]"
              />
            </div>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}
