/**
 * Base comum dos scripts de linha de comando (`backup-firestore.ts` e `migrate-firestore.ts`).
 *
 * Estes scripts rodam FORA do Next (`npx tsx scripts/...`). De propósito NÃO importam
 * `src/lib/firebase.ts`: aquele módulo é de browser, usa o alias `@/` e inicializa o app
 * com `|| ''`, que transformaria variável em branco em configuração silenciosamente vazia.
 * Aqui a configuração é lida do `.env.local` com dotenv e validada antes de qualquer coisa.
 *
 * As regras do Firestore do projeto estão abertas, então o SDK CLIENTE basta —
 * não é necessária credencial de service account.
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { config as carregarDotenv } from 'dotenv'
import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  Bytes,
  DocumentReference,
  GeoPoint,
  Timestamp,
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
  getFirestore,
  terminate,
  type DocumentData,
  type DocumentSnapshot,
  type Firestore,
} from 'firebase/firestore'

/** Família que a home sempre usou (`page.tsx:44`), exista ou não o documento pai. */
export const FAMILIA_PADRAO = 'default_family'

/**
 * Subcoleções conhecidas de `families/{id}`.
 *
 * ATENÇÃO: o SDK cliente NÃO enumera subcoleções (`listCollections` é só do Admin SDK).
 * Esta lista é o limite do que os scripts conseguem enxergar; ela foi montada a partir de
 * `firestore.rules`, `firestore-task-service.ts`, `daily-task-service.ts` e
 * `src/data/firestore-family-data.ts`. Subcoleção fora daqui passa despercebida —
 * por isso os scripts imprimem a lista varrida e aceitam `--subcolecoes=a,b`.
 */
export const SUBCOLECOES_FAMILIA = [
  'tasks',
  'task_templates',
  'task_instances',
  'daily_checks',
  'members',
  'days',
] as const

const VARIAVEIS_FIREBASE = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
] as const

/** Erro esperado de linha de comando: sai com mensagem limpa, sem stack trace. */
export class ErroCli extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ErroCli'
  }
}

// ---------------------------------------------------------------------------
// Argumentos de linha de comando
// ---------------------------------------------------------------------------

/** Lê `--nome=valor`. String em branco conta como ausente. */
export function opcao(nome: string): string | undefined {
  const prefixo = `--${nome}=`
  const achado = process.argv.slice(2).find((arg) => arg.startsWith(prefixo))
  return achado?.slice(prefixo.length).trim() || undefined
}

/** Lê `--nome` (presença). */
export function flag(nome: string): boolean {
  return process.argv.slice(2).includes(`--${nome}`)
}

/** Lê `--nome=a,b,c` como lista sem itens vazios. */
export function listaOpcao(nome: string): string[] {
  return (opcao(nome) ?? '')
    .split(',')
    .map((valor) => valor.trim())
    .filter(Boolean)
}

// ---------------------------------------------------------------------------
// Conexão
// ---------------------------------------------------------------------------

/** Carrega `.env.local` e depois `.env`. Sem `override`: o primeiro encontrado vence. */
function carregarEnv(): string[] {
  const carregados: string[] = []
  for (const nome of ['.env.local', '.env']) {
    const caminho = resolve(process.cwd(), nome)
    if (!existsSync(caminho)) continue
    carregarDotenv({ path: caminho, quiet: true })
    carregados.push(nome)
  }
  return carregados
}

/**
 * Lê a configuração do Firebase do ambiente.
 *
 * Variável EM BRANCO vale como AUSENTE — `??` deixaria a string vazia passar e o SDK
 * subiria com `projectId: ''`, falhando lá na frente sem dizer por quê.
 */
function lerConfigFirebase(): Record<(typeof VARIAVEIS_FIREBASE)[number], string> {
  const faltando: string[] = []
  const valores = {} as Record<(typeof VARIAVEIS_FIREBASE)[number], string>

  for (const nome of VARIAVEIS_FIREBASE) {
    const valor = process.env[nome]?.trim()
    if (!valor) faltando.push(nome)
    valores[nome] = valor ?? ''
  }

  if (faltando.length > 0) {
    throw new ErroCli(
      `Configuração do Firebase incompleta. Variáveis ausentes ou em branco:\n` +
        faltando.map((nome) => `  - ${nome}`).join('\n') +
        `\n\nPreencha o arquivo .env.local na raiz de ${process.cwd()} ` +
        `(as mesmas variáveis que o app usa na Vercel) e rode de novo.`,
    )
  }
  return valores
}

export interface Conexao {
  app: FirebaseApp
  db: Firestore
  projectId: string
}

export function conectar(): Conexao {
  const arquivos = carregarEnv()
  if (arquivos.length === 0) {
    throw new ErroCli(
      `Nenhum .env.local (nem .env) encontrado em ${process.cwd()}.\n` +
        `Crie o .env.local com as variáveis NEXT_PUBLIC_FIREBASE_* do projeto.`,
    )
  }

  const valores = lerConfigFirebase()
  const app = initializeApp({
    apiKey: valores.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: valores.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: valores.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: valores.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: valores.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: valores.NEXT_PUBLIC_FIREBASE_APP_ID,
  })

  const projectId = valores.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  console.log(`Firebase: projeto "${projectId}"  (env: ${arquivos.join(' + ')})`)
  return { app, db: getFirestore(app), projectId }
}

/** Fecha a conexão do Firestore e encerra o processo — sem isto o node fica pendurado. */
export async function encerrar(db: Firestore | null, codigo: number): Promise<never> {
  if (db) await terminate(db).catch(() => undefined)
  process.exit(codigo)
}

