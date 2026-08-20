import Link from "next/link";
import type { Metadata } from "next";

import { RecoverForm } from "@/app/(auth)/recuperar/form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecoverPage() {
  return (
    <div>
      <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-ink-900">
        Recuperá tu contraseña
      </h1>
      <p className="mt-2 text-[14px] text-ink-500">
        Poné tu email y te mandamos un link para crear una nueva.
      </p>

      <RecoverForm />

      <p className="mt-6 text-[13.5px] text-ink-500">
        <Link href="/ingresar" className="font-semibold text-brand-700 hover:text-brand-800">
          Volver a ingresar
        </Link>
      </p>
    </div>
  );
}
