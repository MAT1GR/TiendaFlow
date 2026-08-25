/**
 * El manual de venta.
 *
 * Todo lo que la IA de TiendaFlow sabe sobre cómo se vende un producto digital
 * vive acá y en ningún otro lado. Antes cada tarea de `tasks.ts` traía sus
 * propias instrucciones sueltas —"escribí 6 beneficios", "no inventes datos"— y
 * cada una decidía por su cuenta qué era un buen texto. El resultado era una
 * app que escribía distinto en cada pantalla.
 *
 * Este módulo es el criterio compartido: los tres ejes de transformación, cómo
 * se arma un ángulo, qué hace que un titular funcione, cómo se escribe un ítem
 * de "esto es para vos si". Las tareas eligen qué piezas del manual necesitan y
 * las pegan en su prompt.
 *
 * Es texto, no lógica, y esa es la idea: se lee, se discute y se corrige sin
 * tocar código. Si mañana cambia el criterio de un titular, se cambia en la
 * constante y todas las pantallas que escriben titulares cambian con él.
 *
 * ── De dónde sale ────────────────────────────────────────────────────────────
 * Del material de venta de infoproductos low ticket que trajo el equipo: el
 * prompt de cliente ideal y los bloques problema/solución de Fernando Guerrero,
 * sus ángulos ya testeados, el baúl de prompts de Código Million Pro
 * (investigación, viabilidad, ganchos, objeciones, titulares) y la estructura
 * de landing de referencia.
 *
 * Está reescrito, no copiado: los documentos son prompts para pegar a mano en
 * ChatGPT, con huecos entre paréntesis que completa una persona. Acá los huecos
 * los llena la app con los datos reales del vendedor, así que lo que queda es
 * el criterio: qué pedir, con qué estructura y qué está prohibido.
 */

/* -------------------------------------------------------------------------- */
/* 1. Los tres ejes                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Un producto digital de precio bajo se compra por impulso, y el impulso
 * siempre entra por uno de tres lados. No hay un cuarto.
 *
 * Sirve para dos cosas distintas: le dice al modelo hacia dónde empujar el copy,
 * y le da a la app una forma de clasificar los ángulos que genera para poder
 * mostrarlos agrupados en la interfaz.
 */
export const EJES = [
  {
    id: "ingresos",
    label: "Generar ingresos",
    emoji: "💵",
    /** Cómo se ve el dolor de este eje en la vida de la persona. */
    dolor: "trabaja y no le alcanza, o ve que otros ganan con esto y él no",
    promesa: "un ingreso nuevo, propio, que no depende de que le den un aumento",
  },
  {
    id: "ahorro",
    label: "Ahorrar dinero",
    emoji: "🪙",
    dolor: "paga por algo que podría resolver solo, o compra mal y tira plata",
    promesa: "dejar de pagar de más y quedarse con esa diferencia todos los meses",
  },
  {
    id: "tiempo",
    label: "Ahorrar tiempo y estrés",
    emoji: "⏳",
    dolor: "improvisa, rehace, corre atrás de todo y llega quemado al final del día",
    promesa: "tener el trabajo resuelto de antemano y recuperar las horas",
  },
] as const;

export type EjeId = (typeof EJES)[number]["id"];

/** El eje con ese id, o `null` si vino cualquier cosa desde el modelo. */
export function findEje(id: unknown) {
  return EJES.find((eje) => eje.id === id) ?? null;
}

const EJES_TXT = `LOS TRES EJES DE TRANSFORMACIÓN
Un producto digital de precio bajo se compra por impulso, y el impulso siempre
entra por uno de estos tres lados. Todo lo que escribas tiene que apoyarse en al
menos uno, y tenés que saber cuál:

${EJES.map(
  (eje, i) => `${i + 1}. ${eje.label} — duele porque ${eje.dolor}. Prometé ${eje.promesa}.`,
).join("\n")}

Si un texto no entra en ninguno de los tres, no es un texto de venta: es una
descripción. Reescribilo.`;

