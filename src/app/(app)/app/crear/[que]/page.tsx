import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/data";
import { Icon } from "@/components/ui/icon";
import { EmptyState, LinkButton } from "@/components/ui/primitives";
import { CREATE_TARGET } from "@/components/shell/nav";
import { requireSession } from "@/lib/auth";
import { productLibrary } from "@/lib/product-workspace";
import { cn, formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Crear" };

type Que = keyof typeof CREATE_TARGET;

/**
 * "¿Para qué producto?".
 *
 * Una oferta, una página de venta o un bono no existen sueltos: son de un
 * producto. En vez de dejar crear una entidad huérfana que después hay que ir a
 * atar a mano, esta pantalla hace la única pregunta que falta y te deposita en
 * la sección correcta del producto elegido.
 *
 * Si tenés un solo producto ni siquiera se muestra: no tiene sentido preguntar
 * algo con una sola respuesta posible.
 */
export default async function CreatePickerPage({ params }: { params: Promise<{ que: string }> }) {
  const { workspace } = await requireSession();
  const { que } = await params;

  if (!(que in CREATE_TARGET)) notFound();
  const target = CREATE_TARGET[que as Que];

  const products = productLibrary(workspace.id);

  if (products.length === 1) {
    redirect(`/app/productos/${products[0].id}/${target.segment}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <PageHeader title={target.title} subtitle={target.blurb} />

      {products.length === 0 ? (
        <EmptyState
          icon="box"
          title="Todavía no tenés ningún producto"
          description="Todo empieza por el producto: es lo que vendés. Creá uno y desde adentro vas a poder ponerle precio, armar su página y sumarle bonos."
          action={
            <LinkButton href="/app/productos/nuevo" icon="plus">
              Crear producto
            </LinkButton>
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {products.map((product) => (
              <li key={product.id}>
                <Link
                  href={`/app/productos/${product.id}/${target.segment}`}
                  className="group flex items-center gap-3.5 rounded-2xl border border-ink-200 bg-white p-4 transition-all hover:border-brand-300 hover:shadow-soft"
                >
                  <span
                    className="tf-emoji !inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-ink-100 !text-[21px]"
                    aria-hidden="true"
                  >
                    {product.emoji}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-semibold text-ink-900">
                      {product.name}
                    </span>
                    <span className="block truncate text-[12.5px] text-ink-500">
                      {product.typeLabel}
                      {product.price > 0
                        ? ` · ${formatMoney(product.price, product.currency)}`
                        : ""}
                    </span>
                  </span>

                  <span
                    className={cn(
                      "hidden shrink-0 items-center gap-1.5 text-[12.5px] font-medium sm:flex",
                      product.status === "listo" ? "text-accent-700" : "text-ink-400",
                    )}
                  >
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        product.status === "listo"
                          ? "bg-accent-500"
                          : product.status === "preparacion"
                            ? "bg-amber-400"
                            : "bg-ink-300",
                      )}
                      aria-hidden="true"
                    />
                    {product.statusLabel}
                  </span>

                  <Icon
                    name="chevronRight"
                    size={17}
                    className="shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            ))}
          </ul>

          <p className="text-center text-[13px] text-ink-500">
            ¿Es para algo nuevo?{" "}
            <Link
              href="/app/productos/nuevo"
              className="font-semibold text-brand-700 hover:text-brand-800"
            >
              Creá otro producto
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
