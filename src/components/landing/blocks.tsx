import type { ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * Renderizador de secciones de landing.
 *
 * Se usa igual en el editor (preview) y en la página pública, así que lo que
 * ves editando es exactamente lo que ve el visitante.
 */

export interface SectionData {
  id: string;
  type: string;
  content: Record<string, unknown>;
}

export const SECTION_LIBRARY: Array<{
  type: string;
  label: string;
  group: "Estructura" | "Contenido" | "Conversión" | "Media";
  icon: Parameters<typeof Icon>[0]["name"];
  defaults: Record<string, unknown>;
}> = [
  {
    type: "hero",
    label: "Hero",
    group: "Estructura",
    icon: "star",
    defaults: {
      eyebrow: "Para quienes…",
      headline: "El resultado que promete tu oferta",
      subheadline: "Una línea que explique cómo lo consigue.",
      cta: "Quiero mi acceso",
    },
  },
  {
    type: "headline",
    label: "Titular",
    group: "Contenido",
    icon: "edit",
    defaults: { text: "Un titular que rompa la objeción principal" },
  },
  {
    type: "subheadline",
    label: "Subtítulo",
    group: "Contenido",
    icon: "edit",
    defaults: { text: "Una línea de apoyo que sume claridad." },
  },
  {
    type: "benefits",
    label: "Beneficios",
    group: "Contenido",
    icon: "check",
    defaults: { title: "Lo que te llevás", items: ["Primer beneficio", "Segundo beneficio"] },
  },
  {
    type: "features",
    label: "Características",
    group: "Contenido",
    icon: "layers",
    defaults: {
      title: "Cómo funciona",
      items: [
        { title: "1. Comprás", description: "Checkout simple." },
        { title: "2. Recibís", description: "Acceso inmediato." },
      ],
    },
  },
  {
    type: "mockup",
    label: "Mockup del producto",
    group: "Media",
    icon: "box",
    defaults: { title: "Así se ve por dentro", caption: "Vista del material" },
  },
  {
    type: "testimonials",
    label: "Testimonios",
    group: "Conversión",
    icon: "users",
    defaults: {
      title: "Lo que dicen",
      items: [{ name: "Nombre del cliente", text: "Reemplazá con un testimonio real." }],
      placeholder: true,
    },
  },
  {
    type: "faq",
    label: "Preguntas frecuentes",
    group: "Conversión",
    icon: "info",
    defaults: {
      title: "Preguntas frecuentes",
      items: [{ question: "¿Cómo lo recibo?", answer: "Es digital, te llega por mail." }],
    },
  },
  {
    type: "guarantee",
    label: "Garantía",
    group: "Conversión",
    icon: "shield",
    defaults: { title: "Garantía", text: "Escribí acá tu política de garantía." },
  },
  {
    type: "bonuses",
    label: "Bonos",
    group: "Conversión",
    icon: "gift",
    defaults: {
      title: "Además te llevás",
      items: [{ name: "Bono 1", description: "Qué incluye." }],
    },
  },
  {
    type: "pricing",
    label: "Precio",
    group: "Conversión",
    icon: "tag",
    defaults: { title: "Tu acceso hoy", price_label: "$0", cta: "Quiero mi acceso" },
  },
  {
    type: "comparison",
    label: "Comparativa",
    group: "Conversión",
    icon: "chart",
    defaults: {
      title: "Con esto vs. sin esto",
      with_title: "Con la guía",
      without_title: "Por tu cuenta",
      with_items: ["Método paso a paso"],
      without_items: ["Prueba y error"],
    },
  },
  {
    type: "countdown",
    label: "Contador",
    group: "Conversión",
    icon: "clock",
    defaults: { title: "La oferta cierra pronto", text: "Definí la fecha real de cierre." },
  },
  {
    type: "social_proof",
    label: "Prueba social",
    group: "Conversión",
    icon: "star",
    defaults: { text: "Espacio para prueba social real cuando la tengas.", placeholder: true },
  },
  {
    type: "video",
    label: "Video",
    group: "Media",
    icon: "video",
    defaults: { title: "Mirá cómo funciona", url: "" },
  },
  {
    type: "image",
    label: "Imagen",
    group: "Media",
    icon: "image",
    defaults: { alt: "Descripción de la imagen", url: "" },
  },
  {
    type: "cta",
    label: "Llamado a la acción",
    group: "Estructura",
    icon: "arrowRight",
    defaults: { headline: "Empezá hoy", cta: "Quiero mi acceso" },
  },
  {
    type: "footer",
    label: "Pie de página",
    group: "Estructura",
    icon: "file",
    defaults: { text: "© Tu marca. Todos los derechos reservados." },
  },
];

function str(content: Record<string, unknown>, key: string, fallback = ""): string {
  const value = content[key];
  return typeof value === "string" ? value : fallback;
}

function list<T>(content: Record<string, unknown>, key: string): T[] {
  const value = content[key];
  return Array.isArray(value) ? (value as T[]) : [];
}

export function LandingSectionView({
  section,
  accent = "#6D5DFB",
  ctaHref,
  priceLabel,
  compareLabel,
}: {
  section: SectionData;
  accent?: string;
  ctaHref?: string;
  priceLabel?: string;
  compareLabel?: string;
}) {
  const c = section.content ?? {};

  switch (section.type) {
    case "hero":
      return (
        <Band className="pt-14 pb-12 sm:pt-20 sm:pb-16">
          {str(c, "eyebrow") ? (
            <span
              className="inline-block rounded-full px-3 py-1 text-[12px] font-semibold"
              style={{ backgroundColor: `${accent}18`, color: accent }}
            >
              {str(c, "eyebrow")}
            </span>
          ) : null}
          <h1 className="mt-4 text-[32px] font-semibold leading-[1.1] tracking-tight text-ink-900 sm:text-[46px]">
            {str(c, "headline", "Tu titular principal")}
          </h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-ink-600 sm:text-[18px]">
            {str(c, "subheadline")}
          </p>
          <Cta label={str(c, "cta", "Quiero mi acceso")} href={ctaHref} accent={accent} large />
        </Band>
      );

    case "headline":
      return (
        <Band>
          <h2 className="text-[26px] font-semibold leading-tight tracking-tight text-ink-900 sm:text-[34px]">
            {str(c, "text")}
          </h2>
        </Band>
      );

    case "subheadline":
      return (
        <Band className="py-6">
          <p className="text-[17px] leading-relaxed text-ink-600">{str(c, "text")}</p>
        </Band>
      );

    case "benefits":
      return (
        <Band>
          <h2 className="text-[24px] font-semibold tracking-tight text-ink-900 sm:text-[30px]">
            {str(c, "title", "Lo que te llevás")}
          </h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {list<string>(c, "items").map((item, index) => (
              <li
                key={index}
                className="flex items-start gap-3 rounded-2xl border border-ink-200 bg-white p-4"
              >
                <span
                  className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-white"
                  style={{ backgroundColor: accent }}
                >
                  <Icon name="check" size={14} />
                </span>
                <span className="text-[15px] leading-relaxed text-ink-700">{item}</span>
              </li>
            ))}
          </ul>
        </Band>
      );

    case "features":
      return (
        <Band>
          <h2 className="text-[24px] font-semibold tracking-tight text-ink-900 sm:text-[30px]">
            {str(c, "title", "Cómo funciona")}
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {list<{ title: string; description: string }>(c, "items").map((item, index) => (
              <div key={index} className="rounded-2xl border border-ink-200 bg-white p-5">
                <p className="text-[16px] font-semibold text-ink-900">{item.title}</p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-ink-600">{item.description}</p>
              </div>
            ))}
          </div>
        </Band>
      );

    case "mockup":
      return (
        <Band>
          <h2 className="text-[24px] font-semibold tracking-tight text-ink-900">
            {str(c, "title", "Así se ve por dentro")}
          </h2>
          <div
            className="mt-6 grid aspect-[16/9] place-items-center rounded-3xl text-white"
            style={{ background: `linear-gradient(135deg, ${accent}, #22D3EE)` }}
          >
            <div className="text-center">
              <Icon name="box" size={40} className="mx-auto opacity-80" />
              <p className="mt-3 text-[14px] text-white/80">{str(c, "caption", "Vista del material")}</p>
            </div>
          </div>
        </Band>
      );

    case "bonuses":
      return (
        <Band>
          <h2 className="text-[24px] font-semibold tracking-tight text-ink-900 sm:text-[30px]">
            {str(c, "title", "Además te llevás")}
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {list<{ name: string; description: string }>(c, "items").map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-2xl border border-ink-200 bg-white p-4"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-50 text-accent-700">
                  <Icon name="gift" size={17} />
                </span>
                <div>
                  <p className="text-[15px] font-semibold text-ink-900">{item.name}</p>
                  {item.description ? (
                    <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink-600">
                      {item.description}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Band>
      );

    case "guarantee":
      return (
        <Band>
          <div className="flex flex-col items-start gap-4 rounded-3xl border border-accent-300/50 bg-accent-50 p-6 sm:flex-row sm:items-center">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-600 text-white">
              <Icon name="shield" size={22} />
            </span>
            <div>
              <p className="text-[18px] font-semibold text-ink-900">{str(c, "title", "Garantía")}</p>
              <p className="mt-1 text-[14.5px] leading-relaxed text-ink-700">{str(c, "text")}</p>
            </div>
          </div>
        </Band>
      );

    case "faq":
      return (
        <Band>
          <h2 className="text-[24px] font-semibold tracking-tight text-ink-900 sm:text-[30px]">
            {str(c, "title", "Preguntas frecuentes")}
          </h2>
          <div className="mt-6 flex flex-col gap-2">
            {list<{ question: string; answer: string }>(c, "items").map((item, index) => (
              <details
                key={index}
                className="group rounded-2xl border border-ink-200 bg-white px-5 py-4"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-semibold text-ink-900">
                  {item.question}
                  <Icon
                    name="chevronDown"
                    size={17}
                    className="shrink-0 text-ink-400 transition-transform group-open:rotate-180"
                  />
                </summary>
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </Band>
      );

    case "pricing":
      return (
        <Band>
          <div className="rounded-3xl border-2 p-7 text-center" style={{ borderColor: accent }}>
            <p className="text-[15px] font-medium text-ink-500">{str(c, "title", "Tu acceso hoy")}</p>
            <div className="mt-3 flex items-baseline justify-center gap-3">
              <span className="text-[40px] font-semibold tracking-tight text-ink-900">
                {priceLabel ?? str(c, "price_label", "$0")}
              </span>
              {(compareLabel ?? str(c, "compare_label")) ? (
                <span className="text-[18px] text-ink-400 line-through">
                  {compareLabel ?? str(c, "compare_label")}
                </span>
              ) : null}
            </div>
            <Cta label={str(c, "cta", "Quiero mi acceso")} href={ctaHref} accent={accent} large center />
          </div>
        </Band>
      );

    case "comparison":
      return (
        <Band>
          <h2 className="text-[24px] font-semibold tracking-tight text-ink-900 sm:text-[30px]">
            {str(c, "title")}
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border-2 p-5" style={{ borderColor: accent }}>
              <p className="text-[15px] font-semibold text-ink-900">{str(c, "with_title")}</p>
              <ul className="mt-3 flex flex-col gap-2">
                {list<string>(c, "with_items").map((item, index) => (
                  <li key={index} className="flex gap-2 text-[14px] text-ink-700">
                    <Icon name="check" size={16} className="mt-0.5 shrink-0 text-accent-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-ink-200 bg-ink-50 p-5">
              <p className="text-[15px] font-semibold text-ink-600">{str(c, "without_title")}</p>
              <ul className="mt-3 flex flex-col gap-2">
                {list<string>(c, "without_items").map((item, index) => (
                  <li key={index} className="flex gap-2 text-[14px] text-ink-500">
                    <Icon name="x" size={16} className="mt-0.5 shrink-0 text-ink-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Band>
      );

    case "countdown":
      return (
        <Band>
          <div className="rounded-2xl bg-ink-900 p-6 text-center text-white">
            <p className="text-[18px] font-semibold">{str(c, "title")}</p>
            <p className="mt-1.5 text-[14px] text-white/70">{str(c, "text")}</p>
          </div>
        </Band>
      );

    case "testimonials": {
      const items = list<{ name: string; text: string }>(c, "items");
      return (
        <Band>
          <h2 className="text-[24px] font-semibold tracking-tight text-ink-900 sm:text-[30px]">
            {str(c, "title", "Lo que dicen")}
          </h2>
          {c.placeholder ? (
            <p className="mt-3 rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-[13.5px] text-amber-800">
              Espacio reservado para testimonios. Cargá solo testimonios reales de tus clientes.
            </p>
          ) : null}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {items.map((item, index) => (
              <blockquote key={index} className="rounded-2xl border border-ink-200 bg-white p-5">
                <p className="text-[14.5px] leading-relaxed text-ink-700">“{item.text}”</p>
                <footer className="mt-3 text-[13px] font-semibold text-ink-900">{item.name}</footer>
              </blockquote>
            ))}
          </div>
        </Band>
      );
    }

    case "social_proof":
      return (
        <Band className="py-8">
          <div className="rounded-2xl border border-dashed border-ink-300 bg-ink-50 px-5 py-4 text-center text-[13.5px] text-ink-500">
            {str(c, "text", "Espacio para prueba social real cuando la tengas.")}
          </div>
        </Band>
      );

    case "video":
      return (
        <Band>
          <h2 className="text-[24px] font-semibold tracking-tight text-ink-900">{str(c, "title")}</h2>
          <div className="mt-5 grid aspect-video place-items-center rounded-2xl bg-ink-900 text-white/70">
            {str(c, "url") ? (
              <a href={str(c, "url")} className="text-[14px] underline underline-offset-4">
                Ver el video
              </a>
            ) : (
              <div className="text-center">
                <Icon name="play" size={36} className="mx-auto opacity-60" />
                <p className="mt-2 text-[13px]">Pegá la URL del video en el panel de propiedades.</p>
              </div>
            )}
          </div>
        </Band>
      );

    case "image":
      return (
        <Band>
          <div className="grid aspect-[16/9] place-items-center rounded-2xl border border-dashed border-ink-300 bg-ink-50 text-ink-400">
            <div className="text-center">
              <Icon name="image" size={32} className="mx-auto" />
              <p className="mt-2 text-[13px]">{str(c, "alt", "Imagen")}</p>
              <p className="mt-0.5 text-[11.5px]">
                El almacenamiento de imágenes todavía no está conectado.
              </p>
            </div>
          </div>
        </Band>
      );

    case "cta":
      return (
        <Band className="py-14">
          <div
            className="rounded-3xl px-6 py-10 text-center text-white"
            style={{ background: `linear-gradient(135deg, ${accent}, #4338CA)` }}
          >
            <h2 className="text-[26px] font-semibold tracking-tight sm:text-[32px]">
              {str(c, "headline", "Empezá hoy")}
            </h2>
            <Cta label={str(c, "cta", "Quiero mi acceso")} href={ctaHref} accent="#FFFFFF" large center inverted />
          </div>
        </Band>
      );

    case "footer":
      return (
        <Band className="py-8">
          <p className="border-t border-ink-200 pt-6 text-center text-[13px] text-ink-400">
            {str(c, "text")}
          </p>
        </Band>
      );

    default:
      return (
        <Band className="py-6">
          <p className="rounded-xl border border-dashed border-ink-300 px-4 py-3 text-[13px] text-ink-500">
            Sección “{section.type}” sin renderizador.
          </p>
        </Band>
      );
  }
}

function Band({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("px-5 py-10 sm:px-8 sm:py-12", className)}>
      <div className="mx-auto w-full max-w-3xl">{children}</div>
    </section>
  );
}

function Cta({
  label,
  href,
  accent,
  large,
  center,
  inverted,
}: {
  label: string;
  href?: string;
  accent: string;
  large?: boolean;
  center?: boolean;
  inverted?: boolean;
}) {
  const className = cn(
    "mt-6 inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-transform active:scale-[.98]",
    large ? "px-7 py-4 text-[16px]" : "px-5 py-3 text-[14px]",
    center && "mx-auto flex w-full max-w-sm",
  );
  const style = inverted
    ? { backgroundColor: "#FFFFFF", color: "#4338CA" }
    : { backgroundColor: accent, color: "#FFFFFF" };

  if (!href) {
    return (
      <span className={className} style={style} aria-hidden="true">
        {label}
      </span>
    );
  }

  return (
    <a href={href} className={className} style={style}>
      {label}
      <Icon name="arrowRight" size={18} />
    </a>
  );
}
