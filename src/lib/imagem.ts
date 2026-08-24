/**
 * Preparo da foto de um membro — corte quadrado, redução e compressão, tudo no
 * navegador, ANTES de qualquer escrita.
 *
 * Por que existe: a foto vai embutida no documento do membro como data URI
 * (decisão registrada em `Member.photo`). O documento do Firestore tem teto de
 * 1 MiB e é lido toda vez que o painel da cozinha abre — uma foto de 3 MB direto
 * da câmera do celular estouraria o documento e a abertura do painel junto.
 *
 * Por isso o limite aqui não é estimado, é MEDIDO: o data URI é gerado, pesado,
 * e só é aceito se couber. Se não couber, a qualidade cai e tenta de novo.
 * Base64 infla o binário em ~33% e a compressão varia demais com a foto —
 * estimativa erraria em qualquer direção.
 *
 * Este arquivo não conhece React nem `@/data`: recebe `File`/canvas e devolve
 * dados. O que decide o que fazer com o erro é a tela.
 */

/** Lado do quadrado final, em pixels. */
export const LADO_FOTO = 256

/**
 * Teto do data URI final, em bytes. É o tamanho do que vai gravado no documento,
 * não o do binário antes do base64.
 */
export const LIMITE_BYTES_FOTO = 40 * 1024

export const ZOOM_MINIMO = 1
export const ZOOM_MAXIMO = 3

/**
 * Lado menor da cópia de trabalho. Todo recorte sai daqui, e não da foto
 * original: com 512 px, o pior caso (zoom 1) é uma redução de 2×, que o
 * navegador faz com média decente, e o ajuste de enquadramento fica instantâneo
 * mesmo com foto de 12 megapixels.
 */
const LADO_BASE = 512

/**
 * Qualidades tentadas em ordem. Começa alta porque rosto de criança precisa
 * ficar nítido; a primeira que couber no limite vence.
 */
const QUALIDADES = [0.86, 0.78, 0.7, 0.62, 0.54, 0.46, 0.38, 0.3]

export type TipoFoto = 'image/webp' | 'image/jpeg'

/**
 * Onde cortar o quadrado. `centroX`/`centroY` são normalizados (0 a 1) sobre a
 * imagem inteira; `zoom` 1 é o maior quadrado que cabe.
 */
export interface Enquadramento {
  centroX: number
  centroY: number
  zoom: number
}

export const ENQUADRAMENTO_CENTRAL: Enquadramento = { centroX: 0.5, centroY: 0.5, zoom: 1 }

export interface FotoPreparada {
  /** Pronto para ir em `Member.photo`. */
  dataUri: string
  /** Tamanho real do `dataUri`, medido. */
  bytes: number
  lado: number
  tipo: TipoFoto
  qualidade: number
}

/** Erro com mensagem já escrita para o usuário final. A causa técnica vai em `cause`. */
export class ErroImagem extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'ErroImagem'
  }
}

// ---------------------------------------------------------------------------
// Leitura do arquivo
// ---------------------------------------------------------------------------

/**
 * Abre o arquivo escolhido como imagem decodificada.
 *
 * Recusa cedo o que não é imagem: sem esta checagem, um PDF viraria um
 * `onerror` genérico e o usuário leria "não consegui abrir" sem saber por quê.
 */
export function carregarImagem(arquivo: File): Promise<HTMLImageElement> {
  if (!arquivo.type.startsWith('image/')) {
    return Promise.reject(
      new ErroImagem('Esse arquivo não é uma imagem. Escolha uma foto (JPG, PNG ou HEIC).'),
    )
  }

  const url = URL.createObjectURL(arquivo)
  return new Promise((resolver, rejeitar) => {
    const imagem = new Image()
    imagem.onload = () => {
      URL.revokeObjectURL(url)
      resolver(imagem)
    }
    imagem.onerror = (causa) => {
      URL.revokeObjectURL(url)
      rejeitar(
        new ErroImagem(
          'Não consegui abrir essa imagem. Se ela veio do iPhone, tente salvar como JPG antes.',
          { cause: causa },
        ),
      )
    }
    imagem.src = url
  })
}

