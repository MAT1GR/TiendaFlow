"use client";

import Link from "next/link";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import { cn, type Tone } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Button                                                                      */
/* -------------------------------------------------------------------------- */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "ai" | "success";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 shadow-[0_1px_2px_rgba(15,23,42,.08)] disabled:bg-brand-300",
  secondary:
    "bg-white text-ink-800 border border-ink-200 hover:bg-ink-50 hover:border-ink-300",
  ghost: "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
  danger: "bg-white text-red-600 border border-red-200 hover:bg-red-50",
  success: "bg-accent-600 text-white hover:bg-accent-700",
  ai: "tf-gradient-ai text-white shadow-[0_8px_24px_-10px_rgba(109,93,251,.7)] hover:brightness-110",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-[15px] gap-2 rounded-xl",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  full?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  loading,
  full,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100",
        VARIANTS[variant],
        SIZES[size],
        full && "w-full",
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner size={size === "sm" ? 13 : 15} /> : icon ? <Icon name={icon} size={size === "sm" ? 15 : 17} /> : null}
      {children}
      {iconRight && !loading ? <Icon name={iconRight} size={size === "sm" ? 15 : 17} /> : null}
    </button>
  );
}

interface LinkButtonProps {
  href: string;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  className?: string;
  full?: boolean;
  children: ReactNode;
  prefetch?: boolean;
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  className,
  full,
  children,
  prefetch,
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-[.98]",
        VARIANTS[variant],
        SIZES[size],
        full && "w-full",
        className,
      )}
    >
      {icon ? <Icon name={icon} size={size === "sm" ? 15 : 17} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={size === "sm" ? 15 : 17} /> : null}
    </Link>
  );
}

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cn("animate-spin", className)}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" fill="none" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Form fields                                                                 */
/* -------------------------------------------------------------------------- */

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <label className="text-[13px] font-medium text-ink-700">
          {label}
          {required ? <span className="ml-0.5 text-brand-600">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="text-[12.5px] text-red-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12.5px] text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}

const FIELD_BASE =
  "w-full rounded-xl border border-ink-200 bg-white px-3.5 text-sm text-ink-900 placeholder:text-ink-400 transition-colors hover:border-ink-300 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 disabled:bg-ink-50 disabled:text-ink-500";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD_BASE, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(FIELD_BASE, "min-h-24 py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn(FIELD_BASE, "h-10 appearance-none pr-9", className)}
        {...props}
      >
        {children}
      </select>
      <Icon
        name="chevronDown"
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400"
      />
    </div>
  );
}

export function Checkbox({
  label,
  description,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; description?: string }) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border border-ink-200 bg-white p-3.5 transition-colors hover:border-brand-300 hover:bg-brand-50/40 has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50/60",
        className,
      )}
    >
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-[18px] shrink-0 accent-brand-600"
        {...props}
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink-900">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-[13px] text-ink-500">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/* Card / Badge                                                                */
/* -------------------------------------------------------------------------- */

export function Card({
  className,
  children,
  hover,
  as: As = "div",
}: {
  className?: string;
  children: ReactNode;
  hover?: boolean;
  as?: "div" | "section" | "article" | "li";
}) {
  return (
    <As
      className={cn(
        "rounded-2xl border border-ink-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,.04)]",
        hover && "transition-all duration-200 hover:border-ink-300 hover:shadow-[0_2px_4px_rgba(15,23,42,.04),0_16px_36px_-18px_rgba(15,23,42,.22)]",
        className,
      )}
    >
      {children}
    </As>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 px-5 pt-5", className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-ink-900">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-[13px] text-ink-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

const TONES: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-600 ring-ink-200",
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
  success: "bg-accent-50 text-accent-700 ring-accent-300/60",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
  info: "bg-cyan-50 text-cyan-700 ring-cyan-200",
};

export function Badge({
  children,
  tone = "neutral",
  className,
  dot,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium ring-1 ring-inset",
        TONES[tone],
        className,
      )}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}


/* -------------------------------------------------------------------------- */
/* Tooltip                                                                     */
/* -------------------------------------------------------------------------- */

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-50 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink-900 px-2.5 py-1.5 text-[11.5px] font-medium text-white shadow-lg group-hover/tt:block group-focus-within/tt:block"
      >
        {label}
      </span>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Dropdown                                                                    */
/* -------------------------------------------------------------------------- */

export function Dropdown({
  trigger,
  children,
  align = "right",
  className,
}: {
  trigger: (open: boolean) => ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="contents"
      >
        {trigger(open)}
      </button>
      {open ? (
        <div
          role="menu"
          className={cn(
            "tf-rise absolute z-50 mt-2 min-w-56 overflow-hidden rounded-2xl border border-ink-200 bg-white p-1.5 shadow-[0_2px_4px_rgba(15,23,42,.04),0_24px_48px_-20px_rgba(15,23,42,.35)]",
            align === "right" ? "right-0" : "left-0",
            className,
          )}
        >
          {typeof children === "function" ? children(() => setOpen(false)) : children}
        </div>
      ) : null}
    </div>
  );
}

