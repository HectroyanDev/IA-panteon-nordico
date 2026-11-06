// Funciones puras del módulo de Vár: sin `$`, sin efectos. Se prueban solas.
import type { CallSummary, ThreadVerdict, VarLang, VarVerdict } from '../../types'

export const DEFAULT_MINUTES = 10
export const DEFAULT_TOOL_CALLS = 40
export const BUFFER_LIMIT = 60
export const LOG_LIMIT = 100
export const MAX_CORRECTIONS = 2
export const FIELD_LIMIT = 300

export function trunc(text: unknown, max: number): string {
  const s = typeof text === 'string' ? text : text === undefined || text === null ? '' : String(text)
  const flat = s.replace(/\s+/g, ' ').trim()
  return flat.length > max ? flat.slice(0, max - 1) + '…' : flat
}

// ---------------------------------------------------------------- config

/** `CLAVE=valor`, última aparición, sin ejecutar nada. */
export function parseConfig(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const raw of text.split('\n')) {
    const m = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(raw.trim())
    if (m && m[1] !== undefined) out[m[1]] = (m[2] ?? '').trim().replace(/^(['"])(.*)\1$/, '$2')
  }
  return out
}

export type Settings = {
  enabled: boolean
  minutes: number
  toolCalls: number
  notes: string[]
}

function positiveInt(raw: string | undefined): number | null {
  if (raw === undefined || !/^[0-9]+$/.test(raw.trim())) return null
  const n = Number(raw.trim())
  return Number.isSafeInteger(n) && n > 0 ? n : null
}

/** D11: por defecto `on`, 10 y 40; valores no válidos vuelven al defecto y dejan un aviso. */
export function resolveSettings(cfg: Record<string, string>): Settings {
  const notes: string[] = []
  let enabled = true
  const rawEnabled = cfg.VAR_ENABLED
  if (rawEnabled !== undefined) {
    const v = rawEnabled.trim().toLowerCase()
    if (v === 'on') enabled = true
    else if (v === 'off') enabled = false
    else notes.push(`VAR_ENABLED="${trunc(rawEnabled, 20)}" no es on/off: se usa on`)
  }
  let minutes = DEFAULT_MINUTES
  if (cfg.VAR_MINUTES !== undefined) {
    const n = positiveInt(cfg.VAR_MINUTES)
    if (n === null) notes.push(`VAR_MINUTES="${trunc(cfg.VAR_MINUTES, 20)}" no es un entero positivo: se usan ${DEFAULT_MINUTES} minutos`)
    else minutes = n
  }
  let toolCalls = DEFAULT_TOOL_CALLS
  if (cfg.VAR_TOOL_CALLS !== undefined) {
    const n = positiveInt(cfg.VAR_TOOL_CALLS)
    if (n === null) notes.push(`VAR_TOOL_CALLS="${trunc(cfg.VAR_TOOL_CALLS, 20)}" no es un entero positivo: se usan ${DEFAULT_TOOL_CALLS} llamadas`)
    else toolCalls = n
  }
  return { enabled, minutes, toolCalls, notes }
}

// ---------------------------------------------------------------- skills y planes

function skillKey(name: unknown): string {
  return String(name ?? '').trim().replace(/^\//, '').toLowerCase()
}

const START_SKILLS = ['nordic-pantheon:brokkr', 'brokkr', 'openspec-apply-change', 'opsx:apply']
const END_SKILLS = [
  'nordic-pantheon:heimdall',
  'heimdall',
  'openspec-verify-change',
  'opsx:verify',
  'nordic-pantheon:hela',
  'hela',
  'openspec-archive-change',
  'opsx:archive',
]
const VAR_SKILLS = ['nordic-pantheon:var', 'var']

export function isStartSkill(name: unknown): boolean {
  return START_SKILLS.includes(skillKey(name))
}
export function isEndSkill(name: unknown): boolean {
  return END_SKILLS.includes(skillKey(name))
}
export function isVarSkill(name: unknown): boolean {
  return VAR_SKILLS.includes(skillKey(name))
}

const KEBAB = /^[a-z0-9][a-z0-9]*(-[a-z0-9]+)*$/

/** Nombres de change que aparecen en los argumentos: `openspec/changes/<n>` primero, luego kebab-case. */
export function changeCandidates(args: unknown): string[] {
  const text = typeof args === 'string' ? args : ''
  const out: string[] = []
  const re = /openspec\/changes\/([a-z0-9][a-z0-9-]*)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const name = m[1]
    if (name && name !== 'archive' && !out.includes(name)) out.push(name)
  }
  for (const tok of text.split(/[\s,;:()'"`]+/)) {
    if (tok.length > 2 && KEBAB.test(tok) && tok.includes('-') && !out.includes(tok)) out.push(tok)
  }
  return out
}

/** Cambios activos de `openspec list --json`: los que no están completos. */
export function activeChanges(stdout: string): string[] {
  try {
    const data = JSON.parse(stdout) as { changes?: Array<{ name?: string; status?: string }> }
    return (data.changes ?? [])
      .filter(c => typeof c.name === 'string' && c.status !== 'complete')
      .map(c => c.name as string)
  } catch {
    return []
  }
}

/** Todas las casillas de `tasks.md` marcadas (y hay al menos una). */
export function tasksDone(text: string): boolean {
  const open = /^\s*[-*]\s*\[ \]/m.test(text)
  const done = /^\s*[-*]\s*\[[xX]\]/m.test(text)
  return done && !open
}

/** Una línea por llamada: herramienta + ruta, patrón o comando recortados a 200. */
export function summarizeCall(tool: string, e: Record<string, unknown>): { tool: string; target: string } {
  const pick = ['file_path', 'path', 'notebook_path', 'pattern', 'command', 'url', 'query', 'skill', 'description']
  for (const k of pick) {
    const v = e[k]
    if (typeof v === 'string' && v) return { tool, target: trunc(v, 200) }
  }
  return { tool, target: '' }
}

// ---------------------------------------------------------------- veredictos

const VERDICTS: VarVerdict[] = ['alineado', 'menor', 'desvío']

export function normalizeVerdict(v: unknown): VarVerdict | null {
  const s = String(v ?? '').trim().toLowerCase().replace('desvio', 'desvío')
  return (VERDICTS as string[]).includes(s) ? (s as VarVerdict) : null
}

/** Veredicto de un hilo con los campos recortados; `null` si no es válido. */
export function cleanVerdict(raw: unknown): ThreadVerdict | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  const verdict = normalizeVerdict(r.verdict)
  const thread = typeof r.thread === 'string' ? r.thread.trim() : ''
  if (!verdict || !thread) return null
  return {
    thread,
    verdict,
    planStep: trunc(r.planStep, FIELD_LIMIT),
    reason: trunc(r.reason, FIELD_LIMIT),
    correction: trunc(r.correction, FIELD_LIMIT),
  }
}

/** `es` o `en` (sin distinguir mayúsculas; admite `en-US`, `es_ES`…); cualquier otro valor, `es`. */
export function normalizeLang(x: unknown): VarLang {
  const m = /^([a-z]{2})(?:[-_]|$)/.exec(String(x ?? '').trim().toLowerCase())
  return m?.[1] === 'en' ? 'en' : 'es'
}

/** JSON estricto del juicio: `{ lang?, threads: [...] }`; `null` si no cumple. Con `lang` en la raíz, cada veredicto lo lleva normalizado. */
export function parseVerdicts(text: string): ThreadVerdict[] | null {
  let body = text.trim()
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(body)
  if (fence?.[1] !== undefined) body = fence[1]
  let data: unknown
  try {
    data = JSON.parse(body)
  } catch {
    return null
  }
  const threads = (data as { threads?: unknown })?.threads
  if (!Array.isArray(threads)) return null
  const rawLang = (data as { lang?: unknown }).lang
  const out: ThreadVerdict[] = []
  for (const t of threads) {
    const v = cleanVerdict(t)
    if (!v) return null
    out.push(rawLang === undefined ? v : { ...v, lang: normalizeLang(rawLang) })
  }
  return out
}

/** Textos fijos de la corrección inyectada, uno por idioma del plan. El panel, la notificación y el registro quedan fuera. */
export const CORRECTION_TEXT: Record<
  VarLang,
  {
    header: string
    plan: string
    step: string
    drift: string
    stop: string
    noStep: string
    noStop: string
    closing: string
    forwarded: (thread: string) => string
    main: string
    subagent: string
    planSession: string
    planManual: string
  }
> = {
  es: {
    header: '[Vár · corrección del plan]',
    plan: 'Plan',
    step: 'Paso que toca',
    drift: 'Desvío',
    stop: 'Deja de',
    noStep: 'sin paso identificable',
    noStop: 'lo que no está en ese paso',
    closing: 'Esto solo recuerda el plan aprobado; no añade pasos ni autoriza nada fuera de él.',
    forwarded: thread => `[Vár · ${thread} ya terminado]`,
    main: 'hilo principal',
    subagent: 'subagente',
    planSession: 'plan aprobado en esta sesión',
    planManual: 'plan del encargo de /var',
  },
  en: {
    header: '[Vár · plan correction]',
    plan: 'Plan',
    step: 'Current step',
    drift: 'Drift',
    stop: 'Stop',
    noStep: 'no identifiable step',
    noStop: 'what is not in that step',
    closing: 'This only reminds you of the approved plan; it adds no steps and authorizes nothing outside it.',
    forwarded: thread => `[Vár · ${thread} already finished]`,
    main: 'main thread',
    subagent: 'subagent',
    planSession: 'plan approved in this session',
    planManual: 'plan from the /var brief',
  },
}

/** D6: plantilla fija en el idioma del plan; los campos del veredicto ya van recortados. */
export function buildCorrection(v: ThreadVerdict, planLabel: string, lang: VarLang = 'es'): string {
  const t = CORRECTION_TEXT[lang]
  return [
    t.header,
    `${t.plan}: ${planLabel}. ${t.step}: ${trunc(v.planStep, FIELD_LIMIT) || t.noStep}.`,
    `${t.drift}: ${trunc(v.reason, FIELD_LIMIT)}. ${t.stop}: ${trunc(v.correction, FIELD_LIMIT) || t.noStop}.`,
    t.closing,
  ].join('\n')
}

export function threadLabel(thread: string, lang: VarLang = 'es'): string {
  const t = CORRECTION_TEXT[lang]
  return thread === 'main' ? t.main : `${t.subagent} ${thread}`
}

// ---------------------------------------------------------------- prompt del juicio

export type ThreadActivity = {
  thread: string
  calls: CallSummary[]
  messages: string[]
}

export function buildJudgePrompt(input: {
  planLabel: string
  planText: string
  context: string[]
  taskState: string | null
  threads: ThreadActivity[]
}): string {
  const parts: string[] = []
  parts.push(`# Plan activo\nFuente: ${input.planLabel}\n\n${input.planText.slice(0, 12000)}`)
  if (input.taskState) parts.push(`# Estado de las casillas\n${input.taskState}`)
  for (const c of input.context) parts.push(`# Contexto del change\n${c.slice(0, 3000)}`)
  parts.push('# Actividad de la ventana, por hilo')
  for (const t of input.threads) {
    const lines = t.calls.map(c => `- ${c.tool}${c.target ? ' ' + c.target : ''}${c.isError ? ' (error)' : ''}`)
    const msgs = t.messages.map(m => `> ${m}`)
    parts.push(
      `## Hilo ${t.thread}\nLlamadas (${t.calls.length}, las últimas):\n${lines.join('\n') || '(ninguna)'}\n\nÚltimos mensajes del asistente:\n${msgs.join('\n') || '(ninguno)'}`,
    )
  }
  parts.push('Devuelve solo el JSON del veredicto por hilo, con los `thread` exactos de arriba.')
  return parts.join('\n\n')
}

// ---------------------------------------------------------------- notificación y estado

export function notifyText(thread: string, planStep: string, persistent: boolean): string {
  const base = `${threadLabel(thread)}: desvío del paso «${trunc(planStep, 80) || 'sin paso identificable'}»`
  return persistent ? `${base} (persistente: ya no se corrige)` : base
}

export function summaryLine(w: {
  status: string
  calls: number
  toolCalls: number
  minutes: number
  windowStart: number
}, now: number): string {
  if (w.status === 'sin-plan') return 'Vár: sin plan'
  if (w.status === 'cerrado') return 'Vár: vigilancia cerrada'
  if (w.status === 'desactivado') return 'Vár: vigilancia automática desactivada'
  if (w.status === 'ambiguo') return 'Vár: change ambiguo, sin vigilar'
  const min = Math.max(0, Math.floor((now - w.windowStart) / 60000))
  return `Vár: ${w.calls}/${w.toolCalls} llamadas · ${min}/${w.minutes} min`
}

export function pushLimited<T>(list: T[], item: T, limit: number): T[] {
  const next = [...list, item]
  return next.length > limit ? next.slice(next.length - limit) : next
}
