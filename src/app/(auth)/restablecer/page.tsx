import type { Metadata } from "next";

import { ResetForm } from "@/app/(auth)/restablecer/form";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div>
      <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-ink-900">
        Creá una contraseña nueva
      </h1>
      <p className="mt-2 text-[14px] text-ink-500">
        Elegí una contraseña de al menos 8 caracteres.
      </p>

      <ResetForm token={token ?? ""} />
    </div>
  );
}
