// Funciones puras del protocolo de traspaso (change add-bifrost-protocol): las
// tareas de `tasks.md` (`T-n`, casilla, título, requisitos que cubre) y los
// títulos de requisitos de un delta. Sin `$` ni `fs`: las usan el módulo de Vár
// y `scripts/protocol.ts` (bun importa TypeScript directamente).

/** Versión de esquema de `drift.json`. */
export const SCHEMA_VERSION = 1

// ---------------------------------------------------------------- tasks.md

export type Task = {
  id: string
  checked: boolean
  title: string
  /** `<capability>/REQ-NNN` citados en `Cubre`; vacío con `—` o sin `Cubre`. */
  covers: string[]
}

const TASK_LINE = /^\s*[-*]\s*\[([ xX])\]\s+(?:[0-9]+\.[0-9]+\s+)?(T-[0-9]+)\b\s*(.*)$/

/** Tareas de un `tasks.md`, en orden. Formato: `- [ ] N.M T-n <título>. Verificación: <cómo>. Cubre: <capability>/REQ-NNN, …`. */
export function parseTasks(text: string): Task[] {
  const out: Task[] = []
  for (const line of text.split('\n')) {
    const m = TASK_LINE.exec(line)
    if (!m || m[1] === undefined || m[2] === undefined) continue
    const rest = m[3] ?? ''
    const cubre = /\bCubre:\s*(.*)$/.exec(rest)
    const covers = (cubre?.[1] ?? '')
      .split(',')
      .map(x => x.trim())
      .filter(x => x !== '' && x !== '—')
    const title = rest.replace(/\.?\s*Verificación:.*$/, '').replace(/\.?\s*Cubre:.*$/, '').trim()
    out.push({ id: m[2], checked: m[1] !== ' ', title, covers })
  }
  return out
}

/** Lista de tareas para el juez: id, casilla y título. */
export function describeTasks(tasks: Task[]): string {
  return tasks.map(t => `- ${t.id} [${t.checked ? 'x' : ' '}] ${t.title.replace(/\s+/g, ' ').slice(0, 160)}`).join('\n')
}

// ---------------------------------------------------------------- requisitos de un delta

export type Delta = {
  added: string[]
  modified: string[]
  removed: string[]
  renamed: { from: string; to: string }[]
}

const SECTION = /^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements\s*$/
const REQ_HEADING = /^###\s+Requirement:\s*(.+?)\s*$/
const RENAME_FROM = /^\s*-\s*FROM:\s*`?###\s+Requirement:\s*(.+?)`?\s*$/
const RENAME_TO = /^\s*-\s*TO:\s*`?###\s+Requirement:\s*(.+?)`?\s*$/

/** Títulos de requisito de un delta, por sección. */
export function parseDelta(text: string): Delta {
  const out: Delta = { added: [], modified: [], removed: [], renamed: [] }
  type Section = 'ADDED' | 'MODIFIED' | 'REMOVED' | 'RENAMED'
  let section: Section | null = null
  let from: string | null = null
  for (const line of text.split('\n')) {
    const s = SECTION.exec(line)
    if (s) {
      section = s[1] as Section
      from = null
      continue
    }
    if (/^##\s/.test(line)) {
      section = null
      continue
    }
    if (section === 'RENAMED') {
      const f = RENAME_FROM.exec(line)
      if (f?.[1] !== undefined) from = f[1]
      const t = RENAME_TO.exec(line)
      if (t?.[1] !== undefined && from !== null) {
        out.renamed.push({ from, to: t[1] })
        from = null
      }
      continue
    }
    const h = REQ_HEADING.exec(line)
    if (h?.[1] === undefined) continue
    if (section === 'ADDED') out.added.push(h[1])
    else if (section === 'MODIFIED') out.modified.push(h[1])
    else if (section === 'REMOVED') out.removed.push(h[1])
  }
  return out
}

/** Títulos `### Requirement:` de una spec principal. */
export function parseSpecTitles(text: string): string[] {
  const out: string[] = []
  for (const line of text.split('\n')) {
    const h = REQ_HEADING.exec(line)
    if (h?.[1] !== undefined) out.push(h[1])
  }
  return out
}

/** `REQ-NNN nombre` → `{ id, name }`; sin ID, `id` es `null`. */
export function splitReqTitle(title: string): { id: string | null; name: string } {
  const m = /^(REQ-[0-9]{3,})(?:\s+(.*))?$/.exec(title.trim())
  if (m?.[1] === undefined) return { id: null, name: title.trim() }
  return { id: m[1], name: (m[2] ?? '').trim() }
}

export type ChangeReq = { ref: string; name: string; /** ADDED o MODIFIED: debe cubrirlo alguna tarea (un RENAMED solo se puede citar). */ required: boolean }

/**
 * Requisitos de un change: ADDED, MODIFIED y el nombre nuevo de RENAMED (REMOVED no cuenta).
 * `resolve` da el ID de un título sin ID (un MODIFIED que aún usa el título antiguo).
 * Los títulos sin ID que no se pueden resolver van en `unresolved`.
 */
export function changeRequirements(
  deltas: Record<string, Delta>,
  resolve: (capability: string, title: string) => string | null = () => null,
): { reqs: ChangeReq[]; unresolved: string[] } {
  const reqs: ChangeReq[] = []
  const unresolved: string[] = []
  const add = (capability: string, title: string, required: boolean) => {
    const { id, name } = splitReqTitle(title)
    const useId = id ?? resolve(capability, title)
    if (useId) reqs.push({ ref: `${capability}/${useId}`, name, required })
    else unresolved.push(`${capability}: ${title}`)
  }
  for (const capability of Object.keys(deltas).sort()) {
    const d = deltas[capability]
    if (!d) continue
    for (const t of d.added) add(capability, t, true)
    for (const t of d.modified) add(capability, t, true)
    for (const r of d.renamed) add(capability, r.to, false)
  }
  return { reqs, unresolved }
}

/** Mayor `REQ-NNN` que aparece en una lista de títulos (0 si ninguno). */
export function maxReqNumber(titles: string[]): number {
  let max = 0
  for (const t of titles) {
    const m = /REQ-([0-9]{3,})/.exec(t)
    if (m?.[1] !== undefined) max = Math.max(max, Number(m[1]))
  }
  return max
}

export function formatReqId(n: number): string {
  return `REQ-${String(n).padStart(3, '0')}`
}
