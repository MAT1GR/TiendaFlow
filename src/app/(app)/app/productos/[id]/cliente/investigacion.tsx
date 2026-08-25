"use client";

import { useState } from "react";

import {
  generateAnglesAction,
  generateHeadlinesAction,
  generateIdealClientAction,
  generateObjectionsAction,
} from "@/app/actions/ai";
import { AiProgress, useAiProgress } from "@/components/app/ai-progress";
import { TemplateNotice } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { Badge, Button, Card, CardHeader, useToast } from "@/components/ui/primitives";
import { EJES, findEje } from "@/lib/ai/playbook";
import type {
  AnglesDraft,
  HeadlinesDraft,
  IdealClientResearch,
  ObjectionsDraft,
} from "@/lib/ai/tasks";

/**
 * Conocer a quién le vendés.
 *
 * Esta pantalla existe porque el resto de la app le venía pidiendo al vendedor
 * que escribiera copy antes de saber a quién se lo escribía. "Audiencia",
 * "problema principal" y "transformación" son tres campos de un formulario, y
 * con tres campos salen páginas correctas y vacías.
 *
 * Son cuatro cosas y salen de un solo botón, en este orden:
 *
 *  1. El cliente ideal — quién es, qué le duele, qué se dice en la cabeza.
 *  2. Los ángulos — los motivos por los que compraría, uno por cada eje.
 *  3. Los titulares — la promesa, en las cinco formas que se puede decir.
 *  4. Las objeciones — lo que lo frena, con qué contestarle.
 *
 * En este orden y no en paralelo porque las tres últimas leen la primera: el
 * servidor la busca guardada antes de armar el prompt. Pedidas sueltas salen
 * hablándole a nadie; pedidas en cadena, las cuatro hablan de la misma persona.
 *
 * Un botón y no cuatro porque las cuatro son la misma pregunta —¿a quién le
 * vendo?— partida en pedazos por una razón técnica que al vendedor no le
 * importa. Lo que sí le importa es cuánto falta, y de eso se ocupa la barra.
 */

