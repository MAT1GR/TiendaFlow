"use client";

import Link from "next/link";
import { useActionState } from "react";

import { loginAction } from "@/app/actions/auth";
import { Alert } from "@/components/ui/feedback";
import { Button, Field, Input } from "@/components/ui/primitives";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, null);

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-4" noValidate>
      {state && !state.ok ? <Alert tone="error">{state.error}</Alert> : null}

      <Field label="Email" error={state && !state.ok ? state.fieldErrors?.email : undefined}>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="vos@tumarca.com"
        />
      </Field>

      <Field label="Contraseña">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>

      <div className="flex justify-end">
        <Link href="/recuperar" className="text-[13px] font-medium text-brand-700 hover:text-brand-800">
          Olvidé mi contraseña
        </Link>
      </div>

      <Button type="submit" size="lg" full loading={pending}>
        Ingresar
      </Button>
    </form>
  );
}
