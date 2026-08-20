"use client";

import { useEffect } from "react";

import { trackVisitAction } from "@/app/actions/public";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

/**
 * Registra la visita del paso y guarda la atribución UTM.
 * Corre una sola vez por carga y no bloquea el render.
 */
export function VisitTracker({ slug, stepType }: { slug: string; stepType: string }) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    for (const key of UTM_KEYS) {
      const value = params.get(key);
      if (value) utm[key] = value;
    }

    void trackVisitAction({
      slug,
      stepType,
      utm,
      referrer: document.referrer || undefined,
      path: window.location.pathname,
    });
  }, [slug, stepType]);

  return null;
}
