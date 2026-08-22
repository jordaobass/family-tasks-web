'use client'

/**
 * Gestão das tarefas recorrentes (templates) da família.
 *
 * Fala somente com `@/data`. O serviço singleton antigo, cujo id de família era
 * mutável em tempo de execução, saiu de cena: o familyId é resolvido uma única vez
 * no FamilyDataProvider, então esta tela e o painel nunca mais operam em famílias
 * diferentes.
 *
 * Dois campos do domínio ganharam controle próprio aqui:
 * - `audience` decide em qual aba do painel a tarefa aparece. Antes isso era
 *   deduzido de `points > 0` — um adulto com tarefa pontuada mudava de aba sozinho.
 * - `daysOfWeek` só vale para recorrência semanal, e por isso só aparece nela.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useAuthContext } from '@/providers/auth-provider'
import {
  DataError,
  useFamilyData,
  type Difficulty,
  type FamilyData,
  type MemberRole,
  type NewTemplateInput,
  type Recurrence,
  type TaskTemplate,
} from '@/data'

// ---------------------------------------------------------------------------
// Rótulos e classes de tema (nunca cor via style inline)
// ---------------------------------------------------------------------------

const EMOJIS = [
  '🦷', '🚿', '🛏️', '🥣', '📚', '🧸', '🐕', '🧹', '🍳', '🧽',
  '🧼', '🍎', '💧', '🎒', '✏️', '📝', '📖', '⚽', '🎨', '🎵',
  '🚗', '🌱', '🗑️', '🍽️', '🛒', '👕', '🧦', '⏰', '💊', '🏆',
]

const ROTULO_RECORRENCIA: Record<Recurrence, string> = {
  daily: 'Todo dia',
  weekly: 'Semanal',
}

const CLASSE_RECORRENCIA: Record<Recurrence, string> = {
  daily: 'bg-blue-100 text-blue-800',
  weekly: 'bg-purple-100 text-purple-800',
}

const ROTULO_AUDIENCIA: Record<MemberRole, string> = {
  crianca: '🧒 Crianças',
  adulto: '🧑 Adultos',
}

const CLASSE_AUDIENCIA: Record<MemberRole, string> = {
  crianca: 'bg-pink-100 text-pink-800',
  adulto: 'bg-teal-100 text-teal-800',
}

const ROTULO_DIFICULDADE: Record<Difficulty, string> = {
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
}

const CLASSE_DIFICULDADE: Record<Difficulty, string> = {
  easy: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  hard: 'bg-red-100 text-red-800',
}

/** 0=domingo .. 6=sábado, a mesma convenção de `TaskTemplate.daysOfWeek`. */
const DIAS_SEMANA = [
  { valor: 0, curto: 'Dom', nome: 'Domingo' },
  { valor: 1, curto: 'Seg', nome: 'Segunda-feira' },
  { valor: 2, curto: 'Ter', nome: 'Terça-feira' },
  { valor: 3, curto: 'Qua', nome: 'Quarta-feira' },
  { valor: 4, curto: 'Qui', nome: 'Quinta-feira' },
  { valor: 5, curto: 'Sex', nome: 'Sexta-feira' },
  { valor: 6, curto: 'Sáb', nome: 'Sábado' },
]

const TODOS_OS_DIAS = [0, 1, 2, 3, 4, 5, 6]

// ---------------------------------------------------------------------------
// Formulário
// ---------------------------------------------------------------------------

type Filtro = 'todas' | MemberRole

interface Formulario {
  /** `null` = criação; preenchido = edição. */
  id: string | null
  nome: string
  icone: string
  pontos: string
  audience: MemberRole
  recorrencia: Recurrence
  diasSemana: number[]
  categoria: string
  dificuldade: Difficulty
  tempoEstimado: string
}

type ErrosForm = Partial<Record<'nome' | 'pontos' | 'diasSemana' | 'tempoEstimado', string>>

type AtualizarForm = <C extends keyof Formulario>(campo: C, valor: Formulario[C]) => void

const FORM_INICIAL: Formulario = {
  id: null,
  nome: '',
  icone: '📝',
  pontos: '10',
  audience: 'crianca',
  recorrencia: 'daily',
  diasSemana: TODOS_OS_DIAS,
  categoria: '',
  dificuldade: 'easy',
  tempoEstimado: '',
}

