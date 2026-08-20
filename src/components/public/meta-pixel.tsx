"use client";

import Script from "next/script";
import { useEffect } from "react";

/**
 * Pixel de Meta.
 *
 * Solo recibe el Pixel ID, que es público por definición. El token de la API
 * de Conversiones nunca llega al navegador: esos eventos se envían desde el
 * servidor (src/lib/integrations/meta.ts).
 */
export function MetaPixel({
  pixelId,
  events = ["PageView"],
  value,
  currency,
  eventId,
}: {
  pixelId: string;
  events?: string[];
  value?: number;
  currency?: string;
  eventId?: string;
}) {
  useEffect(() => {
    const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
    if (!fbq) return;

    for (const event of events) {
      if (event === "PageView") continue; // ya lo dispara el snippet inicial
      const payload =
        value !== undefined ? { value, currency: currency ?? "ARS" } : undefined;
      // `eventID` permite deduplicar contra el evento equivalente de la API
      // de Conversiones enviado desde el servidor.
      fbq("track", event, payload, eventId ? { eventID: eventId } : undefined);
    }
  }, [events, value, currency, eventId]);

  return (
    <>
      <Script id="tf-meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${pixelId}');
fbq('track','PageView');`}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
