import Link from 'next/link'
import { RegisterForm } from './register-form'

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 sm:px-6">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow sm:p-8">
        <h1 className="text-2xl font-bold mb-2">Registro</h1>
        <p className="text-slate-600 mb-6">
          Crea una cuenta para usar el sistema
        </p>

        <RegisterForm />

        <div className="mt-6 space-y-2 text-center text-sm">
          <p className="text-slate-600">
            ¿Ya tienes una cuenta?{' '}
            <Link
              href="/auth/login"
              className="font-medium text-blue-700 hover:underline"
            >
              Inicia sesión
            </Link>
          </p>
          <Link
            href="/"
            className="inline-block font-medium text-slate-600 hover:text-slate-900 hover:underline"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  )
}
