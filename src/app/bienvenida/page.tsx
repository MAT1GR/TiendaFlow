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
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(50% 100% at 30% 0%, rgba(109,93,251,.22) 0%, transparent 70%), radial-gradient(40% 80% at 80% 0%, rgba(34,211,238,.18) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-5 py-8 sm:px-8">
        <Wordmark className="mb-8" />

        <OnboardingWizard firstName={user.full_name.split(" ")[0]} />
      </div>
    </div>
  );
}