function formularioDoTemplate(template: TaskTemplate): Formulario {
  return {
    id: template.id,
    nome: template.name,
    icone: template.icon,
    pontos: String(template.points),
    audience: template.audience,
    recorrencia: template.recurrence,
    diasSemana: template.daysOfWeek.length > 0 ? template.daysOfWeek : TODOS_OS_DIAS,
    categoria: template.category ?? '',
    dificuldade: template.difficulty ?? 'easy',
    tempoEstimado: template.estimatedTime ? String(template.estimatedTime) : '',
  }
}

function validar(form: Formulario): ErrosForm {
  const erros: ErrosForm = {}
  if (!form.nome.trim()) erros.nome = 'Dê um nome para a tarefa.'

  const pontos = Number(form.pontos)
  if (form.pontos.trim() === '' || !Number.isFinite(pontos) || pontos < 0) {
    erros.pontos = 'Os pontos precisam ser um número igual ou maior que zero.'
  }

  if (form.recorrencia === 'weekly' && form.diasSemana.length === 0) {
    erros.diasSemana = 'Marque pelo menos um dia da semana.'
  }

  const tempo = Number(form.tempoEstimado)
  if (form.tempoEstimado.trim() !== '' && (!Number.isFinite(tempo) || tempo < 0)) {
    erros.tempoEstimado = 'O tempo estimado precisa ser um número de minutos.'
  }
  return erros
}

/**
 * `category` vai como string vazia e `estimatedTime` como 0 quando o usuário limpa
 * o campo: o adapter descarta `undefined`, então mandar `undefined` deixaria o valor
 * antigo gravado e o campo seria impossível de apagar.
 */
function paraEntrada(form: Formulario): NewTemplateInput {
  return {
    name: form.nome.trim(),
    icon: form.icone,
    points: Number(form.pontos),
    audience: form.audience,
    recurrence: form.recorrencia,
    // Comparação numérica explícita: `sort()` sem função converte para string,
    // e aí 10 viria antes de 2 se um dia a lista deixar de ser 0..6.
    daysOfWeek:
      form.recorrencia === 'weekly' ? [...form.diasSemana].sort((a, b) => a - b) : TODOS_OS_DIAS,
    category: form.categoria.trim(),
    difficulty: form.dificuldade,
    estimatedTime: form.tempoEstimado.trim() === '' ? 0 : Number(form.tempoEstimado),
  }
}

/** Mensagem legível para a tela; a causa real fica registrada no console. */
function mensagemAmigavel(erro: unknown, padrao: string): string {
  console.error(`[manage-tasks] ${padrao}`, erro)
  return erro instanceof DataError ? erro.message : padrao
}

function resumoDosDias(dias: number[]): string {
  if (dias.length === 0) return 'nenhum dia marcado'
  if (dias.length === 7) return 'todos os dias'
  return DIAS_SEMANA.filter((d) => dias.includes(d.valor))
    .map((d) => d.curto)
    .join(', ')
}

// ---------------------------------------------------------------------------
// Estado da tela
// ---------------------------------------------------------------------------

function useTemplates() {
  const dados = useFamilyData()
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    setCarregando(true)
    try {
      setTemplates(await dados.listTemplates())
      setErro(null)
    } catch (falha) {
      setErro(mensagemAmigavel(falha, 'Não foi possível carregar as tarefas recorrentes.'))
    } finally {
      setCarregando(false)
    }
  }, [dados])

  return { dados, templates, carregando, erro, recarregar }
}

function useEditorTemplate(dados: FamilyData, recarregar: () => Promise<void>, autor: string) {
  const [aberto, setAberto] = useState(false)
  const [form, setForm] = useState<Formulario>(FORM_INICIAL)
  const [erros, setErros] = useState<ErrosForm>({})
  const [erroSalvar, setErroSalvar] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const abrir = (inicial: Formulario) => {
    setForm(inicial)
    setErros({})
    setErroSalvar(null)
    setAberto(true)
  }

  const salvar = async () => {
    const achados = validar(form)
    setErros(achados)
    if (Object.keys(achados).length > 0) return

    setSalvando(true)
    try {
      if (form.id) await dados.updateTemplate(form.id, paraEntrada(form))
      else await dados.createTemplate(paraEntrada(form), autor)
      await recarregar()
      setAberto(false)
    } catch (falha) {
      setErroSalvar(mensagemAmigavel(falha, 'Não foi possível salvar a tarefa recorrente.'))
    } finally {
      setSalvando(false)
    }
  }

  const atualizar: AtualizarForm = (campo, valor) =>
    setForm((atual) => ({ ...atual, [campo]: valor }))

  return {
    aberto,
    form,
    erros,
    erroSalvar,
    salvando,
    atualizar,
    salvar,
    fechar: () => setAberto(false),
    abrirNovo: () => abrir(FORM_INICIAL),
    abrirEdicao: (t: TaskTemplate) => abrir(formularioDoTemplate(t)),
  }
}

