/**
 * Prova o caminho quente NO NAVEGADOR, com toque de verdade (`hasTouch`), que é
 * o gesto do painel de cozinha. Exige o emulador e o dev server no ar:
 *
 *   npm run emulador       (terminal 1)
 *   npm run semear:demo    (uma vez)
 *   npm run dev:emulador   (terminal 2)
 *   npm run verificar:toque
 *
 * O Playwright é dependência OPCIONAL de propósito: colocá-lo em
 * devDependencies faria a Vercel baixar os navegadores a cada deploy.
 * Instale sob demanda com `npm i -D playwright` (ou num diretório à parte).
 */

let chromium
try {
  ;({ chromium } = await import('playwright'))
} catch {
  console.error('Playwright não encontrado. Instale com: npm i -D playwright')
  process.exit(1)
}

const URL = 'http://127.0.0.1:11450/'
const TAREFA = 'Escovar os dentes'
let falhas = 0

function verificar(descricao, condicao, detalhe = '') {
  console.log(`${condicao ? '  OK  ' : ' FALHA'} | ${descricao}${detalhe ? ` -> ${detalhe}` : ''}`)
  if (!condicao) falhas++
}

const navegador = await chromium.launch()
const contexto = await navegador.newContext({
  viewport: { width: 1180, height: 820 },
  hasTouch: true, // tela de TOQUE: page.tap() dispara eventos de toque, não de mouse
  locale: 'pt-BR',
  timezoneId: 'America/Sao_Paulo',
})
const pagina = await contexto.newPage()
const errosDeConsole = []
pagina.on('pageerror', (e) => errosDeConsole.push(e.message))
pagina.on('console', (m) => m.type() === 'error' && errosDeConsole.push(m.text()))

async function abrir() {
  await pagina.goto(URL, { waitUntil: 'domcontentloaded' })
  await pagina.getByRole('button', { name: /Louise/ }).waitFor({ timeout: 20000 })
  await pagina.waitForTimeout(1500)
}

async function estado() {
  return await pagina.locator('body').ariaSnapshot()
}

/** A tarefa está pendente quando ainda existe o botão "Concluir X". */
async function estaPendente() {
  return (await estado()).includes(`Concluir ${TAREFA}`)
}

async function placarDaLouise() {
  const texto = await pagina.getByRole('button', { name: /Louise/ }).textContent()
  const m = texto.match(/(\d+)\s*hoje/)
  return m ? Number(m[1]) : -1
}

await abrir()

// --- 1. sem escolher a criança, o toque não conclui ---
await pagina.getByRole('button', { name: `Concluir ${TAREFA}` }).tap()
await pagina.waitForTimeout(800)
verificar('sem membro selecionado, o toque NÃO conclui', await estaPendente())

// --- 2. escolher a criança e TOCAR no cartão ---
await pagina.getByRole('button', { name: /Louise/ }).tap()
await pagina.waitForTimeout(400)
await pagina.getByRole('button', { name: `Concluir ${TAREFA}` }).tap()
await pagina.waitForTimeout(2500)

verificar('TOCAR no cartão conclui a tarefa', !(await estaPendente()))
verificar('placar da criança sobe na hora', (await placarDaLouise()) === 10, `${await placarDaLouise()} pontos`)

// --- 3. A PROVA: recarregar a página ---
await abrir()
verificar(
  'a conclusão SOBREVIVE ao recarregar (era o bug)',
  !(await estaPendente()),
  await estaPendente() ? 'voltou para pendente' : 'continua concluída',
)
verificar('o placar sobrevive ao recarregar', (await placarDaLouise()) === 10, `${await placarDaLouise()} pontos`)

// --- 4. desfazer por toque ---
const botaoDesfazer = pagina.getByRole('button', { name: new RegExp(`Desfazer|Reabrir`, 'i') }).first()
const temDesfazer = (await botaoDesfazer.count()) > 0
verificar('existe um controle para desfazer', temDesfazer)

if (temDesfazer) {
  await botaoDesfazer.tap()
  await pagina.waitForTimeout(2500)
  verificar('desfazer devolve a tarefa para Para Fazer', await estaPendente())

  // --- 5. recarregar de novo ---
  await abrir()
  verificar('o desfazer SOBREVIVE ao recarregar', await estaPendente())
  verificar('os pontos foram estornados', (await placarDaLouise()) === 0, `${await placarDaLouise()} pontos`)
}

verificar('nenhum erro de JavaScript na página', errosDeConsole.length === 0, errosDeConsole.join(' | ') || 'limpo')

await pagina.screenshot({ path: 'painel-final.png', fullPage: true })
console.log(`\n${falhas === 0 ? '✅ CAMINHO QUENTE DE TOQUE PASSOU' : `❌ ${falhas} FALHA(S)`}\n`)

await navegador.close()
process.exit(falhas === 0 ? 0 : 1)
