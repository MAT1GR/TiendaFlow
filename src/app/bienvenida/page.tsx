import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { OnboardingWizard } from "@/app/bienvenida/wizard";
import { Wordmark } from "@/components/ui/icon";
import { currentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Bienvenido" };

export default async function OnboardingPage() {
  const user = await currentUser();
  if (!user) redirect("/ingresar");

  return (
    <div className="relative min-h-dvh overflow-hidden bg-ink-50/60">
      {/*
        Las tipografías de las páginas de venta. Se cargan acá porque la vista
        previa de colores muestra el nombre de la tienda con la misma fuente
        que va a tener la página real: sin esto, el vendedor elige un estilo
        mirando una tipografía que después no es la suya.
      */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,700;0,800;1,700&display=swap"
      />

      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(50% 100% at 30% 0%, rgba(109,93,251,.22) 0%, transparent 70%), radial-gradient(40% 80% at 80% 0%, rgba(34,211,238,.18) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-5 py-8 sm:px-8">
        <Wordmark className="mb-8" />

        <OnboardingWizard firstName={user.full_name.split(" ")[0]} />
      </div>
    </div>
  );
}
