import Link from "next/link";

import { Icon } from "@/components/ui/icon";

/**
 * Un destino que existe pero no merece un lugar en el menú.
 *
 * El menú tiene seis destinos y tres de cuenta; meter ahí todo lo que la app
 * sabe hacer es exactamente lo que la vuelve intimidante. Cosas como afiliados
 * o dominios se enganchan desde la pantalla con la que tienen que ver, donde la
 * persona ya está pensando en ese tema.
 */
export function MoreLink({
  emoji,
  title,
  blurb,
  href,
}: {
  emoji: string;
  title: string;
  blurb: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3.5 rounded-2xl border border-ink-200 bg-white p-4 transition-all hover:border-ink-300 hover:shadow-soft"
    >
      <span
        className="tf-emoji !inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-ink-100 !text-[19px]"
        aria-hidden="true"
      >
        {emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-ink-900">{title}</span>
        <span className="block text-[12.5px] leading-relaxed text-ink-500">{blurb}</span>
      </span>
      <Icon
        name="chevronRight"
        size={16}
        className="shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}