// ---------------------------------------------------------------------------
// Canvas
// ---------------------------------------------------------------------------

function novoCanvas(largura: number, altura: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(largura))
  canvas.height = Math.max(1, Math.round(altura))
  return canvas
}

/** O `getContext` devolve `null` quando o navegador ficou sem memória de GPU. */
function contextoDe(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const contexto = canvas.getContext('2d')
  if (!contexto) {
    throw new ErroImagem('Este aparelho não conseguiu processar a imagem. Tente por outro.')
  }
  contexto.imageSmoothingEnabled = true
  contexto.imageSmoothingQuality = 'high'
  return contexto
}

function copiar(origem: CanvasImageSource, largura: number, altura: number): HTMLCanvasElement {
  const canvas = novoCanvas(largura, altura)
  contextoDe(canvas).drawImage(origem, 0, 0, canvas.width, canvas.height)
  return canvas
}

function limitar(valor: number, minimo: number, maximo: number): number {
  if (!Number.isFinite(valor)) return minimo
  return Math.min(Math.max(valor, minimo), maximo)
}

/**
 * Reduz a foto a uma cópia de trabalho com lado menor de `LADO_BASE`, mantendo a
 * proporção.
 *
 * A redução é feita pela metade a cada etapa de propósito: ir de 3000 px para
 * 512 num `drawImage` só faz o navegador amostrar pontos soltos, e o rosto sai
 * serrilhado. Meia dúzia de etapas custa milissegundos e devolve rosto nítido —
 * e nitidez é o motivo desta funcionalidade existir.
 */
export function criarBase(imagem: HTMLImageElement): HTMLCanvasElement {
  const largura = imagem.naturalWidth || imagem.width
  const altura = imagem.naturalHeight || imagem.height
  if (largura < 1 || altura < 1) {
    throw new ErroImagem('Não consegui ler o tamanho dessa imagem. Tente outra foto.')
  }

  const escala = Math.min(1, LADO_BASE / Math.min(largura, altura))
  const alvoLargura = Math.max(1, Math.round(largura * escala))
  const alvoAltura = Math.max(1, Math.round(altura * escala))

  // A primeira etapa já corta pela metade — copiar a foto inteira em tamanho
  // natural só para depois reduzir gastaria dezenas de MB de canvas à toa.
  let atual = meioCaminho(imagem, largura, altura, alvoLargura, alvoAltura)
  while (atual.width > alvoLargura * 2 && atual.height > alvoAltura * 2) {
    atual = meioCaminho(atual, atual.width, atual.height, alvoLargura, alvoAltura)
  }
  return atual.width === alvoLargura ? atual : copiar(atual, alvoLargura, alvoAltura)
}

/** Uma etapa da redução: metade do atual, sem nunca passar do alvo. */
function meioCaminho(
  origem: CanvasImageSource,
  largura: number,
  altura: number,
  alvoLargura: number,
  alvoAltura: number,
): HTMLCanvasElement {
  return copiar(origem, Math.max(alvoLargura, largura / 2), Math.max(alvoAltura, altura / 2))
}

// ---------------------------------------------------------------------------
// Recorte e compressão
// ---------------------------------------------------------------------------

interface AreaRecorte {
  x: number
  y: number
  lado: number
}

/**
 * Traduz o enquadramento em pixels da base, sempre dentro dela: o centro pedido
 * é respeitado até encostar na borda, e aí gruda — assim o quadrado nunca sai da
 * foto, e mexer no controle não pode gerar faixa vazia.
 */
