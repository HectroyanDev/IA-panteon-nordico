// Lógica con `$` del módulo de Vár: plan, contadores, juicio, reconducción,
// registro y las dos herramientas (`var_status`, `var_report`). Todas las
// funciones que reciben `$` se declaran con `function`.
import type { EngineInterface } from 'claude-code'
import type { JudgeUsage, LogEntry, LogUsage, LogOrigin, ThreadState, ThreadVerdict, VarLang, Watch, WatchSource } from '../../types'
import {
  BUFFER_LIMIT,
  LOG_LIMIT,
  MAX_CORRECTIONS,
  activeChanges,
  buildCorrection,
  CORRECTION_TEXT,
  buildJudgePrompt,
  changeCandidates,
  cleanVerdict,
  isEndSkill,
  isStartSkill,
  isVarSkill,
  notifyText,
  parseConfig,
  normalizeLang,
  parseVerdicts,
  pushLimited,
  resolveSettings,
  summarizeCall,
  summaryLine,
  tasksDone,
  threadLabel,
  trunc,
} from './pure'
import type { Settings, ThreadActivity } from './pure'

type Engine = EngineInterface
type Ev = Record<string, any>

export const PANE_ID = 'var'
export const VAR_STATUS_TOOL = 'mcp__nordic-pantheon__var_status'
export const VAR_REPORT_TOOL = 'mcp__nordic-pantheon__var_report'

const WATCH = { plugin: 'nordic-pantheon', key: 'watch' } as const
const LOG = { plugin: 'nordic-pantheon', key: 'log' } as const
const THREADS = { plugin: 'nordic-pantheon', key: 'threads' } as const
const JUDGE_MODEL = 'opus'
const JUDGE_USAGE = { plugin: 'nordic-pantheon', key: 'judgeUsage' } as const

const TICK_MS = 30_000
const JUDGE_TIMEOUT_MS = 120_000
const JUDGE_PATH = '/skills/var/references/judge.md'

export const INITIAL_WATCH: Watch = {
  status: 'sin-plan',
  source: null,
  path: null,
  planText: null,
  changeName: null,
  contextPaths: [],
  activatedAt: 0,
  windowStart: 0,
  windowId: 0,
  calls: 0,
  buffers: {},
  enabled: true,
  minutes: 10,
  toolCalls: 40,
  notes: [],
  varAgentIds: [],
  judging: false,
  lastJudgmentAt: null,
  lastJudgment: null,
  pending: {},
  handledReports: [],
  panelPlaced: null,
}

// ---------------------------------------------------------------- estado

// Un solo escritor a la vez: las lecturas-modificaciones-escrituras no se pisan.
let chain: Promise<unknown> = Promise.resolve()
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn)
  chain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

export async function readWatch($: Engine): Promise<Watch> {
  const { value } = await $.state.get(WATCH)
  return value ?? INITIAL_WATCH
}
export async function readLog($: Engine): Promise<LogEntry[]> {
  const { value } = await $.state.get(LOG)
  return value ?? []
}
export async function readJudgeUsage($: Engine): Promise<JudgeUsage> {
  const { value } = await $.state.get(JUDGE_USAGE)
  return value ?? { judgments: 0, input: 0, output: 0, cacheRead: 0, cacheCreation: 0 }
}
export async function readThreads($: Engine): Promise<Record<string, ThreadState>> {
  const { value } = await $.state.get(THREADS)
  return value ?? {}
}

/** Modifica el estado de la vigilancia; `fn` recibe una copia y devuelve lo que quiera. */
export function editWatch<R>($: Engine, fn: (w: Watch) => R): Promise<R> {
  return serial(async () => {
    const w = structuredCloneJson(await readWatch($))
    const result = fn(w)
    await $.state.set(WATCH, w)
    if (w.panelPlaced === false) $.ui.status(summaryLine(w, await $.clock.now()))
    return result
  })
}
function editThreads<R>($: Engine, fn: (t: Record<string, ThreadState>) => R): Promise<R> {
  return serial(async () => {
    const t = structuredCloneJson(await readThreads($))
    const result = fn(t)
    await $.state.set(THREADS, t)
    return result
  })
}
function addLog($: Engine, entry: LogEntry): Promise<void> {
  return serial(async () => {
    await $.state.set(LOG, pushLimited(await readLog($), entry, LOG_LIMIT))
  })
}

