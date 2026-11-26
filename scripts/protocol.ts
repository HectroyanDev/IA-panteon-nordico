#!/usr/bin/env bun
// Contratos de traspaso del panteón (change add-bifrost-protocol, D2).
//
//   bun scripts/protocol.ts ids [--next <capability>] comprueba los IDs REQ-NNN, o da el siguiente libre
//   bun scripts/protocol.ts check <change>            comprueba los T-n y los requisitos que cubre tasks.md
//
// Opción común: `--root <dir>` (carpeta que contiene `openspec/`; por defecto, el directorio actual).
// Sale con 0 si todo está bien, 1 si hay fallos y 2 si el uso es incorrecto.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { changeRequirements, formatReqId, maxReqNumber, parseDelta, parseSpecTitles, parseTasks, splitReqTitle } from '../hooks/var/plan'
import type { ChangeReq, Delta } from '../hooks/var/plan'

type Deltas = Record<string, Delta>

function fail(code: number, message: string): never {
  process.stderr.write(message.endsWith('\n') ? message : message + '\n')
  process.exit(code)
}

function readText(path: string): string | null {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return null
  }
}

function dirs(path: string): string[] {
  try {
    return readdirSync(path)
      .filter(n => statSync(join(path, n)).isDirectory())
      .sort()
  } catch {
    return []
  }
}

// ---------------------------------------------------------------- carga de openspec/

type Repo = {
  root: string
  /** `openspec/specs/<capability>/spec.md`: títulos en orden. */
  specs: Record<string, string[]>
  /** Deltas de los changes abiertos. */
  open: Record<string, Deltas>
  /** Deltas de los changes archivados. */
  archived: Record<string, Deltas>
}

function readDeltas(changeDir: string): Deltas {
  const out: Deltas = {}
  for (const cap of dirs(join(changeDir, 'specs'))) {
    const text = readText(join(changeDir, 'specs', cap, 'spec.md'))
    if (text !== null) out[cap] = parseDelta(text)
  }
  return out
}

function loadRepo(root: string): Repo {
  const base = join(root, 'openspec')
  const specs: Repo['specs'] = {}
  for (const cap of dirs(join(base, 'specs'))) {
    const text = readText(join(base, 'specs', cap, 'spec.md'))
    if (text !== null) specs[cap] = parseSpecTitles(text)
  }
  const open: Repo['open'] = {}
  const archived: Repo['archived'] = {}
  for (const name of dirs(join(base, 'changes'))) {
    if (name === 'archive') continue
    open[name] = readDeltas(join(base, 'changes', name))
  }
  for (const name of dirs(join(base, 'changes', 'archive'))) archived[name] = readDeltas(join(base, 'changes', 'archive', name))
  return { root, specs, open, archived }
}

/** Títulos de cada capability tras aplicar los RENAMED de los changes abiertos. */
function projectSpecs(repo: Repo, errors: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const [cap, titles] of Object.entries(repo.specs)) out[cap] = [...titles]
  for (const [change, deltas] of Object.entries(repo.open)) {
    for (const [cap, d] of Object.entries(deltas)) {
      for (const r of d.renamed) {
        const a = splitReqTitle(r.from).id
        const b = splitReqTitle(r.to).id
        if (a !== null && b !== null && a !== b) errors.push(`${cap}: ${change} renombra "${r.from}" a "${r.to}" y cambia el número (${a} → ${b})`)
        const list = out[cap]
        const i = list ? list.indexOf(r.from) : -1
        if (!list || i < 0) errors.push(`${cap}: ${change} renombra "${r.from}", que no está en openspec/specs/${cap}/spec.md`)
        else list[i] = r.to
      }
    }
  }
  return out
}

// ---------------------------------------------------------------- ids

function checkIds(repo: Repo): string[] {
  const errors: string[] = []
  const proj = projectSpecs(repo, errors)
  const owners: Record<string, Map<string, string>> = {}
  const claim = (cap: string, id: string, owner: string) => {
    const m = (owners[cap] ??= new Map())
    const prev = m.get(id)
    if (prev !== undefined) errors.push(`${cap}: ${id} repetido (${prev} y ${owner})`)
    else m.set(id, owner)
  }
  for (const [cap, titles] of Object.entries(proj)) {
    for (const t of titles) {
      const { id } = splitReqTitle(t)
      if (id === null) errors.push(`${cap}: "${t}" no empieza por REQ-NNN`)
      else claim(cap, id, 'openspec/specs')
    }
  }
  for (const [change, deltas] of Object.entries(repo.open)) {
    for (const [cap, d] of Object.entries(deltas)) {
      for (const t of d.added) {
        const { id } = splitReqTitle(t)
        if (id === null) errors.push(`${cap}: "${t}" (ADDED de ${change}) no empieza por REQ-NNN`)
        else claim(cap, id, `ADDED de ${change}`)
      }
    }
  }
  return errors
}

