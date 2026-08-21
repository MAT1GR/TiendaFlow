/**
 * Cambiar de pestaña adentro de un producto no tiene por qué borrar el producto.
 *
 * Este límite de Suspense deja en pie el título, el precio y las pestañas del
 * espacio de trabajo, y reserva el parpadeo para el panel que efectivamente
 * cambia. Es la diferencia entre "la app se colgó" y "está cargando".
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="tf-skeleton h-5 w-44 rounded-lg" />
      <div className="tf-skeleton h-72 rounded-2xl" />
    </div>
  );
}