function useAlternarAtiva(dados: FamilyData, recarregar: () => Promise<void>) {
  const [idOcupado, setIdOcupado] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const alternar = async (template: TaskTemplate) => {
    setIdOcupado(template.id)
    setErro(null)
    try {
      await dados.setTemplateActive(template.id, !template.isActive)
      await recarregar()
    } catch (falha) {
      setErro(mensagemAmigavel(falha, 'Não foi possível ativar ou desativar a tarefa.'))
    } finally {
      setIdOcupado(null)
    }
  }

  return { alternar, idOcupado, erro }
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export default function ManageTasksPage() {
  const router = useRouter()
  const { user, loading, isAuthenticated } = useAuthContext()
  const { dados, templates, carregando, erro, recarregar } = useTemplates()
  const autor = user?.email ?? user?.uid ?? 'painel'
  const editor = useEditorTemplate(dados, recarregar, autor)
  const alternarAtiva = useAlternarAtiva(dados, recarregar)
  const [filtro, setFiltro] = useState<Filtro>('todas')

  useEffect(() => {
    if (loading) return
    if (!isAuthenticated || !user) {
      router.push('/login')
      return
    }
    void recarregar()
  }, [loading, isAuthenticated, user, router, recarregar])

  const visiveis = useMemo(
    () => templates.filter((t) => filtro === 'todas' || t.audience === filtro),
    [templates, filtro],
  )

  if (loading) return <TelaCarregando texto="Carregando..." />

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">
        <Cabecalho onVoltar={() => router.push('/')} onNova={editor.abrirNovo} />
        <BarraFiltro valor={filtro} onChange={setFiltro} templates={templates} />
        <Aviso mensagem={erro ?? alternarAtiva.erro} />
        {carregando ? (
          <TelaCarregando texto="Carregando tarefas recorrentes..." />
        ) : (
          <ListaTemplates
            templates={visiveis}
            idOcupado={alternarAtiva.idOcupado}
            onEditar={editor.abrirEdicao}
            onAlternar={alternarAtiva.alternar}
          />
        )}
        <ModalTemplate editor={editor} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Componentes de leitura
// ---------------------------------------------------------------------------

function TelaCarregando({ texto }: { texto: string }) {
  return (
    <div className="text-center py-12" role="status" aria-live="polite">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
      <p className="text-gray-600">{texto}</p>
    </div>
  )
}

function Aviso({ mensagem }: { mensagem: string | null }) {
  if (!mensagem) return null
  return (
    <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-red-800" role="alert">
      ⚠️ {mensagem}
    </div>
  )
}

function Cabecalho({ onVoltar, onNova }: { onVoltar: () => void; onNova: () => void }) {
  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <Button onClick={onVoltar} className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-2xl">
          ← Voltar ao painel
        </Button>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">🗂️ Tarefas recorrentes</h1>
        <Button
          onClick={onNova}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-semibold"
        >
          ➕ Nova tarefa
        </Button>
      </div>
      <p className="text-gray-700 max-w-3xl">
        Estas são as tarefas que o sistema cria sozinho a cada dia. Tarefa diária entra todo dia;
        tarefa semanal entra só nos dias marcados.
      </p>
    </div>
  )
}

function BarraFiltro({
  valor,
  onChange,
  templates,
}: {
  valor: Filtro
  onChange: (novo: Filtro) => void
  templates: TaskTemplate[]
}) {
  const opcoes: { chave: Filtro; rotulo: string; total: number }[] = [
    { chave: 'todas', rotulo: 'Todas', total: templates.length },
    { chave: 'crianca', rotulo: ROTULO_AUDIENCIA.crianca, total: contar(templates, 'crianca') },
    { chave: 'adulto', rotulo: ROTULO_AUDIENCIA.adulto, total: contar(templates, 'adulto') },
  ]

  return (
    <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label="Filtrar por público">
      {opcoes.map((opcao) => (
        <button
          key={opcao.chave}
          type="button"
          onClick={() => onChange(opcao.chave)}
          aria-pressed={valor === opcao.chave}
          className={cn(
            'px-4 py-2 rounded-2xl text-sm font-semibold transition-colors',
            valor === opcao.chave
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-blue-50 border border-gray-200',
          )}
        >
          {opcao.rotulo} ({opcao.total})
        </button>
      ))}
    </div>
  )
}

function contar(templates: TaskTemplate[], audience: MemberRole): number {
  return templates.filter((t) => t.audience === audience).length
}

function ListaTemplates({
  templates,
  idOcupado,
  onEditar,
  onAlternar,
}: {
  templates: TaskTemplate[]
  idOcupado: string | null
  onEditar: (t: TaskTemplate) => void
  onAlternar: (t: TaskTemplate) => void
}) {
  if (templates.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-3xl shadow-lg">
        <div className="text-6xl mb-4">📝</div>
        <h2 className="text-xl font-semibold mb-2 text-gray-900">Nenhuma tarefa recorrente aqui</h2>
        <p className="text-gray-600">Use &quot;Nova tarefa&quot; para criar a primeira.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {templates.map((template) => (
        <CartaoTemplate
          key={template.id}
          template={template}
          ocupado={idOcupado === template.id}
          onEditar={onEditar}
          onAlternar={onAlternar}
        />
      ))}
    </div>
  )
}

function CartaoTemplate({
  template,
  ocupado,
  onEditar,
  onAlternar,
}: {
  template: TaskTemplate
  ocupado: boolean
  onEditar: (t: TaskTemplate) => void
  onAlternar: (t: TaskTemplate) => void
}) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden="true">{template.icon}</span>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
            <EtiquetasTemplate template={template} />
          </div>
        </div>
        <span
          className={cn(
            'shrink-0 px-3 py-1 rounded-full text-xs font-semibold',
            template.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700',
          )}
        >
          {template.isActive ? '✅ Ativa' : '⏸️ Inativa'}
        </span>
      </div>
      <DetalhesTemplate template={template} />
      <AcoesTemplate template={template} ocupado={ocupado} onEditar={onEditar} onAlternar={onAlternar} />
    </div>
  )
}