export function MenuItem({
  icon,
  children,
  onClick,
  href,
  tone = "default",
}: {
  icon?: IconName;
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  tone?: "default" | "danger";
}) {
  const className = cn(
    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13.5px] font-medium transition-colors",
    tone === "danger"
      ? "text-red-600 hover:bg-red-50"
      : "text-ink-700 hover:bg-ink-100 hover:text-ink-900",
  );
  if (href) {
    return (
      <Link href={href} className={className} role="menuitem" onClick={onClick}>
        {icon ? <Icon name={icon} size={16} className="text-ink-400" /> : null}
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={className} role="menuitem" onClick={onClick}>
      {icon ? <Icon name={icon} size={16} className="text-ink-400" /> : null}
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Modal / Drawer                                                              */
/* -------------------------------------------------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const width = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
  }[size];

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-6">
      <div
        className="fixed inset-0 bg-ink-900/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "tf-rise relative z-10 w-full rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl",
          width,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
            {description ? <p className="mt-1 text-[13.5px] text-ink-500">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="tf-scroll max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-ink-100 px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "absolute right-0 top-0 flex h-full w-full flex-col bg-white shadow-2xl",
          width,
        )}
      >
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <h2 className="text-base font-semibold text-ink-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="tf-scroll flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? <div className="border-t border-ink-100 px-5 py-4">{footer}</div> : null}
      </aside>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Tabs                                                                        */
/* -------------------------------------------------------------------------- */

export function Tabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: Array<{ value: string; label: string; count?: number }>;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn("inline-flex flex-wrap gap-1 rounded-xl bg-ink-100 p-1", className)}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          type="button"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-all",
            value === tab.value
              ? "bg-white text-ink-900 shadow-[0_1px_2px_rgba(15,23,42,.08)]"
              : "text-ink-500 hover:text-ink-800",
          )}
        >
          {tab.label}
          {typeof tab.count === "number" ? (
            <span className="ml-1.5 text-ink-400">{tab.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Empty / Loading                                                             */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  icon = "sparkles",
  title,
  description,
  action,
  secondary,
  className,
}: {
  icon?: IconName;
  title: string;
  description: string;
  action?: ReactNode;
  secondary?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-ink-50/50 px-6 py-14 text-center",
        className,
      )}
    >
      <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-white text-brand-600 shadow-[0_1px_2px_rgba(15,23,42,.06)] ring-1 ring-ink-200">
        <Icon name={icon} size={22} />
      </div>
      <h3 className="text-[15px] font-semibold text-ink-900">{title}</h3>
      <p className="mt-1.5 max-w-md text-[13.5px] leading-relaxed text-ink-500">{description}</p>
      {action || secondary ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondary}
        </div>
      ) : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("tf-skeleton rounded-lg", className)} />;
}

/* -------------------------------------------------------------------------- */
/* Stepper / Progress                                                          */
/* -------------------------------------------------------------------------- */

export function Stepper({
  steps,
  current,
  className,
}: {
  steps: string[];
  current: number;
  className?: string;
}) {
  return (
    <ol className={cn("flex flex-wrap items-center gap-x-2 gap-y-3", className)}>
      {steps.map((step, index) => {
        const state = index < current ? "done" : index === current ? "active" : "todo";
        return (
          <li key={step} className="flex items-center gap-2">
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold transition-colors",
                state === "done" && "bg-accent-500 text-white",
                state === "active" && "bg-brand-600 text-white ring-4 ring-brand-500/15",
                state === "todo" && "bg-ink-100 text-ink-400",
              )}
            >
              {state === "done" ? <Icon name="check" size={14} /> : index + 1}
            </span>
            <span
              className={cn(
                "text-[13px] font-medium",
                state === "todo" ? "text-ink-400" : "text-ink-800",
              )}
            >
              {step}
            </span>
            {index < steps.length - 1 ? (
              <span className="mx-1 hidden h-px w-6 bg-ink-200 sm:block" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function ProgressBar({
  value,
  tone = "brand",
  className,
  showLabel,
}: {
  value: number;
  tone?: "brand" | "success" | "warning";
  className?: string;
  showLabel?: boolean;
}) {
  const colors = {
    brand: "bg-brand-600",
    success: "bg-accent-500",
    warning: "bg-amber-500",
  };
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100"
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500", colors[tone])}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
      {showLabel ? (
        <span className="w-9 shrink-0 text-right text-[12px] font-semibold text-ink-600">
          {Math.round(value)}%
        </span>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Toasts                                                                      */
/* -------------------------------------------------------------------------- */

export interface Toast {
  id: number;
  title: string;
  description?: string;
  tone: "success" | "error" | "info";
}

interface ToastContextValue {
  toast: (input: Omit<Toast, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  function push(input: Omit<Toast, "id">) {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { ...input, id }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 5200);
  }

  const value: ToastContextValue = {
    toast: push,
    success: (title, description) => push({ title, description, tone: "success" }),
    error: (title, description) => push({ title, description, tone: "error" }),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
        aria-live="polite"
        role="status"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "tf-rise pointer-events-auto flex items-start gap-3 rounded-2xl border bg-white p-3.5 shadow-[0_2px_4px_rgba(15,23,42,.04),0_20px_44px_-20px_rgba(15,23,42,.4)]",
              toast.tone === "success" && "border-accent-300/70",
              toast.tone === "error" && "border-red-200",
              toast.tone === "info" && "border-ink-200",
            )}
          >
            <span
              className={cn(
                "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-white",
                toast.tone === "success" && "bg-accent-500",
                toast.tone === "error" && "bg-red-500",
                toast.tone === "info" && "bg-brand-600",
              )}
            >
              <Icon
                name={toast.tone === "success" ? "check" : toast.tone === "error" ? "warning" : "info"}
                size={14}
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold text-ink-900">{toast.title}</p>
              {toast.description ? (
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-500">
                  {toast.description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setToasts((current) => current.filter((t) => t.id !== toast.id))}
              aria-label="Cerrar notificación"
              className="rounded-md p-1 text-ink-400 hover:bg-ink-100"
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe usarse dentro de <ToastProvider>.");
  }
  return context;
}
