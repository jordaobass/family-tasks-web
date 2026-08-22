import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth'

/**
 * Acesso ao Firebase, inicializado sob demanda.
 *
 * Duas correções em relação à versão anterior, que custavam caro:
 *
 * 1. **Nada é inicializado no import.** Antes, `db`, `auth` e o `export default`
 *    eram IIFEs no escopo do módulo: bastava importar `db` — como faz a rota de
 *    cron, que não usa autenticação nenhuma — para o Firebase Auth ser criado
 *    junto e derrubar o build inteiro em "Collecting page data".
 *
 * 2. **Variável em branco vale como ausente.** Antes era `process.env.X || ''`,
 *    então configuração faltando virava `auth/invalid-api-key` — mensagem que
 *    não diz o que fazer. Agora falta de configuração falha dizendo exatamente
 *    qual variável está vazia.
 */

const VARIAVEIS = {
  apiKey: 'NEXT_PUBLIC_FIREBASE_API_KEY',
  authDomain: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  projectId: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  storageBucket: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'NEXT_PUBLIC_FIREBASE_APP_ID',
} as const

/**
 * Ex.: `127.0.0.1:8080`. Quando definido, o app fala com o emulador local do
 * Firestore em vez do banco real — é assim que se exercita o caminho quente
 * sem escrever na base da família.
 */
const HOST_EMULADOR = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST?.trim()

function lerConfiguracao() {
  // Contra o emulador, só o projectId importa: não há credencial a validar.
  if (HOST_EMULADOR) {
    return {
      apiKey: 'emulador',
      authDomain: 'localhost',
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || 'demo-family-tasks',
      storageBucket: '',
      messagingSenderId: '',
      appId: 'emulador',
    }
  }

  // `?.trim()` de propósito: string vazia é ausência, e `??` a deixaria passar.
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim(),
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim(),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim(),
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim(),
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim(),
  }

  const ausentes = Object.entries(config)
    .filter(([, valor]) => !valor)
    .map(([chave]) => VARIAVEIS[chave as keyof typeof VARIAVEIS])

  if (ausentes.length > 0) {
    throw new Error(
      `Configuração do Firebase ausente ou em branco: ${ausentes.join(', ')}. ` +
        'Preencha o .env.local (local) ou as Environment Variables da Vercel. ' +
        'Atenção: variáveis NEXT_PUBLIC_* são embutidas no BUILD — mudar no ' +
        'painel não basta, é preciso refazer o deploy.',
    )
  }

  return config as Record<keyof typeof VARIAVEIS, string>
}

let appMemorizado: FirebaseApp | undefined
let firestoreMemorizado: Firestore | undefined
let authMemorizado: Auth | undefined
let googleProviderMemorizado: GoogleAuthProvider | undefined

function obterApp(): FirebaseApp {
  if (!appMemorizado) {
    appMemorizado = getApps().length > 0 ? getApp() : initializeApp(lerConfiguracao())
  }
  return appMemorizado
}

/** Firestore. A conexão só nasce na primeira chamada. */
export function obterDb(): Firestore {
  if (!firestoreMemorizado) {
    firestoreMemorizado = getFirestore(obterApp())
    if (HOST_EMULADOR) {
      const [host, porta] = HOST_EMULADOR.split(':')
      connectFirestoreEmulator(firestoreMemorizado, host, Number(porta))
      console.info(`[firebase] usando o emulador do Firestore em ${HOST_EMULADOR}`)
    }
  }
  return firestoreMemorizado
}

/** Firebase Auth. Só faz sentido no navegador — não chame no servidor. */
export function obterAuth(): Auth {
  if (!authMemorizado) {
    authMemorizado = getAuth(obterApp())
  }
  return authMemorizado
}

export function obterGoogleProvider(): GoogleAuthProvider {
  if (!googleProviderMemorizado) {
    googleProviderMemorizado = new GoogleAuthProvider()
    googleProviderMemorizado.setCustomParameters({ prompt: 'select_account' })
  }
  return googleProviderMemorizado
}
