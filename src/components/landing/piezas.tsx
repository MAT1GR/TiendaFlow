import type { ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * Las piezas con las que están hechas todas las secciones.
 *
 * Viven separadas de los bloques porque las comparten dos archivos: la
 * estructura canónica (`secciones.tsx`) y los bloques de páginas armadas con
 * versiones anteriores de la app (`blocks.tsx`). Tenerlas duplicadas garantiza
 * que en algún momento un titular se vea distinto en una página vieja que en
 * una nueva, que es exactamente lo que el sistema existe para evitar.
 *
 * Nada de acá abajo escribe un color a mano: todo sale de las variables del
 * tema, así que cambiar el preset reskinea la página entera sin tocar un solo
 * renderizador.
 */

/**
 * El contenido de un bloque es JSON libre: lo escribe el usuario, lo genera un
 * modelo o viene de una versión anterior de la app. Por eso los tres lectores
 * de abajo son totales — devuelven algo razonable para CUALQUIER entrada.
 *
 * No es paranoia: un modelo que devuelve `links: [{text, url}]` donde
 * esperábamos `links: ["Contacto"]` alcanza para tirar abajo la página entera
 * del vendedor. La página tiene que aguantar eso y mostrar lo que se pueda.
 */

/** Cualquier valor, convertido al texto más razonable que se pueda. */
export function toText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["text", "label", "title", "name", "value", "alt"]) {
      if (typeof record[key] === "string") return record[key];
    }
  }
  return "";
}

export function str(content: Record<string, unknown>, key: string, fallback = ""): string {
  const value = content[key];
  return typeof value === "string" && value ? value : fallback;
}

/** Una lista de textos, venga como venga. */
export function lines(content: Record<string, unknown>, key: string): string[] {
  const value = content[key];
  if (!Array.isArray(value)) return [];
  return value.map(toText).filter(Boolean);
}

/** Una lista de tarjetas, con todos sus campos ya convertidos a texto. */
export function cards(content: Record<string, unknown>, key: string): Array<Record<string, string>> {
  const value = content[key];
  if (!Array.isArray(value)) return [];

  return value.map((item) => {
    if (!item || typeof item !== "object") {
      const text = toText(item);
      return { title: text, name: text, text, label: text, question: text, alt: text };
    }
    const result: Record<string, string> = {};
    for (const [field, raw] of Object.entries(item as Record<string, unknown>)) {
      result[field] = toText(raw);
    }
    return result;
  });
}

/** Los saltos de línea que escribe el usuario se respetan tal cual. */
export function Multiline({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, index) => (
        <span key={index} className="block">
          {line}
        </span>
      ))}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Piezas del sistema de diseño                                                */
/* -------------------------------------------------------------------------- */

/**
 * Nada de acá abajo escribe un color a mano.
 *
 * Todo sale de las variables del tema, así que cambiar el preset reskinea la
 * página entera sin tocar un solo renderizador.
 */

export type Tono = "surface" | "suave" | "oscuro" | "muy-oscuro";

/**
 * La banda de una sección.
 *
 * El tono no pinta un fondo y nada más: redefine las variables del tema para
 * todo lo que cuelga adentro. Por eso una tarjeta, un titular o un botón puestos
 * en una banda oscura se adaptan solos, sin que cada sección tenga que pasarles
 * colores a mano — que es como se termina con una página donde el mismo
 * componente se ve de tres formas distintas.
 *
 * Los tonos oscuros necesitan dos nodos: el de afuera calcula `--tf-bg` y
 * `--tf-surface` a partir del `--tf-text` que hereda, y recién el de adentro
 * pisa `--tf-text`. En un solo nodo, `--tf-bg: var(--tf-text)` se referiría al
 * `--tf-text` que la misma regla está redefiniendo, CSS lo detecta como ciclo y
 * descarta las dos declaraciones.
 */
export function Band({
  children,
  className,
  tono,
  ancho,
}: {
  children: ReactNode;
  className?: string;
  tono?: Tono;
  /** Más aire a los costados: lo usa el encabezado cuando va a dos columnas. */
  ancho?: boolean;
}) {
  const interior = (
    <div className={cn("mx-auto w-full", ancho ? "max-w-5xl" : "max-w-3xl")}>{children}</div>
  );

  if (tono === "oscuro" || tono === "muy-oscuro") {
    const profundidad = tono === "muy-oscuro" ? "98%" : "92%";

    return (
      <section
        className={cn("px-5 py-14 @2xl:px-8 @2xl:py-20", className)}
        style={
          {
            backgroundColor: `color-mix(in srgb, var(--tf-text) ${profundidad}, #000000)`,
            "--tf-bg": `color-mix(in srgb, var(--tf-text) ${profundidad}, #000000)`,
            "--tf-surface": "color-mix(in srgb, var(--tf-text) 78%, #000000)",
          } as React.CSSProperties
        }
      >
        <div
          style={
            {
              "--tf-text": "#FFFFFF",
              "--tf-muted": "color-mix(in srgb, #FFFFFF 62%, transparent)",
              "--tf-line": "color-mix(in srgb, #FFFFFF 16%, transparent)",
              color: "#FFFFFF",
            } as React.CSSProperties
          }
        >
          {interior}
        </div>
      </section>
    );
  }

  const fondo =
    tono === "surface"
      ? { backgroundColor: "var(--tf-surface)" }
      : tono === "suave"
        ? {
            // El degradé de la sección de bonos: apenas un lavado del acento que
            // baja hasta el fondo, para que el bloque se despegue sin gritar.
            backgroundImage:
              "linear-gradient(to bottom, color-mix(in srgb, var(--tf-accent-soft) 45%, var(--tf-bg)), var(--tf-bg))",
          }
        : undefined;

  return (
    <section className={cn("px-5 py-12 @2xl:px-8 @2xl:py-16", className)} style={fondo}>
      {interior}
    </section>
  );
}