export function InvestigacionCliente({
  productId,
  research,
  productName,
}: {
  productId: string;
  /** La última investigación guardada, si ya la hizo. */
  research: IdealClientResearch | null;
  productName: string;
}) {
  const toast = useToast();
  const ai = useAiProgress();

  const [avatar, setAvatar] = useState<IdealClientResearch | null>(research);
  const [angles, setAngles] = useState<AnglesDraft | null>(null);
  const [headlines, setHeadlines] = useState<HeadlinesDraft | null>(null);
  const [objections, setObjections] = useState<ObjectionsDraft | null>(null);

  const [aviso, setAviso] = useState<string | undefined>();
  const [esBorrador, setEsBorrador] = useState(false);

  /**
   * Un paso de la investigación.
   *
   * Los cuatro hacen lo mismo: llamar a su acción, guardar el resultado y
   * quedarse con el aviso si el proveedor no estaba conectado. Devuelve `false`
   * cuando falla, y con eso la barra corta la cadena: si no se pudo investigar
   * al cliente, seguir con los ángulos es gastar tres pedidos más para escribir
   * lo mismo que ya sabíamos.
   */
  function paso<T>(
    accion: () => Promise<
      | { ok: true; data: { data: T; isTemplate: boolean; warning?: string } }
      | { ok: false; error: string }
    >,
    guardar: (data: T) => void,
  ) {
    return async () => {
      const result = await accion();

      if (!result.ok) {
        toast.error(result.error);
        return false;
      }

      guardar(result.data.data);
      if (result.data.isTemplate) setEsBorrador(true);
      if (result.data.warning) setAviso(result.data.warning);
      return true;
    };
  }

  function investigar() {
    setAviso(undefined);
    setEsBorrador(false);

    return ai.runAll([
      {
        label: "Investigando a tu cliente",
        run: paso(() => generateIdealClientAction(productId), setAvatar),
      },
      {
        label: "Buscando tus ángulos de venta",
        run: paso(() => generateAnglesAction(productId), setAngles),
      },
      {
        label: "Escribiendo tus titulares",
        run: paso(() => generateHeadlinesAction(productId), setHeadlines),
      },
      {
        label: "Anticipando las objeciones",
        run: paso(() => generateObjectionsAction(productId), setObjections),
      },
    ]);
  }

  const yaHay = Boolean(avatar || angles || headlines || objections);

  return (
    <div className="flex flex-col gap-5">
      {/* --------------------------------------------------- El único botón */}

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold tracking-tight text-ink-900">
              {yaHay ? "Volver a investigar" : "Investigá a tu cliente"}
            </h2>
            <p className="mt-1 max-w-xl text-[13.5px] leading-relaxed text-ink-500">
              De una sola vez: quién compra <strong>{productName}</strong>, por qué motivos lo
              compraría, con qué titulares hablarle y qué lo frena. Son cuatro pedidos a la IA,
              uno atrás del otro, porque cada uno usa lo que averiguó el anterior.
            </p>
          </div>

          <Button variant="ai" icon="sparkles" loading={ai.running} onClick={investigar}>
            {yaHay ? "Investigar de nuevo" : "Investigar todo"}
          </Button>
        </div>

        <AiProgress
          running={ai.running}
          progress={ai.progress}
          label={ai.label}
          className="mt-4"
        />
      </Card>

      {aviso ? <TemplateNotice warning={aviso} /> : null}

      {/* ------------------------------------------------ 1. El cliente ideal */}

      <Card>
        <CardHeader
          title="Tu cliente ideal"
          subtitle="Quién es la persona que compra esto, qué le duele y qué se dice en la cabeza."
        />

        <div className="p-5 pt-4">
          {avatar ? (
            <Avatar research={avatar} borrador={esBorrador} />
          ) : (
            <Vacio texto="Acá va a quedar la persona a la que le vendés: cómo es su día, qué le duele, qué se dice en la cabeza y qué la hace comprar. De esto cuelga todo lo demás." />
          )}
        </div>
      </Card>

      {/* ------------------------------------------------------- 2. Ángulos */}

      <Card>
        <CardHeader
          title="Tus ángulos de venta"
          subtitle="Los motivos distintos por los que alguien compraría esto. Dos por cada eje."
        />

        <div className="p-5 pt-4">
          {angles?.angles.length ? (
            <ul className="flex flex-col gap-3">
              {angles.angles.map((angle, index) => {
                const eje = findEje(angle.eje) ?? EJES[0];
                return (
                  <li key={index} className="rounded-2xl border border-ink-200 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="tf-emoji !text-[15px]" aria-hidden="true">
                        {eje.emoji}
                      </span>
                      <span className="text-[13px] font-semibold text-ink-900">{angle.name}</span>
                      <Badge tone="neutral">{eje.label}</Badge>
                    </div>

                    <p className="mt-3 text-[15.5px] font-bold leading-snug text-ink-900">
                      {angle.hook}
                    </p>
                    <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-ink-600">
                      {angle.body}
                    </p>
                    <p className="mt-2.5 text-[13.5px] font-semibold text-brand-700">{angle.cta}</p>

                    {angle.speaks_to ? (
                      <p className="mt-3 border-t border-ink-100 pt-2.5 text-[12px] text-ink-400">
                        Le habla a: {angle.speaks_to}
                      </p>
                    ) : null}

                    <Copiar
                      texto={`${angle.hook}\n\n${angle.body}\n\n${angle.cta}`}
                      onCopiado={() => toast.success("Ángulo copiado")}
                    />
                  </li>
                );
              })}
            </ul>
          ) : (
            <Vacio texto="Un ángulo es un gancho, un cuerpo y un llamado a la acción. Sirven para tus anuncios y para el encabezado de tu página." />
          )}
        </div>
      </Card>

      {/* ----------------------------------------------------- 3. Titulares */}

      <Card>
        <CardHeader
          title="Titulares y promesas"
          subtitle="Acción, tiempo y resultado. Cinco formas distintas de decir lo que prometés."
        />

        <div className="p-5 pt-4">
          {headlines?.pairs.length ? (
            <ul className="flex flex-col gap-2.5">
              {headlines.pairs.map((pair, index) => (
                <li key={index} className="rounded-2xl border border-ink-200 p-4">
                  <p className="text-[16px] font-bold leading-snug tracking-tight text-ink-900">
                    {pair.headline}
                  </p>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-500">
                    {pair.subheadline}
                  </p>
                  <Copiar
                    texto={`${pair.headline}\n${pair.subheadline}`}
                    onCopiado={() => toast.success("Titular copiado")}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <Vacio texto="El titular decide si el resto de tu página se lee. Van de a pares con su subtítulo: uno sin el otro no se puede evaluar." />
          )}
        </div>
      </Card>

      {/* ---------------------------------------------------- 4. Objeciones */}

      <Card>
        <CardHeader
          title="Lo que lo frena"
          subtitle="Las dudas que se lleva sin preguntarte, y con qué contestarle antes."
        />

        <div className="p-5 pt-4">
          {objections?.items.length ? (
            <ul className="flex flex-col gap-2.5">
              {objections.items.map((item, index) => (
                <li key={index} className="rounded-2xl border border-ink-200 p-4">
                  <p className="text-[14.5px] font-bold leading-snug text-ink-900">
                    “{item.objection}”
                  </p>
                  <ul className="mt-3 flex flex-col gap-2">
                    {item.answers.map((answer, i) => (
                      <li key={i} className="flex gap-2.5">
                        <span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-accent-50 text-accent-700">
                          <Icon name="check" size={12} />
                        </span>
                        <span className="text-[13.5px] leading-relaxed text-ink-600">{answer}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <Vacio texto="Cada objeción sin responder es una venta que se va en silencio. Estas respuestas van en tus preguntas frecuentes y cuando te escriben por privado." />
          )}
        </div>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * El avatar, para leerlo de corrido.
 *
 * Se muestra entero y sin plegar a propósito: es material de consulta mientras
 * escribís lo demás, y un acordeón obliga a abrir cinco cosas cada vez que
 * volvés. Las frases que se dice en la cabeza van destacadas porque son las que
 * más se usan: de ahí salen los titulares y los ganchos casi textuales.
 */
function Avatar({ research, borrador }: { research: IdealClientResearch; borrador: boolean }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-[17px] font-bold leading-snug tracking-tight text-ink-900">
          {research.headline}
        </p>
        {borrador ? (
          <Badge tone="warning" className="mt-2">
            Borrador local
          </Badge>
        ) : null}
      </div>

      <Parrafo titulo="Quién es" texto={research.profile} />
      <Parrafo titulo="Cómo es su día" texto={research.daily_life} />
      <Parrafo titulo="Su problema principal" texto={research.main_problem} />

      {research.inner_thoughts?.length ? (
        <div>
          <Titulo>Lo que se dice en la cabeza</Titulo>
          <ul className="mt-2.5 flex flex-col gap-2">
            {research.inner_thoughts.map((thought, index) => (
              <li
                key={index}
                className="rounded-xl border-l-2 border-brand-300 bg-brand-50/50 px-3.5 py-2.5 text-[14px] italic leading-relaxed text-ink-700"
              >
                “{thought.replace(/^[“"]|[”"]$/g, "")}”
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Lista titulo="Lo que le duele" items={research.pains} emoji="😖" />
        <Lista titulo="Lo que quiere" items={research.desires} emoji="✨" />
        <Lista titulo="Lo que no le cuenta a nadie" items={research.hidden_fears} emoji="🤐" />
        <Lista titulo="Lo que lo hace comprar" items={research.buying_triggers} emoji="⚡" />
      </div>

      {research.failed_attempts?.length ? (
        <div>
          <Titulo>Lo que ya probó y no le funcionó</Titulo>
          <ul className="mt-2.5 flex flex-col gap-2">
            {research.failed_attempts.map((attempt, index) => (
              <li key={index} className="rounded-xl border border-ink-200 px-3.5 py-2.5">
                <p className="text-[13.5px] font-semibold text-ink-900">{attempt.attempt}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-500">
                  {attempt.why_failed}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {research.objections?.length ? (
        <Lista titulo="Lo que lo frena" items={research.objections} emoji="🛑" />
      ) : null}

      {research.before_after?.length ? (
        <div>
          <Titulo>Antes y después</Titulo>
          <ul className="mt-2.5 flex flex-col gap-2">
            {research.before_after.map((row, index) => (
              <li
                key={index}
                className="grid gap-2 rounded-xl border border-ink-200 p-3.5 sm:grid-cols-[1fr_auto_1fr] sm:items-center"
              >
                <span className="text-[13.5px] leading-relaxed text-ink-500">{row.before}</span>
                <Icon
                  name="arrowRight"
                  size={15}
                  className="hidden shrink-0 text-ink-300 sm:block"
                />
                <span className="text-[13.5px] font-semibold leading-relaxed text-ink-900">
                  {row.after}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Titulo({ children }: { children: string }) {
  return (
    <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-ink-400">{children}</h3>
  );
}

function Parrafo({ titulo, texto }: { titulo: string; texto: string }) {
  if (!texto?.trim()) return null;
  return (
    <div>
      <Titulo>{titulo}</Titulo>
      <p className="mt-1.5 text-[14px] leading-relaxed text-ink-700">{texto}</p>
    </div>
  );
}

function Lista({ titulo, items, emoji }: { titulo: string; items?: string[]; emoji: string }) {
  if (!items?.length) return null;
  return (
    <div>
      <Titulo>{titulo}</Titulo>
      <ul className="mt-2 flex flex-col gap-1.5">
        {items.map((item, index) => (
          <li key={index} className="flex gap-2 text-[13.5px] leading-relaxed text-ink-600">
            <span className="tf-emoji !text-[13px] shrink-0" aria-hidden="true">
              {emoji}
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Vacio({ texto }: { texto: string }) {
  return <p className="text-[13.5px] leading-relaxed text-ink-500">{texto}</p>;
}

/**
 * Copiar al portapapeles.
 *
 * Un ángulo y un titular no se editan acá: se llevan al anuncio o a la página.
 * El botón es lo que convierte esta pantalla en una herramienta y no en un
 * informe que hay que seleccionar con el mouse.
 */
function Copiar({ texto, onCopiado }: { texto: string; onCopiado: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(texto).then(onCopiado);
      }}
      className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-400 transition-colors hover:text-brand-700"
    >
      <Icon name="copy" size={13} />
      Copiar
    </button>
  );
}
