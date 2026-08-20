import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { LinkButton } from "@/components/ui/primitives";
import { requireSession } from "@/lib/auth";
import { productContext } from "@/lib/product-workspace";
import { listDownsells, listOrderBumps, listUpsells } from "@/lib/repo";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Después de comprar" };

/**
 * Qué pasa alrededor de la compra.
 *
 * Esto es, por debajo, el funnel: order bump, upsell y downsell. Pero el
 * usuario nunca lee esas palabras. Ve el recorrido de su comprador dibujado de
 * arriba a abajo y decide qué agregar en cada momento.
 *
 * El término técnico aparece entre paréntesis y en gris, para quien ya lo
 * conoce o quiera googlearlo — nunca como el nombre principal.
 */
export default async function AfterPurchaseTab({ params }: { params: Promise<{ id: string }> }) {
  const { workspace } = await requireSession();
  const { id } = await params;

  const context = productContext(workspace.id, id);
  if (!context) notFound();

  const { offer } = context;

  if (!offer) {
    return (
      <EmptyGate
        title="Primero necesitás ponerle precio"
        body="Todo lo que se ofrece alrededor de la compra se cuelga de tu oferta principal."
        href={`/app/productos/${id}/oferta`}
        cta="Ir a mi oferta"
      />
    );
  }

  const bumps = listOrderBumps(workspace.id, offer.id);
  const upsells = listUpsells(workspace.id, offer.id);
  const downsells = upsells.flatMap((upsell) => listDownsells(workspace.id, upsell.id));
  const editHref = `/app/productos/${id}/oferta`;
  const currency = offer.currency;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h2 className="text-[18px] font-semibold tracking-tight text-ink-900">
          El recorrido de tu comprador
        </h2>
        <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-ink-600">
          Cada vez que alguien te compra pasa por estos momentos. En dos de ellos podés ofrecerle
          algo más. No es obligatorio, pero es la forma más barata de que cada venta valga más.
        </p>
      </header>

      <ol className="flex flex-col">
        <Moment
          emoji="🛒"
          title="Está por pagar"
          body="La persona ya decidió comprar y está completando sus datos."
          fixed
        />

        <Moment
          emoji="➕"
          title="Oferta extra en el momento de pagar"
          technical="order bump"
          body="Un agregado barato que se tilda con un clic, sin salir de la página de pago."
          items={bumps.map((bump) => ({
            id: bump.id,
            name: bump.name,
            price: bump.price,
            active: Boolean(bump.active),
          }))}
          emptyBody="Todavía no ofrecés nada acá. Suele funcionar algo chico y complementario, entre el 20% y el 30% del precio principal."
          currency={currency}
          href={editHref}
        />

        <Moment emoji="✅" title="Pagó" body="La compra se confirmó y ya es tu cliente." fixed />

        <Moment
          emoji="💎"
          title="Una segunda oferta, justo después"
          technical="upsell"
          body="Es el mejor momento para ofrecer algo más: ya te compró y ya confía."
          items={upsells.map((upsell) => ({
            id: upsell.id,
            name: upsell.name,
            price: upsell.price,
            active: Boolean(upsell.active),
          }))}
          emptyBody="Todavía no ofrecés nada después de la compra. Podés proponer una versión más completa, un acompañamiento o un producto relacionado."
          currency={currency}
          href={editHref}
        />

        <Moment
          emoji="🔄"
          title="Si dice que no, una alternativa"
          technical="downsell"
          body="Solo se muestra a quien rechazó la oferta anterior. Suele ser lo mismo, más chico o más barato."
          items={downsells.map((downsell) => ({
            id: downsell.id,
            name: downsell.name,
            price: downsell.price,
            active: Boolean(downsell.active),
          }))}
          emptyBody={
            upsells.length === 0
              ? "Para esto necesitás primero una segunda oferta."
              : "Todavía no tenés una alternativa. Recupera a una parte de los que dijeron que no."
          }
          currency={currency}
          href={editHref}
          disabled={upsells.length === 0}
        />

        <Moment
          emoji="🎁"
          title="Recibe lo que compró"
          body="Le damos acceso a sus archivos en la página de gracias."
          fixed
          last
        />
      </ol>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

interface MomentItem {
  id: string;
  name: string;
  price: number;
  active: boolean;
}

function Moment({
  emoji,
  title,
  technical,
  body,
  items,
  emptyBody,
  currency,
  href,
  fixed,
  disabled,
  last,
}: {
  emoji: string;
  title: string;
  technical?: string;
  body: string;
  items?: MomentItem[];
  emptyBody?: string;
  currency?: string;
  href?: string;
  /** Momentos que siempre ocurren y no se configuran. */
  fixed?: boolean;
  disabled?: boolean;
  last?: boolean;
}) {
  const configured = (items?.length ?? 0) > 0;

  return (
    <li className="relative flex gap-4 pb-4 last:pb-0">
      {!last ? (
        <span
          className="absolute left-[1.375rem] top-11 bottom-0 w-px bg-ink-200"
          aria-hidden="true"
        />
      ) : null}

      <span
        className={
          fixed
            ? "tf-emoji relative z-10 !inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[18px]"
            : "tf-emoji relative z-10 !inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[18px] ring-1 ring-inset ring-brand-200"
        }
        aria-hidden="true"
      >
        {emoji}
      </span>

      <div className={fixed ? "min-w-0 flex-1 pt-2.5" : "min-w-0 flex-1"}>
        {fixed ? (
          <>
            <p className="text-[14px] font-medium text-ink-700">{title}</p>
            <p className="text-[13px] text-ink-500">{body}</p>
          </>
        ) : (
          <div className="rounded-2xl border border-ink-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-ink-900">
                  {title}
                  {technical ? (
                    <span className="ml-2 text-[12px] font-normal text-ink-400">({technical})</span>
                  ) : null}
                </p>
                <p className="mt-1 max-w-xl text-[13.5px] leading-relaxed text-ink-600">{body}</p>
              </div>
              {href && !disabled ? (
                <LinkButton href={href} variant="secondary" size="sm" icon={configured ? "edit" : "plus"}>
                  {configured ? "Editar" : "Agregar"}
                </LinkButton>
              ) : null}
            </div>

            {configured ? (
              <ul className="mt-3 flex flex-col gap-2 border-t border-ink-100 pt-3">
                {items!.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-[13.5px] font-medium text-ink-800">
                      {item.name}
                    </span>
                    <span className="flex shrink-0 items-center gap-2.5">
                      <span className="text-[13.5px] tabular-nums text-ink-700">
                        {formatMoney(item.price, currency ?? "ARS")}
                      </span>
                      {!item.active ? (
                        <span className="text-[11.5px] font-medium text-ink-400">Apagada</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 border-t border-ink-100 pt-3 text-[13px] leading-relaxed text-ink-500">
                {emptyBody}
              </p>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function EmptyGate({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-8 text-center">
      <h2 className="text-[19px] font-semibold tracking-tight text-ink-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-ink-500">{body}</p>
      <div className="mt-6 flex justify-center">
        <LinkButton href={href} icon="arrowRight">
          {cta}
        </LinkButton>
      </div>
    </div>
  );
}