/**
 * La etiqueta de arriba de cada sección.
 *
 * Mayúsculas, muy espaciada y chica. Es el contrapunto del titular —que va
 * apretado y grande— y buena parte del carácter de estas páginas sale de ese
 * contraste.
 */
export function Kicker({ children, className }: { children: string; className?: string }) {
  if (!children) return null;
  return (
    <p
      className={cn("text-center text-[12px] font-extrabold uppercase", className)}
      style={{ color: "var(--tf-accent)", letterSpacing: "0.18em" }}
    >
      {children}
    </p>
  );
}

export function Titulo({
  children,
  as = "h2",
  centrado = true,
  className,
}: {
  children: string;
  as?: "h1" | "h2";
  centrado?: boolean;
  className?: string;
}) {
  const Tag = as;
  return (
    <Tag
      className={cn(
        "mt-3 font-extrabold",
        as === "h1"
          ? "text-[clamp(2.1rem,8cqw,3.6rem)] leading-[1.04]"
          : "text-[clamp(1.5rem,4.6cqw,2.15rem)] leading-[1.18]",
        centrado && "text-center",
        className,
      )}
      style={{ color: "var(--tf-text)", letterSpacing: as === "h1" ? "-0.045em" : "-0.03em" }}
    >
      <Multiline text={children} />
    </Tag>
  );
}

export function Bajada({
  children,
  centrado = true,
  className,
}: {
  children: string;
  centrado?: boolean;
  className?: string;
}) {
  if (!children) return null;
  return (
    <p
      className={cn(
        "mx-auto mt-4 max-w-2xl text-[16px] leading-relaxed @2xl:text-[17px]",
        centrado && "text-center",
        className,
      )}
      style={{ color: "var(--tf-muted)" }}
    >
      <Multiline text={children} />
    </p>
  );
}

export function Caja({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn("border p-5", className)}
      style={{
        backgroundColor: "var(--tf-surface)",
        borderColor: "var(--tf-line)",
        borderRadius: "var(--tf-radius-lg)",
      }}
    >
      {children}
    </div>
  );
}

export function Pastilla({ children }: { children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-3 py-1.5 text-[12.5px] font-semibold"
      style={{ borderColor: "var(--tf-line)", color: "var(--tf-muted)" }}
    >
      {children}
    </span>
  );
}

export function Numero({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div className="text-center">
      <p
        className="text-[clamp(1.75rem,6cqw,2.5rem)] font-extrabold leading-none"
        style={{ color: "var(--tf-accent)", letterSpacing: "-0.03em" }}
      >
        {valor}
      </p>
      <p
        className="mt-2 text-[12px] font-bold uppercase"
        style={{ color: "var(--tf-muted)", letterSpacing: "0.06em" }}
      >
        {etiqueta}
      </p>
    </div>
  );
}

/**
 * El botón, con la forma que le da el tema.
 *
 * La clase `tf-cta` lee `--tf-btn-radius`, `--tf-btn-shadow`, `--tf-btn-lift`,
 * `--tf-btn-case` y `--tf-btn-shine`, que salen del preset. Un solo botón para
 * las tres formas —sólido, con relieve y pastilla con brillo— porque el que se
 * repite catorce veces en una página no puede tener tres implementaciones que
 * se desincronicen.
 *
 * `sub` es la línea chica de adentro del botón ("Acceso al instante · Pago
 * único"). Va adentro y no debajo a propósito: es la última objeción que se
 * responde, y responderla dentro del área que se toca es lo que hace que se
 * toque.
 */
