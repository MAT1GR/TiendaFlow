"use client";

import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { LinkButton } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/**
 * El link de venta, con copiar.
 *
 * Es lo primero que quiere el usuario apenas publica, así que se muestra
 * entero y el botón confirma en el lugar —"✓ Copiado"— en vez de tirar un
 * toast que se pierde arriba a la derecha.
 */
export function ShareLink({ url, prominent }: { url: string; prominent?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [absolute, setAbsolute] = useState(url);

  // Si ya viene absoluta —el link con subdominio de la tienda— se usa tal cual.
  // Si es relativa, le ponemos el origen recién en el navegador: hasta que
  // hidrate mostramos la ruta, que se entiende igual y no hace saltar el layout.
  useEffect(() => {
    if (url.startsWith("http")) return;
    setAbsolute(`${window.location.origin}${url}`);
  }, [url]);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
    } catch {
      // Sin permiso de portapapeles no hay nada que hacer: el link está a la
      // vista y se puede seleccionar a mano.
    }
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-5 py-4",
        prominent ? "border-accent-200 bg-accent-50/60" : "border-ink-200 bg-ink-50/60",
      )}
    >
      <div className="min-w-0">
        <p className="text-[12.5px] font-medium text-ink-500">Tu link de venta</p>
        <code className="mt-0.5 block truncate text-[13.5px] font-medium text-ink-800">
          {absolute}
        </code>
      </div>

      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={copy}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[13.5px] font-medium transition-colors",
            copied
              ? "border-accent-300 bg-accent-50 text-accent-700"
              : "border-ink-200 bg-white text-ink-700 hover:bg-ink-100",
          )}
        >
          <span className={copied ? "tf-pop inline-flex" : "inline-flex"}>
            <Icon name={copied ? "check" : "copy"} size={15} />
          </span>
          {copied ? "Copiado" : "Copiar link"}
        </button>

        <LinkButton href={url} variant="secondary" size="sm" icon="arrowUpRight">
          Ver página
        </LinkButton>
      </div>
    </div>
  );
}
