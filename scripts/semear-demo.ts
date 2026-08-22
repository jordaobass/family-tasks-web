/**
 * Semeia uma família de demonstração no EMULADOR, para exercitar o painel no
 * navegador. Nunca aponte este script para o banco real — ele cria templates.
 *
 *   npm run emulador          (num terminal)
 *   npm run semear:demo       (noutro)
 */

import { createFirestoreFamilyData } from '@/data/firestore-family-data'

const FAMILIA = process.env.NEXT_PUBLIC_FAMILY_ID?.trim() || 'demo_painel'

const TEMPLATES = [
  { name: 'Escovar os dentes', icon: '🦷', points: 10, audience: 'crianca' as const },
  { name: 'Arrumar a cama', icon: '🛏️', points: 10, audience: 'crianca' as const },
  { name: 'Guardar os brinquedos', icon: '🧸', points: 15, audience: 'crianca' as const },
  { name: 'Lavar a louça', icon: '🍽️', points: 0, audience: 'adulto' as const },
  { name: 'Levar o lixo', icon: '🗑️', points: 0, audience: 'adulto' as const },
]

async function main() {
  if (!process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST?.trim()) {
    console.error('Recusado: este script só roda contra o emulador.')
    console.error('Defina NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST (ex.: 127.0.0.1:8390).')
    process.exit(1)
  }

  const dados = createFirestoreFamilyData(FAMILIA)

  const existentes = await dados.listTemplates()
  if (existentes.length > 0) {
    console.log(`Família ${FAMILIA} já tem ${existentes.length} templates — nada a fazer.`)
  } else {
    for (const template of TEMPLATES) {
      await dados.createTemplate({ ...template, recurrence: 'daily' }, 'semeadura')
    }
    console.log(`Criados ${TEMPLATES.length} templates em ${FAMILIA}.`)
  }

  const membros = await dados.listMembers()
  console.log(`Membros: ${membros.map((m) => `${m.name} (${m.role})`).join(', ')}`)
}

main().catch((erro) => {
  console.error('Falhou:', erro)
  process.exit(1)
})
