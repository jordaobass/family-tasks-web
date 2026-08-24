'use client'

/**
 * Campo da foto do membro.
 *
 * A prévia NÃO é uma simulação: ela é o próprio resultado do pipeline de
 * `@/lib/imagem`, recalculado a cada ajuste. O que aparece na tela, com o peso
 * ao lado, é byte a byte o que vai gravado — nada de "mais ou menos assim".
 */

import { useId, useState } from 'react'

import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  ENQUADRAMENTO_CENTRAL,
  ErroImagem,
  LADO_FOTO,
  LIMITE_BYTES_FOTO,
  ZOOM_MAXIMO,
  ZOOM_MINIMO,
  carregarImagem,
  criarBase,
  formatarBytes,
  prepararFoto,
  type Enquadramento,
  type FotoPreparada,
} from '@/lib/imagem'

import { AvatarMembro } from '@/components/common/avatar-membro'

interface Props {
  nome: string
  emoji: string
  /** Data URI a exibir agora — a recém-preparada ou a já gravada. */
  foto: string | null
  /** `null` significa "sem foto"; a tela traduz isso em remover ao salvar. */
  onMudar: (foto: string | null) => void
}

/** Mensagem para a tela; a causa técnica fica registrada no console. */
function mensagemDeErro(falha: unknown, padrao = 'Não consegui preparar essa foto.'): string {
  console.error('[familia] falha ao preparar a foto do membro', falha)
  return falha instanceof ErroImagem ? falha.message : padrao
}

function useEditorDeFoto(onMudar: (foto: string | null) => void) {
  const [base, setBase] = useState<HTMLCanvasElement | null>(null)
  const [enquadramento, setEnquadramento] = useState<Enquadramento>(ENQUADRAMENTO_CENTRAL)
  const [previa, setPrevia] = useState<FotoPreparada | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [processando, setProcessando] = useState(false)

  /** Em falha, o estado anterior fica de pé: o que se vê continua sendo o que se grava. */
  const aplicar = (novaBase: HTMLCanvasElement, novo: Enquadramento) => {
    try {
      const foto = prepararFoto(novaBase, novo)
      setPrevia(foto)
      setErro(null)
      onMudar(foto.dataUri)
    } catch (falha) {
      setErro(mensagemDeErro(falha))
    }
  }

  const escolher = async (arquivo: File) => {
    setProcessando(true)
    try {
      const novaBase = criarBase(await carregarImagem(arquivo))
      setBase(novaBase)
      setEnquadramento(ENQUADRAMENTO_CENTRAL)
      aplicar(novaBase, ENQUADRAMENTO_CENTRAL)
    } catch (falha) {
      setErro(mensagemDeErro(falha, 'Não consegui usar essa foto. Tente escolher outra.'))
    } finally {
      setProcessando(false)
    }
  }

  const ajustar = (campo: keyof Enquadramento, valor: number) => {
    if (!base) return
    const novo = { ...enquadramento, [campo]: valor }
    setEnquadramento(novo)
    // Reusa a mesma cópia de trabalho: por isso ajustar o recorte é instantâneo
    // mesmo com foto de 12 megapixels.
    aplicar(base, novo)
  }

  const remover = () => {
    setBase(null)
    setPrevia(null)
    setErro(null)
    onMudar(null)
  }

  return { base, enquadramento, previa, erro, processando, escolher, ajustar, remover }
}

export function CampoFoto({ nome, emoji, foto, onMudar }: Props) {
  const editor = useEditorDeFoto(onMudar)
  const idInput = `arquivo-foto-${useId()}`

  return (
    // `fieldset`/`legend` e não um `<label>` solto: são vários controles (escolher,
    // remover, enquadrar) sob um rótulo só, e label sem controle associado é
    // ruído para quem usa leitor de tela.
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-gray-900">📷 Foto</legend>
      <div className="flex flex-wrap items-start gap-4">
        <AvatarMembro
          nome={nome || 'membro'}
          emoji={emoji}
          foto={foto}
          className="h-40 w-40"
          classeEmoji="text-7xl"
        />
        <div className="flex min-w-[12rem] flex-1 flex-col gap-2">
          <BotaoEscolher id={idInput} temFoto={Boolean(foto)} onArquivo={editor.escolher} />
          {foto && <BotaoRemover onRemover={editor.remover} />}
          <Rodape processando={editor.processando} previa={editor.previa} />
        </div>
      </div>
      {editor.base && (
        <ControlesEnquadramento enquadramento={editor.enquadramento} onAjustar={editor.ajustar} />
      )}
      {editor.erro && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-800" role="alert">
          ⚠️ {editor.erro}
        </p>
      )}
    </fieldset>
  )
}

