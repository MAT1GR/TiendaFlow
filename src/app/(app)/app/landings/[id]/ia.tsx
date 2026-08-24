"use client";

import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/feedback";
import { Button, Field, Input, Modal, Select, Textarea } from "@/components/ui/primitives";

/**
 * El brief: tres preguntas y la página sale escrita.
 *
 * Antes esto era un desplegable de tono y nada más. El modelo escribía con lo
 * que hubiera cargado en el producto, que muchas veces era el nombre y poco
 * más, y devolvía una página correcta y vacía. La diferencia entre una landing
 * que vende y una que no está casi entera en estas tres respuestas —a quién le
 * hablás, de qué lo salvás y en qué lo convertís—, así que se preguntan acá,
 * en criollo, en vez de esperar que alguien las haya completado tres pantallas
 * atrás.
 *
 * Vienen precargadas con lo que ya cargó en su producto. Si está todo, es
 * apretar un botón; si falta algo, el hueco se ve y se llena en el momento.
 */

export interface LandingBrief {
  audience: string;
  problem: string;
  transformation: string;
}

const TONOS = [
  { value: "directo", label: "Directo y enérgico" },
  { value: "cercano", label: "Cercano y conversacional" },
  { value: "profesional", label: "Profesional y simple" },
  { value: "inspirador", label: "Inspirador" },
];

export function AiModal({
  open,
  onClose,
  onGenerate,
  loading,
  hasOffer,
  hasSections,
  initial,
  cover,
}: {
  open: boolean;
  onClose: () => void;
  onGenerate: (tone: string, brief: LandingBrief) => void;
  loading: boolean;
  hasOffer: boolean;
  /** Si ya hay bloques escritos, se avisa que se reemplazan. */
  hasSections: boolean;
  initial: LandingBrief;
  /**
   * La portada del producto y dónde se carga.
   *
   * Va vacío cuando el editor se abre suelto, fuera del espacio de trabajo de
   * un producto: ahí no hay ficha de producto adónde mandar a nadie.
   */
  cover?: { url: string | null; href: string };
}) {
  const [tone, setTone] = useState("directo");
  const [brief, setBrief] = useState<LandingBrief>(initial);

  // Si el vendedor edita su producto en otra pestaña y vuelve, el brief tiene
  // que reflejar lo último que cargó, no lo que había cuando se montó el modal.
  useEffect(() => {
    if (open) setBrief(initial);
  }, [open, initial.audience, initial.problem, initial.transformation]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch: Partial<LandingBrief>) => setBrief((actual) => ({ ...actual, ...patch }));
  const listo = brief.problem.trim().length > 2 && brief.transformation.trim().length > 2;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Creemos tu página de venta"
      description="Contanos un poco sobre tu producto y la escribimos entera."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="ai"
            icon="sparkles"
            loading={loading}
            disabled={!listo}
            onClick={() => onGenerate(tone, brief)}
          >
            Crear mi página
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field
          label="¿Qué problema ayuda a resolver?"
          hint="Escribilo como lo diría tu cliente, no como lo dirías vos."
        >
          <Textarea
            rows={2}
            value={brief.problem}
            placeholder="Me duele la espalda todo el día y vivo a base de analgésicos."
            onChange={(event) => set({ problem: event.target.value })}
          />
        </Field>

        <Field label="¿Qué resultado obtiene la persona?" hint="Dónde está después de usar tu producto.">
          <Textarea
            rows={2}
            value={brief.transformation}
            placeholder="Puede aliviar sus propios dolores en casa, sin depender de turnos."
            onChange={(event) => set({ transformation: event.target.value })}
          />
        </Field>

        <Field label="¿A quién está dirigido?">
          <Input
            value={brief.audience}
            placeholder="Personas de 35 a 60 con dolores crónicos"
            onChange={(event) => set({ audience: event.target.value })}
          />
        </Field>

        <Field label="Tono">
          <Select value={tone} onChange={(event) => setTone(event.target.value)}>
            {TONOS.map((opcion) => (
              <option key={opcion.value} value={opcion.value}>
                {opcion.label}
              </option>
            ))}
          </Select>
        </Field>

        {cover && !cover.url ? (
          <Alert tone="warning">
            Tu producto todavía no tiene portada. La página se arma alrededor de esa imagen —el
            encabezado, la presentación, el precio y el último llamado la usan—, así que sin ella
            va a salir solo con texto.{" "}
            <a href={cover.href} className="font-semibold underline underline-offset-2">
              Cargala en tu producto
            </a>{" "}
            y volvé.
          </Alert>
        ) : null}

        {!hasOffer ? (
          <Alert tone="warning">
            Esta página todavía no tiene un precio asociado, así que la parte de la oferta va a
            salir genérica. Cargá tu oferta y volvé a generarla para que quede completa.
          </Alert>
        ) : null}

        {/* El aviso solo aparece cuando hay algo que perder. Mostrarlo sobre una
            página vacía es enseñarle a la gente a ignorar los avisos. */}
        {hasSections ? (
          <Alert tone="warning">
            Se reemplaza todo lo que hay escrito en la página. Si querés conservar algo, copialo
            antes.
          </Alert>
        ) : null}
      </div>
    </Modal>
  );
}
