import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Set de íconos propio (stroke 1.75, grilla 24) para no depender de una
 * librería externa y mantener un trazo consistente en toda la app.
 */

const PATHS = {
  dashboard: "M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z",
  box: "M3.5 7.5 12 3l8.5 4.5M3.5 7.5v9L12 21l8.5-4.5v-9M3.5 7.5 12 12m0 0 8.5-4.5M12 12v9",
  tag: "M3 11.5V4a1 1 0 0 1 1-1h7.5a1 1 0 0 1 .7.3l8.5 8.5a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 12.2a1 1 0 0 1-.3-.7ZM7.5 7.5h.01",
  funnel: "M3 4h18l-7 8v7l-4 2v-9L3 4Z",
  cart: "M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 8H6M9 20.5h.01M17 20.5h.01",
  users: "M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20M9 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm13 9.5v-1.5a4 4 0 0 0-3-3.9M16 3.6a4 4 0 0 1 0 7.8",
  sparkles:
    "m12 3 1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3Zm6.5 9 .9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1ZM5.5 15l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6L3.2 17.3l1.6-.7.7-1.6Z",
  megaphone: "M3 11v2a1 1 0 0 0 1 1h2l3.5 4.5V6.5L6 11H4a1 1 0 0 0-1 1Zm11-6.5v15A6.5 6.5 0 0 0 14 4.5ZM18.5 9.5h3m-3 5h3",
  chart: "M4 20V10m5 10V4m5 16v-7m5 7V8",
  handshake: "M11 6 8 9a2 2 0 0 0 0 2.8l.2.2a2 2 0 0 0 2.8 0l1-1 3 3a2 2 0 0 0 2.8-2.8L13.5 6H11Zm0 0-2-1.5H6L2.5 9m19 0L18 5h-3M4 14l3 3m2.5-.5 1.5 1.5m2-1 1.5 1.5",
  card: "M3 8.5h18M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm3.5 8H10",
  plug: "M9 3v6m6-6v6M6 9h12v3a6 6 0 0 1-6 6 6 6 0 0 1-6-6V9Zm6 12v-3",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0c2.5-2.4 3.8-5.4 3.8-9S14.5 5.4 12 3C9.5 5.4 8.2 8.4 8.2 12s1.3 6.6 3.8 9ZM3.5 9h17m-17 6h17",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8.4-2.1a1 1 0 0 0 .2-1.1l-1-1.7.4-1.9a1 1 0 0 0-.5-1l-1.7-1a1 1 0 0 0-1.1.1L15 7.4l-1.9-.6a1 1 0 0 0-1 .3l-1.2 1.5-1.9.2a1 1 0 0 0-.8.7l-.6 1.9-1.5 1.2a1 1 0 0 0-.3 1l.6 1.9-.6 1.8a1 1 0 0 0 .3 1l1.5 1.2.6 1.9",
  plus: "M12 5v14M5 12h14",
  search: "m21 21-4.3-4.3M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z",
  bell: "M18 8.5a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5ZM13.7 19a2 2 0 0 1-3.4 0",
  check: "m4.5 12.5 5 5 10-11",
  x: "M6 6l12 12M18 6 6 18",
  chevronDown: "m6 9 6 6 6-6",
  chevronRight: "m9 6 6 6-6 6",
  chevronLeft: "m15 6-6 6 6 6",
  arrowRight: "M4 12h16m0 0-6-6m6 6-6 6",
  arrowUpRight: "M7 17 17 7m0 0H8m9 0v9",
  trendUp: "m3 17 6-6 4 4 8-8m0 0h-6m6 0v6",
  trendDown: "m3 7 6 6 4-4 8 8m0 0h-6m6 0v-6",
  edit: "M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z",
  copy: "M9 9V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-4M5 9h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z",
  trash: "M4 7h16M10 11v6m4-6v6M5 7l1 13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-13M9 7V4h6v3",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Zm12 0a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z",
  archive: "M3 7h18M5 7v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7M3 7l1.5-3h15L21 7M10 12h4",
  upload: "M12 16V4m0 0-4 4m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3",
  download: "M12 4v12m0 0 4-4m-4 4-4-4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3",
  file: "M14 3v5h5M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8l-4-5Z",
  layers: "m12 3 9 5-9 5-9-5 9-5Zm9 9-9 5-9-5m18 4.5-9 5-9-5",
  rocket:
    "M14 4c3.5 0 6 2.5 6 6 0 4-3.5 7.5-8 10-2.5-4.5-6-8-6-8C8.5 7.5 10.5 4 14 4Zm-8.5 12c-1 1-1.5 4-1.5 4s3-.5 4-1.5",
  shield: "M12 21s7-3 7-9V5.5L12 3 5 5.5V12c0 6 7 9 7 9Zm-3-9.5 2 2 4-4",
  lock: "M6 10V8a6 6 0 1 1 12 0v2M5 10h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z",
  logout: "M15 12H4m0 0 4-4m-4 4 4 4m3-9V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-2",
  menu: "M4 7h16M4 12h16M4 17h16",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4v-5m0-3.5h.01",
  warning: "M12 9v4m0 3.5h.01M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5l3 2",
  mail: "M3 7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Zm0 .5 9 6 9-6",
  image: "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm0 11 5-5 4 4 3-2 5 4M9 10a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z",
  video: "M3 7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Zm12 3.5 6-3.5v10l-6-3.5",
  star: "m12 3.5 2.6 5.6 6 .8-4.4 4.2 1.1 6L12 17.3l-5.3 2.8 1.1-6-4.4-4.2 6-.8L12 3.5Z",
  grip: "M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01",
  desktop: "M3 5h18a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm5 15h8m-4-4v4",
  tablet: "M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm6 15h.01",
  mobile: "M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm4 15h.01",
  refresh: "M20 11a8 8 0 1 0-.7 4.3M20 5v6h-6",
  play: "M7 4.5v15l13-7.5-13-7.5Z",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0-3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
  gift: "M4 11h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9Zm-1-4h18v4H3V7Zm9 0v14M12 7S10.5 3 8 3a2 2 0 1 0 0 4h4Zm0 0s1.5-4 4-4a2 2 0 1 1 0 4h-4Z",
  link: "M10 13.5a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1.5 1.5M14 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1.5-1.5",
} as const;

export type IconName = keyof typeof PATHS;

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 20, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/**
 * Isotipo de la marca. Se sirve como PNG con fondo transparente para que
 * funcione igual sobre claro y sobre oscuro (los huecos internos del isotipo
 * son calados, no blancos).
 */
export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/tiendaflow-mark-128.png"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={cn("shrink-0 select-none", className)}
      style={{ width: size, height: size }}
    />
  );
}

const WORDMARK_SIZES = {
  sm: { mark: 26, text: "text-[15px]" },
  md: { mark: 30, text: "text-[16px]" },
  lg: { mark: 32, text: "text-[17px]" },
} as const;

/**
 * Bloque de marca completo: isotipo + nombre. Es lo que va en el header de la
 * landing, en el login, en el onboarding y en las páginas de error/acceso.
 */
export function Wordmark({
  size = "md",
  className,
}: {
  size?: keyof typeof WORDMARK_SIZES;
  className?: string;
}) {
  const { mark, text } = WORDMARK_SIZES[size];

  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <Logo size={mark} />
      <span className={cn("truncate font-semibold tracking-tight text-ink-900", text)}>
        TiendaFlow
      </span>
    </span>
  );
}
