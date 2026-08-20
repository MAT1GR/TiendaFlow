import Link from "next/link";

import { Icon, Wordmark } from "@/components/ui/icon";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-5">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="inline-flex justify-center">
          <Wordmark />
        </Link>

        <h1 className="mt-8 text-[30px] font-semibold tracking-tight text-ink-900">
          No encontramos esta página
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-500">
          Puede que el link esté mal, que el funnel todavía no esté publicado o que se haya
          eliminado.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Ir a mi panel
            <Icon name="arrowRight" size={16} />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center rounded-xl border border-ink-200 px-5 py-2.5 text-[14px] font-semibold text-ink-800 transition-colors hover:bg-ink-50"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
