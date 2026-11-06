// Informe de tokens por especialista, hilo y modelo a partir de los transcripts
// de Claude Code. Solo lectura. Uso:
//   bun scripts/token-report.ts [--project <ruta>] [--session <id>]... [--since <YYYY-MM-DD>]
// Sesión de cada línea: su campo sessionId (los chats laterales son otro .jsonl
// con el sessionId del padre). Transcripts: <projects>/<proyecto>/<archivo>.jsonl y
// <projects>/<proyecto>/<sessionId>/subagents/agent-<id>.jsonl, con
// <projects> = $CLAUDE_PROJECTS_DIR o ~/.claude/projects.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

type Counts = { calls: number; input: number; output: number; cacheRead: number; cacheCreation: number }
type Group = Counts & { skill: string; thread: 'principal' | 'subagente'; model: string }
type Session = {
  id: string
  start: string
  costUsd: number | undefined
  costModels: Record<string, any> | undefined
  incomplete: number
  groups: Map<string, Group>
}

const NO_SKILL = '(sin skill)'

function fail(msg: string): never {
  console.error(`token-report: ${msg}`)
  process.exit(64)
}

function parseArgs(argv: string[]) {
  const out = { project: process.cwd(), sessions: [] as string[], since: undefined as string | undefined }
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    const value = argv[i + 1]
    if (flag !== '--project' && flag !== '--session' && flag !== '--since') fail(`flag no reconocido: ${flag}`)
    if (value === undefined || value === '') fail(`${flag} necesita un valor`)
    i++
    if (flag === '--project') out.project = value
    else if (flag === '--session') out.sessions.push(value)
    else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) out.since = value
    else fail('--since necesita una fecha YYYY-MM-DD')
  }
  return out
}

function readLines(file: string): Record<string, any>[] {
  const rows: Record<string, any>[] = []
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue
    try {
      rows.push(JSON.parse(line))
    } catch {
      // línea truncada o ajena: se ignora
    }
  }
  return rows
}

// Lee todos los transcripts del proyecto de una vez. La sesión de cada línea es
// su campo `sessionId` (si falta, el id del archivo o de la carpeta padre de
// subagentes): un "chat lateral" vive en otro .jsonl pero lleva el sessionId de
// la sesión padre y repite sus requestId. La dedup es global por requestId
// (fallback message.id): una llamada, con el usage de mayor output_tokens (en
// empate, la última línea), atribuida a la sesión de la línea elegida.
function readAll(dir: string): Map<string, Session> {
  const files: { path: string; id: string; sidechain: boolean }[] = []
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
  for (const e of entries) {
    if (e.isFile() && e.name.endsWith('.jsonl')) files.push({ path: join(dir, e.name), id: e.name.slice(0, -'.jsonl'.length), sidechain: false })
  }
  for (const e of entries) {
    const subDir = join(dir, e.name, 'subagents')
    if (!e.isDirectory() || !existsSync(subDir)) continue
    for (const f of readdirSync(subDir).sort()) {
      if (f.endsWith('.jsonl')) files.push({ path: join(subDir, f), id: e.name, sidechain: true })
    }
  }
  const sessions = new Map<string, Session>()
  const sessionOf = (id: string): Session => {
    let s = sessions.get(id)
    if (!s) {
      s = { id, start: '', costUsd: undefined, costModels: undefined, incomplete: 0, groups: new Map() }
      sessions.set(id, s)
    }
    return s
  }
  type Call = { row: Record<string, any>; sidechain: boolean; session: string }
  const calls: Call[] = []
  const byKey = new Map<string, number>()
  for (const file of files) {
    for (const row of readLines(file.path)) {
      const sid = typeof row.sessionId === 'string' && row.sessionId !== '' ? row.sessionId : file.id
      const session = sessionOf(sid)
      if (typeof row.timestamp === 'string' && (session.start === '' || row.timestamp < session.start)) {
        session.start = row.timestamp
      }
      if (!file.sidechain && row.type === 'cost-state' && typeof row.totalCostUSD === 'number') {
        session.costUsd = row.totalCostUSD
        session.costModels = row.modelUsage && typeof row.modelUsage === 'object' ? row.modelUsage : undefined
      }
      if (row.type !== 'assistant' || !row.message?.usage) continue
      const key = row.requestId ?? row.message.id
      if (typeof key === 'string') {
        const at = byKey.get(key)
        if (at !== undefined) {
          const prev = calls[at]!
          if ((row.message.usage.output_tokens ?? 0) >= (prev.row.message.usage.output_tokens ?? 0)) {
            calls[at] = { row, sidechain: file.sidechain, session: sid }
          }
          continue
        }
        byKey.set(key, calls.length)
      }
      calls.push({ row, sidechain: file.sidechain, session: sid })
    }
  }
  for (const { row, sidechain, session: sid } of calls) {
    const session = sessionOf(sid)
    const u = row.message.usage
    if (row.message.stop_reason === null) session.incomplete++
    const skill = typeof row.attributionSkill === 'string' ? row.attributionSkill : NO_SKILL
    const thread = sidechain || row.isSidechain === true ? 'subagente' : 'principal'
    const model = typeof row.message.model === 'string' ? row.message.model : '(desconocido)'
    const gKey = `${skill}\u0000${thread}\u0000${model}`
    const g = session.groups.get(gKey) ?? { skill, thread, model, calls: 0, input: 0, output: 0, cacheRead: 0, cacheCreation: 0 }
    g.calls++
    g.input += u.input_tokens ?? 0
    g.output += u.output_tokens ?? 0
    g.cacheRead += u.cache_read_input_tokens ?? 0
    g.cacheCreation += u.cache_creation_input_tokens ?? 0
    session.groups.set(gKey, g)
  }
  return sessions
}