/**
 * Sem o atributo `capture`: no celular, o seletor nativo já abre com "Câmera" e
 * "Fotos" lado a lado. Forçar `capture` tiraria a galeria — e a foto boa da
 * criança quase sempre já existe no rolo, não vai ser tirada na hora.
 */
function BotaoEscolher({
  id,
  temFoto,
  onArquivo,
}: {
  id: string
  temFoto: boolean
  onArquivo: (arquivo: File) => Promise<void>
}) {
  return (
    <>
      <input
        id={id}
        type="file"
        accept="image/*"
        className="peer sr-only"
        onChange={(evento) => {
          const arquivo = evento.target.files?.[0]
          // Limpa o valor para que escolher o MESMO arquivo de novo dispare o evento.
          evento.target.value = ''
          if (arquivo) void onArquivo(arquivo)
        }}
      />
      <Label
        htmlFor={id}
        className={cn(
          'flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white',
          'hover:bg-indigo-700 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500 peer-focus-visible:ring-offset-2',
        )}
      >
        {temFoto ? '🔄 Trocar foto' : '📷 Escolher foto'}
      </Label>
    </>
  )
}

function BotaoRemover({ onRemover }: { onRemover: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemover}
      className="min-h-[44px] rounded-xl bg-red-100 px-4 text-sm font-semibold text-red-800 hover:bg-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
    >
      🗑️ Remover foto
    </button>
  )
}

function Rodape({ processando, previa }: { processando: boolean; previa: FotoPreparada | null }) {
  if (processando) {
    return (
      <p className="text-sm text-gray-600" role="status" aria-live="polite">
        ⏳ Preparando a foto...
      </p>
    )
  }
  return (
    <p className="text-xs leading-relaxed text-gray-600" aria-live="polite">
      {previa
        ? `Pronta: ${LADO_FOTO}×${LADO_FOTO}, ${formatarBytes(previa.bytes)} (limite de ${formatarBytes(LIMITE_BYTES_FOTO)}).`
        : `A foto é cortada em quadrado e reduzida aqui no aparelho, para ${LADO_FOTO}×${LADO_FOTO} e até ${formatarBytes(LIMITE_BYTES_FOTO)}.`}
    </p>
  )
}

/** Só aparece quando há uma foto recém-escolhida — é dela que o recorte sai. */
function ControlesEnquadramento({
  enquadramento,
  onAjustar,
}: {
  enquadramento: Enquadramento
  onAjustar: (campo: keyof Enquadramento, valor: number) => void
}) {
  return (
    <fieldset className="rounded-xl border border-gray-200 bg-gray-50 p-3">
      <legend className="px-1 text-sm font-semibold text-gray-700">Enquadramento</legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Deslizante
          id="foto-zoom"
          rotulo="Aproximação"
          valor={enquadramento.zoom}
          minimo={ZOOM_MINIMO}
          maximo={ZOOM_MAXIMO}
          passo={0.05}
          onChange={(valor) => onAjustar('zoom', valor)}
        />
        <Deslizante
          id="foto-x"
          rotulo="Horizontal"
          valor={enquadramento.centroX}
          minimo={0}
          maximo={1}
          passo={0.01}
          onChange={(valor) => onAjustar('centroX', valor)}
        />
        <Deslizante
          id="foto-y"
          rotulo="Vertical"
          valor={enquadramento.centroY}
          minimo={0}
          maximo={1}
          passo={0.01}
          onChange={(valor) => onAjustar('centroY', valor)}
        />
      </div>
    </fieldset>
  )
}

function Deslizante({
  id,
  rotulo,
  valor,
  minimo,
  maximo,
  passo,
  onChange,
}: {
  id: string
  rotulo: string
  valor: number
  minimo: number
  maximo: number
  passo: number
  onChange: (valor: number) => void
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs font-semibold text-gray-600">
        {rotulo}
      </Label>
      <input
        id={id}
        type="range"
        min={minimo}
        max={maximo}
        step={passo}
        value={valor}
        onChange={(evento) => onChange(Number(evento.target.value))}
        className="h-11 w-full cursor-pointer rounded-lg accent-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
      />
    </div>
  )
}
