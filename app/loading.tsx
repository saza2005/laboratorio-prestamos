export default function Loading() {
  return (
    <main
      className="app-page"
      aria-busy="true"
      aria-label="Cargando contenido"
    >
      <div className="mx-auto max-w-7xl animate-pulse space-y-6">
        <div className="surface-card space-y-3 p-6">
          <div className="h-8 w-64 rounded-lg bg-slate-200" />
          <div className="h-4 w-48 rounded bg-slate-200" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="surface-card h-28" />
          ))}
        </div>

        <div className="surface-card h-80" />
      </div>
    </main>
  )
}
