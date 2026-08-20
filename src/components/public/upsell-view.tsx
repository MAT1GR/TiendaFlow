"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { acceptUpsellAction, declineUpsellAction } from "@/app/actions/public";
import { Icon } from "@/components/ui/icon";
import { formatMoney, toLines } from "@/lib/utils";

export function UpsellView({
  kind,
  slug,
  stepId,
  orderId,
  token,
  data,
  orderReference,
}: {
  kind: "upsell" | "downsell";
  slug: string;
  stepId: string;
  orderId: string;
  token: string;
  data: {
    name: string;
    headline: string | null;
    description: string | null;
    price: number;
    compareAtPrice: number | null;
    currency: string;
    acceptLabel: string;
    declineLabel: string;
    benefits: string | null;
  };
  orderReference: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const benefits = toLines(data.benefits);

  function go(accept: boolean) {
    setError(null);
    startTransition(async () => {
      const action = accept ? acceptUpsellAction : declineUpsellAction;
      const result = await action({ slug, stepId, orderId, token });
      if (result.ok) {
        router.push(result.data.nextUrl);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:py-16">
      <div className="flex items-center gap-2 rounded-full bg-accent-50 px-4 py-2 text-[13px] font-medium text-accent-800 ring-1 ring-inset ring-accent-300/60">
        <Icon name="check" size={15} />
        Tu pedido {orderReference} está registrado. Falta un paso.
      </div>

      <p className="mt-8 text-[13px] font-semibold uppercase tracking-widest text-brand-600">
        {kind === "upsell" ? "Oferta única" : "Última oportunidad"}
      </p>

      <h1 className="mt-3 text-[30px] font-semibold leading-[1.12] tracking-tight text-ink-900 sm:text-[38px]">
        {data.headline ?? data.name}
      </h1>

      {data.description ? (
        <p className="mt-4 text-[16px] leading-relaxed text-ink-600">{data.description}</p>
      ) : null}

      {benefits.length ? (
        <ul className="mt-7 flex flex-col gap-2.5">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-3 text-[15px] text-ink-700">
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-accent-500 text-white">
                <Icon name="check" size={14} />
              </span>
              {benefit}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-9 rounded-3xl border-2 border-brand-500 p-6 text-center">
        <p className="text-[13px] font-medium text-ink-500">Sumalo a tu pedido por</p>
        <div className="mt-2 flex items-baseline justify-center gap-3">
          <span className="text-[38px] font-semibold tracking-tight text-ink-900">
            {formatMoney(data.price, data.currency)}
          </span>
          {data.compareAtPrice ? (
            <span className="text-[18px] text-ink-400 line-through">
              {formatMoney(data.compareAtPrice, data.currency)}
            </span>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-[13.5px] text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => go(true)}
          disabled={pending}
          className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-accent-600 text-[16px] font-semibold text-white transition-colors hover:bg-accent-700 disabled:opacity-70"
        >
          {pending ? "Un segundo…" : data.acceptLabel}
          {!pending ? <Icon name="arrowRight" size={18} /> : null}
        </button>

        <button
          type="button"
          onClick={() => go(false)}
          disabled={pending}
          className="mt-3 text-[13.5px] text-ink-500 underline underline-offset-4 transition-colors hover:text-ink-700 disabled:opacity-60"
        >
          {data.declineLabel}
        </button>
      </div>

      <p className="mt-6 text-center text-[12.5px] text-ink-400">
        Esta oferta se agrega a la compra que ya hiciste. No vas a tener que cargar tus datos de
        nuevo.
      </p>
    </main>
  );
}