/* -------------------------------------------------------------------------- */
/* 2. Las reglas que valen para todo                                           */
/* -------------------------------------------------------------------------- */

/**
 * La regla anti-genérico.
 *
 * Es la que más trabaja. Un modelo sin restricciones escribe "mejorá tu vida",
 * "aprendé de forma fácil y divertida", "contenido de alta calidad": frases que
 * sirven para cualquier producto y por eso no venden ninguno. La forma de
 * matarlas no es pedir "sé específico" —eso ya lo pide todo el mundo— sino
 * darle una prueba que se pueda aplicar frase por frase.
 */
export const REGLA_ANTI_GENERICO = `LA PRUEBA DEL VECINO (regla que no se negocia)
Antes de dejar una frase, preguntate: ¿esta misma frase le serviría igual a un
producto de otro rubro? Si la respuesta es sí, está mal escrita y va de nuevo.

Prohibidas siempre: "mejorá tu vida", "de forma fácil y divertida", "contenido
de alta calidad", "todo lo que necesitás saber", "llevá tu X al siguiente
nivel", "guía completa", "descubrí el mundo de".

En su lugar: el detalle concreto que solo aplica a ESTE producto y a ESTA
persona. Nombres de cosas reales, cantidades, momentos del día, situaciones que
la persona reconoce. "Cuando son las once de la noche y todavía no sabés qué
actividad dar mañana" gana siempre contra "ahorrá tiempo de planificación".`;

/**
 * Cómo decide alguien que compra por impulso.
 *
 * Va en casi todos los prompts porque cambia el largo y el orden de todo lo que
 * se escribe: impacto primero, explicación después.
 */
export const REGLA_LOW_TICKET = `A QUIÉN LE ESTÁS ESCRIBIENDO
Decide en segundos, con el celular en la mano, entre dos historias de Instagram.
No analiza: reconoce. Escribí para esa persona.

· Impacto antes que explicación. Lo que convence va primero, el detalle después.
· Lenguaje de todos los días, voseo rioplatense. Nada técnico, nada de jerga.
· Cada frase se tiene que entender sola, sin la anterior.
· Emocional, específico y realista. Las tres al mismo tiempo, no dos de tres.`;

/**
 * El límite que la app no cruza aunque el material de referencia lo cruce.
 *
 * Los ejemplos que trajo el equipo tienen testimonios firmados con nombre y
 * apellido, notificaciones de "compra verificada" con compradores inventados y
 * bonos "valuados en más de $97". Nada de eso lo puede escribir la app: son
 * afirmaciones sobre hechos que solo el vendedor puede saber si son ciertos, y
 * si la IA los inventa el que da la cara después es él.
 *
 * La app le deja el lugar preparado y le pide el dato real.
 */
export const REGLA_HONESTIDAD = `LO QUE NO PODÉS INVENTAR NUNCA
No tenés forma de saber si algo de esto es cierto, y el que responde si no lo es
no sos vos: es el vendedor.

· Testimonios, nombres de clientes, reseñas, capturas de resultados.
· Cantidad de alumnos, ventas, descargas, seguidores, países.
· Precios anteriores, valores de bonos ("valuado en $97"), descuentos.
· Fechas de cierre, cupos restantes, gente viendo la página ahora.
· Avales, certificaciones, apariciones en medios, resultados garantizados.

Cuando un bloque necesite uno de estos datos, dejá el bloque armado y escribí en
su lugar qué tiene que poner el vendedor. Un hueco marcado se completa en dos
minutos; un dato inventado se descubre en la primera pregunta de un comprador.

La urgencia y la prueba social sí se pueden escribir —son las que más venden—
pero con lo que es verdad: una fecha de cierre que el vendedor eligió, un cupo
que él definió, la garantía que él da.`;

/* -------------------------------------------------------------------------- */
/* 3. Investigación del cliente ideal                                          */
/* -------------------------------------------------------------------------- */