function addJudgeUsage($: Engine, spent: Spent): Promise<void> {
  return serial(async () => {
    const cur = await readJudgeUsage($)
    await $.state.set(JUDGE_USAGE, {
      judgments: cur.judgments + 1,
      input: cur.input + spent.input,
      output: cur.output + spent.output,
      cacheRead: cur.cacheRead + spent.cacheRead,
      cacheCreation: cur.cacheCreation + spent.cacheCreation,
    })
  })
}

function structuredCloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

// ---------------------------------------------------------------- config y panel

export async function loadSettings($: Engine): Promise<Settings> {
  let text = ''
  try {
    const xdg = await $.env.get('XDG_CONFIG_HOME')
    const home = await $.env.get('HOME')
    const base = xdg && xdg.trim() ? xdg.trim() : `${home ?? ''}/.config`
    const raw = await $.fs.read(`${base}/nordic-pantheon/config`)
    text = typeof raw === 'string' ? raw : ''
  } catch {
    text = ''
  }
  return resolveSettings(parseConfig(text))
}

export async function openPanel($: Engine): Promise<boolean> {
  let placed = false
  try {
    const r = await $.ui.open({ id: PANE_ID, title: 'Vár' })
    placed = r.isPlaced
  } catch {
    placed = false
  }
  await editWatch($, w => {
    w.panelPlaced = placed
  })
  return placed
}

// ---------------------------------------------------------------- arranque

let isSetUp = false
let timer: { cancel: () => void } | null = null

/** Herramientas, comando y reloj: se hace en `session.start` y, si el módulo se recargó, en la primera llamada. */
export async function ensureSetup($: Engine): Promise<void> {
  if (!isSetUp) {
    isSetUp = true
    try {
      await $.tool.register({
        name: 'var_status',
        description:
          'Vár: devuelve el plan vigilado, el estado de la vigilancia (activo, desactivado, cerrado, sin-plan, ambiguo), la ventana actual, las llamadas recientes por hilo (main o agentId) y el registro de juicios. Solo lectura.',
        inputSchema: { type: 'object', properties: {} },
        isDeferred: false,
      })
      await $.tool.register({
        name: 'var_report',
        description:
          'Vár: entrega al módulo el veredicto de /var por hilo. El módulo corrige el hilo que se desvió (inyección, registro, panel y notificación). Pasa todos los veredictos, también alineado y menor.',
        inputSchema: {
          type: 'object',
          properties: {
            threads: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  thread: { type: 'string', description: '"main" o un agentId' },
                  verdict: { type: 'string', enum: ['alineado', 'menor', 'desvío'] },
                  planStep: { type: 'string' },
                  reason: { type: 'string' },
                  correction: { type: 'string' },
                },
                required: ['thread', 'verdict'],
              },
            },
            plan: { type: 'string', description: 'Ruta del plan juzgado, si se conoce' },
            lang: { type: 'string', enum: ['es', 'en'], description: 'Idioma del plan: la corrección se redacta en él (por defecto es)' },
          },
          required: ['threads'],
        },
        isDeferred: false,
      })
      await $.command.register({ name: 'var-panel', description: 'Abre el panel de Vár (plan vigilado y registro de juicios)' })
    } catch {
      isSetUp = false
    }
  }
  ensureTimer($)
}

export function ensureTimer($: Engine): void {
  if (timer) return
  timer = $.clock.every(TICK_MS, () => {
    void tick($)
  })
}

export function stopTimer(): void {
  if (timer) timer.cancel()
  timer = null
}

// ---------------------------------------------------------------- plan activo

type PlanSpec = {
  source: WatchSource
  path: string | null
  planText: string | null
  changeName: string | null
  contextPaths: string[]
  notes?: string[]
}

export async function activate($: Engine, spec: PlanSpec): Promise<void> {
  const settings = await loadSettings($)
  const now = await $.clock.now()
  const status = settings.enabled ? 'activo' : 'desactivado'
  const unchanged = await editWatch($, w => {
    const same = w.source === spec.source && w.path === spec.path && (w.status === 'activo' || w.status === 'desactivado')
    if (same) return true
    const keep = { varAgentIds: w.varAgentIds, handledReports: w.handledReports, panelPlaced: w.panelPlaced }
    Object.assign(w, INITIAL_WATCH, keep, {
      status,
      source: spec.source,
      path: spec.path,
      planText: spec.planText,
      changeName: spec.changeName,
      contextPaths: spec.contextPaths,
      activatedAt: now,
      windowStart: now,
      enabled: settings.enabled,
      minutes: settings.minutes,
      toolCalls: settings.toolCalls,
      notes: [...settings.notes, ...(spec.notes ?? [])],
    })
    return false
  })
  if (unchanged) return
  await editThreads($, t => {
    for (const k of Object.keys(t)) delete t[k]
  })
  if (settings.enabled) await openPanel($)
  ensureTimer($)
}

