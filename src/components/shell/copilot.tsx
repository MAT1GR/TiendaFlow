"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { askCopilotAction } from "@/app/actions/ai";
import { Icon } from "@/components/ui/icon";
import { Badge, Button, Drawer, Spinner, Textarea } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  text: string;
  bullets?: string[];
  isTemplate?: boolean;
  links?: Array<{ label: string; href: string }>;
}

/** Sugerencias según en qué parte de la app está el usuario. */
const SUGGESTIONS: Record<string, string[]> = {
  productos: [
    "Mejorá la descripción de mi producto.",
    "¿Qué bonos le puedo sumar?",
    "Escribime un subtítulo más claro.",
  ],
  ofertas: [
    "Creá una oferta más atractiva.",
    "¿A qué precio conviene el order bump?",
    "Reescribí mi garantía.",
  ],
  funnels: [
    "Analizá este funnel.",
    "¿Dónde estoy perdiendo más gente?",
    "¿Qué paso agrego después del checkout?",
  ],
  analytics: [
    "¿Por qué bajaron mis conversiones?",
    "¿Cómo viene mi ROAS?",
    "¿Qué campaña rinde mejor?",
  ],
  landings: [
    "Escribí un nuevo hero.",
    "Hacé el CTA más directo.",
    "¿Qué sección me falta?",
  ],
  default: [
    "¿Por dónde arranco?",
    "¿Qué me falta para lanzar?",
    "Dame ideas para mi próxima oferta.",
  ],
};

function moduleFromPath(pathname: string): string {
  const segment = pathname.split("/")[2] ?? "";
  if (segment in SUGGESTIONS) return segment;
  if (segment === "ia") return "default";
  return segment || "default";
}

export function Copilot({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const moduleName = moduleFromPath(pathname);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(
    () => SUGGESTIONS[moduleName] ?? SUGGESTIONS.default,
    [moduleName],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(question: string) {
    const text = question.trim();
    if (!text || loading) return;

    setMessages((current) => [...current, { role: "user", text }]);
    setInput("");
    setLoading(true);

    const result = await askCopilotAction(text, {
      module: moduleName,
      entityId: pathname.split("/")[3],
    });

    setLoading(false);

    if (!result.ok) {
      setMessages((current) => [...current, { role: "assistant", text: result.error }]);
      return;
    }

    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        text: result.data.answer,
        bullets: result.data.bullets,
        isTemplate: result.data.isTemplate,
        links: result.data.links,
      },
    ]);
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="TiendaFlow AI"
      width="max-w-md"
      footer={
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send(input);
          }}
          className="flex items-end gap-2"
        >
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send(input);
              }
            }}
            rows={2}
            placeholder={`Preguntá algo sobre ${moduleName === "default" ? "tu negocio" : moduleName}…`}
            className="min-h-11 flex-1 resize-none"
            aria-label="Mensaje para TiendaFlow AI"
          />
          <Button type="submit" variant="ai" icon="arrowRight" loading={loading} aria-label="Enviar">
            <span className="sr-only">Enviar</span>
          </Button>
        </form>
      }
    >
      <div ref={scrollRef} className="flex flex-col gap-4">
        <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-4">
          <div className="flex items-center gap-2">
            <span className="tf-gradient-ai grid size-7 place-items-center rounded-lg text-white">
              <Icon name="sparkles" size={15} />
            </span>
            <p className="text-[13.5px] font-semibold text-ink-900">
              Estoy viendo tu sección de {moduleName === "default" ? "TiendaFlow" : moduleName}
            </p>
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-600">
            Uso los datos reales de tu workspace para responder. Si algo no tiene datos suficientes,
            te lo digo en vez de inventarlo.
          </p>
        </div>

        {messages.length === 0 ? (
          <div>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-400">
              Probá con
            </p>
            <div className="flex flex-col gap-1.5">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void send(suggestion)}
                  className="rounded-xl border border-ink-200 px-3.5 py-2.5 text-left text-[13px] text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50/50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              "max-w-[92%] rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed",
              message.role === "user"
                ? "ml-auto bg-brand-600 text-white"
                : "border border-ink-200 bg-white text-ink-800",
            )}
          >
            <p className="whitespace-pre-wrap">{message.text}</p>

            {message.bullets?.length ? (
              <ul className="mt-3 flex flex-col gap-1 border-t border-ink-100 pt-3">
                {message.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2 text-[12.5px] text-ink-600">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-brand-400" />
                    {bullet}
                  </li>
                ))}
              </ul>
            ) : null}

            {message.links?.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {message.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={onClose}
                    className="rounded-lg bg-ink-100 px-2.5 py-1 text-[12px] font-medium text-ink-700 hover:bg-ink-200"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ) : null}

            {message.role === "assistant" && message.isTemplate ? (
              <div className="mt-3">
                <Badge tone="warning">Sin proveedor de IA conectado</Badge>
              </div>
            ) : null}
          </div>
        ))}

        {loading ? (
          <div className="flex items-center gap-2 text-[13px] text-ink-500">
            <Spinner size={14} /> Pensando…
          </div>
        ) : null}
      </div>
    </Drawer>
  );
}