/**
 * El avatar completo.
 *
 * Es la pieza de la que cuelga todo lo demás: los ángulos, los titulares, los
 * ítems de la página y las respuestas a las objeciones salen de acá. Por eso es
 * la investigación más larga del manual y la única que la app guarda entera.
 */
export const SPEC_CLIENTE_IDEAL = `CÓMO SE INVESTIGA AL CLIENTE IDEAL
No estás describiendo un segmento de mercado: estás describiendo a una persona
concreta un martes cualquiera. Escribí como si la hubieras entrevistado.

· El perfil es una situación, no una demografía. "Maestra jardinera de 34 años
  que llega a su casa a las seis y todavía tiene que planificar la semana"
  sirve; "mujeres de 25 a 45 interesadas en educación" no sirve para nada.
· Los dolores se cuentan como escenas: qué pasa, cuándo pasa, qué siente.
· Los pensamientos internos van entre comillas y en primera persona, con las
  palabras exactas que usaría ella. Esas frases son materia prima de copy: si
  las escribís bien, el titular después se escribe solo.
· Los deseos y miedos ocultos son los que no le cuenta a nadie: quedar como la
  que no puede, que se note que improvisa, seguir igual dentro de un año.
· Los intentos fallidos importan tanto como el dolor: explican por qué desconfía
  y contra qué compite tu producto.
· Las objeciones de un producto barato no son "es caro", son "otro más que no
  voy a usar", "seguro es lo mismo que hay gratis en YouTube", "¿y si no me
  llega?".
· Los triggers son lo que la hace comprar sin pensarlo: acceso inmediato, algo
  que resuelve lo de mañana, un precio que no duele, un bono que solo está hoy.`;

/* -------------------------------------------------------------------------- */
/* 4. Ángulos de venta                                                         */
/* -------------------------------------------------------------------------- */

/**
 * La estructura de un ángulo, sacada de los ángulos ya testeados del equipo.
 *
 * Los tres ejemplos que trajeron —docencia, negocios y oficios— son distintos
 * en tono y en rubro pero tienen exactamente el mismo esqueleto, y ese
 * esqueleto es lo que se enseña acá. Los ejemplos completos van en
 * `EJEMPLOS_ANGULOS`, con la advertencia de su autor incluida.
 */
export const SPEC_ANGULO = `CÓMO SE ARMA UN ÁNGULO
Un ángulo son tres piezas y se escriben en este orden.

HOOK — una línea. Frena el scroll. Dos formas que funcionan:
  · Interpelación directa al nicho: "Si sos maestra jardinera, esto te va a
    salvar el año".
  · Verdad contraria: "La mayoría de los carpinteros falla por esto… y no es la
    calidad". Decís que la causa es otra, y para saber cuál hay que seguir.

CUERPO — tres o cuatro frases, en esta secuencia:
  1. El momento exacto en que duele. Cuándo, no qué. "Cuando falta tiempo, estás
     cansada y no sabés qué actividad usar."
  2. Qué recibe, con cantidad y formato. "Más de 150 actividades imprimibles
     para todo el año escolar." El número concreto es lo que hace que se sienta
     real; si no lo tenés, pedíselo al vendedor en vez de inventarlo.
  3. Sin qué. Las fricciones que se eliminan: sin experiencia previa, sin
     herramientas caras, sin equipos complicados, sin estrés.
  4. Los bonos, si los hay, como algo que suma valor hoy.

CTA — una línea con acción + resultado, nunca la acción sola. "Entrá ahora y
dejá tu planificación resuelta" vende; "hacé click acá" no dice nada.

Cada ángulo tiene que declarar de qué eje sale (ingresos, ahorro o tiempo) y a
qué parte del avatar le habla. Dos ángulos del mismo eje que dicen lo mismo con
otras palabras son un ángulo, no dos: si no cambia el motivo por el que compra,
cambialo.`;

/**
 * Los ángulos reales del equipo, tal como funcionan, con su advertencia.
 *
 * Van al prompt como referencia de tono y ritmo, no como plantilla. La
 * advertencia es del autor y es importante que quede: si el modelo los toma
 * como molde, todos los vendedores de la app terminan con el mismo anuncio.
 */