export async function closeWatch($: Engine, why: string): Promise<void> {
  await editWatch($, w => {
    if (w.status === 'activo' || w.status === 'desactivado') {
      w.status = 'cerrado'
      w.notes = [...w.notes, why]
      w.buffers = {}
      w.calls = 0
    }
  })
}

async function markAmbiguous($: Engine, note: string): Promise<void> {
  await editWatch($, w => {
    if (w.status === 'activo' || w.status === 'desactivado') {
      w.notes = [...w.notes, note]
    } else {
      Object.assign(w, INITIAL_WATCH, {
        status: 'ambiguo',
        notes: [note],
        varAgentIds: w.varAgentIds,
        handledReports: w.handledReports,
        panelPlaced: w.panelPlaced,
      })
    }
  })
}

/** `ExitPlanMode` aprobado: el archivo de plan pasa a ser el plan activo. */
export async function onPlanApproved($: Engine, result: Ev | undefined): Promise<void> {
  const filePath = typeof result?.filePath === 'string' && result.filePath ? result.filePath : null
  const plan = typeof result?.plan === 'string' && result.plan ? result.plan : null
  if (!filePath && !plan) return
  if (result?.awaitingLeaderApproval === true) return
  await activate($, {
    source: 'plan-mode',
    path: filePath,
    planText: filePath ? null : plan && plan.slice(0, 12000),
    changeName: null,
    contextPaths: [],
  })
}

async function readIf($: Engine, path: string): Promise<string | null> {
  try {
    const raw = await $.fs.read(path)
    return typeof raw === 'string' ? raw : null
  } catch {
    return null
  }
}

/** Brokkr o apply de OpenSpec: `tasks.md` del change identificado. */
export async function onApplyStarted($: Engine, args: unknown, explicitOnly: boolean): Promise<void> {
  const current = await readWatch($)
  if (current.source === 'plan-mode' && (current.status === 'activo' || current.status === 'desactivado')) return
  const cwd = await $.session.cwd()
  const taskPath = (name: string) => `${cwd}/openspec/changes/${name}/tasks.md`
  let candidates = changeCandidates(args)
  if (explicitOnly) {
    const text = typeof args === 'string' ? args : ''
    candidates = candidates.filter(c => text.includes(`openspec/changes/${c}`))
  }
  const existing: string[] = []
  for (const c of candidates) if ((await readIf($, taskPath(c))) !== null) existing.push(c)
  // Plan mode cerrado por la validación: Brokkr es una ronda de corrección del mismo plan,
  // salvo que los argumentos nombren un change existente.
  if (current.source === 'plan-mode' && current.status === 'cerrado' && (current.path || current.planText)) {
    const text = typeof args === 'string' ? args : ''
    if (!existing.some(c => text.includes(`openspec/changes/${c}`))) {
      await activate($, { source: 'plan-mode', path: current.path, planText: current.planText, changeName: null, contextPaths: [] })
      return
    }
  }
  let name: string | null = null
  if (existing.length === 1) name = existing[0] ?? null
  else if (existing.length > 1) {
    await markAmbiguous($, `Change ambiguo (${existing.join(', ')}): vigilancia no activada`)
    return
  } else {
    let stdout = ''
    try {
      const r = await $.process.run(['openspec', 'list', '--json'], { cwd })
      stdout = r.exitCode === 0 ? r.stdout : ''
    } catch {
      stdout = ''
    }
    const active = activeChanges(stdout)
    if (active.length === 1) name = active[0] ?? null
    else {
      await markAmbiguous(
        $,
        active.length === 0
          ? 'No hay un change identificable: vigilancia no activada'
          : `Change ambiguo (${active.join(', ')}): vigilancia no activada`,
      )
      return
    }
  }
  const base = `${cwd}/openspec/changes/${name}`
  const context: string[] = []
  for (const f of ['proposal.md', 'design.md']) if ((await readIf($, `${base}/${f}`)) !== null) context.push(`${base}/${f}`)
  await activate($, { source: 'openspec', path: `${base}/tasks.md`, planText: null, changeName: name, contextPaths: context })
}

