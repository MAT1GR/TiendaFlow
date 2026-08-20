"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createFunnelAction } from "@/app/actions/funnels";
import { Alert } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { Button, Card, Field, Input, Select, useToast } from "@/components/ui/primitives";

const DEFAULT_STEPS = ["Landing page", "Checkout", "Upsell 1", "Gracias"];

export function NewFunnelForm({
  offers,
  products,
  initialOfferId,
}: {
  offers: Array<{ id: string; name: string; productId: string | null }>;
  products: Array<{ id: string; name: string }>;
  initialOfferId?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [offerId, setOfferId] = useState(initialOfferId ?? offers[0]?.id ?? "");
  const [name, setName] = useState(() => {
    const offer = offers.find((item) => item.id === (initialOfferId ?? offers[0]?.id));
    return offer ? `Funnel ${offer.name.replace(/^Oferta\s+/i, "")}` : "";
  });
  const [source, setSource] = useState("meta_ads");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const offer = offers.find((item) => item.id === offerId);
    const data = new FormData();
    data.set("name", name);
    data.set("offer_id", offerId);
    data.set("product_id", offer?.productId ?? "");
    data.set("traffic_source", source);

    startTransition(async () => {
      const result = await createFunnelAction(null, data);
      if (result.ok) {
        toast.success("Funnel creado", "Ahora generá la landing y publicá.");
        router.push(`/app/funnels/${result.data.id}?nuevo=1`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {error ? <Alert tone="error">{error}</Alert> : null}

      <Card className="flex flex-col gap-4 p-5">
        <Field label="Oferta que vas a vender" required>
          <Select
            value={offerId}
            onChange={(event) => {
              setOfferId(event.target.value);
              const offer = offers.find((item) => item.id === event.target.value);
              if (offer) setName(`Funnel ${offer.name.replace(/^Oferta\s+/i, "")}`);
            }}
          >
            {offers.map((offer) => (
              <option key={offer.id} value={offer.id}>
                {offer.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Nombre del funnel" required>
          <Input value={name} onChange={(event) => setName(event.target.value)} required />
        </Field>

        <Field label="¿De dónde va a venir el tráfico?">
          <Select value={source} onChange={(event) => setSource(event.target.value)}>
            <option value="meta_ads">Meta Ads</option>
            <option value="organico">Orgánico</option>
            <option value="afiliados">Afiliados</option>
            <option value="email">Email</option>
            <option value="otro">Otro</option>
          </Select>
        </Field>
      </Card>

      <Card className="p-5">
        <p className="text-[13px] font-semibold text-ink-900">Vamos a crear estos pasos</p>
        <p className="mt-0.5 text-[12.5px] text-ink-500">
          Podés agregar, sacar y reordenar todo después.
        </p>
        <div className="tf-scroll mt-4 flex items-center gap-2 overflow-x-auto">
          {DEFAULT_STEPS.map((step, index) => (
            <div key={step} className="flex shrink-0 items-center gap-2">
              <span className="rounded-xl bg-brand-50 px-3 py-2 text-[12.5px] font-semibold text-brand-700 ring-1 ring-inset ring-brand-200">
                {step}
              </span>
              {index < DEFAULT_STEPS.length - 1 ? (
                <Icon name="arrowRight" size={15} className="text-ink-300" />
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={pending} icon="funnel">
          Crear funnel
        </Button>
      </div>
    </form>
  );
}
