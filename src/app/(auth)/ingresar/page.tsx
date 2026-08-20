import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { LoginForm } from "@/app/(auth)/ingresar/form";
import { currentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Ingresar" };

export default async function LoginPage() {
  if (await currentUser()) redirect("/app");

  return (
    <div>
      <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-ink-900">
        Entrá a tu cuenta
      </h1>
      <p className="mt-2 text-[14px] text-ink-500">
        Seguí donde lo dejaste: tu producto, tu oferta y tu funnel te esperan.
      </p>

      <LoginForm />

      <p className="mt-6 text-[13.5px] text-ink-500">
        ¿Todavía no tenés cuenta?{" "}
        <Link href="/crear-cuenta" className="font-semibold text-brand-700 hover:text-brand-800">
          Creá una gratis
        </Link>
      </p>
    </div>
  );
}