/** Tras un `Edit`/`Write` de `tasks.md`: si no queda casilla abierta, fin de la vigilancia. */
export async function checkTasksDone($: Engine): Promise<boolean> {
  const w = await readWatch($)
  if (w.source !== 'openspec' || !w.path || (w.status !== 'activo' && w.status !== 'desactivado')) return false
  const text = await readIf($, w.path)
  if (text !== null && tasksDone(text)) {
    await closeWatch($, 'Todas las tareas de tasks.md están marcadas')
    return true
  }
  return false
}

// ---------------------------------------------------------------- hook tool.call

/** Cuerpo del hook `tool.call`: contador, detección de plan, fin y reserva por `context`. */
export async function handleToolCall($: Engine, e: Ev, next: (e: any) => Promise<any>): Promise<any> {
  const tool = String(e.tool)
  if (tool === VAR_STATUS_TOOL || tool === VAR_REPORT_TOOL) {
    try {
      await ensureSetup($)
      return tool === VAR_STATUS_TOOL ? await answerStatus($, e) : await answerReport($, e)
    } catch (err) {
      return { result: `Vár: error interno (${trunc(String(err), 160)})` }
    }
  }

  const agentId: string | undefined = typeof e.agentId === 'string' ? e.agentId : undefined
  const thread = agentId ?? 'main'
  let reserved: string | null = null

  // Nada de lo que hace Vár alrededor de la llamada puede romperla: si falla, la llamada sigue.
  await safely(async () => {
    await ensureSetup($)
    if (tool === 'Skill') {
      if (isEndSkill(e.skill)) await closeWatch($, `Empezó la validación (${e.skill})`)
      else if (isStartSkill(e.skill)) await onApplyStarted($, e.args, false)
    }
    reserved = await countCall($, e, tool, thread, agentId)
  })

  const r = await next(e)

  await safely(async () => {
    if (tool === 'ExitPlanMode' && !r.deny && !r.isError) await onPlanApproved($, r.result as Ev | undefined)
    if ((tool === 'Edit' || tool === 'Write') && typeof e.file_path === 'string' && e.file_path.endsWith('tasks.md')) {
      await checkTasksDone($)
    }
    if (tool === 'Skill' && isVarSkill(e.skill)) await afterVarSkill($, r)
    if (r.isError === true && typeof e.tool_use_id === 'string') {
      await editWatch($, w => {
        const entry = (w.buffers[thread] ?? []).find(c => c.id === e.tool_use_id)
        if (entry) entry.isError = true
      })
    }
  })
  if (reserved && !r.deny) return { ...r, context: [...(r.context ?? []), reserved] }
  return r
}

async function safely(fn: () => Promise<void>): Promise<void> {
  try {
    await fn()
  } catch {
    // Vár es de segundo plano: nunca rompe la llamada vigilada
  }
}

async function countCall($: Engine, e: Ev, tool: string, thread: string, agentId: string | undefined): Promise<string | null> {
  const summary = summarizeCall(tool, e)
  const out = { reserved: null as string | null, fire: false }
  await editWatch($, w => {
    if (w.pending[thread]) {
      out.reserved = w.pending[thread]
      delete w.pending[thread]
    }
    if (w.status !== 'activo') return
    if (agentId && w.varAgentIds.includes(agentId)) return
    w.calls += 1
    w.buffers[thread] = pushLimited(
      w.buffers[thread] ?? [],
      { id: String(e.tool_use_id ?? ''), tool: summary.tool, target: summary.target, isError: false },
      BUFFER_LIMIT,
    )
    out.fire = !w.judging && w.calls >= w.toolCalls
  })
  if (out.fire) scheduleJudgment($)
  return out.reserved
}

function scheduleJudgment($: Engine): void {
  $.clock.after(0, () => {
    void runJudgment($)
  })
}

