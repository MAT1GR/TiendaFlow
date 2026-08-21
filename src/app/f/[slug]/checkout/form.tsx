"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { submitCheckoutAction } from "@/app/actions/public";
import { Icon } from "@/components/ui/icon";
import { formatMoney } from "@/lib/utils";

interface Bump {
  id: string;
  name: string;
  description: string | null;
  label: string;
  price: number;
}

export function CheckoutForm({
  slug,
  offer,
  productName,
  bumps,
  bonuses,
  provider,
  cancelled,
}: {
  slug: string;
  offer: {
    name: string;
    headline: string | null;
    price: number;
    compareAtPrice: number | null;
    currency: string;
    ctaText: string;
    guarantee: string | null;
  };
  productName: string;
  bumps: Bump[];
  bonuses: Array<{ name: string; value: number }>;
  provider: { name: string; mode: string | null } | null;
  cancelled: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedBumps, setSelectedBumps] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingOrder, setPendingOrder] = useState<{
    reference: string;
    issue: string;
    nextUrl: string;
  } | null>(null);

  const bumpTotal = bumps
    .filter((bump) => selectedBumps.includes(bump.id))
    .reduce((acc, bump) => acc + bump.price, 0);
  const total = offer.price + bumpTotal;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);

    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
      const value = params.get(key);
      if (value) utm[key] = value;
    }

    startTransition(async () => {
      const result = await submitCheckoutAction({
        slug,
        fullName: String(data.get("full_name") ?? ""),
        email: String(data.get("email") ?? ""),
        phone: String(data.get("phone") ?? ""),
        bumpIds: selectedBumps,
        coupon: String(data.get("coupon") ?? ""),
        utm,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (result.data.paymentUrl) {
        window.location.href = result.data.paymentUrl;
        return;
      }

      if (result.data.paymentIssue) {
        setPendingOrder({
          reference: result.data.reference,
          issue: result.data.paymentIssue,
          nextUrl: result.data.nextUrl,
        });
        return;
      }

      router.push(result.data.nextUrl);
    });
  }

  if (pendingOrder) {
    return (
      <main className="mx-auto w-full max-w-lg px-5 py-16">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <span className="grid size-11 place-items-center rounded-2xl bg-amber-500 text-white">
            <Icon name="warning" size={20} />
          </span>
          <h1 className="mt-4 text-[20px] font-semibold text-ink-900">
            No pudimos cobrar tu pedido
          </h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-700">{pendingOrder.issue}</p>
          <p className="mt-4 rounded-xl bg-white/70 px-4 py-3 text-[13.5px] text-ink-700">
            Guardamos tu pedido con el número{" "}
            <strong className="font-semibold">{pendingOrder.reference}</strong> en estado pendiente.
            Nadie te cobró nada.
          </p>
          <a
            href={pendingOrder.nextUrl}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-ink-900 px-4 py-2.5 text-[14px] font-semibold text-white"
          >
            Ver el detalle del pedido
            <Icon name="arrowRight" size={16} />
          </a>
        </div>
      </main>
    );
  }

  return (
    /* `@container`: el checkout también se muestra como vista previa adentro
       del panel, en una caja mucho más angosta que la ventana. Midiendo su
       propia caja, la misma pantalla sirve para las dos cosas. */
    <main className="@container mx-auto w-full max-w-5xl px-4 py-8 @2xl:px-6 @2xl:py-12">
      <div className="grid gap-6 @3xl:grid-cols-[1fr_400px]">
        <form onSubmit={submit} className="order-2 flex flex-col gap-5 @3xl:order-1">
          {cancelled ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13.5px] text-amber-800">
              Cancelaste el pago. Podés volver a intentarlo cuando quieras.
            </div>
          ) : null}

          {error ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-700"
            >
              {error}
            </div>
          ) : null}

          <section className="rounded-3xl border border-ink-200 bg-white p-5 @2xl:p-6">
            <h2 className="text-[17px] font-semibold text-ink-900">Tus datos</h2>
            <p className="mt-1 text-[13px] text-ink-500">
              Al email que pongas te mandamos el acceso.
            </p>

            <div className="mt-5 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-ink-700">Nombre y apellido</span>
                <input
                  name="full_name"
                  required
                  autoComplete="name"
                  className="h-12 rounded-xl border border-ink-200 px-4 text-[15px] focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-ink-700">Email</span>
                <input
                  name="email"
                  type="email"
                  required
                  inputMode="email"
                  autoComplete="email"
                  className="h-12 rounded-xl border border-ink-200 px-4 text-[15px] focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-ink-700">
                  Teléfono <span className="font-normal text-ink-400">(opcional)</span>
                </span>
                <input
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  className="h-12 rounded-xl border border-ink-200 px-4 text-[15px] focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
                />
              </label>
            </div>
          </section>

          {bumps.length ? (
            <section className="flex flex-col gap-3">
              {bumps.map((bump) => (
                <label
                  key={bump.id}
                  className="flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-dashed border-accent-500 bg-accent-50 p-4 transition-colors has-[:checked]:border-solid has-[:checked]:bg-accent-100/60"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 size-5 shrink-0 accent-accent-600"
                    checked={selectedBumps.includes(bump.id)}
                    onChange={(event) =>
                      setSelectedBumps((current) =>
                        event.target.checked
                          ? [...current, bump.id]
                          : current.filter((id) => id !== bump.id),
                      )
                    }
                  />
                  <span className="min-w-0">
                    <span className="block text-[14.5px] font-semibold text-accent-900">
                      {bump.label}
                    </span>
                    {bump.description ? (
                      <span className="mt-1 block text-[13px] leading-relaxed text-ink-600">
                        {bump.description}
                      </span>
                    ) : null}
                  </span>
                </label>
              ))}
            </section>
          ) : null}

          <section className="rounded-3xl border border-ink-200 bg-white p-5 @2xl:p-6">
            <h2 className="text-[17px] font-semibold text-ink-900">Pago</h2>
            {provider ? (
              <p className="mt-2 flex items-center gap-2 text-[13.5px] text-ink-600">
                <Icon name="lock" size={15} className="text-accent-600" />
                Vas a pagar de forma segura con {provider.name}
                {provider.mode === "test" ? " (modo de prueba)" : ""}.
              </p>
            ) : (
              <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13.5px] text-amber-800">
                Esta tienda todavía no tiene un proveedor de pago conectado. Podés dejar tu pedido,
                pero no se va a poder cobrar hasta que se configure.
              </p>
            )}

            <label className="mt-4 flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-ink-700">
                Cupón <span className="font-normal text-ink-400">(opcional)</span>
              </span>
              <input
                name="coupon"
                className="h-11 rounded-xl border border-ink-200 px-4 text-[14px] uppercase focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
                placeholder="CODIGO"
              />
            </label>
          </section>

          <button
            type="submit"
            disabled={pending}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-accent-600 text-[16px] font-semibold text-white transition-colors hover:bg-accent-700 disabled:opacity-70"
          >
            {pending ? "Procesando…" : `${offer.ctaText} · ${formatMoney(total, offer.currency)}`}
            {!pending ? <Icon name="arrowRight" size={18} /> : null}
          </button>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px] text-ink-500">
            <span className="flex items-center gap-1.5">
              <Icon name="lock" size={14} /> Pago seguro
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="download" size={14} /> Acceso inmediato
            </span>
            {offer.guarantee ? (
              <span className="flex items-center gap-1.5">
                <Icon name="shield" size={14} /> {offer.guarantee}
              </span>
            ) : null}
          </div>
        </form>

        <aside className="order-1 @3xl:order-2">
          <div className="sticky top-6 rounded-3xl border border-ink-200 bg-white p-5 @2xl:p-6">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-ink-400">
              Tu pedido
            </h2>

            <div className="mt-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-ink-900">{productName}</p>
                {offer.headline ? (
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-500">{offer.headline}</p>
                ) : null}
              </div>
              <span className="shrink-0 text-[15px] font-semibold text-ink-900">
                {formatMoney(offer.price, offer.currency)}
              </span>
            </div>

            {bonuses.length ? (
              <ul className="mt-4 flex flex-col gap-1.5 border-t border-ink-100 pt-4">
                {bonuses.map((bonus) => (
                  <li key={bonus.name} className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="flex min-w-0 items-center gap-1.5 text-ink-600">
                      <Icon name="gift" size={14} className="shrink-0 text-accent-600" />
                      <span className="truncate">{bonus.name}</span>
                    </span>
                    <span className="shrink-0 font-medium text-accent-700">Incluido</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {selectedBumps.length ? (
              <ul className="mt-4 flex flex-col gap-1.5 border-t border-ink-100 pt-4">
                {bumps
                  .filter((bump) => selectedBumps.includes(bump.id))
                  .map((bump) => (
                    <li key={bump.id} className="flex items-center justify-between gap-3 text-[13px]">
                      <span className="truncate text-ink-600">{bump.name}</span>
                      <span className="shrink-0 font-medium text-ink-900">
                        {formatMoney(bump.price, offer.currency)}
                      </span>
                    </li>
                  ))}
              </ul>
            ) : null}

            <div className="mt-4 flex items-baseline justify-between border-t border-ink-200 pt-4">
              <span className="text-[15px] font-semibold text-ink-900">Total</span>
              <span className="flex items-baseline gap-2">
                {offer.compareAtPrice && !selectedBumps.length ? (
                  <span className="text-[13px] text-ink-400 line-through">
                    {formatMoney(offer.compareAtPrice, offer.currency)}
                  </span>
                ) : null}
                <span className="text-[22px] font-semibold tracking-tight text-ink-900">
                  {formatMoney(total, offer.currency)}
                </span>
              </span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
