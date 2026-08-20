/**
 * Glosario en castellano llano.
 *
 * La idea NO es reemplazar los términos del rubro: si alguien va a vender con
 * Meta Ads, en algún momento va a escuchar "order bump" y "ROAS", y conviene
 * que los aprenda acá. Lo que hacemos es que nunca sean un obstáculo: al lado
 * de cada término hay un "?" que lo explica con un ejemplo concreto.
 *
 * Reglas al escribir una definición:
 *  - Una frase para el qué. Sin usar otro término técnico adentro.
 *  - Un ejemplo con números o nombres reales, no abstracto.
 *  - Nada de "simplemente" ni "solo tenés que": si fuera obvio no estaría acá.
 */

export interface GlossaryEntry {
  /** Cómo se muestra el término en el encabezado del cartel. */
  term: string;
  /** Qué es, en una frase, sin jerga adentro. */
  definition: string;
  /** Un caso concreto. Es lo que más ayuda a que caiga la ficha. */
  example?: string;
}

export const GLOSSARY = {
  funnel: {
    term: "Funnel",
    definition:
      "El camino que recorre una persona desde que hace clic en tu anuncio hasta que te compra. Cada pantalla de ese camino es un paso.",
    example:
      "Ve tu anuncio → entra a la página de venta → completa sus datos → paga → recibe el ebook. Eso es un funnel de 4 pasos.",
  },
  landing: {
    term: "Landing page",
    definition:
      "La página donde cae la persona al hacer clic en tu anuncio. Su único trabajo es convencerla de comprar.",
    example:
      "Arriba el título con la promesa, después los beneficios, los bonos, la garantía y el botón de compra.",
  },
  checkout: {
    term: "Checkout",
    definition:
      "La pantalla donde la persona pone su nombre, su email y paga. Es el paso más frágil: cada campo de más hace que se caigan ventas.",
    example: "Nombre, email y el botón de pagar. Nada más.",
  },
  oferta: {
    term: "Oferta",
    definition:
      "No es lo mismo que el producto. La oferta es el producto MÁS el precio, la promesa, los bonos y la garantía. Es lo que la persona realmente compra.",
    example:
      "El producto es un ebook. La oferta es ese ebook + 3 bonos + garantía de 7 días por $14.900.",
  },
  order_bump: {
    term: "Order bump",
    definition:
      "Un extra barato que aparece como una casilla para tildar dentro del checkout, justo antes de pagar.",
    example:
      "Está comprando tu ebook de hábitos por $14.900 y ve una casilla: “Sumá el recetario por $3.900”. La tilda y tu venta pasa a $18.800.",
  },
  upsell: {
    term: "Upsell",
    definition:
      "Una segunda oferta que aparece justo después de que la persona te pagó. Como ya te compró y ya confía, es la venta más barata que vas a hacer.",
    example:
      "Compró el ebook de $14.900 y en la pantalla siguiente le ofrecés el curso completo por $29.900.",
  },
  downsell: {
    term: "Downsell",
    definition:
      "Una versión más barata que se muestra solo si la persona rechazó el upsell. Es un segundo intento, no un castigo.",
    example:
      "Dijo que no al curso de $29.900, entonces le ofrecés los 3 módulos principales por $9.900.",
  },
  bono: {
    term: "Bono",
    definition:
      "Algo extra que regalás junto al producto. Sube lo que la persona siente que se lleva sin que tengas que bajar el precio.",
    example: "Una checklist imprimible, una plantilla editable o una guía rápida.",
  },
  garantia: {
    term: "Garantía",
    definition:
      "Tu promesa de devolver la plata si la persona no queda conforme. Saca el miedo a comprar.",
    example:
      "“Garantía de 7 días: si no es para vos, escribinos y te devolvemos todo.” Escribí solo lo que puedas cumplir de verdad.",
  },
  conversion: {
    term: "Conversión",
    definition:
      "De cada 100 personas que entran, cuántas terminan comprando.",
    example: "Entraron 1.000 y compraron 25 → tu conversión es 2,5%.",
  },
  roas: {
    term: "ROAS",
    definition:
      "Cuánta plata te vuelve por cada peso que ponés en publicidad. Si da menos de 1, estás perdiendo.",
    example: "Gastaste $10.000 en anuncios y vendiste $30.000 → tu ROAS es 3x.",
  },
  cpa: {
    term: "CPA",
    definition:
      "Cuánto te sale conseguir una venta. Si es más alto que tu ganancia por venta, cada cliente nuevo te cuesta plata.",
    example: "Gastaste $10.000 y trajiste 5 ventas → tu CPA es $2.000 por venta.",
  },
  ticket_promedio: {
    term: "Ticket promedio",
    definition:
      "Cuánto gasta en promedio cada persona que compra. Subirlo es la forma más rápida de ganar más sin traer más gente.",
    example: "10 ventas que sumaron $180.000 → tu ticket promedio es $18.000.",
  },
  take_rate: {
    term: "Take rate",
    definition:
      "De cada 100 personas que compraron, cuántas aceptaron el extra que les ofreciste.",
    example: "De 100 compras, 22 tildaron el order bump → take rate del 22%.",
  },
  visitantes: {
    term: "Visitantes",
    definition:
      "Personas distintas que entraron a tu página. Si alguien entra tres veces, cuenta como una.",
  },
  utm: {
    term: "UTM",
    definition:
      "Unas etiquetas que se agregan al final del link de tu anuncio. Sirven para saber de qué campaña vino cada venta.",
    example:
      "tusitio.com/oferta?utm_campaign=verano → cuando alguien compre por ese link, vas a saber que vino de “verano”.",
  },
  pixel: {
    term: "Meta Pixel",
    definition:
      "Un código que se pone en tus páginas para que Facebook e Instagram sepan qué hace la gente que traen: si miró, si empezó a comprar, si compró.",
    example:
      "Sin esto, Meta no sabe a quién mostrarle tus anuncios y gastás de más.",
  },
  capi: {
    term: "API de Conversiones",
    definition:
      "Lo mismo que el Pixel, pero enviado desde el servidor en vez del navegador. Se usa junto con el Pixel porque muchos navegadores bloquean el segundo.",
    example: "Con los dos activos, Meta se entera de bastantes más ventas que con el Pixel solo.",
  },
  campana: {
    term: "Campaña",
    definition:
      "Un conjunto de anuncios con un mismo objetivo. Acá la cargás para poder saber qué ventas trajo cada una.",
    example:
      "La campaña real la creás en el Administrador de Anuncios de Meta. Acá solo la registrás para medirla.",
  },
  afiliado: {
    term: "Afiliado",
    definition:
      "Alguien que vende tu producto a cambio de una comisión. Le das un link propio y se le cuenta cada venta que trae.",
    example: "Le das 30% de comisión: vende tu ebook de $14.900 y se lleva $4.470.",
  },
  dominio: {
    term: "Dominio propio",
    definition:
      "Usar tu propia dirección web en vez de la que te damos nosotros. Es cosmético, pero da más confianza.",
    example: "ofertas.tumarca.com en lugar de tumarca.tiendaflow.app",
  },
  dns: {
    term: "Registros DNS",
    definition:
      "Dos líneas de configuración que se cargan donde compraste tu dominio, para que apunte a tu página.",
    example:
      "Entrá al panel de tu proveedor (GoDaddy, Namecheap, Nic.ar), buscá “DNS” y copiá los valores tal cual están en la tabla.",
  },
  trafico: {
    term: "Tráfico",
    definition: "La gente que llega a tus páginas, venga de anuncios, de redes o de donde sea.",
  },
  precio_tachado: {
    term: "Precio tachado",
    definition:
      "Un precio más alto que se muestra cruzado al lado del tuyo, para que se note el descuento.",
    example:
      "Poné solo un precio que hayas cobrado de verdad alguna vez: inventarlo es publicidad engañosa.",
  },
  headline: {
    term: "Headline",
    definition:
      "La frase más grande de la página, la primera que se lee. Decide si la persona sigue leyendo o se va.",
    example: "“Armá una rutina que puedas sostener, aunque ya hayas abandonado mil veces.”",
  },
  reembolso: {
    term: "Reembolso",
    definition: "Una venta que devolviste. Si son muchas, algo está prometiendo de más.",
  },
  demo: {
    term: "Datos de demostración",
    definition:
      "Ventas y productos inventados que cargamos para que veas cómo se ve la app funcionando. No son reales y los borrás cuando quieras.",
    example: "Todo lo que sea demo aparece con una etiqueta amarilla que dice “Demo”.",
  },
} as const satisfies Record<string, GlossaryEntry>;

export type GlossaryKey = keyof typeof GLOSSARY;