/** `/var` terminó: se marca su subagente y, si `var_report` no llegó, se lee el JSON final del resultado. */
async function afterVarSkill($: Engine, r: Ev): Promise<void> {
  const res = r.result as Ev | undefined
  if (!res || res.status !== 'forked' || typeof res.agentId !== 'string') return
  const agentId: string = res.agentId
  const w = await readWatch($)
  if (w.handledReports.some(k => k.startsWith(`${agentId}|`))) return
  const verdicts = extractFinalVerdicts(typeof res.result === 'string' ? res.result : '')
  if (!verdicts || verdicts.length === 0) return
  await applyReport($, agentId, verdicts, null)
}

export function extractFinalVerdicts(text: string): ThreadVerdict[] | null {
  const blocks = [...text.matchAll(/```json\s*([\s\S]*?)```/g)]
  for (let i = blocks.length - 1; i >= 0; i--) {
    const v = parseVerdicts(blocks[i]?.[1] ?? '')
    if (v) return v
  }
  return null
}

// ---------------------------------------------------------------- reloj y juicio

export async function tick($: Engine): Promise<void> {
  const w = await readWatch($)
  if (w.status !== 'activo' || w.judging) return
  const now = await $.clock.now()
  if (now - w.windowStart < w.minutes * 60_000) return
  if (w.calls === 0) {
    await editWatch($, x => {
      x.windowStart = now
      x.buffers = {}
    })
    return
  }
  await runJudgment($)
}

type Snapshot = { planPath: string | null; planText: string | null; source: WatchSource | null; context: string[]; buffers: Watch['buffers']; windowStart: number }

export async function runJudgment($: Engine): Promise<void> {
  const now = await $.clock.now()
  const snap: Snapshot | null = await editWatch($, w => {
    if (w.status !== 'activo' || w.judging || w.calls === 0) return null
    const s: Snapshot = {
      planPath: w.path,
      planText: w.planText,
      source: w.source,
      context: w.contextPaths,
      buffers: w.buffers,
      windowStart: w.windowStart,
    }
    // La ventana nueva empieza ya: se sigue contando mientras se juzga.
    w.judging = true
    w.windowStart = now
    w.windowId += 1
    w.calls = 0
    w.buffers = {}
    return s
  })
  if (!snap) return
  let summary = ''
  const spent = newSpent()
  try {
    summary = await judge($, snap, now, spent)
  } catch (err) {
    summary = `juicio fallido: ${trunc(String(err), 120)}`
    await addLog($, failedEntry(now, 'auto', summary, logUsage(spent)))
  } finally {
    if (spent.calls > 0) await addJudgeUsage($, spent)
    await editWatch($, w => {
      w.judging = false
      w.lastJudgmentAt = now
      w.lastJudgment = summary
    })
  }
}

/** Tokens gastados por los intentos de un juicio; `calls` cuenta las llamadas al modelo. */
type Spent = { calls: number; input: number; output: number; cacheRead: number; cacheCreation: number }

function newSpent(): Spent {
  return { calls: 0, input: 0, output: 0, cacheRead: 0, cacheCreation: 0 }
}

function logUsage(spent: Spent): LogUsage | undefined {
  if (spent.calls === 0) return undefined
  return { model: JUDGE_MODEL, input: spent.input, output: spent.output, cacheRead: spent.cacheRead, cacheCreation: spent.cacheCreation }
}

function failedEntry(at: number, origin: LogOrigin, reason: string, usage?: LogUsage): LogEntry {
  return { at, origin, thread: '-', verdict: 'fallido', planStep: '', reason, correction: null, via: null, persistent: false, note: null, ...(usage ? { usage } : {}) }
}

