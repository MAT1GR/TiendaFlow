"use client";

import Link from "next/link";
import { useActionState } from "react";

import { resetPasswordAction } from "@/app/actions/auth";
import { Alert } from "@/components/ui/feedback";
import { Button, Field, Input } from "@/components/ui/primitives";

export function ResetForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, null);

  if (!token) {
    return (
      <div className="mt-8">
        <Alert tone="error" title="Falta el token">
          El link no tiene token o está incompleto.{" "}
          <Link href="/recuperar" className="font-semibold underline underline-offset-2">
            Pedí uno nuevo
          </Link>
          .
        </Alert>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-4" noValidate>
      <input type="hidden" name="token" value={token} />
      {state && !state.ok ? <Alert tone="error">{state.error}</Alert> : null}

      <Field
        label="Contraseña nueva"
        error={state && !state.ok ? state.fieldErrors?.password : undefined}
      >
        <Input name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>

      <Button type="submit" size="lg" full loading={pending}>
        Guardar y entrar
      </Button>
    </form>
  );
}
