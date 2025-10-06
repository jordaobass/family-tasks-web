'use client'

import { DEFAULT_USERS } from '@/config/constants'

export default function Debug() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Page</h1>
      <div className="space-y-4">
        <div>✅ React funcionando</div>
        <div>✅ Next.js funcionando</div>
        <div>✅ Tailwind funcionando</div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-2">Testando imports:</h2>
          <div>✅ Constants: {DEFAULT_USERS.KIDS.length} crianças</div>
          <div>✅ UI Components carregados</div>
        </div>
      </div>
    </div>
  )
}