async function judge($: Engine, snap: Snapshot, now: number, spent: Spent): Promise<string> {
  // OpenSpec: si ya no queda casilla abierta, no hay nada que vigilar.
  let planText = snap.planText ?? ''
  if (snap.planPath) {
    const text = await readIf($, snap.planPath)
    if (text !== null) planText = text
  }
  if (snap.source === 'openspec' && planText && tasksDone(planText)) {
    await closeWatch($, 'Todas las tareas de tasks.md están marcadas')
    return 'vigilancia cerrada: tareas completas'
  }
  const criterion = await readIf($, `${$.plugin.root}${JUDGE_PATH}`)
  if (criterion === null) {
    await addLog($, failedEntry(now, 'auto', 'juicio fallido: no se pudo leer references/judge.md'))
    return 'juicio fallido'
  }
  const context: string[] = []
  for (const p of snap.context) {
    const text = await readIf($, p)
    if (text !== null) context.push(`${p}\n${text}`)
  }
  const threads: ThreadActivity[] = []
  for (const [thread, calls] of Object.entries(snap.buffers)) {
    if (calls.length === 0) continue
    threads.push({ thread, calls, messages: await recentAssistantText($, thread) })
  }
  if (threads.length === 0) return 'sin actividad que juzgar'
  const prompt = buildJudgePrompt({
    planLabel: snap.planPath ?? CORRECTION_TEXT.es.planSession,
    planText,
    context,
    taskState: snap.source === 'openspec' ? 'Las casillas marcadas con [x] están hechas; las [ ] pendientes.' : null,
    threads,
  })
  let verdicts: ThreadVerdict[] | null = null
  let reason = 'respuesta no válida'
  for (let attempt = 0; attempt < 2 && !verdicts; attempt++) {
    const r = await $.model.complete({
      model: JUDGE_MODEL,
      effort: 'high',
      system: [{ text: criterion, cache: true }],
      prompt,
      maxTokens: 4000,
      timeoutMs: JUDGE_TIMEOUT_MS,
    })
    spent.calls += 1
    spent.input += r.usage?.input_tokens ?? 0
    spent.output += r.usage?.output_tokens ?? 0
    spent.cacheRead += r.usage?.cache_read_input_tokens ?? 0
    spent.cacheCreation += r.usage?.cache_creation_input_tokens ?? 0
    if (r.isAnswered) {
      verdicts = parseVerdicts(r.text)
      if (!verdicts) reason = 'JSON no válido'
    } else reason = r.reason
  }
  if (!verdicts) {
    const text = `juicio fallido: ${reason}`
    await addLog($, failedEntry(now, 'auto', text, logUsage(spent)))
    return text
  }
  const known = new Set(threads.map(t => t.thread))
  const counted: string[] = []
  // Un juicio, un gasto: el `usage` se registra en la primera entrada para no duplicarlo.
  let usage = logUsage(spent)
  for (const v of verdicts) {
    if (!known.has(v.thread)) continue
    await applyVerdict($, v, 'auto', { planLabel: snap.planPath, planFallback: snap.source === 'plan-mode' ? 'planSession' : 'planManual' }, usage)
    usage = undefined
    counted.push(`${v.thread}: ${v.verdict}`)
  }
  return counted.join(' · ') || 'sin veredictos para los hilos juzgados'
}

async function recentAssistantText($: Engine, thread: string): Promise<string[]> {
  try {
    const rows = thread === 'main' ? await $.session.messages() : await $.session.messages({ agentId: thread })
    if (!Array.isArray(rows)) return []
    return rows
      .filter(m => m.role === 'assistant' && m.text)
      .slice(-6)
      .map(m => trunc(m.text, 400))
  } catch {
    return []
  }
}

// ---------------------------------------------------------------- reconducción (D5, D6, D7)

/** `planLabel`: ruta del plan; sin ella, el literal fijo (sesión o `/var`) en el idioma del veredicto. */
type ApplyContext = { planLabel: string | null; planFallback?: 'planSession' | 'planManual' }

export type Applied = { thread: string; verdict: string; outcome: string; via: string | null; persistent: boolean }

async function isAlive($: Engine, agentId: string): Promise<boolean> {
  try {
    const list = await $.agent.list()
    return list.some(a => a.id === agentId && ['pending', 'running', 'waiting', 'idle'].includes(a.status))
  } catch {
    return false
  }
}

async function appendUser($: Engine, text: string, agentId: string | undefined): Promise<boolean> {
  try {
    const r = await $.session.append({ ...(agentId ? { agentId } : {}), message: { type: 'user', content: [{ type: 'text', text }] } })
    return r.deny === undefined
  } catch {
    return false
  }
}

/** Vías en orden: `append` al bucle; reserva por `context`; subagente terminado → hilo principal. */
async function inject($: Engine, thread: string, text: string, lang: VarLang): Promise<string> {
  const agentId = thread === 'main' ? undefined : thread
  if (agentId && !(await isAlive($, agentId))) {
    const forwarded = `${CORRECTION_TEXT[lang].forwarded(threadLabel(thread, lang))}\n${text}`
    if (await appendUser($, forwarded, undefined)) return 'hilo-principal'
    await editWatch($, w => {
      w.pending.main = forwarded
    })
    return 'hilo-principal (reserva)'
  }
  if (await appendUser($, text, agentId)) return 'append'
  await editWatch($, w => {
    w.pending[thread] = text
  })
  return 'context'
}