function EtiquetasTemplate({ template }: { template: TaskTemplate }) {
  return (
    <div className="flex flex-wrap items-center gap-2 mt-1">
      <span className={cn('px-2 py-1 rounded-full text-xs font-semibold', CLASSE_AUDIENCIA[template.audience])}>
        {ROTULO_AUDIENCIA[template.audience]}
      </span>
      <span className={cn('px-2 py-1 rounded-full text-xs font-semibold', CLASSE_RECORRENCIA[template.recurrence])}>
        {ROTULO_RECORRENCIA[template.recurrence]}
      </span>
      {template.difficulty && (
        <span className={cn('px-2 py-1 rounded-full text-xs font-semibold', CLASSE_DIFICULDADE[template.difficulty])}>
          {ROTULO_DIFICULDADE[template.difficulty]}
        </span>
      )}
    </div>
  )
}

function DetalhesTemplate({ template }: { template: TaskTemplate }) {
  return (
    <ul className="space-y-2 mb-4 text-sm text-gray-600">
      <li>⭐ {template.points} {template.points === 1 ? 'ponto' : 'pontos'}</li>
      {template.recurrence === 'weekly' && <li>📅 {resumoDosDias(template.daysOfWeek)}</li>}
      {template.category && <li className="capitalize">📂 {template.category}</li>}
      {template.estimatedTime ? <li>⏱️ ~{template.estimatedTime} min</li> : null}
    </ul>
  )
}