function nextId(repo: Repo, capability: string): string {
  const titles: string[] = [...(repo.specs[capability] ?? [])]
  const gather = (all: Record<string, Deltas>) => {
    for (const deltas of Object.values(all)) {
      const d = deltas[capability]
      if (!d) continue
      titles.push(...d.added, ...d.modified, ...d.removed)
      for (const r of d.renamed) titles.push(r.from, r.to)
    }
  }
  gather(repo.open)
  gather(repo.archived)
  return formatReqId(maxReqNumber(titles) + 1)
}

// ---------------------------------------------------------------- requisitos de un change

function changeDir(repo: Repo, change: string): string {
  const dir = join(repo.root, 'openspec', 'changes', change)
  if (!existsSync(dir)) fail(2, `protocol: no existe el change ${change} en openspec/changes/`)
  return dir
}

/** Un MODIFIED con el título antiguo se resuelve por los RENAMED de los changes abiertos. */
function resolver(repo: Repo): (capability: string, title: string) => string | null {
  return (capability, title) => {
    for (const deltas of Object.values(repo.open)) {
      for (const r of deltas[capability]?.renamed ?? []) {
        if (r.from === title) return splitReqTitle(r.to).id
      }
    }
    return null
  }
}

function requirementsOf(repo: Repo, change: string): { reqs: ChangeReq[]; unresolved: string[] } {
  const deltas = repo.open[change] ?? {}
  return changeRequirements(deltas, resolver(repo))
}

// ---------------------------------------------------------------- check

function check(repo: Repo, change: string): string[] {
  const dir = changeDir(repo, change)
  const errors: string[] = []
  const { reqs, unresolved } = requirementsOf(repo, change)
  for (const u of unresolved) errors.push(`requisito sin ID resoluble: ${u}`)
  const text = readText(join(dir, 'tasks.md'))
  if (text === null) return [...errors, 'tasks.md no existe']
  const tasks = parseTasks(text)
  if (tasks.length === 0) errors.push('tasks.md no tiene ninguna tarea con T-n')
  const seen = new Set<string>()
  for (const t of tasks) {
    if (seen.has(t.id)) errors.push(`${t.id} repetida en tasks.md`)
    seen.add(t.id)
  }
  const known = new Set(reqs.map(r => r.ref))
  const covered = new Set<string>()
  for (const t of tasks) {
    for (const ref of t.covers) {
      if (!known.has(ref)) errors.push(`${t.id} cubre ${ref}, que no es un requisito del change`)
      covered.add(ref)
    }
  }
  for (const q of reqs) if (q.required && !covered.has(q.ref)) errors.push(`requisito sin tarea: ${q.ref} ${q.name}`)
  return errors
}

// ---------------------------------------------------------------- main

function main(argv: string[]): void {
  let root = process.cwd()
  const args: string[] = []
  let next: string | null = null
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] ?? ''
    if (a === '--root') root = resolve(argv[++i] ?? fail(2, 'protocol: --root necesita una carpeta'))
    else if (a === '--next') next = argv[++i] ?? fail(2, 'protocol: --next necesita una capability')
    else args.push(a)
  }
  const [cmd, change] = args
  const usage = 'uso: bun scripts/protocol.ts check <change> | ids [--next <capability>] [--root <dir>]'
  if (!existsSync(join(root, 'openspec'))) fail(2, `protocol: no hay openspec/ en ${root}`)
  const repo = loadRepo(root)
  switch (cmd) {
    case 'ids': {
      if (next !== null) {
        console.log(nextId(repo, next))
        return
      }
      const errors = checkIds(repo)
      for (const e of errors) console.log(`FALLO ${e}`)
      if (errors.length > 0) process.exit(1)
      console.log('ids: todos los requisitos tienen un REQ-NNN único en su capability')
      break
    }
    case 'check': {
      if (!change) fail(2, usage)
      const errors = check(repo, change)
      for (const e of errors) console.log(`FALLO ${e}`)
      if (errors.length > 0) process.exit(1)
      console.log(`check ${change}: sin fallos`)
      break
    }
    default:
      fail(2, usage)
  }
}

main(process.argv.slice(2))
