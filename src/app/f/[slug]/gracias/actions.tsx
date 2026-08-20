"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { confirmManualPaymentAction } from "@/app/actions/public";
import { Icon } from "@/components/ui/icon";

/**
 * Acciones de la página de gracias cuando el pedido quedó pendiente.
 *
 * Si el workspace tiene un proveedor de pago conectado, la confirmación llega
 * del proveedor y acá solo explicamos qué esperar. Si no hay ninguno conectado,
 * ofrecemos una confirmación manual para poder recorrer el funnel completo
 * durante la configuración — y lo decimos con todas las letras.
 */
export function ThankYouActions({
  slug,
  orderId,
  token,
  hasProvider,
}: {
  slug: string;
  orderId: string;
  token: string;
  hasProvider: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (hasProvider) {
    return (
      <div className="mt-6 rounded-2xl border border-ink-200 bg-white px-4 py-4">
        <p className="flex items-start gap-2.5 text-[14px] leading-relaxed text-ink-700">
          <Icon name="clock" size={17} className="mt-0.5 shrink-0 text-amber-600" />
          Estamos esperando la confirmación del proveedor de pago. Apenas se acredite, vas a recibir
          el acceso por email. No hace falta que hagas nada.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
      <p className="text-[14px] font-semibold text-amber-900">
        Esta tienda todavía no tiene cobro conectado
      </p>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-amber-800">
        Como no hay proveedor de pago configurado, no se cobró nada. Si sos quien está armando la
        tienda, podés marcar el pedido como pagado para probar el recorrido completo.
      </p>

      {error ? (
        <p role="alert" className="mt-3 rounded-xl bg-white px-3 py-2 text-[13px] text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await confirmManualPaymentAction({ slug, orderId, token });
            if (result.ok) {
              router.refresh();
            } else {
              setError(result.error);
            }
          })
        }
        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-70"
      >
        {pending ? "Confirmando…" : "Marcar como pagado (solo para pruebas)"}
      </button>
    </div>
  );
}
