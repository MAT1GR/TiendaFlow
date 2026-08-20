export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col gap-4 p-8">
      <div className="tf-skeleton h-8 w-56 rounded-xl" />
      <div className="tf-skeleton h-4 w-80 rounded-lg" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="tf-skeleton h-28 rounded-2xl" />
        ))}
      </div>
      <div className="tf-skeleton mt-2 h-72 rounded-2xl" />
    </div>
  );
}