export const EJEMPLOS_ANGULOS = `TRES ÁNGULOS QUE YA VENDIERON (referencia de tono, NO plantilla)

Son de otros rubros y están acá para que veas el ritmo, la energía y cómo se
encadenan las piezas. No los copies ni los adaptes cambiando sustantivos: si el
vendedor termina con el mismo anuncio que otros diez, no tiene ninguno.

DOCENCIA · eje tiempo
  Hook: "Si sos maestra jardinera, esto te va a salvar el año."
  Cuerpo: cuando falta tiempo, estás cansada o no sabés qué actividad usar, este
  kit te rescata. Más de 150 actividades, recursos imprimibles y material
  reutilizable para todo el año escolar. Todo listo para imprimir y aplicar, sin
  vueltas.
  CTA: "Entrá ahora y dejá tu planificación resuelta."

NEGOCIOS · eje ingresos
  Hook: "Si querés empezar el año con un negocio desde casa, mirá esto."
  Cuerpo: aprendé a trabajar el acrílico y el neón flex de forma creativa y
  rentable, sin herramientas caras ni equipos complicados. Empezás a crear
  piezas que se venden aunque hoy no sepas nada de electrónica.
  CTA: "Entrá y empezá el negocio del neón desde tu casa."

OFICIOS · eje ingresos, entrando por la verdad contraria
  Hook: "La mayoría de los carpinteros falla por esto… y no es la calidad."
  Cuerpo: el problema es no tener un sistema de proyectos que se vendan.
  Fabricás lo que sale, improvisás medidas, perdés horas diseñando desde cero y
  terminás compitiendo por precio: más trabajo, menos plata. Con planos listos y
  medidas exactas armás tu catálogo como una marca.
  CTA: "Entrá y empezá hoy a fabricar y vender con los planos listos."

Fijate qué tienen en común: un momento concreto que duele, una cantidad real,
una lista de fricciones eliminadas y un cierre que promete el resultado, no el
click. Eso es lo que tenés que reproducir. El resto es de ellos.`;

/* -------------------------------------------------------------------------- */
/* 5. Titulares y promesas                                                     */
/* -------------------------------------------------------------------------- */

export const SPEC_TITULARES = `CÓMO SE ESCRIBE UN TITULAR
El titular es la pieza más importante de todo lo que escribas: define si el
resto se lee. Se juzga con cuatro varas —urgente, útil, único y ultraespecífico—
y tiene que pasar las cuatro, no una.

La fórmula que funciona en precio bajo son tres partes:
  ACCIÓN CLARA + TIEMPO ESPECÍFICO + RESULTADO CONCRETO
  "Dominá la plomería profesional en menos de 24 horas."
  "Dejá tu planificación de todo el año resuelta en una tarde."

Reglas duras:
· Entre 7 y 14 palabras. Si no entra, es que todavía no sabés qué prometés.
· Verbo al principio, en imperativo y en voseo: dominá, aprendé, creá, generá,
  dejá, empezá.
· El tiempo tiene que ser creíble para lo que el producto realmente entrega.
· No tengas miedo de prometer un resultado grande, pero que sea el resultado que
  el producto da de verdad. Audaz no es lo mismo que falso.
· Si podés, que el titular deje sin efecto la objeción principal del avatar.

LA SUBPROMESA va abajo y hace otra cosa: dice qué recibe. Es concreta y se puede
leer en dos segundos, casi siempre como suma.
  "Curso + planos + guías + paso a paso."
  "150 actividades imprimibles + 5 bonos + acceso inmediato."`;

/* -------------------------------------------------------------------------- */
/* 6. Los dos bloques que hacen que la persona se reconozca                    */
/* -------------------------------------------------------------------------- */

/**
 * "Esto es para vos si…" y "En X días vas a lograr…".
 *
 * Son los dos bloques que más trabajan en una página de venta de infoproducto y
 * los que peor salen cuando se los pide sueltos: un modelo sin estructura
 * devuelve una lista de bullets de cuatro palabras que no dicen nada. La
 * estructura de dos líneas es lo que los salva, y es obligatoria.
 */
