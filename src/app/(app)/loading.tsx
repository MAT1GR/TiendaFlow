/**
 * Lo que se ve mientras carga una sección del panel.
 *
 * Sin esto, el único límite de Suspense que había era el de la raíz de la app:
 * cambiar de sección desmontaba el sidebar y la barra de arriba y dejaba la
 * pantalla entera en gris. Con este archivo, el armazón se queda quieto y solo
 * parpadea el contenido — que es lo único que en realidad está cargando.
 *
 * No intenta adivinar la forma de cada pantalla. Un esqueleto que se parece
 * demasiado a algo que después no llega miente más de lo que ayuda.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="tf-skeleton h-7 w-52 rounded-xl" />
      <div className="tf-skeleton h-4 w-80 rounded-lg" />
      <div className="tf-skeleton mt-3 h-64 rounded-2xl" />
    </div>
  );
}
