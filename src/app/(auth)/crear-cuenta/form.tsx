"use client";

import { useActionState } from "react";

import { registerAction } from "@/app/actions/auth";
import { Alert } from "@/components/ui/feedback";
import { Button, Field, Input } from "@/components/ui/primitives";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-4" noValidate>
      {state && !state.ok ? <Alert tone="error">{state.error}</Alert> : null}

      <Field label="Tu nombre">
        <Input name="full_name" autoComplete="name" required placeholder="Camila Rossi" />
      </Field>

      <Field label="Email" error={errors?.email}>
        <Input name="email" type="email" autoComplete="email" required placeholder="vos@tumarca.com" />
      </Field>

      <Field
        label="Contraseña"
        hint="Mínimo 8 caracteres."
        error={errors?.password}
      >
        <Input name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>

      <Button type="submit" size="lg" full loading={pending}>
        Crear mi cuenta
      </Button>
    </form>
  );
}