export function Cta({
  label,
  href,
  sub,
  grande,
  suelto,
  className: extra,
}: {
  label: string;
  href?: string;
  sub?: string;
  grande?: boolean;
  /** Sin el margen de arriba ni el ancho máximo: para los botones de una tarjeta. */
  suelto?: boolean;
  className?: string;
}) {
  // `cn` acá es un `join`, no un merge de Tailwind: dos clases del mismo grupo
  // —`gap-2` y `gap-1`— salen las dos y gana la que esté más abajo en la hoja,
  // que no es una decisión de nadie. Por eso el eje se elige una sola vez.
  const className = cn(
    "tf-cta flex items-center justify-center text-center font-extrabold",
    sub ? "flex-col" : "gap-2",
    suelto ? "w-full" : "mx-auto mt-8 w-full max-w-md",
    grande ? "px-7 py-4.5 text-[16px]" : "px-6 py-3.5 text-[15px]",
    extra,
  );
  const style = {
    backgroundColor: "var(--tf-accent)",
    color: "var(--tf-on-accent)",
  };

  const contenido = (
    <>
      <span className="flex items-center gap-2">
        {label}
        {href && !sub ? <Icon name="arrowRight" size={18} /> : null}
      </span>
      {sub ? (
        <span
          className="mt-1 text-[12px] font-semibold normal-case opacity-90"
          style={{ letterSpacing: 0 }}
        >
          {sub}
        </span>
      ) : null}
    </>
  );

  // Sin destino es la vista previa del editor: se dibuja igual pero no es un
  // enlace, así que no tiene por qué anunciarse ni recibir foco.
  if (!href) {
    return (
      <span className={className} style={style} aria-hidden="true">
        {contenido}
      </span>
    );
  }

  return (
    <a href={href} className={className} style={style}>
      {contenido}
    </a>
  );
}

/**
 * Un precio, con su tachado al lado.
 *
 * Lo comparten la tarjeta de precio, el pack y el botón que sigue al que lee, y
 * tiene que verse igual en los tres: un mismo producto con tres tipografías de
 * precio distintas en la misma página se lee como tres ofertas.
 */
export function Precio({
  valor,
  tachado,
  chico,
}: {
  valor: string;
  tachado?: string;
  chico?: boolean;
}) {
  if (!valor) return null;

  return (
    <span className="flex items-baseline gap-2.5">
      {tachado ? (
        <span
          className={cn("line-through", chico ? "text-[13px]" : "text-[18px]")}
          style={{ color: "var(--tf-muted)" }}
        >
          {tachado}
        </span>
      ) : null}
      <span
        className={cn(
          "font-extrabold leading-none",
          chico ? "text-[20px]" : "text-[clamp(2.25rem,8cqw,3rem)]",
        )}
        style={{ color: "var(--tf-accent)", letterSpacing: "-0.03em" }}
      >
        {valor}
      </span>
    </span>
  );
}

/**
 * Hueco de imagen.
 *
 * Mientras no haya almacenamiento de archivos conectado, mostramos el texto
 * alternativo: así se entiende qué va en ese lugar en vez de ver un rectángulo
 * gris sin explicación.
 */
export function Hueco({
  label,
  className,
  chico,
}: {
  label: string;
  className?: string;
  chico?: boolean;
}) {
  return (
    <div
      className={cn("grid place-items-center border border-dashed p-4 text-center", className)}
      style={{
        borderColor: "var(--tf-line)",
        backgroundColor: "var(--tf-surface)",
        borderRadius: "var(--tf-radius-lg)",
        color: "var(--tf-muted)",
      }}
    >
      <div>
        <Icon name="image" size={chico ? 20 : 30} className="mx-auto opacity-60" />
        <p className={cn("mt-1.5", chico ? "text-[11.5px]" : "text-[13px]")}>{label}</p>
      </div>
    </div>
  );
}

/**
 * La imagen de un bloque, esté cargada o no.
 *
 * Con URL dibuja la imagen; sin URL, el mismo hueco de siempre con el texto de
 * qué va ahí. Es un solo componente para los dos casos a propósito: la
 * composición del bloque —el lugar, la proporción, el aire alrededor— no
 * cambia según el vendedor haya subido o no su portada, así que la página no
 * se reacomoda entera el día que la sube.
 *
 * `object-contain` y no `cover`: una portada de ebook es vertical y una foto de
 * producto es horizontal. Recortar la portada para llenar un rectángulo le come
 * el título, que es justo lo que hay que ver.
 */
export function Figura({
  url,
  alt,
  className,
  chico,
}: {
  url: string;
  alt: string;
  className?: string;
  chico?: boolean;
}) {
  if (!url) return <Hueco label={alt} className={className} chico={chico} />;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- la URL la pega el vendedor: puede ser de cualquier dominio.
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className={cn("w-full object-contain", className)}
      style={{ borderRadius: "var(--tf-radius-lg)" }}
    />
  );
}

/**
 * Lo que está pasando en la página ahora mismo, con datos reales.
 *
 * Es el único dato que un bloque no puede sacar de su propio contenido: la
 * gente que está mirando y las compras que ya se hicieron los sabe el servidor,
 * no el vendedor. Viaja aparte del `content` justamente por eso — nadie lo
 * puede editar a mano, que es lo que lo hace valer.
 *
 * Cuando no viene (el editor, una vista previa), los bloques que dependen de él
 * se dibujan explicando qué van a mostrar en vez de inventar un número.
 */
export interface LiveProofData {
  viewers: number;
  purchases: Array<{ name: string; place: string | null; at: string }>;
}
