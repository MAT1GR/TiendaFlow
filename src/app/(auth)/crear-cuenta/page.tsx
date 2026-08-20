import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { RegisterForm } from "@/app/(auth)/crear-cuenta/form";
import { currentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function RegisterPage() {
  if (await currentUser()) redirect("/app");

  return (
    <div>
      <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-ink-900">
        Empezá gratis
      </h1>
      <p className="mt-2 text-[14px] text-ink-500">
        Creá tu cuenta y armamos juntos tu primera oferta lista para vender.
      </p>

      <RegisterForm />

      <p className="mt-6 text-[13.5px] text-ink-500">
        ¿Ya tenés cuenta?{" "}
        <Link href="/ingresar" className="font-semibold text-brand-700 hover:text-brand-800">
          Ingresá
        </Link>
      </p>
    </div>
  );
}