async function notifyDesvio($: Engine, text: string): Promise<void> {
  try {
    $.ui.toast(`Vár: ${text}`)
  } catch {
    // el toast es un extra
  }
  let sent = false
  try {
    const r = await $.ui.notify(text, { title: 'Vár' })
    sent = r.isSent
  } catch {
    sent = false
  }
  if (sent) return
  for (const argv of [
    ['notify-send', 'Vár', text],
    ['osascript', '-e', 'on run argv\ndisplay notification (item 1 of argv) with title "Vár"\nend run', text],
  ]) {
    try {
      const r = await $.process.run(argv, { timeoutMs: 5000 })
      if (r.exitCode === 0) return
    } catch {
      // siguiente reserva
    }
  }
}

/** Una sola vía de reconducción para el juicio automático (`auto`) y `/var` (`manual`). */
export async function applyVerdict($: Engine, v: ThreadVerdict, origin: LogOrigin, ctx: ApplyContext, usage?: LogUsage): Promise<Applied> {
  const now = await $.clock.now()
  const cur = (await readWatch($)).windowId
  const dec = { value: 'none' as 'inject' | 'persistent' | 'same-window' | 'none' }
  await editThreads($, t => {
    const s = t[v.thread] ?? { corrections: 0, persistent: false, lastCorrectionWindow: -1 }
    if (v.verdict === 'alineado') {
      s.corrections = 0
      s.persistent = false
    } else if (v.verdict === 'desvío') {
      if (s.persistent || s.corrections >= MAX_CORRECTIONS) {
        s.persistent = true
        dec.value = 'persistent'
      } else if (s.lastCorrectionWindow === cur) {
        dec.value = 'same-window'
      } else {
        s.corrections += 1
        // `/var` reinicia la ventana al terminar su informe: su corrección cuenta en la siguiente.
        s.lastCorrectionWindow = origin === 'manual' ? cur + 1 : cur
        dec.value = 'inject'
      }
    }
    t[v.thread] = s
  })

  const decision = dec.value
  let via: string | null = null
  let correction: string | null = null
  let note: string | null = null
  if (decision === 'inject') {
    const lang = v.lang ?? 'es'
    correction = buildCorrection(v, ctx.planLabel ?? CORRECTION_TEXT[lang][ctx.planFallback ?? 'planManual'], lang)
    via = await inject($, v.thread, correction, lang)
    try {
      await $.session.append({
        message: {
          type: 'system',
          content: [{ type: 'text', text: `Vár: desvío en ${threadLabel(v.thread)} (${trunc(v.planStep, 80) || 'sin paso'}). Corrección enviada por ${via}.` }],
        },
      })
    } catch {
      // el aviso es visible para el humano; si falla, queda el registro
    }
  } else if (decision === 'persistent') {
    note = 'desvío persistente: no se inyecta más en este hilo'
  } else if (decision === 'same-window') {
    note = 'ya corregido en esta ventana: no se inyecta otra vez'
  }
  const persistent = decision === 'persistent'
  await addLog($, {
    at: now,
    origin,
    thread: v.thread,
    verdict: v.verdict,
    planStep: v.planStep,
    reason: v.reason,
    correction,
    via,
    persistent,
    note,
    ...(usage ? { usage } : {}),
  })
  if (v.verdict === 'desvío') await notifyDesvio($, notifyText(v.thread, v.planStep, persistent))
  const outcome =
    v.verdict !== 'desvío'
      ? v.verdict === 'menor'
        ? 'registrado, sin corrección'
        : 'registrado'
      : decision === 'inject'
        ? `corrección inyectada por ${via}`
        : decision === 'persistent'
          ? 'desvío persistente: no se inyecta más; avisa al humano'
          : 'ya corregido en esta ventana: no se inyecta otra vez'
  return { thread: v.thread, verdict: v.verdict, outcome, via, persistent }
}

// ---------------------------------------------------------------- herramientas de /var (D12)

function compactLog(log: LogEntry[]): unknown[] {
  return log.slice(-20).map(l => ({
    hora: new Date(l.at).toISOString(),
    horaMs: l.at,
    origen: l.origin === 'manual' ? '/var' : 'auto',
    hilo: l.thread,
    veredicto: l.verdict,
    paso: l.planStep,
    motivo: l.reason,
    via: l.via,
    persistente: l.persistent,
    correccion: l.correction,
    nota: l.note,
  }))
}