export const SPEC_ITEMS = `LOS DOS BLOQUES ESPEJO
Van casi siempre juntos y en este orden: primero la persona se reconoce en el
problema, después se ve del otro lado. Uno sin el otro no funciona.

BLOQUE 1 — "Esto es para vos si…"
Cinco ítems. Cada uno son DOS líneas y las dos hacen falta:
  Línea 1: la situación real + lo que ya intentó y no le salió.
  Línea 2: por qué le pasa + en qué termina.
  Molde: "[Situación], pero [problema] porque [causa] y terminás [consecuencia]".
Tiene que dar ganas de decir "soy yo". Si al leerlo la persona no se reconoce,
el ítem está escrito desde afuera: volvé a los pensamientos internos del avatar
y escribilo con sus palabras.

BLOQUE 2 — "En [X días] vas a lograr…"
Cinco ítems, también dos líneas, en espejo con los del bloque 1:
  Línea 1: la acción concreta + el resultado claro.
  Línea 2: sin qué dolor y con qué beneficio.
  Molde: "[Acción + resultado] sin [dolor principal] y con [beneficio directo]".
Tiene que sentirse alcanzable. Un resultado enorme que nadie se cree no suma
deseo: resta credibilidad.

Los cuatro movimientos que tienen que quedar visibles entre un bloque y otro:
  inseguridad → confianza · improvisación → sistema
  perder plata → generar ingresos · perder tiempo → avanzar rápido`;

/* -------------------------------------------------------------------------- */
/* 7. Bonos                                                                    */
/* -------------------------------------------------------------------------- */

export const SPEC_BONOS = `CÓMO SE PIENSA UN BONO
Un bono no es contenido extra: es una objeción menos. Antes de escribirlo,
decidí qué duda estás cerrando con él.

Cada bono tiene que tener:
· Nombre específico y vendible. "Guía completa de X" no es un nombre, es una
  categoría. "Las 12 plantillas que uso para cotizar en 5 minutos" sí lo es.
· Qué incluye, en tres puntos concretos y contables.
· Qué problema saca del medio.
· Qué resultado deja.

La vara: el cliente tiene que pensar "esto solo ya vale lo que estoy pagando".
Si el bono no acelera el resultado principal, distrae. Sacalo.

No le pongas precio a un bono ni digas cuánto "vale": ese número no lo tenés.`;

/* -------------------------------------------------------------------------- */
/* 8. Objeciones                                                               */
/* -------------------------------------------------------------------------- */

export const SPEC_OBJECIONES = `CÓMO SE TRABAJA UNA OBJECIÓN
Una objeción es una pregunta que la persona no va a hacer: se va sin hacerla.
Por eso se contestan antes, en la página, no cuando escribe por privado.

Escribí la objeción con las palabras exactas que usaría el comprador, en primera
persona, no como categoría. "¿Y si es lo mismo que hay gratis en YouTube?" está
bien; "objeción de precio/valor" no sirve.

Para cada una, tres respuestas cortas y distintas entre sí —no la misma idea
reformulada— y que cada una se pueda usar sola: en la página de venta, en una
pregunta frecuente o respondiendo un mensaje.

Una buena respuesta reconoce que la duda es razonable y después la desarma con
algo concreto: cómo está armado el producto, qué incluye, qué pasa si no le
sirve. Nunca discutas con el comprador ni lo hagas sentir tonto por preguntar.`;

/* -------------------------------------------------------------------------- */
/* 9. Ganchos para contenido                                                   */
/* -------------------------------------------------------------------------- */

