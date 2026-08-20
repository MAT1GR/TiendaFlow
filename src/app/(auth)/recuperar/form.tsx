"use client";

import Link from "next/link";
import { useActionState } from "react";

import { requestPasswordResetAction } from "@/app/actions/auth";
import { Alert } from "@/components/ui/feedback";
import { Button, Field, Input } from "@/components/ui/primitives";

export function RecoverForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, null);

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-4" noValidate>
      {state && !state.ok ? <Alert tone="error">{state.error}</Alert> : null}
      {state?.ok ? (
        <Alert tone={state.data.devLink ? "warning" : "success"}>
          <p>{state.message}</p>
          {state.data.devLink ? (
            <Link
              href={state.data.devLink}
              className="mt-2 inline-block font-semibold underline underline-offset-2"
            >
              Abrir el link de restablecimiento
            </Link>
          ) : null}
        </Alert>
      ) : null}

      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" required placeholder="vos@tumarca.com" />
      </Field>

      <Button type="submit" size="lg" full loading={pending}>
        Enviarme el link
      </Button>
    </form>
  );
}
