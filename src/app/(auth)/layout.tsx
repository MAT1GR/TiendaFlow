import Link from "next/link";

import { Icon, Logo } from "@/components/ui/icon";

const HIGHLIGHTS = [
  { icon: "box" as const, text: "Creá o importá tu producto digital" },
  { icon: "tag" as const, text: "Armá la oferta con bonos, bump y upsells" },
  { icon: "funnel" as const, text: "Publicá el funnel completo en minutos" },
  { icon: "chart" as const, text: "Medí cada venta y optimizá con IA" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-5 py-8 sm:px-10">
        <Link href="/" className="mb-10 flex items-center gap-2.5">
          <Logo size={32} />
          <span className="text-[17px] font-semibold tracking-tight text-ink-900">TiendaFlow</span>
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">{children}</div>
        <p className="mx-auto mt-8 w-full max-w-sm text-[12px] text-ink-400">
          Al continuar aceptás los términos de uso de TiendaFlow.
        </p>
      </div>

      <aside className="relative hidden overflow-hidden bg-ink-900 lg:flex lg:flex-col lg:justify-center lg:px-14">
        <div
          className="absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "radial-gradient(60% 50% at 20% 15%, #6D5DFB 0%, transparent 60%), radial-gradient(50% 45% at 85% 80%, #22D3EE 0%, transparent 60%)",
          }}
          aria-hidden="true"
        />
        <div className="relative z-10 max-w-md">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-medium text-white/80 ring-1 ring-inset ring-white/15">
            <Icon name="sparkles" size={14} />
            Create. Launch. Sell. Optimize.
          </p>
          <h2 className="text-[34px] font-semibold leading-[1.12] tracking-tight text-white">
            De una idea a una oferta lista para vender.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-white/60">
            Tu producto, tu funnel y tus ventas. Todo en un solo lugar.
          </p>

          <ul className="mt-9 flex flex-col gap-3.5">
            {HIGHLIGHTS.map((item) => (
              <li key={item.text} className="flex items-center gap-3 text-[14px] text-white/85">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 text-white ring-1 ring-inset ring-white/15">
                  <Icon name={item.icon} size={17} />
                </span>
                {item.text}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
