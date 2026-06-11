export default function Loading() {
  return (
    <main
      className="min-h-screen bg-slate-50 p-4 sm:p-8"
      aria-busy="true"
      aria-label="Cargando contenido"
    >
      <div className="mx-auto max-w-7xl animate-pulse space-y-6">
        <div className="space-y-3">
          <div className="h-8 w-64 rounded bg-slate-200" />
          <div className="h-4 w-48 rounded bg-slate-200" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 rounded-lg bg-white shadow" />
          ))}
        </div>

        <div className="h-80 rounded-lg bg-white shadow" />
      </div>
    </main>
  )
}
