import Link from "next/link";
import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/data";
import { Alert } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { Badge, Card, CardHeader } from "@/components/ui/primitives";
import { aiStatus } from "@/lib/ai/provider";
import { requireSession } from "@/lib/auth";
import { listAiGenerations } from "@/lib/repo";
import { relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "IA" };

const TASK_LABEL: Record<string, string> = {
  product_draft: "Borrador de producto",
  offer_draft: "Propuesta de oferta",
  landing_draft: "Página de venta generada",
  funnel_analysis: "Análisis de tu página",
  ad_copy: "Textos para anuncios",
  copilot: "Consulta a la IA",
  ideal_client: "Investigación del cliente ideal",
  sales_angles: "Ángulos de venta",
  headlines: "Titulares y promesas",
  objections: "Objeciones y respuestas",
  rewrite_improve: "Texto mejorado",
  rewrite_expand: "Texto ampliado",
  rewrite_shorten: "Texto acortado",
  rewrite_tone: "Cambio de tono",
};

/**
 * Cada cosa que la IA puede hacer, escrita como la diría el usuario.
 *
 * No es un chat vacío esperando un prompt: es una lista de tareas concretas.
 * Las que necesitan un producto pasan por `/app/crear/…`, que pregunta cuál y
 * te deja adentro de la sección correcta. Así la IA siempre trabaja con
 * contexto en vez de generar texto en el aire.
 */
const TASKS: Array<{ emoji: string; title: string; description: string; href: string }> = [
  {
    emoji: "📕",
    title: "Crear un producto",
    description: "De una idea a título, índice, capítulos, beneficios y preguntas frecuentes.",
    href: "/app/productos/nuevo?fuente=ia",
  },
  {
    emoji: "🎯",
    title: "Conocer a mi cliente",
    description: "Quién compra esto, qué le duele, qué lo frena y con qué palabras hablarle.",
    href: "/app/crear/cliente",
  },
  {
    emoji: "🎣",
    title: "Encontrar mis ángulos",
    description: "Los motivos distintos por los que alguien lo compraría, con gancho y cierre.",
    href: "/app/crear/cliente",
  },
  {
    emoji: "✍️",
    title: "Escribir mis titulares",
    description: "La promesa en cinco formas: acción, tiempo y resultado concreto.",
    href: "/app/crear/cliente",
  },
  {
    emoji: "💰",
    title: "Crear una oferta",
    description: "Promesa, beneficios y precio para que sea difícil de rechazar.",
    href: "/app/crear/oferta",
  },
  {
    emoji: "🎁",
    title: "Crear bonos",
    description: "Regalos que acompañan la compra y suben el valor de lo que ofrecés.",
    href: "/app/crear/bono",
  },
  {
    emoji: "🛍️",
    title: "Crear mi página de venta",
    description: "La página completa, sección por sección, con tus datos reales.",
    href: "/app/crear/pagina",
  },
  {
    emoji: "📣",
    title: "Crear anuncios",
    description: "Ganchos, textos, títulos y llamadas a la acción para Meta.",
    href: "/app/marketing",
  },
  {
    emoji: "📊",
    title: "Analizar mis ventas",
    description: "Qué está funcionando, dónde se te escapa la gente y qué probar primero.",
    href: "/app/productos",
  },
  {
    emoji: "🚀",
    title: "Preparar mi producto para vender",
    description: "Te dice exactamente qué le falta a cada producto para poder cobrar.",
    href: "/app/productos",
  },
];

export default async function AiPage() {
  const { workspace } = await requireSession();
  const status = aiStatus();
  const history = listAiGenerations(workspace.id, 8);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="IA"
        subtitle="Contale qué querés hacer y lo escribe, lo arma o lo analiza por vos."
      />

      <section>
        <h2 className="flex items-center gap-2 text-[16px] font-semibold tracking-tight text-ink-900">
          <span className="tf-emoji" aria-hidden="true">
            ✨
          </span>
          ¿Qué querés hacer?
        </h2>

        <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {TASKS.map((task, index) => (
            <li
              key={task.title}
              className="tf-enter"
              style={{ "--tf-delay": `${Math.min(index, 8) * 40}ms` } as React.CSSProperties}
            >
              <Link
                href={task.href}
                className="group flex h-full flex-col rounded-2xl border border-ink-200 bg-white p-5 transition-all duration-200 hover:border-brand-300 hover:shadow-lift"
              >
                <span
                  className="tf-emoji !inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 !text-[24px]"
                  aria-hidden="true"
                >
                  {task.emoji}
                </span>

                <h3 className="mt-4 text-[16px] font-semibold leading-snug tracking-tight text-ink-900">
                  {task.title}
                </h3>
                <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-ink-500">
                  {task.description}
                </p>

                <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-700">
                  Empezar
                  <Icon
                    name="arrowRight"
                    size={14}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="rounded-2xl border border-ink-200 bg-ink-50/60 px-5 py-4 text-[13.5px] leading-relaxed text-ink-600">
        <span className="tf-emoji mr-1.5" aria-hidden="true">
          💡
        </span>
        Adentro de cada producto la IA aparece donde la necesitás: para mejorar una descripción,
        escribir beneficios o revisar tu página. No hace falta volver acá.
      </p>

      {!status.configured ? (
        <Alert tone="info" title="Estás usando borradores locales">
          Todavía no hay un proveedor de IA conectado, así que armamos los borradores con los datos
          que ya cargaste y te lo avisamos en cada resultado. Para generación real, agregá{" "}
          <code className="rounded bg-ink-100 px-1 py-0.5 text-[12px]">GEMINI_API_KEY</code> o{" "}
          <code className="rounded bg-ink-100 px-1 py-0.5 text-[12px]">ANTHROPIC_API_KEY</code> al
          archivo <code className="rounded bg-ink-100 px-1 py-0.5 text-[12px]">.env.local</code> de
          la raíz del proyecto y reiniciá el servidor: la clave se lee al arrancar. Nunca se
          expone al navegador.
        </Alert>
      ) : null}

      {history.length > 0 ? (
        <Card>
          <CardHeader
            title="Lo último que generaste"
            subtitle="Guardamos cada generación para que puedas volver a lo anterior."
          />
          <div className="p-5 pt-4">
            <ul className="flex flex-col gap-2">
              {history.map((generation) => (
                <li
                  key={generation.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-200 px-4 py-3"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-500">
                    <Icon name="sparkles" size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-medium text-ink-900">
                      {TASK_LABEL[generation.task] ?? generation.task}
                    </span>
                    <span className="text-[11.5px] text-ink-400">
                      {relativeTime(generation.created_at)}
                    </span>
                  </span>
                  <Badge tone={generation.provider === "template" ? "warning" : "brand"}>
                    {generation.provider === "template" ? "Borrador local" : generation.provider}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
