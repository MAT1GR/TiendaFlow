import type { ReactNode } from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

const TONES: Record<
  "info" | "success" | "warning" | "error" | "ai",
  { wrapper: string; icon: IconName; iconColor: string }
> = {
  info: {
    wrapper: "border-ink-200 bg-ink-50 text-ink-700",
    icon: "info",
    iconColor: "text-ink-500",
  },
  success: {
    wrapper: "border-accent-300/60 bg-accent-50 text-accent-700",
    icon: "check",
    iconColor: "text-accent-600",
  },
  warning: {
    wrapper: "border-amber-200 bg-amber-50 text-amber-800",
    icon: "warning",
    iconColor: "text-amber-600",
  },
  error: {
    wrapper: "border-red-200 bg-red-50 text-red-700",
    icon: "warning",
    iconColor: "text-red-500",
  },
  ai: {
    wrapper: "border-brand-200 bg-brand-50 text-brand-800",
    icon: "sparkles",
    iconColor: "text-brand-600",
  },
};

export function Alert({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: keyof typeof TONES;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const config = TONES[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-[13.5px] leading-relaxed",
        config.wrapper,
        className,
      )}
    >
      <Icon name={config.icon} size={17} className={cn("mt-0.5 shrink-0", config.iconColor)} />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title && "mt-1 opacity-90")}>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/**
 * Aviso de que un contenido lo armó el generador local en vez de un modelo.
 * Se muestra en TODA salida de IA sin proveedor conectado.
 */
export function TemplateNotice({ warning }: { warning?: string }) {
  return (
    <Alert tone="warning" title="Borrador local, no generado por IA">
      {warning ??
        "No hay un proveedor de IA conectado, así que armamos este borrador con los datos que ya cargaste. Editalo antes de publicar."}
    </Alert>
  );
}

/** Marca visual para datos de demostración. */
export function DemoTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-amber-700 ring-1 ring-inset ring-amber-200",
        className,
      )}
      title="Dato de demostración, no es una venta real"
    >
      Demo
    </span>
  );
}

/** Estado de conexión de una integración. */
export function ConnectionStatus({
  status,
  className,
}: {
  status: "connected" | "disconnected" | "error" | "pending" | "verifying" | "active";
  className?: string;
}) {
  const map = {
    connected: { label: "Conectado", dot: "bg-accent-500", text: "text-accent-700" },
    active: { label: "Activo", dot: "bg-accent-500", text: "text-accent-700" },
    disconnected: { label: "Sin conectar", dot: "bg-ink-300", text: "text-ink-500" },
    pending: { label: "Pendiente", dot: "bg-amber-400", text: "text-amber-700" },
    verifying: { label: "Verificando", dot: "bg-amber-400", text: "text-amber-700" },
    error: { label: "Con error", dot: "bg-red-500", text: "text-red-600" },
  }[status];

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[12.5px] font-medium", map.text, className)}>
      <span className={cn("size-2 rounded-full", map.dot)} />
      {map.label}
    </span>
  );
}