function AcoesTemplate({
  template,
  ocupado,
  onEditar,
  onAlternar,
}: {
  template: TaskTemplate
  ocupado: boolean
  onEditar: (t: TaskTemplate) => void
  onAlternar: (t: TaskTemplate) => void
}) {
  return (
    <div className="flex gap-2">
      <Button
        onClick={() => onEditar(template)}
        className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-100 text-blue-800 hover:bg-blue-200"
      >
        ✏️ Editar
      </Button>
      <Button
        onClick={() => onAlternar(template)}
        disabled={ocupado}
        className={cn(
          'flex-1 px-4 py-2 rounded-xl text-sm font-semibold',
          template.isActive
            ? 'bg-red-100 text-red-800 hover:bg-red-200'
            : 'bg-green-100 text-green-800 hover:bg-green-200',
        )}
      >
        {ocupado ? '⏳ Salvando...' : template.isActive ? '⏸️ Desativar' : '▶️ Ativar'}
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Formulário (modal)
// ---------------------------------------------------------------------------

type Editor = ReturnType<typeof useEditorTemplate>

function ModalTemplate({ editor }: { editor: Editor }) {
  const { form, erros, erroSalvar, salvando, atualizar } = editor

  const enviar = (evento: React.FormEvent) => {
    evento.preventDefault()
    void editor.salvar()
  }

  return (
    <Dialog open={editor.aberto} onOpenChange={(aberto) => !aberto && editor.fechar()}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {form.id ? '✏️ Editar tarefa recorrente' : '➕ Nova tarefa recorrente'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={enviar} className="space-y-5" noValidate>
          <CamposBasicos form={form} erros={erros} atualizar={atualizar} />
          <CampoAudiencia valor={form.audience} atualizar={atualizar} />
          <CamposRecorrencia form={form} erros={erros} atualizar={atualizar} />
          <CamposOpcionais form={form} erros={erros} atualizar={atualizar} />
          <Aviso mensagem={erroSalvar} />
          <RodapeFormulario salvando={salvando} onCancelar={editor.fechar} />
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RodapeFormulario({ salvando, onCancelar }: { salvando: boolean; onCancelar: () => void }) {
  return (
    <DialogFooter className="flex gap-3">
      <Button
        type="button"
        onClick={onCancelar}
        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold"
      >
        Cancelar
      </Button>
      <Button type="submit" disabled={salvando} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold">
        {salvando ? '⏳ Salvando...' : '💾 Salvar'}
      </Button>
    </DialogFooter>
  )
}

function MensagemCampo({ id, mensagem }: { id: string; mensagem?: string }) {
  if (!mensagem) return null
  return (
    <p id={id} className="text-sm font-medium text-red-700">
      {mensagem}
    </p>
  )
}

function CamposBasicos({
  form,
  erros,
  atualizar,
}: {
  form: Formulario
  erros: ErrosForm
  atualizar: AtualizarForm
}) {
  return (
    <>
      <SeletorEmoji valor={form.icone} atualizar={atualizar} />
      <div className="space-y-2">
        <Label htmlFor="nome">📝 Nome da tarefa</Label>
        <Input
          id="nome"
          value={form.nome}
          onChange={(e) => atualizar('nome', e.target.value)}
          placeholder="Ex.: Escovar os dentes"
          aria-invalid={Boolean(erros.nome)}
          aria-describedby={erros.nome ? 'erro-nome' : undefined}
        />
        <MensagemCampo id="erro-nome" mensagem={erros.nome} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pontos">⭐ Pontos</Label>
        <Input
          id="pontos"
          type="number"
          min={0}
          value={form.pontos}
          onChange={(e) => atualizar('pontos', e.target.value)}
          aria-invalid={Boolean(erros.pontos)}
          aria-describedby={erros.pontos ? 'erro-pontos' : undefined}
        />
        <MensagemCampo id="erro-pontos" mensagem={erros.pontos} />
      </div>
    </>
  )
}

function SeletorEmoji({ valor, atualizar }: { valor: string; atualizar: AtualizarForm }) {
  return (
    <div className="space-y-2">
      <Label id="rotulo-icone">📱 Ícone</Label>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl border border-gray-200">
          {valor}
        </div>
        <div
          role="group"
          aria-labelledby="rotulo-icone"
          className="flex-1 grid grid-cols-10 gap-1 max-h-24 overflow-y-auto p-2 border rounded-lg bg-gray-50"
        >
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={`Usar o ícone ${emoji}`}
              aria-pressed={valor === emoji}
              onClick={() => atualizar('icone', emoji)}
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center text-lg',
                valor === emoji ? 'bg-blue-100 border-2 border-blue-400' : 'bg-white border border-gray-200',
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * `audience` é campo próprio — não se deduz mais dos pontos. É ele que decide
 * em qual aba do painel a tarefa aparece.
 */
function CampoAudiencia({ valor, atualizar }: { valor: MemberRole; atualizar: AtualizarForm }) {
  return (
    <div className="space-y-2">
      <Label id="rotulo-audiencia">👨‍👩‍👧 Aparece na aba de</Label>
      <div role="group" aria-labelledby="rotulo-audiencia" className="grid grid-cols-2 gap-3">
        {(['crianca', 'adulto'] as MemberRole[]).map((opcao) => (
          <button
            key={opcao}
            type="button"
            aria-pressed={valor === opcao}
            onClick={() => atualizar('audience', opcao)}
            className={cn(
              'px-4 py-3 rounded-xl text-sm font-semibold border transition-colors',
              valor === opcao
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50',
            )}
          >
            {ROTULO_AUDIENCIA[opcao]}
          </button>
        ))}
      </div>
    </div>
  )
}

function CamposRecorrencia({
  form,
  erros,
  atualizar,
}: {
  form: Formulario
  erros: ErrosForm
  atualizar: AtualizarForm
}) {
  return (
    <div className="space-y-2">
      <Label id="rotulo-recorrencia">🔄 Quando repetir</Label>
      <div role="group" aria-labelledby="rotulo-recorrencia" className="grid grid-cols-2 gap-3">
        {(['daily', 'weekly'] as Recurrence[]).map((opcao) => (
          <button
            key={opcao}
            type="button"
            aria-pressed={form.recorrencia === opcao}
            onClick={() => atualizar('recorrencia', opcao)}
            className={cn(
              'px-4 py-3 rounded-xl text-sm font-semibold border transition-colors',
              form.recorrencia === opcao
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-purple-50',
            )}
          >
            {ROTULO_RECORRENCIA[opcao]}
          </button>
        ))}
      </div>
      {form.recorrencia === 'weekly' && (
        <SeletorDiasSemana valor={form.diasSemana} erro={erros.diasSemana} atualizar={atualizar} />
      )}
    </div>
  )
}

/** Só existe para recorrência semanal — é quando `daysOfWeek` tem efeito. */
function SeletorDiasSemana({
  valor,
  erro,
  atualizar,
}: {
  valor: number[]
  erro?: string
  atualizar: AtualizarForm
}) {
  const alternarDia = (dia: number) =>
    atualizar('diasSemana', valor.includes(dia) ? valor.filter((d) => d !== dia) : [...valor, dia])

  return (
    <div className="space-y-2 pt-3">
      <Label id="rotulo-dias">📅 Dias da semana</Label>
      <div role="group" aria-labelledby="rotulo-dias" className="flex flex-wrap gap-2">
        {DIAS_SEMANA.map((dia) => (
          <button
            key={dia.valor}
            type="button"
            aria-label={dia.nome}
            aria-pressed={valor.includes(dia.valor)}
            onClick={() => alternarDia(dia.valor)}
            className={cn(
              'w-14 py-2 rounded-xl text-sm font-semibold border transition-colors',
              valor.includes(dia.valor)
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-purple-50',
            )}
          >
            {dia.curto}
          </button>
        ))}
      </div>
      <MensagemCampo id="erro-dias" mensagem={erro} />
    </div>
  )
}

function CamposOpcionais({
  form,
  erros,
  atualizar,
}: {
  form: Formulario
  erros: ErrosForm
  atualizar: AtualizarForm
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label htmlFor="categoria">📂 Categoria</Label>
        <Input
          id="categoria"
          value={form.categoria}
          onChange={(e) => atualizar('categoria', e.target.value)}
          placeholder="higiene, casa..."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="dificuldade">🎯 Dificuldade</Label>
        <select
          id="dificuldade"
          value={form.dificuldade}
          onChange={(e) => atualizar('dificuldade', e.target.value as Difficulty)}
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white text-gray-900 px-3 py-2 text-sm"
        >
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((nivel) => (
            <option key={nivel} value={nivel}>
              {ROTULO_DIFICULDADE[nivel]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="tempo">⏱️ Minutos</Label>
        <Input
          id="tempo"
          type="number"
          min={0}
          value={form.tempoEstimado}
          onChange={(e) => atualizar('tempoEstimado', e.target.value)}
          aria-invalid={Boolean(erros.tempoEstimado)}
          aria-describedby={erros.tempoEstimado ? 'erro-tempo' : undefined}
        />
        <MensagemCampo id="erro-tempo" mensagem={erros.tempoEstimado} />
      </div>
    </div>
  )
}