/** Roda o `main` de um script traduzindo `ErroCli` em mensagem limpa. */
export async function executar(main: (conexao: Conexao) => Promise<number>): Promise<void> {
  let conexao: Conexao | null = null
  try {
    conexao = conectar()
    const codigo = await main(conexao)
    await encerrar(conexao.db, codigo)
  } catch (erro) {
    if (erro instanceof ErroCli) console.error(`\nERRO: ${erro.message}\n`)
    else console.error('\nERRO inesperado:', erro, '\n')
    await encerrar(conexao?.db ?? null, 1)
  }
}

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

export interface DocBruto {
  id: string
  familia: string
  dados: DocumentData
}

/**
 * Toda leitura destes scripts é **só do servidor**, e isto não é preciosismo.
 *
 * Verificado em 22/08/2026: com um projectId inacessível, `getDocs` **não falha** — o SDK
 * entra em modo offline e devolve `size=0, fromCache=true`. O dry-run da migração então
 * imprimia "0 documentos, tudo conferido" e saía com código 0, mentindo com cara de sucesso.
 * `getDocsFromServer` lança nesse mesmo cenário, que é o comportamento correto aqui.
 */
async function doServidor<T>(oQue: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (erro) {
    const causa = erro instanceof Error ? erro.message : String(erro)
    throw new ErroCli(
      `Não consegui ler ${oQue} do servidor.\n  Causa: ${causa}\n\n` +
        '  Estes scripts leem SÓ do servidor de propósito: a leitura comum cairia em modo\n' +
        '  offline e devolveria cache vazio como se fosse a verdade.\n' +
        '  Confira a conexão e o NEXT_PUBLIC_FIREBASE_PROJECT_ID.',
    )
  }
}

export async function lerSubcolecao(
  db: Firestore,
  familia: string,
  nome: string,
): Promise<DocBruto[]> {
  const snap = await doServidor(`families/${familia}/${nome}`, () =>
    getDocsFromServer(collection(db, 'families', familia, nome)),
  )
  return snap.docs.map((documento) => ({ id: documento.id, familia, dados: documento.data() }))
}

/** Lê um documento avulso, também só do servidor. */
export async function lerDocumento(db: Firestore, ...caminho: string[]): Promise<DocumentSnapshot> {
  const [primeiro, ...resto] = caminho
  return doServidor(caminho.join('/'), () => getDocFromServer(doc(db, primeiro, ...resto)))
}

export interface UsuarioBruto {
  uid: string
  familyId: string
  dados: DocumentData
}

export interface Descoberta {
  /** Todas as famílias que vale a pena sondar. */
  candidatos: string[]
  /** Apenas as que têm DOCUMENTO em `families` (subcoleção órfã não aparece aqui). */
  comDocumento: string[]
  usuarios: UsuarioBruto[]
}

/**
 * Descobre quais famílias podem ter dados.
 *
 * `getDocs(collection('families'))` só devolve documentos QUE EXISTEM — uma subcoleção
 * criada sob um doc pai inexistente (o caso de `families/default_family`, que a home
 * nunca criou explicitamente) fica invisível nessa listagem. Por isso somamos
 * `default_family`, o `familyId` de cada usuário e o que vier por `--familias=`.
 */
export async function descobrirFamilias(db: Firestore, extras: string[] = []): Promise<Descoberta> {
  const snapFamilias = await doServidor('families', () => getDocsFromServer(collection(db, 'families')))
  const comDocumento = snapFamilias.docs.map((documento) => documento.id)

  const snapUsuarios = await doServidor('users', () => getDocsFromServer(collection(db, 'users')))
  const usuarios: UsuarioBruto[] = snapUsuarios.docs.map((documento) => ({
    uid: documento.id,
    familyId: String(documento.data().familyId ?? '').trim(),
    dados: documento.data(),
  }))

  const candidatos = new Set<string>([
    ...comDocumento,
    FAMILIA_PADRAO,
    ...usuarios.map((usuario) => usuario.familyId).filter(Boolean),
    ...extras,
  ])
  return { candidatos: [...candidatos].sort((a, b) => a.localeCompare(b)), comDocumento, usuarios }
}

// ---------------------------------------------------------------------------
// Serialização para JSON (backup restaurável)
// ---------------------------------------------------------------------------

/**
 * Converte um valor do Firestore em algo que sobrevive a `JSON.stringify` SEM perder o
 * tipo original: o marcador `__tipo__` permite reconstruir Timestamp/GeoPoint/Bytes/ref
 * na hora de restaurar.
 */
export function paraJson(valor: unknown): unknown {
  if (valor === null || valor === undefined) return null
  if (valor instanceof Timestamp) {
    return {
      __tipo__: 'timestamp',
      segundos: valor.seconds,
      nanossegundos: valor.nanoseconds,
      iso: valor.toDate().toISOString(),
    }
  }
  if (valor instanceof Date) return { __tipo__: 'data', iso: valor.toISOString() }
  if (valor instanceof DocumentReference) return { __tipo__: 'referencia', caminho: valor.path }
  if (valor instanceof GeoPoint) {
    return { __tipo__: 'geoponto', latitude: valor.latitude, longitude: valor.longitude }
  }
  if (valor instanceof Bytes) return { __tipo__: 'bytes', base64: valor.toBase64() }
  if (Array.isArray(valor)) return valor.map(paraJson)
  if (typeof valor === 'object') {
    const entradas = Object.entries(valor as Record<string, unknown>)
    return Object.fromEntries(entradas.map(([chave, item]) => [chave, paraJson(item)]))
  }
  return valor
}

// ---------------------------------------------------------------------------
// Saída no terminal
// ---------------------------------------------------------------------------

export function titulo(texto: string): void {
  console.log(`\n${'─'.repeat(72)}\n${texto}\n${'─'.repeat(72)}`)
}