function areaDoRecorte(base: HTMLCanvasElement, enquadramento: Enquadramento): AreaRecorte {
  const zoom = limitar(enquadramento.zoom, ZOOM_MINIMO, ZOOM_MAXIMO)
  const lado = Math.min(base.width, base.height) / zoom
  return {
    lado,
    x: limitar(limitar(enquadramento.centroX, 0, 1) * base.width - lado / 2, 0, base.width - lado),
    y: limitar(limitar(enquadramento.centroY, 0, 1) * base.height - lado / 2, 0, base.height - lado),
  }
}

function recortarQuadrado(base: HTMLCanvasElement, enquadramento: Enquadramento): HTMLCanvasElement {
  const area = areaDoRecorte(base, enquadramento)
  const canvas = novoCanvas(LADO_FOTO, LADO_FOTO)
  const contexto = contextoDe(canvas)
  // Fundo branco antes de desenhar: o JPEG de reserva não tem transparência e,
  // sem isto, um PNG com fundo transparente viraria uma silhueta preta.
  contexto.fillStyle = '#ffffff'
  contexto.fillRect(0, 0, LADO_FOTO, LADO_FOTO)
  contexto.drawImage(base, area.x, area.y, area.lado, area.lado, 0, 0, LADO_FOTO, LADO_FOTO)
  return canvas
}

/**
 * Descobre o formato pelo que o navegador DEVOLVEU, não por lista de versões.
 * Safari antigo ignora `image/webp` e entrega PNG sem avisar — e um PNG de
 * 256×256 passa fácil de 100 KB, ou seja, o limite estouraria em silêncio.
 */
function tipoDeSaida(canvas: HTMLCanvasElement): TipoFoto {
  const amostra = gerarDataUri(canvas, 'image/webp', 0.5)
  return amostra.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg'
}

function gerarDataUri(canvas: HTMLCanvasElement, tipo: string, qualidade: number): string {
  try {
    return canvas.toDataURL(tipo, qualidade)
  } catch (causa) {
    throw new ErroImagem('Não consegui converter essa foto. Tente escolher outra.', { cause: causa })
  }
}

/** Data URI é ASCII puro, mas medir pelo `Blob` não depende dessa suposição. */
function tamanhoEmBytes(dataUri: string): number {
  return new Blob([dataUri]).size
}

/**
 * Recorta, comprime e devolve a primeira versão que couber no limite.
 *
 * Síncrona de propósito: com a base já reduzida, cada tentativa custa poucos
 * milissegundos, e isso permite recalcular a prévia a cada toque no controle de
 * enquadramento — o que a tela mostra é exatamente o que vai ser gravado, com o
 * peso real ao lado.
 */
export function prepararFoto(
  base: HTMLCanvasElement,
  enquadramento: Enquadramento = ENQUADRAMENTO_CENTRAL,
): FotoPreparada {
  const canvas = recortarQuadrado(base, enquadramento)
  const tipo = tipoDeSaida(canvas)

  for (const qualidade of QUALIDADES) {
    const dataUri = gerarDataUri(canvas, tipo, qualidade)
    const bytes = tamanhoEmBytes(dataUri)
    if (bytes <= LIMITE_BYTES_FOTO) {
      return { dataUri, bytes, lado: LADO_FOTO, tipo, qualidade }
    }
  }

  throw new ErroImagem(
    `Não consegui deixar essa foto abaixo de ${formatarBytes(LIMITE_BYTES_FOTO)}. ` +
      'Tente uma foto com menos detalhe ao fundo.',
  )
}

/** Caminho completo, para uso direto e para a prova de redução. */
export async function prepararFotoDoArquivo(
  arquivo: File,
  enquadramento: Enquadramento = ENQUADRAMENTO_CENTRAL,
): Promise<FotoPreparada> {
  return prepararFoto(criarBase(await carregarImagem(arquivo)), enquadramento)
}

/** "24 KB" — para mostrar o peso ao lado da prévia. */
export function formatarBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${Math.round(bytes / 1024)} KB`
}