const total = (c: Counts) => c.input + c.output + c.cacheRead + c.cacheCreation

function table(header: string[], rows: string[][]): string {
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)))
  const fmt = (r: string[]) =>
    r.map((c, i) => (i < 3 ? c.padEnd(widths[i] ?? 0) : c.padStart(widths[i] ?? 0))).join('  ').trimEnd()
  return [fmt(header), fmt(widths.map((w) => '-'.repeat(w))), ...rows.map(fmt)].join('\n')
}

function render(s: Session): string {
  const groups = [...s.groups.values()].sort((a, b) => total(b) - total(a) || a.skill.localeCompare(b.skill))
  const sum: Counts = { calls: 0, input: 0, output: 0, cacheRead: 0, cacheCreation: 0 }
  const rows = groups.map((g) => {
    for (const k of Object.keys(sum) as (keyof Counts)[]) sum[k] += g[k]
    return [g.skill, g.thread, g.model, g.calls, g.input, g.output, g.cacheRead, g.cacheCreation, total(g)].map(String)
  })
  rows.push(['TOTAL', '', '', sum.calls, sum.input, sum.output, sum.cacheRead, sum.cacheCreation, total(sum)].map(String))
  const cost = s.costUsd === undefined ? 'sin cost-state' : `${s.costUsd.toFixed(2)} USD`
  const title = `Sesión ${s.id} (${s.start.slice(0, 10) || 'sin fecha'}) · total real: ${cost}`
  const head = ['especialista', 'hilo', 'modelo', 'llamadas', 'input', 'output', 'cache read', 'cache creation', 'total']
  const notes: string[] = []
  if (s.incomplete > 0) {
    notes.push(`aviso: ${s.incomplete} respuestas sin usage final; el output puede estar por debajo del real`)
  }
  if (s.costModels) {
    const mine = new Map<string, number>()
    for (const g of groups) mine.set(g.model, (mine.get(g.model) ?? 0) + g.output)
    const models = [...new Set([...mine.keys(), ...Object.keys(s.costModels)])].sort()
    for (const m of models) {
      const x = mine.get(m) ?? 0
      const y = s.costModels[m]?.outputTokens
      if (typeof y === 'number' && y !== x) notes.push(`output vs cost-state: ${x} / ${y} (${m})`)
    }
  }
  return [title, table(head, rows), ...notes].join('\n')
}

const args = parseArgs(process.argv.slice(2))
const root = process.env.CLAUDE_PROJECTS_DIR ?? join(homedir(), '.claude', 'projects')
const dir = join(root, args.project.replace(/[^a-zA-Z0-9]/g, '-'))
if (!existsSync(dir)) fail(`no hay transcripts en ${dir}`)

const all = readAll(dir)
const wanted = args.sessions.length > 0 ? args.sessions : [...all.keys()].sort()
const sessions: Session[] = []
for (const id of wanted) {
  const s = all.get(id)
  if (!s) {
    console.error(`token-report: sesión no encontrada: ${id}`)
    continue
  }
  if (s.groups.size === 0) continue
  if (args.since !== undefined && s.start.slice(0, 10) < args.since) continue
  sessions.push(s)
}
sessions.sort((a, b) => a.start.localeCompare(b.start))

if (sessions.length === 0) {
  console.log('Sin sesiones con llamadas que coincidan.')
  process.exit(0)
}
console.log(sessions.map(render).join('\n\n'))
