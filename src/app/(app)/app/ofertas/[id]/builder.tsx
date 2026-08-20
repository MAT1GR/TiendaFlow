"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";

import { generateOfferDraftAction } from "@/app/actions/ai";
import {
  deleteBonusAction,
  deleteDownsellAction,
  deleteOrderBumpAction,
  deleteUpsellAction,
  publishOfferAction,
  saveBonusAction,
  saveDownsellAction,
  saveOrderBumpAction,
  saveUpsellAction,
  updateOfferAction,
} from "@/app/actions/catalog";
import { Explain, MoreOptions, TermLabel } from "@/components/ui/explain";
import { Alert, TemplateNotice } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  LinkButton,
  Modal,
  Select,
  Tabs,
  Textarea,
  useToast,
} from "@/components/ui/primitives";
import { formatMoney, STATUS_LABEL, statusTone } from "@/lib/utils";
import type { Bonus, Downsell, Offer, OrderBump, Upsell } from "@/lib/types";

type Product = { id: string; name: string };

export function OfferBuilder({
  offer,
  benefits,
  bonuses,
  bumps,
  upsells,
  downsells,
  products,
  currency,
  justCreated,
}: {
  offer: Offer;
  benefits: string[];
  bonuses: Bonus[];
  bumps: OrderBump[];
  upsells: Upsell[];
  downsells: Downsell[];
  products: Product[];
  currency: string;
  justCreated: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState("oferta");
  const [pending, startTransition] = useTransition();

  const totalBonusValue = bonuses.reduce((acc, bonus) => acc + bonus.value, 0);

  return (
    <div className="flex flex-col gap-5">
      {justCreated ? (
        <Alert
          tone="ai"
          title="Oferta creada. Ahora armemos el funnel."
          action={
            <LinkButton href={`/app/funnels/nuevo?oferta=${offer.id}`} size="sm" variant="ai">
              Crear funnel
            </LinkButton>
          }
        >
          Con la oferta lista, el funnel se arma solo: landing, checkout, upsell y gracias.
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "oferta", label: "Oferta" },
            { value: "bonos", label: "Bonos", count: bonuses.length },
            { value: "bump", label: "Order bump", count: bumps.length },
            { value: "upsells", label: "Upsells", count: upsells.length },
          ]}
        />
        <div className="flex items-center gap-2">
          <Badge tone={statusTone(offer.status)}>{STATUS_LABEL[offer.status] ?? offer.status}</Badge>
          {offer.status !== "active" ? (
            <Button
              size="sm"
              icon="check"
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await publishOfferAction(offer.id);
                  if (result.ok) {
                    toast.success("Oferta publicada.");
                    router.refresh();
                  } else {
                    toast.error("Todavía no podemos publicarla", result.error);
                  }
                })
              }
            >
              Publicar oferta
            </Button>
          ) : null}
        </div>
      </div>

      {tab === "oferta" ? (
        <OfferForm offer={offer} benefits={benefits} products={products} currency={currency} />
      ) : null}

      {tab === "bonos" ? (
        <BonusesPanel
          offerId={offer.id}
          bonuses={bonuses}
          products={products}
          currency={currency}
          totalValue={totalBonusValue}
          price={offer.price}
        />
      ) : null}

      {tab === "bump" ? (
        <BumpPanel offer={offer} bumps={bumps} products={products} currency={currency} />
      ) : null}

      {tab === "upsells" ? (
        <UpsellsPanel
          offer={offer}
          upsells={upsells}
          downsells={downsells}
          products={products}
          currency={currency}
        />
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Oferta                                                                      */
/* -------------------------------------------------------------------------- */

function OfferForm({
  offer,
  benefits,
  products,
  currency,
}: {
  offer: Offer;
  benefits: string[];
  products: Product[];
  currency: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [state, formAction, pending] = useActionState(updateOfferAction, null);
  const [aiPending, startAi] = useTransition();
  const [aiNotice, setAiNotice] = useState<{ isTemplate: boolean; warning?: string } | null>(null);
  const [values, setValues] = useState({
    headline: offer.headline ?? "",
    promise: offer.promise ?? "",
    benefits: benefits.join("\n"),
    cta_text: offer.cta_text,
    guarantee: offer.guarantee ?? "",
  });

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Guardado.");
      router.refresh();
    }
  }, [state, toast, router]);

  function regenerate() {
    if (!offer.product_id) {
      toast.error("Falta el producto", "Asociá un producto a la oferta para poder generar el copy.");
      return;
    }
    startAi(async () => {
      const result = await generateOfferDraftAction(offer.product_id as string);
      if (!result.ok) {
        toast.error("No pudimos generar la propuesta", result.error);
        return;
      }
      const draft = result.data.data;
      setValues({
        headline: draft.headline ?? "",
        promise: draft.promise ?? "",
        benefits: (draft.benefits ?? []).join("\n"),
        cta_text: draft.cta_text ?? offer.cta_text,
        guarantee: draft.guarantee ?? "",
      });
      setAiNotice({ isTemplate: result.data.isTemplate, warning: result.data.warning });
    });
  }

  return (
    <form action={formAction} className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <input type="hidden" name="id" value={offer.id} />

      <div className="flex flex-col gap-4">
        {state && !state.ok ? <Alert tone="error">{state.error}</Alert> : null}
        {aiNotice?.isTemplate ? <TemplateNotice warning={aiNotice.warning} /> : null}

        <Card className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-ink-900">Promesa y copy</h2>
            <Button type="button" variant="ai" size="sm" icon="sparkles" loading={aiPending} onClick={regenerate}>
              Regenerar con IA
            </Button>
          </div>

          <Field label="Nombre de la oferta" required>
            <Input name="name" defaultValue={offer.name} required />
          </Field>

          <Field label={<TermLabel term="headline">Headline</TermLabel>}>
            <Input
              name="headline"
              value={values.headline}
              onChange={(event) => setValues((c) => ({ ...c, headline: event.target.value }))}
            />
          </Field>

          <Field label="Promesa principal">
            <Textarea
              name="promise"
              rows={3}
              value={values.promise}
              onChange={(event) => setValues((c) => ({ ...c, promise: event.target.value }))}
            />
          </Field>

          <Field label="Beneficios" hint="Uno por línea.">
            <Textarea
              name="benefits"
              rows={6}
              value={values.benefits}
              onChange={(event) => setValues((c) => ({ ...c, benefits: event.target.value }))}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Texto del botón">
              <Input
                name="cta_text"
                value={values.cta_text}
                onChange={(event) => setValues((c) => ({ ...c, cta_text: event.target.value }))}
              />
            </Field>
            <Field label={<TermLabel term="garantia">Garantía</TermLabel>}>
              <Input
                name="guarantee"
                value={values.guarantee}
                onChange={(event) => setValues((c) => ({ ...c, guarantee: event.target.value }))}
              />
            </Field>
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-5">
          <h2 className="text-[15px] font-semibold text-ink-900">Producto y precio</h2>

          <Field label="Producto">
            <Select name="product_id" defaultValue={offer.product_id ?? ""}>
              <option value="">Sin producto asociado</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`Precio (${currency})`} required>
              <Input name="price" type="number" min={0} step="any" defaultValue={offer.price} required />
            </Field>
            <Field label={<TermLabel term="precio_tachado">{`Precio tachado (${currency})`}</TermLabel>}>
              <Input
                name="compare_at_price"
                type="number"
                min={0}
                step="any"
                defaultValue={offer.compare_at_price ?? ""}
              />
            </Field>
          </div>

          <Field label="Estado">
            <Select name="status" defaultValue={offer.status}>
              <option value="draft">Borrador</option>
              <option value="active">Activa</option>
              <option value="archived">Archivada</option>
            </Select>
          </Field>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" loading={pending} icon="check">
            Guardar oferta
          </Button>
        </div>
      </div>

      <aside>
        <Card className="sticky top-20 overflow-hidden">
          <div className="border-b border-ink-100 px-5 py-4">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-400">
              Vista previa
            </p>
          </div>
          <div className="p-5">
            <p className="text-[16px] font-semibold leading-snug text-ink-900">
              {values.headline || "Tu headline va acá"}
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
              {values.promise || "Tu promesa principal va acá."}
            </p>

            <ul className="mt-4 flex flex-col gap-1.5">
              {values.benefits
                .split("\n")
                .filter(Boolean)
                .slice(0, 6)
                .map((benefit) => (
                  <li key={benefit} className="flex gap-2 text-[13px] text-ink-700">
                    <Icon name="check" size={14} className="mt-0.5 shrink-0 text-accent-600" />
                    {benefit}
                  </li>
                ))}
            </ul>

            <div className="mt-5 flex items-baseline gap-2">
              <span className="text-[26px] font-semibold tracking-tight text-ink-900">
                {formatMoney(offer.price, currency)}
              </span>
              {offer.compare_at_price ? (
                <span className="text-[14px] text-ink-400 line-through">
                  {formatMoney(offer.compare_at_price, currency)}
                </span>
              ) : null}
            </div>

            <button
              type="button"
              disabled
              className="mt-3 w-full rounded-xl bg-accent-600 py-3 text-[14px] font-semibold text-white"
            >
              {values.cta_text || "Quiero mi acceso"}
            </button>

            {values.guarantee ? (
              <p className="mt-3 flex items-start gap-1.5 text-[12px] text-ink-500">
                <Icon name="shield" size={14} className="mt-0.5 shrink-0 text-accent-600" />
                {values.guarantee}
              </p>
            ) : null}
          </div>
        </Card>
      </aside>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Bonos                                                                       */
/* -------------------------------------------------------------------------- */

function BonusesPanel({
  offerId,
  bonuses,
  products,
  currency,
  totalValue,
  price,
}: {
  offerId: string;
  bonuses: Bonus[];
  products: Product[];
  currency: string;
  totalValue: number;
  price: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<Bonus | "new" | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Card>
        <CardHeader
          title={<TermLabel term="bono">Bonos</TermLabel>}
          subtitle="Cosas extra que regalás junto al producto. Suben lo que la persona siente que se lleva, sin que bajes el precio."
          action={
            <div className="flex gap-2">
              <Button size="sm" icon="plus" onClick={() => setEditing("new")}>
                Agregar bono
              </Button>
            </div>
          }
        />

        <div className="p-5 pt-4">
          {totalValue > 0 ? (
            <Alert tone="success" className="mb-4">
              Los bonos suman {formatMoney(totalValue, currency)} de valor percibido sobre una oferta
              de {formatMoney(price, currency)}.
            </Alert>
          ) : null}

          {bonuses.length === 0 ? (
            <EmptyState
              icon="gift"
              title="La oferta todavía no tiene bonos"
              description="Un checklist, una plantilla o una guía rápida alcanzan para que la decisión sea más fácil."
              action={
                <Button icon="plus" onClick={() => setEditing("new")}>
                  Agregar bono
                </Button>
              }
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {bonuses.map((bonus) => (
                <li
                  key={bonus.id}
                  className="flex flex-col rounded-2xl border border-ink-200 p-4 transition-colors hover:border-ink-300"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-50 text-accent-700">
                      <Icon name="gift" size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-ink-900">{bonus.name}</p>
                      {bonus.description ? (
                        <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-500">
                          {bonus.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-ink-900">
                      Valor: {formatMoney(bonus.value, currency)}
                    </span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" icon="edit" onClick={() => setEditing(bonus)}>
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon="trash"
                        loading={pending}
                        onClick={() =>
                          startTransition(async () => {
                            const result = await deleteBonusAction(bonus.id, offerId);
                            if (result.ok) {
                              toast.success("Quitamos el bono.");
                              router.refresh();
                            } else {
                              toast.error("No pudimos quitarlo", result.error);
                            }
                          })
                        }
                      >
                        <span className="sr-only">Eliminar</span>
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <BonusModal
        offerId={offerId}
        bonus={editing === "new" ? null : editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
        products={products}
        currency={currency}
      />
    </>
  );
}

function BonusModal({
  offerId,
  bonus,
  open,
  onClose,
  products,
  currency,
}: {
  offerId: string;
  bonus: Bonus | null;
  open: boolean;
  onClose: () => void;
  products: Product[];
  currency: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [state, formAction, pending] = useActionState(saveBonusAction, null);

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Guardado.");
      router.refresh();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={bonus ? "Editar bono" : "Nuevo bono"}
      description="Los bonos se muestran en la landing y en la página de gracias."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="bonus-form" loading={pending} icon="check">
            Guardar bono
          </Button>
        </>
      }
    >
      <form id="bonus-form" action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="offer_id" value={offerId} />
        {bonus ? <input type="hidden" name="id" value={bonus.id} /> : null}

        {state && !state.ok ? <Alert tone="error">{state.error}</Alert> : null}

        <Field label="Nombre" required>
          <Input name="name" defaultValue={bonus?.name ?? ""} required placeholder="Checklist de 21 días" />
        </Field>
        <Field label="Descripción">
          <Textarea
            name="description"
            rows={3}
            defaultValue={bonus?.description ?? ""}
            placeholder="Para imprimir y tachar cada día."
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`Valor percibido (${currency})`}>
            <Input name="value" type="number" min={0} step="any" defaultValue={bonus?.value ?? 0} />
          </Field>
          <Field label="Archivo asociado" hint="Solo el nombre por ahora.">
            <Input name="file_name" defaultValue={bonus?.file_name ?? ""} placeholder="checklist.pdf" />
          </Field>
        </div>
        <Field label="O usar un producto existente">
          <Select name="product_id" defaultValue={bonus?.product_id ?? ""}>
            <option value="">Ninguno</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </Select>
        </Field>
      </form>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* Order bump                                                                  */
/* -------------------------------------------------------------------------- */

function BumpPanel({
  offer,
  bumps,
  products,
  currency,
}: {
  offer: Offer;
  bumps: OrderBump[];
  products: Product[];
  currency: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<OrderBump | "new" | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader
            title={<TermLabel term="order_bump">Order bump</TermLabel>}
            subtitle="Una casilla con un extra barato, que aparece dentro del checkout justo antes de pagar."
            action={
              <Button size="sm" icon="plus" onClick={() => setEditing("new")}>
                Crear order bump
              </Button>
            }
          />
          <div className="p-5 pt-4">
            {bumps.length === 0 ? (
              <EmptyState
                icon="plus"
                title="Todavía no tenés un order bump"
                description="Un complemento barato dentro del checkout sube el ticket promedio sin costo de adquisición extra. Suele funcionar entre el 15% y el 25% del precio principal."
                action={
                  <Button icon="plus" onClick={() => setEditing("new")}>
                    Crear order bump
                  </Button>
                }
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {bumps.map((bump) => (
                  <li key={bump.id} className="rounded-2xl border border-ink-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-ink-900">{bump.name}</p>
                        {bump.description ? (
                          <p className="mt-0.5 text-[12.5px] text-ink-500">{bump.description}</p>
                        ) : null}
                      </div>
                      <Badge tone={bump.active ? "success" : "neutral"}>
                        {bump.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-[13px] font-semibold text-ink-900">
                        {formatMoney(bump.price, currency)}
                        <span className="ml-1.5 font-normal text-ink-500">
                          ({Math.round((bump.price / (offer.price || 1)) * 100)}% del ticket)
                        </span>
                      </span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" icon="edit" onClick={() => setEditing(bump)}>
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon="trash"
                          loading={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const result = await deleteOrderBumpAction(bump.id, offer.id);
                              if (result.ok) {
                                toast.success("Quitamos el order bump.");
                                router.refresh();
                              } else {
                                toast.error("No pudimos quitarlo", result.error);
                              }
                            })
                          }
                        >
                          <span className="sr-only">Eliminar</span>
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card className="h-fit">
          <CardHeader title="Cómo se ve en el checkout" />
          <div className="p-5 pt-4">
            <div className="rounded-2xl bg-ink-50 p-4">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-400">
                Resumen del pedido
              </p>
              <div className="mt-2 flex justify-between text-[13px] text-ink-700">
                <span>{offer.name}</span>
                <span className="font-semibold">{formatMoney(offer.price, currency)}</span>
              </div>

              {bumps.filter((bump) => bump.active).map((bump) => (
                <label
                  key={bump.id}
                  className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl border-2 border-dashed border-accent-500 bg-accent-50 p-3"
                >
                  <input type="checkbox" className="mt-0.5 size-4 accent-accent-600" readOnly />
                  <span>
                    <span className="block text-[13px] font-semibold text-accent-800">
                      {bump.checkbox_label}
                    </span>
                    {bump.description ? (
                      <span className="mt-0.5 block text-[12px] text-ink-600">{bump.description}</span>
                    ) : null}
                  </span>
                </label>
              ))}

              <div className="mt-4 flex justify-between border-t border-ink-200 pt-3 text-[14px] font-semibold text-ink-900">
                <span>Total</span>
                <span>{formatMoney(offer.price, currency)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <BumpModal
        offerId={offer.id}
        offerPrice={offer.price}
        bump={editing === "new" ? null : editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
        products={products}
        currency={currency}
      />
    </>
  );
}

function BumpModal({
  offerId,
  offerPrice,
  bump,
  open,
  onClose,
  products,
  currency,
}: {
  offerId: string;
  offerPrice: number;
  bump: OrderBump | null;
  open: boolean;
  onClose: () => void;
  products: Product[];
  currency: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [state, formAction, pending] = useActionState(saveOrderBumpAction, null);
  const [price, setPrice] = useState(String(bump?.price ?? Math.round(offerPrice * 0.22)));

  useEffect(() => {
    if (open) setPrice(String(bump?.price ?? Math.round(offerPrice * 0.22)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bump?.id]);

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Guardado.");
      router.refresh();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const ratio = offerPrice > 0 ? (Number(price) / offerPrice) * 100 : 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={bump ? "Editar order bump" : "Nuevo order bump"}
      description="Aparece como un checkbox dentro del checkout."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="bump-form" loading={pending} icon="check">
            Guardar
          </Button>
        </>
      }
    >
      <form id="bump-form" action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="offer_id" value={offerId} />
        <input type="hidden" name="active" value="1" />
        {bump ? <input type="hidden" name="id" value={bump.id} /> : null}

        {state && !state.ok ? <Alert tone="error">{state.error}</Alert> : null}

        <Field label="Nombre" required>
          <Input name="name" defaultValue={bump?.name ?? ""} required placeholder="Pack de plantillas extra" />
        </Field>
        <Field label="Descripción">
          <Textarea name="description" rows={2} defaultValue={bump?.description ?? ""} />
        </Field>
        <Field
          label={`Precio (${currency})`}
          hint={
            offerPrice > 0
              ? `Es el ${ratio.toFixed(0)}% del precio principal. Lo recomendable está entre 15% y 25%.`
              : undefined
          }
          required
        >
          <Input
            name="price"
            type="number"
            min={0}
            step="any"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            required
          />
        </Field>
        <Field label="Texto del checkbox" hint="Lo que lee la persona en el checkout.">
          <Input
            name="checkbox_label"
            defaultValue={
              bump?.checkbox_label ??
              `Sí, quiero agregar este complemento por ${formatMoney(Number(price) || 0, currency)}`
            }
          />
        </Field>
        <Field label="Producto asociado">
          <Select name="product_id" defaultValue={bump?.product_id ?? ""}>
            <option value="">Ninguno</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </Select>
        </Field>
      </form>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* Upsells y downsells                                                         */
/* -------------------------------------------------------------------------- */

function UpsellsPanel({
  offer,
  upsells,
  downsells,
  products,
  currency,
}: {
  offer: Offer;
  upsells: Upsell[];
  downsells: Downsell[];
  products: Product[];
  currency: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [editingUpsell, setEditingUpsell] = useState<Upsell | "new" | null>(null);
  const [editingDownsell, setEditingDownsell] = useState<{
    upsellId: string;
    downsell: Downsell | null;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Card>
        <CardHeader
          title={
            <span className="inline-flex items-center gap-2">
              <TermLabel term="upsell">Upsells</TermLabel>
              <span className="text-ink-400">y</span>
              <TermLabel term="downsell">downsells</TermLabel>
            </span>
          }
          subtitle="Una segunda oferta que aparece cuando la persona ya te pagó. Es la venta más barata que vas a hacer."
          action={
            <Button size="sm" icon="plus" onClick={() => setEditingUpsell("new")}>
              Crear upsell
            </Button>
          }
        />

        <div className="p-5 pt-4">
          {upsells.length === 0 ? (
            <EmptyState
              icon="trendUp"
              title="Todavía no tenés upsells"
              description="El upsell es la forma más rápida de subir el ticket promedio: la persona ya te compró y ya confía."
              action={
                <Button icon="plus" onClick={() => setEditingUpsell("new")}>
                  Crear upsell
                </Button>
              }
            />
          ) : (
            <>
              <FlowDiagram upsells={upsells} downsells={downsells} />

              <ul className="mt-6 flex flex-col gap-3">
                {upsells.map((upsell) => {
                  const downsell = downsells.find((item) => item.upsell_id === upsell.id);
                  return (
                    <li key={upsell.id} className="rounded-2xl border border-ink-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 text-[14px] font-semibold text-ink-900">
                            <span className="rounded-md bg-brand-100 px-1.5 py-0.5 text-[11px] font-bold text-brand-700">
                              Upsell {upsell.position}
                            </span>
                            {upsell.name}
                          </p>
                          {upsell.headline ? (
                            <p className="mt-1 text-[13px] text-ink-600">{upsell.headline}</p>
                          ) : null}
                        </div>
                        <span className="shrink-0 text-[15px] font-semibold text-ink-900">
                          {formatMoney(upsell.price, currency)}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button variant="secondary" size="sm" icon="edit" onClick={() => setEditingUpsell(upsell)}>
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={downsell ? "edit" : "plus"}
                          onClick={() => setEditingDownsell({ upsellId: upsell.id, downsell: downsell ?? null })}
                        >
                          {downsell ? "Editar downsell" : "Agregar downsell"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon="trash"
                          loading={pending}
                          className="ml-auto"
                          onClick={() =>
                            startTransition(async () => {
                              const result = await deleteUpsellAction(upsell.id, offer.id);
                              if (result.ok) {
                                toast.success("Quitamos el upsell.");
                                router.refresh();
                              } else {
                                toast.error("No pudimos quitarlo", result.error);
                              }
                            })
                          }
                        >
                          Eliminar
                        </Button>
                      </div>

                      {downsell ? (
                        <div className="mt-3 rounded-xl bg-ink-50 p-3">
                          <p className="flex items-center gap-2 text-[13px] font-semibold text-ink-800">
                            <Icon name="trendDown" size={14} className="text-amber-600" />
                            Downsell: {downsell.name}
                            <span className="ml-auto">{formatMoney(downsell.price, currency)}</span>
                          </p>
                          {downsell.headline ? (
                            <p className="mt-1 text-[12.5px] text-ink-600">{downsell.headline}</p>
                          ) : null}
                          <button
                            type="button"
                            className="mt-2 text-[12px] font-medium text-red-600 hover:text-red-700"
                            onClick={() =>
                              startTransition(async () => {
                                const result = await deleteDownsellAction(downsell.id, offer.id);
                                if (result.ok) {
                                  toast.success("Quitamos el downsell.");
                                  router.refresh();
                                } else {
                                  toast.error("No pudimos quitarlo", result.error);
                                }
                              })
                            }
                          >
                            Quitar downsell
                          </button>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </Card>

      <UpsellModal
        offerId={offer.id}
        offerPrice={offer.price}
        upsell={editingUpsell === "new" ? null : editingUpsell}
        open={editingUpsell !== null}
        onClose={() => setEditingUpsell(null)}
        products={products}
        currency={currency}
      />

      <DownsellModal
        offerId={offer.id}
        context={editingDownsell}
        onClose={() => setEditingDownsell(null)}
        products={products}
        currency={currency}
      />
    </>
  );
}

function FlowDiagram({ upsells, downsells }: { upsells: Upsell[]; downsells: Downsell[] }) {
  const nodes: Array<{ label: string; tone: string }> = [
    { label: "Checkout", tone: "bg-brand-600" },
  ];
  for (const upsell of upsells) {
    nodes.push({ label: `Upsell ${upsell.position}`, tone: "bg-brand-500" });
    if (downsells.some((item) => item.upsell_id === upsell.id)) {
      nodes.push({ label: "Downsell", tone: "bg-amber-500" });
    }
  }
  nodes.push({ label: "Gracias", tone: "bg-accent-600" });

  return (
    <div className="tf-scroll flex items-center gap-2 overflow-x-auto rounded-2xl bg-ink-50 p-4">
      {nodes.map((node, index) => (
        <div key={`${node.label}-${index}`} className="flex shrink-0 items-center gap-2">
          <span className={`rounded-xl px-3 py-2 text-[12.5px] font-semibold text-white ${node.tone}`}>
            {node.label}
          </span>
          {index < nodes.length - 1 ? (
            <Icon name="arrowRight" size={16} className="text-ink-300" />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function UpsellModal({
  offerId,
  offerPrice,
  upsell,
  open,
  onClose,
  products,
  currency,
}: {
  offerId: string;
  offerPrice: number;
  upsell: Upsell | null;
  open: boolean;
  onClose: () => void;
  products: Product[];
  currency: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [state, formAction, pending] = useActionState(saveUpsellAction, null);

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Guardado.");
      router.refresh();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={upsell ? "Editar upsell" : "Nuevo upsell"}
      description="Se muestra apenas se confirma la compra."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="upsell-form" loading={pending} icon="check">
            Guardar upsell
          </Button>
        </>
      }
    >
      <form id="upsell-form" action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="offer_id" value={offerId} />
        {upsell ? <input type="hidden" name="id" value={upsell.id} /> : null}

        {state && !state.ok ? <Alert tone="error">{state.error}</Alert> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" required>
            <Input name="name" defaultValue={upsell?.name ?? ""} required />
          </Field>
          <Field label="Producto asociado">
            <Select name="product_id" defaultValue={upsell?.product_id ?? ""}>
              <option value="">Ninguno</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Headline" hint="Conectalo con lo que la persona acaba de comprar.">
          <Input name="headline" defaultValue={upsell?.headline ?? ""} />
        </Field>

        <Field label="Descripción">
          <Textarea name="description" rows={3} defaultValue={upsell?.description ?? ""} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={`Precio (${currency})`}
            hint={offerPrice > 0 ? `Suele funcionar entre 1,5x y 3x el ticket principal.` : undefined}
            required
          >
            <Input
              name="price"
              type="number"
              min={0}
              step="any"
              defaultValue={upsell?.price ?? Math.round(offerPrice * 2)}
              required
            />
          </Field>
          <Field label={<TermLabel term="precio_tachado">{`Precio tachado (${currency})`}</TermLabel>}>
            <Input
              name="compare_at_price"
              type="number"
              min={0}
              step="any"
              defaultValue={upsell?.compare_at_price ?? ""}
            />
          </Field>
        </div>

        <MoreOptions hint="textos de los botones">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Botón de aceptar">
              <Input
                name="accept_label"
                defaultValue={upsell?.accept_label ?? "Sí, lo quiero agregar"}
              />
            </Field>
            <Field label="Botón de rechazar">
              <Input
                name="decline_label"
                defaultValue={upsell?.decline_label ?? "No gracias, seguir sin esto"}
              />
            </Field>
          </div>
        </MoreOptions>
      </form>
    </Modal>
  );
}

function DownsellModal({
  offerId,
  context,
  onClose,
  products,
  currency,
}: {
  offerId: string;
  context: { upsellId: string; downsell: Downsell | null } | null;
  onClose: () => void;
  products: Product[];
  currency: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [state, formAction, pending] = useActionState(saveDownsellAction, null);

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Guardado.");
      router.refresh();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal
      open={context !== null}
      onClose={onClose}
      title={context?.downsell ? "Editar downsell" : "Nuevo downsell"}
      description="Se muestra si la persona rechaza el upsell."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="downsell-form" loading={pending} icon="check">
            Guardar downsell
          </Button>
        </>
      }
    >
      <form id="downsell-form" action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="offer_id" value={offerId} />
        <input type="hidden" name="upsell_id" value={context?.upsellId ?? ""} />
        {context?.downsell ? <input type="hidden" name="id" value={context.downsell.id} /> : null}

        {state && !state.ok ? <Alert tone="error">{state.error}</Alert> : null}

        <Field label="Nombre" required>
          <Input name="name" defaultValue={context?.downsell?.name ?? ""} required />
        </Field>
        <Field label="Headline">
          <Input name="headline" defaultValue={context?.downsell?.headline ?? ""} />
        </Field>
        <Field label="Descripción">
          <Textarea name="description" rows={3} defaultValue={context?.downsell?.description ?? ""} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`Precio (${currency})`} required>
            <Input
              name="price"
              type="number"
              min={0}
              step="any"
              defaultValue={context?.downsell?.price ?? ""}
              required
            />
          </Field>
          <Field label={<TermLabel term="precio_tachado">{`Precio tachado (${currency})`}</TermLabel>}>
            <Input
              name="compare_at_price"
              type="number"
              min={0}
              step="any"
              defaultValue={context?.downsell?.compare_at_price ?? ""}
            />
          </Field>
        </div>
        <Field label="Producto asociado">
          <Select name="product_id" defaultValue={context?.downsell?.product_id ?? ""}>
            <option value="">Ninguno</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </Select>
        </Field>
      </form>
    </Modal>
  );
}
