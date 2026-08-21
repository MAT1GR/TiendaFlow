"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { applyOfferDraftAction, generateOfferDraftAction } from "@/app/actions/ai";
import { createOfferAction } from "@/app/actions/catalog";
import { MoreOptions, TermLabel } from "@/components/ui/explain";
import { Alert, TemplateNotice } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import {
  Button,
  Card,
  Checkbox,
  Field,
  Input,
  Select,
  Textarea,
  useToast,
} from "@/components/ui/primitives";
import type { OfferDraft } from "@/lib/ai/tasks";
import { withFlow } from "@/lib/product-flow";
import { formatMoney } from "@/lib/utils";

interface ProductOption {
  id: string;
  name: string;
  price: number;
  audience: string | null;
  problem: string | null;
  transformation: string | null;
}

export function NewOfferForm({
  products,
  currency,
  initialProductId,
  autoAi,
  enFlujo,
}: {
  products: ProductOption[];
  currency: string;
  initialProductId?: string;
  autoAi?: boolean;
  /** La persona está creando su producto de punta a punta: al guardar, sigue. */
  enFlujo?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [productId, setProductId] = useState(initialProductId ?? products[0]?.id ?? "");
  const product = products.find((item) => item.id === productId);

  const [form, setForm] = useState({
    name: "",
    headline: "",
    promise: "",
    benefits: "",
    cta_text: "Quiero mi acceso ahora",
    guarantee: "",
    price: String(product?.price || ""),
    compare_at_price: "",
  });

  const [draft, setDraft] = useState<OfferDraft | null>(null);
  const [isTemplate, setIsTemplate] = useState(false);
  const [warning, setWarning] = useState<string | undefined>();
  const [apply, setApply] = useState({ bonuses: true, bump: true, upsell: true });

  useEffect(() => {
    if (product && !form.name) {
      setForm((current) => ({
        ...current,
        name: `Oferta ${product.name}`,
        price: current.price || String(product.price || ""),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => {
    if (autoAi && productId) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function generate() {
    if (!productId) {
      setError("Elegí un producto antes de generar la oferta.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await generateOfferDraftAction(productId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const data = result.data.data;
      setDraft(data);
      setIsTemplate(result.data.isTemplate);
      setWarning(result.data.warning);
      setForm((current) => ({
        ...current,
        headline: data.headline ?? current.headline,
        promise: data.promise ?? current.promise,
        benefits: (data.benefits ?? []).join("\n") || current.benefits,
        cta_text: data.cta_text ?? current.cta_text,
        guarantee: data.guarantee ?? current.guarantee,
        // El precio sugerido solo entra si el campo está vacío: si el vendedor
        // ya escribió un número, ese número manda.
        price: current.price || (data.suggested_price ? String(data.suggested_price) : ""),
      }));
    });
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const price = Number(form.price);
    if (!price || price <= 0) {
      setError("Poné un precio mayor a cero para poder cobrar.");
      return;
    }

    const data = new FormData();
    data.set("name", form.name);
    data.set("product_id", productId);
    data.set("headline", form.headline);
    data.set("promise", form.promise);
    data.set("benefits", form.benefits);
    data.set("cta_text", form.cta_text);
    data.set("guarantee", form.guarantee);
    data.set("price", form.price);
    data.set("compare_at_price", form.compare_at_price);
    data.set("status", "draft");

    startTransition(async () => {
      const result = await createOfferAction(null, data);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      // Si el usuario pidió aplicar bonos/bump/upsell del borrador, los creamos
      // sobre la oferta recién guardada.
      if (draft && (apply.bonuses || apply.bump || apply.upsell)) {
        const applied = await applyOfferDraftAction(result.data.id, draft, apply);
        if (!applied.ok) {
          toast.error("Creamos la oferta, pero no pudimos sumar los extras", applied.error);
        }
      }

      // En el paso a paso seguimos derecho a armar la página; fuera de él
      // volvemos al producto, que es de donde vino. El usuario nunca se entera
      // de que existe una pantalla de "ofertas" aparte.
      if (enFlujo) {
        toast.success("Listo, ya tiene precio", "Seguimos con la página de venta.");
        router.push(withFlow(`/app/funnels/nuevo?oferta=${result.data.id}`));
      } else {
        toast.success("Listo, ya tiene precio", "Ahora podés sumarle bonos.");
        router.push(`/app/productos/${productId}/oferta`);
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {error ? <Alert tone="error">{error}</Alert> : null}

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-ink-900">Empezá por el producto</h2>
            <p className="mt-0.5 text-[13px] text-ink-500">
              La IA usa sus datos para proponerte la oferta completa.
            </p>
          </div>
          <Button type="button" variant="ai" icon="sparkles" loading={pending} onClick={generate}>
            Crear oferta con IA
          </Button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Producto" required>
            <Select value={productId} onChange={(event) => setProductId(event.target.value)}>
              {products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Nombre de la oferta" required>
            <Input
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              required
              placeholder="Oferta Hábitos Saludables"
            />
          </Field>
        </div>
      </Card>

      {draft && isTemplate ? <TemplateNotice warning={warning} /> : null}

      <Card className="flex flex-col gap-4 p-5">
        <h2 className="text-[15px] font-semibold text-ink-900">La promesa</h2>

        <Field
          label={<TermLabel term="headline">Headline</TermLabel>}
          hint="La frase más grande de la página, la primera que se lee."
        >
          <Input
            value={form.headline}
            onChange={(event) => update("headline", event.target.value)}
            placeholder="Armá una rutina que puedas sostener"
          />
        </Field>

        <Field label="Promesa principal">
          <Textarea
            value={form.promise}
            onChange={(event) => update("promise", event.target.value)}
            rows={3}
            placeholder="En 21 días vas a tener una rutina adaptada a tu semana real."
          />
        </Field>

        <Field label="Beneficios" hint="Uno por línea. Escribí resultados, no características.">
          <Textarea
            value={form.benefits}
            onChange={(event) => update("benefits", event.target.value)}
            rows={5}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Texto del botón">
            <Input value={form.cta_text} onChange={(event) => update("cta_text", event.target.value)} />
          </Field>
          <Field
            label={<TermLabel term="garantia">Garantía</TermLabel>}
            hint="Escribí solo lo que puedas cumplir."
          >
            <Input
              value={form.guarantee}
              onChange={(event) => update("guarantee", event.target.value)}
              placeholder="Garantía de 7 días"
            />
          </Field>
        </div>
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <h2 className="text-[15px] font-semibold text-ink-900">El precio</h2>
        <Field
          label={`Precio (${currency})`}
          hint={
            draft?.suggested_price
              ? "Es una sugerencia de la IA, no un cálculo: cambiala por el precio que quieras cobrar."
              : "Lo que cobrás por el producto principal."
          }
          required
        >
          <Input
            type="number"
            min={0}
            step="any"
            value={form.price}
            onChange={(event) => update("price", event.target.value)}
            required
          />
        </Field>

        <MoreOptions hint="descuento">
          <Field
            label={<TermLabel term="precio_tachado">{`Precio tachado (${currency})`}</TermLabel>}
            hint="Se muestra cruzado al lado del tuyo. Poné solo un precio que hayas cobrado de verdad alguna vez."
          >
            <Input
              type="number"
              min={0}
              step="any"
              value={form.compare_at_price}
              onChange={(event) => update("compare_at_price", event.target.value)}
            />
          </Field>
        </MoreOptions>
        {Number(form.compare_at_price) > Number(form.price) && Number(form.price) > 0 ? (
          <p className="text-[13px] text-accent-700">
            Se muestra un {Math.round((1 - Number(form.price) / Number(form.compare_at_price)) * 100)}% de
            descuento.
          </p>
        ) : null}
      </Card>

      {draft ? (
        <Card className="p-5">
          <h2 className="text-[15px] font-semibold text-ink-900">
            La IA también te propuso esto
          </h2>
          <p className="mt-0.5 text-[13px] text-ink-500">
            Elegí qué querés crear junto con la oferta. Podés editarlo todo después.
          </p>

          <div className="mt-4 flex flex-col gap-2.5">
            {draft.bonuses?.length ? (
              <Checkbox
                checked={apply.bonuses}
                onChange={(event) => setApply((c) => ({ ...c, bonuses: event.target.checked }))}
                label={`${draft.bonuses.length} bonos`}
                description={draft.bonuses.map((bonus) => bonus.name).join(" · ")}
              />
            ) : null}

            {draft.order_bump ? (
              <Checkbox
                checked={apply.bump}
                onChange={(event) => setApply((c) => ({ ...c, bump: event.target.checked }))}
                label={`Order bump: ${draft.order_bump.name}`}
                description={`${formatMoney(draft.order_bump.price, currency)} — ${draft.order_bump.description}`}
              />
            ) : null}

            {draft.upsell ? (
              <Checkbox
                checked={apply.upsell}
                onChange={(event) => setApply((c) => ({ ...c, upsell: event.target.checked }))}
                label={`Upsell: ${draft.upsell.name}`}
                description={`${formatMoney(draft.upsell.price, currency)}${
                  draft.downsell ? ` · con downsell de ${formatMoney(draft.downsell.price, currency)}` : ""
                }`}
              />
            ) : null}
          </div>

          <button
            type="button"
            onClick={generate}
            className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-700 hover:text-brand-800"
          >
            <Icon name="refresh" size={14} />
            Regenerar propuesta
          </button>
        </Card>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="submit" size="lg" loading={pending} icon="check">
          Crear oferta
        </Button>
      </div>
    </form>
  );
}
