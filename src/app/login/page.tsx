'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/providers/auth-provider'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const { user, loading, signInWithGoogle, error } = useAuthContext()
  const router = useRouter()

  useEffect(() => {
    if (user && !loading) {
      router.push('/')
    }
  }, [user, loading, router])

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-600 to-purple-700 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-6xl mb-4">🏠</div>
          <div className="text-xl font-semibold">Carregando...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-600 to-purple-700 flex items-center justify-center p-5">
      <div className="max-w-md w-full">
        {/* Login Card */}
        <div className="bg-white/95 rounded-3xl p-8 shadow-2xl text-center">
          {/* Logo */}
          <div className="text-6xl mb-4">🏠</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Tarefas da Família
          </h1>
          <p className="text-gray-600 mb-8">
            Entre com sua conta Google para acessar as tarefas da sua família
          </p>

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          {/* Google Sign In Button */}
          <Button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 shadow-lg hover:shadow-xl transition-all duration-300 py-3 px-6 rounded-2xl font-semibold"
          >
            <div className="flex items-center justify-center gap-3">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Entrar com Google
            </div>
          </Button>

          {/* Info */}
          <div className="mt-6 text-sm text-gray-500">
            <p>🔐 Login seguro com Google</p>
            <p>👨‍👩‍👧‍👦 Cada família tem suas próprias tarefas</p>
            <p>📱 Acesse de qualquer dispositivo</p>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 text-center text-white/80">
          <p className="text-lg font-semibold mb-3">✨ Recursos da Aplicação</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-2xl mb-1">🎯</div>
              <p>Sistema de Pontos</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-2xl mb-1">🔄</div>
              <p>Sync em Tempo Real</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-2xl mb-1">📱</div>
              <p>Multi-dispositivo</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-2xl mb-1">🏆</div>
              <p>Gamificação</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}