export const SPEC_HOOKS = `GANCHOS PARA VIDEOS Y ANUNCIOS
Tenés tres segundos. La persona no decide si le interesa el tema: decide si
frena. Son cosas distintas.

Prohibidos por gastados: "3 tips para…", "¿Sabías que…?", "¿Te gustaría…?",
"hoy te voy a enseñar…", "qué es el/la…".

Los que siguen funcionando, como formas y no como frases para copiar:
· El secreto o el atajo: "Así fue como conseguí…"
· El error que está cometiendo: "Si estás haciendo esto, estás arruinando…"
· La orden que interrumpe: "Dejá de hacer esto y empezá…"
· El alivio: "Al fin una forma de…"
· La opinión que incomoda: decir algo que la mayoría de su nicho no diría.
· El resultado primero: mostrar el después y recién ahí contar cómo.

Cada gancho tiene que poder seguir con el ángulo del que salió. Un gancho que
frena pero no engancha con lo que venís a vender solo compra vistas.`;

/* -------------------------------------------------------------------------- */
/* 10. La estructura de referencia de una página de venta                      */
/* -------------------------------------------------------------------------- */

/**
 * El orden que el material trae como estructura de landing, traducido a los
 * bloques que existen en la app.
 *
 * No es un layout nuevo —eso vive en `components/landing/estructuras.ts`— sino
 * la explicación de para qué está cada bloque, que es lo que el modelo necesita
 * para escribir cada sección sabiendo qué trabajo hace.
 */
export const SPEC_PAGINA = `PARA QUÉ ESTÁ CADA PARTE DE LA PÁGINA
La página contesta preguntas en un orden, y ese orden importa más que el diseño.
Nadie llega al precio si antes no entendió qué gana.

 1. Titular — qué es y qué consigo. Acción + tiempo + resultado.
 2. Promesa — la transformación en dos líneas, para gente real y sin vueltas.
 3. Esto es para vos si… — la persona se reconoce en el problema.
 4. En X días vas a lograr… — la persona se ve del otro lado.
 5. Bonos — el empujón de valor. Qué suma cada uno.
 6. El producto — qué recibe exactamente: formato, cómo accede, en qué lo usa.
 7. Garantía — sacar el riesgo de encima. La que el vendedor realmente da.
 8. Urgencia — por qué ahora y no en tres semanas. Con motivo verdadero.
 9. Imágenes — qué se ve. Producto, resultado, persona usándolo.
10. Testimonios — por qué te creo. Solo los reales del vendedor.
11. Preguntas frecuentes — las últimas dudas, que son las objeciones de arriba.

Si un bloque no contesta ninguna de esas preguntas, sobra. Sacarlo hace más por
la conversión que agregarle tres párrafos.`;

/* -------------------------------------------------------------------------- */
/* Armado                                                                      */
/* -------------------------------------------------------------------------- */

/** Las piezas del manual, por nombre, para poder pedirlas por id. */
const PIEZAS = {
  ejes: EJES_TXT,
  generico: REGLA_ANTI_GENERICO,
  lowTicket: REGLA_LOW_TICKET,
  honestidad: REGLA_HONESTIDAD,
  clienteIdeal: SPEC_CLIENTE_IDEAL,
  angulos: SPEC_ANGULO,
  ejemplos: EJEMPLOS_ANGULOS,
  titulares: SPEC_TITULARES,
  items: SPEC_ITEMS,
  bonos: SPEC_BONOS,
  objeciones: SPEC_OBJECIONES,
  hooks: SPEC_HOOKS,
  pagina: SPEC_PAGINA,
} as const;

export type PiezaId = keyof typeof PIEZAS;

/**
 * Arma el bloque de manual que va adentro de un prompt.
 *
 * Cada tarea pide las piezas que necesita y en el orden que las necesita. No
 * mandamos el manual entero a todas: un prompt con doce especificaciones cuando
 * la tarea era reescribir un párrafo gasta tokens y diluye la instrucción que
 * importa.
 */
export function playbook(...piezas: PiezaId[]): string {
  const vistas = new Set<PiezaId>();
  const partes: string[] = [];

  for (const pieza of piezas) {
    if (vistas.has(pieza)) continue;
    vistas.add(pieza);
    partes.push(PIEZAS[pieza]);
  }

  return partes.join("\n\n———\n\n");
}
