/**
 * Backup do Firestore de produção — a ÂNCORA DE REVERSIBILIDADE da migração.
 *
 * Despeja `families/**` (documento da família + todas as subcoleções conhecidas) e
 * `users/**` num arquivo JSON local, e imprime a contagem de documentos por coleção.
 * O `migrate-firestore.ts` se recusa a rodar sem um destes arquivos presente.
 *
 * Uso:
 *   npm run backup:firestore
 *   npx --yes tsx scripts/backup-firestore.ts --saida=backups --familias=outra_familia
 *   npx --yes tsx scripts/backup-firestore.ts --subcolecoes=alguma_coisa_nova
 *
 * ⚠️ O arquivo gerado contém DADOS REAIS DA FAMÍLIA. Não commite: acrescente
 * `backups/` ao `.gitignore` antes da primeira execução.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { type Firestore } from 'firebase/firestore'

import {
  ErroCli,
  SUBCOLECOES_FAMILIA,
  descobrirFamilias,
  executar,
  lerDocumento,
  lerSubcolecao,
  listaOpcao,
  opcao,
  paraJson,
  titulo,
  type Conexao,
} from './firestore-cli'

interface FamiliaBackup {
  existeDocumento: boolean
  documento: unknown
  subcolecoes: Record<string, Record<string, unknown>>
}

interface ArquivoBackup {
  geradoEm: string
  projectId: string
  subcolecoesVarridas: string[]
  avisos: string[]
  contagens: Record<string, number>
  totalDocumentos: number
  colecoes: {
    users: Record<string, unknown>
    families: Record<string, FamiliaBackup>
  }
}

/** Lê uma família inteira: o documento pai (que pode não existir) e as subcoleções. */
async function lerFamilia(
  db: Firestore,
  familia: string,
  subcolecoes: string[],
  contagens: Record<string, number>,
): Promise<FamiliaBackup> {
  const snapPai = await lerDocumento(db, 'families', familia)
  const conteudo: Record<string, Record<string, unknown>> = {}

  for (const nome of subcolecoes) {
    const docs = await lerSubcolecao(db, familia, nome)
    // Registra a chave mesmo vazia: prova que a subcoleção foi olhada, não esquecida.
    conteudo[nome] = Object.fromEntries(docs.map((item) => [item.id, paraJson(item.dados)]))
    contagens[`families/${familia}/${nome}`] = docs.length
  }

  contagens[`families/${familia} (documento)`] = snapPai.exists() ? 1 : 0
  return {
    existeDocumento: snapPai.exists(),
    documento: snapPai.exists() ? paraJson(snapPai.data()) : null,
    subcolecoes: conteudo,
  }
}

/** Nome de arquivo com carimbo do INSTANTE (UTC de propósito: é hora, não data de calendário). */
function nomeDoArquivo(): string {
  const carimbo = new Date().toISOString().replace(/[:.]/g, '-')
  return `backup-${carimbo}.json`
}

function imprimirResumo(arquivo: ArquivoBackup, caminho: string): void {
  titulo('Documentos salvos')
  for (const [colecao, quantidade] of Object.entries(arquivo.contagens)) {
    console.log(`  ${quantidade.toString().padStart(5)}  ${colecao}`)
  }
  console.log(`  ${'-'.repeat(5)}`)
  console.log(`  ${arquivo.totalDocumentos.toString().padStart(5)}  TOTAL`)

  if (arquivo.avisos.length > 0) {
    titulo('Avisos')
    for (const aviso of arquivo.avisos) console.log(`  ! ${aviso}`)
  }

  titulo('Backup gravado')
  console.log(`  ${caminho}`)
  console.log(`\n  Guarde este arquivo antes de rodar a migração.`)
  console.log(`  Ele contém dados reais da família — NÃO commite (adicione "backups/" ao .gitignore).`)
}

async function montarBackup(db: Firestore, projectId: string): Promise<ArquivoBackup> {
  const subcolecoes = [...SUBCOLECOES_FAMILIA, ...listaOpcao('subcolecoes')]
  const { candidatos, comDocumento, usuarios } = await descobrirFamilias(db, listaOpcao('familias'))

  titulo('Famílias encontradas')
  console.log(`  com documento em families/: ${comDocumento.join(', ') || '(nenhuma)'}`)
  console.log(`  a varrer (inclui default_family e os familyId dos usuários): ${candidatos.join(', ')}`)

  const contagens: Record<string, number> = { users: usuarios.length }
  const families: Record<string, FamiliaBackup> = {}
  for (const familia of candidatos) {
    families[familia] = await lerFamilia(db, familia, subcolecoes, contagens)
  }

  return {
    geradoEm: new Date().toISOString(),
    projectId,
    subcolecoesVarridas: subcolecoes,
    avisos: [
      'O SDK cliente não enumera subcoleções; só foram varridas as conhecidas ' +
        `(${subcolecoes.join(', ')}). Se existir outra, use --subcolecoes=nome.`,
    ],
    contagens,
    totalDocumentos: Object.values(contagens).reduce((soma, n) => soma + n, 0),
    colecoes: {
      users: Object.fromEntries(usuarios.map((usuario) => [usuario.uid, paraJson(usuario.dados)])),
      families,
    },
  }
}

async function main({ db, projectId }: Conexao): Promise<number> {
  const arquivo = await montarBackup(db, projectId)

  // Backup vazio não é backup: ou o projeto está errado, ou os dados não estão onde
  // pensamos. Gravar o arquivo mesmo assim daria falsa sensação de segurança.
  if (arquivo.totalDocumentos === 0) {
    throw new ErroCli(
      `Nenhum documento encontrado no projeto "${projectId}".\n` +
        '  Confira o NEXT_PUBLIC_FIREBASE_PROJECT_ID do .env.local — é o projeto de produção?\n' +
        '  Se os dados estiverem numa família que a descoberta não achou, use --familias=<id>.',
    )
  }

  const pasta = resolve(process.cwd(), opcao('saida') ?? 'backups')
  mkdirSync(pasta, { recursive: true })
  const caminho = resolve(pasta, nomeDoArquivo())
  writeFileSync(caminho, JSON.stringify(arquivo, null, 2), 'utf8')

  imprimirResumo(arquivo, caminho)
  return 0
}

void executar(main)