async function answerStatus($: Engine, e: Ev): Promise<any> {
  const agentId: string | undefined = typeof e.agentId === 'string' ? e.agentId : undefined
  if (agentId) {
    await editWatch($, w => {
      if (!w.varAgentIds.includes(agentId)) w.varAgentIds.push(agentId)
      const mine = w.buffers[agentId]
      if (mine) {
        w.calls = Math.max(0, w.calls - mine.length)
        delete w.buffers[agentId]
      }
    })
  }
  const w = await readWatch($)
  const log = await readLog($)
  const threads = await readThreads($)
  const now = await $.clock.now()
  const body = {
    estado: w.status,
    vigilanciaAutomatica: w.enabled ? 'on' : 'off',
    plan: {
      fuente: w.source,
      ruta: w.path,
      change: w.changeName,
      contexto: w.contextPaths,
      texto: w.path ? null : w.planText && w.planText.slice(0, 6000),
    },
    ventana: {
      llamadas: w.calls,
      maxLlamadas: w.toolCalls,
      minutos: Math.floor((now - w.windowStart) / 60000),
      maxMinutos: w.minutes,
      inicioMs: w.windowStart,
    },
    juzgando: w.judging,
    ultimoJuicio: w.lastJudgment,
    hilosEstado: threads,
    hilos: Object.entries(w.buffers).map(([thread, calls]) => ({
      hilo: thread,
      llamadas: calls.length,
      recientes: calls.slice(-15).map(c => `${c.tool}${c.target ? ' ' + c.target : ''}${c.isError ? ' (error)' : ''}`),
      correcciones: threads[thread]?.corrections ?? 0,
      persistente: threads[thread]?.persistent ?? false,
    })),
    avisos: w.notes,
    registro: compactLog(log),
  }
  return { result: JSON.stringify(body, null, 2) }
}

async function answerReport($: Engine, e: Ev): Promise<any> {
  const agentId: string = typeof e.agentId === 'string' ? e.agentId : 'main'
  const raw = Array.isArray(e.threads) ? e.threads : []
  const verdicts: ThreadVerdict[] = []
  for (const item of raw) {
    const v = cleanVerdict(item)
    if (v) verdicts.push(v)
  }
  if (verdicts.length === 0) {
    return { result: 'var_report: no hay veredictos válidos (hilo, veredicto alineado|menor|desvío, paso, motivo, corrección).' }
  }
  const plan = typeof e.plan === 'string' && e.plan ? trunc(e.plan, 300) : null
  const lang = e.lang === undefined ? undefined : normalizeLang(e.lang)
  const tagged = lang ? verdicts.map(v => ({ ...v, lang })) : verdicts
  return { result: await applyReport($, agentId, tagged, plan) }
}

/** `var_report` y su reserva: aplica los veredictos de `/var` con origen `manual`. */
async function applyReport($: Engine, agentId: string, verdicts: ThreadVerdict[], plan: string | null): Promise<string> {
  const key = `${agentId}|${JSON.stringify(verdicts)}`
  const duplicate = await editWatch($, w => {
    if (w.handledReports.includes(key)) return true
    w.handledReports = pushLimited(w.handledReports, key, 20)
    return false
  })
  if (duplicate) return 'Informe duplicado: ya se aplicó; no se inyecta otra vez.'
  const w = await readWatch($)
  const planLabel = w.path ?? plan
  const lines: string[] = []
  for (const v of verdicts) {
    const a = await applyVerdict($, v, 'manual', { planLabel })
    lines.push(`${threadLabel(a.thread)}: ${a.verdict} → ${a.outcome}`)
  }
  const now = await $.clock.now()
  await editWatch($, x => {
    x.windowId += 1
    if (x.status === 'activo') {
      x.windowStart = now
      x.calls = 0
      x.buffers = {}
    }
    x.lastJudgmentAt = now
    x.lastJudgment = `/var: ${verdicts.map(v => `${v.thread} ${v.verdict}`).join(' · ')}`
  })
  return lines.join('\n')
}

// ---------------------------------------------------------------- fin de sesión

export async function onSessionEnd($: Engine): Promise<void> {
  stopTimer()
  isSetUp = false
  await closeWatch($, 'Terminó la sesión')
}
