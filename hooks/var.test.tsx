import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

// Nada corre debajo de los hooks del módulo: cada llamada a `$` se contesta aquí.
// Las pruebas usan el reloj simulado y un `model.complete` simulado.

const PLAN = '/home/h/.claude/plans/plan.md'
const TASKS = '/work/openspec/changes/add-foo/tasks.md'
const MIN = 60_000

type Opts = {
  config?: string
  files?: Record<string, string>
  verdicts?: () => unknown
  notifySent?: boolean
  alive?: string[]
  denyAppendFor?: string[]
  openspecList?: string
  /** Respuesta del modelo para cada petición de juicio. */
  model?: (e: any, w: any) => unknown
  placed?: boolean
}

async function world($: any, on: On, opts: Opts = {}) {
  const clock = mock.clock(on, { now: 1_000_000 })
  mock.env(on, { HOME: '/home/h' })
  const files: Record<string, string> = {
    '/home/h/.config/nordic-pantheon/config': opts.config ?? '',
    '/plugin/skills/var/references/judge.md': 'CRITERIO',
    [PLAN]: '# Plan\n1. Añadir locale a config.ts\n2. Leerlo en format-date.ts',
    '/work/openspec/changes/add-foo/tasks.md': '- [ ] 1.1 uno\n- [ ] 1.2 dos\n',
    '/work/openspec/changes/add-foo/design.md': 'diseño',
    ...(opts.files ?? {}),
  }
  const w = {
    clock,
    files,
    models: [] as unknown[],
    notified: [] as string[],
    ran: [] as string[][],
    opened: [] as string[],
    toolResult: {} as Record<string, unknown>,
    statuses: [] as unknown[],
    rows: [] as any[],
  }
  on('fs.read', (_: any, e: any) => {
    const hit = files[e.path] ?? (String(e.path).endsWith('judge.md') ? 'CRITERIO' : undefined)
    return hit !== undefined ? { value: hit } : { deny: 'ENOENT' }
  })
  on('session.cwd', () => ({ value: '/work' }))
  on('agent.list', () => ({ value: (opts.alive ?? []).map(id => ({ id, status: 'running', type: 'general-purpose', description: '' })) }))
  on('session.messages', () => ({ value: [{ role: 'assistant', text: 'Edito el módulo auth', toolUses: [] }] }))
  on('model.complete', (_: any, e: any) => {
    w.models.push(e)
    if (opts.model) return opts.model(e, w) as any
    const text = opts.verdicts ? JSON.stringify(opts.verdicts()) : JSON.stringify({ threads: [{ thread: 'main', verdict: 'alineado', planStep: 'paso 1', reason: 'ok', correction: '' }] })
    return { value: { isAnswered: true, text, usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } } }
  })
  on('ui.notify', (_: any, e: any) => {
    w.notified.push(e.text)
    return { value: opts.notifySent === false ? { isSent: false, reason: 'no-surface' } : { isSent: true, channel: 'kitty' } }
  })
  on('ui.toast', () => ({ value: undefined }))
  on('ui.status', (_: any, e: any) => {
    w.statuses.push(e.text)
    return { value: undefined }
  })
  on('ui.open', (_: any, e: any) => {
    w.opened.push(e.id)
    return { value: opts.placed === false ? { isPlaced: false, reason: 'narrow' } : { isPlaced: true } } as any
  })
  on('tool.register', () => ({ value: { tool: 'x' } }))
  on('command.register', () => ({ value: { command: 'var-panel' } }))
  on('process.run', (_: any, e: any) => {
    w.ran.push(e.argv)
    if (e.argv[0] === 'openspec') return { value: { exitCode: 0, stdout: opts.openspecList ?? '{"changes":[]}', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
    return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('session.start', (_: any, e: any) => ({ cwd: e.cwd }))
  on('session.end', (_: any, e: any) => ({ sessionId: e.sessionId }) as any)
  on('tool.call', (_: any, e: any) => ({ result: w.toolResult[e.tool] ?? {} }))
  on('session.append', (_: any, e: any, next: any) => {
    if (e.agentId && opts.denyAppendFor?.includes(e.agentId)) return { deny: 'no running loop' } as any
    w.rows.push(e)
    return next(e)
  })
  await $.session.start({ cwd: '/work', surface: 'desktop', isInteractive: true })
  return w
}

async function approvePlan($: any, w: any, filePath = PLAN) {
  w.toolResult.ExitPlanMode = { plan: 'x', isAgent: false, filePath }
  await $.tool.call({ tool: 'ExitPlanMode' })
}

async function calls($: any, n: number, extra: Record<string, unknown> = {}) {
  for (let i = 0; i < n; i++) await $.tool.call({ tool: 'Read', file_path: `/work/f${i}.ts`, ...extra })
}

// El estado se lee por var_status: la `$` de las pruebas no expone `$.state`.
const view = async ($: any) => JSON.parse(String((await $.tool.call({ tool: 'mcp__nordic-pantheon__var_status' })).result))
const watch = async ($: any) => {
  const v = await view($)
  return {
    status: v.estado,
    source: v.plan.fuente,
    path: v.plan.ruta,
    changeName: v.plan.change,
    contextPaths: v.plan.contexto,
    calls: v.ventana.llamadas,
    windowStart: v.ventana.inicioMs,
    minutes: v.ventana.maxMinutos,
    toolCalls: v.ventana.maxLlamadas,
    notes: v.avisos,
    judging: v.juzgando,
    enabled: v.vigilanciaAutomatica === 'on',
  }
}
const log = async ($: any) =>
  (await view($)).registro.map((l: any) => ({
    origin: l.origen === '/var' ? 'manual' : 'auto',
    thread: l.hilo,
    verdict: l.veredicto,
    via: l.via,
    correction: l.correccion,
    persistent: l.persistente,
    note: l.nota,
  }))
const threads = async ($: any) => (await view($)).hilosEstado

const desvio = (thread = 'main') => ({ threads: [{ thread, verdict: 'desvío', planStep: 'Paso 1: locale', reason: 'refactoriza auth', correction: 'vuelve a config.ts' }] })

// ---------------------------------------------------------------- plan activo

test('sin plan activo no hay ningún juicio', async ($, on) => {
  const w = await world($, on)
  await calls($, 200)
  await w.clock.advance(30 * MIN)
  expect(w.models).toHaveLength(0)
  expect((await watch($))?.status ?? 'sin-plan').toBe('sin-plan')
})

test('plan aprobado con ExitPlanMode: se activa, contadores a cero y panel abierto', async ($, on) => {
  const w = await world($, on)
  await approvePlan($, w)
  const s = await watch($)
  expect(s.status).toBe('activo')
  expect(s.path).toBe(PLAN)
  expect(s.source).toBe('plan-mode')
  expect(s.calls).toBe(0)
  expect(w.opened).toContain('var')
})

test('plan rechazado: no hay plan activo y no se cuenta nada', async ($, on) => {
  const w = await world($, on)
  w.toolResult.ExitPlanMode = { isError: true }
  await $.tool.call({ tool: 'ExitPlanMode' })
  await calls($, 5)
  expect((await watch($))?.status ?? 'sin-plan').toBe('sin-plan')
  expect(w.opened).toHaveLength(0)
})

test('un plan aprobado después sustituye al anterior', async ($, on) => {
  const w = await world($, on, { files: { '/home/h/.claude/plans/b.md': '# B' } })
  await approvePlan($, w)
  await calls($, 3)
  await approvePlan($, w, '/home/h/.claude/plans/b.md')
  const s = await watch($)
  expect(s.path).toBe('/home/h/.claude/plans/b.md')
  expect(s.calls).toBe(0)
})

test('OpenSpec: Brokkr con el change en los argumentos activa tasks.md con su contexto', async ($, on) => {
  const w = await world($, on)
  await $.tool.call({ tool: 'Skill', skill: 'nordic-pantheon:brokkr', args: 'Implementa openspec/changes/add-foo' })
  const s = await watch($)
  expect(s.source).toBe('openspec')
  expect(s.path).toBe(TASKS)
  expect(s.contextPaths).toContain('/work/openspec/changes/add-foo/design.md')
  expect(w.opened).toContain('var')
})

test('OpenSpec: sin nombre y un único change activo, ese', async ($, on) => {
  await world($, on, { openspecList: '{"changes":[{"name":"add-foo","status":"in-progress"}]}' })
  await $.tool.call({ tool: 'Skill', skill: 'opsx:apply' })
  expect((await watch($)).path).toBe(TASKS)
})

test('OpenSpec: change ambiguo, no se activa y el panel lo anota', async ($, on) => {
  await world($, on, { openspecList: '{"changes":[{"name":"a-a","status":"in-progress"},{"name":"b-b","status":"in-progress"}]}' })
  await $.tool.call({ tool: 'Skill', skill: 'nordic-pantheon:brokkr', args: '' })
  const s = await watch($)
  expect(s.status).toBe('ambiguo')
  expect(s.notes.join(' ')).toMatch(/ambiguo/)
})

test('con un plan de plan mode, cargar Brokkr no cambia la fuente', async ($, on) => {
  const w = await world($, on)
  await approvePlan($, w)
  await $.tool.call({ tool: 'Skill', skill: 'nordic-pantheon:brokkr', args: 'openspec/changes/add-foo' })
  expect((await watch($)).source).toBe('plan-mode')
})

test('fin: llega Heimdall y la vigilancia se cierra', async ($, on) => {
  const w = await world($, on)
  await approvePlan($, w)
  await $.tool.call({ tool: 'Skill', skill: 'nordic-pantheon:heimdall' })
  await calls($, 60)
  const s = await watch($)
  expect(s.status).toBe('cerrado')
  expect(w.models).toHaveLength(0)
})

// Reproduce el falso positivo: Heimdall cierra el plan de plan mode y la ronda de
// corrección de Brokkr cae en `openspec list`, que da el único change activo.
test('plan mode: Brokkr tras Heimdall sigue vigilando el plan, no el único change activo', async ($, on) => {
  const w = await world($, on, { openspecList: '{"changes":[{"name":"add-foo","status":"in-progress"}]}' })
  await approvePlan($, w)
  const args = `Camino plan mode (sin OpenSpec, sin tasks.md, sin /opsx:apply). Plan aprobado: ${PLAN}`
  await $.tool.call({ tool: 'Skill', skill: 'nordic-pantheon:brokkr', args })
  await $.tool.call({ tool: 'Skill', skill: 'nordic-pantheon:heimdall', args })
  await $.tool.call({ tool: 'Skill', skill: 'nordic-pantheon:brokkr', args: `Ronda de corrección tras Heimdall. ${args}` })
  const s = await watch($)
  expect(s.source).toBe('plan-mode')
  expect(s.path).toBe(PLAN)
  expect(s.status).toBe('activo')
})

test('plan mode cerrado: Brokkr con un change nombrado pasa a OpenSpec', async ($, on) => {
  const w = await world($, on)
  await approvePlan($, w)
  await $.tool.call({ tool: 'Skill', skill: 'nordic-pantheon:heimdall' })
  await $.tool.call({ tool: 'Skill', skill: 'nordic-pantheon:brokkr', args: 'Implementa openspec/changes/add-foo' })
  const s = await watch($)
  expect(s.source).toBe('openspec')
  expect(s.path).toBe(TASKS)
})

test('fin: /opsx:verify, archive, otro plan y fin de sesión', async ($, on) => {
  const w = await world($, on)
  await $.tool.call({ tool: 'Skill', skill: 'nordic-pantheon:brokkr', args: 'openspec/changes/add-foo' })
  await $.tool.call({ tool: 'Skill', skill: 'openspec-archive-change' })
  expect((await watch($)).status).toBe('cerrado')
  await approvePlan($, w)
  expect((await watch($)).status).toBe('activo')
  await $.session.end({ reason: 'other', sessionId: 's', resume: {} } as any)
  expect((await watch($)).status).toBe('cerrado')
})

test('fin: todas las casillas de tasks.md marcadas tras un Edit', async ($, on) => {
  const w = await world($, on)
  await $.tool.call({ tool: 'Skill', skill: 'nordic-pantheon:brokkr', args: 'openspec/changes/add-foo' })
  w.files[TASKS] = '- [x] 1.1 uno\n- [x] 1.2 dos\n'
  await $.tool.call({ tool: 'Edit', file_path: TASKS, old_string: '[ ]', new_string: '[x]' })
  expect((await watch($)).status).toBe('cerrado')
})

// ---------------------------------------------------------------- activación y umbrales

test('VAR_ENABLED=off: ni juicios ni panel automático, pero el plan queda para /var', async ($, on) => {
  const w = await world($, on, { config: 'VAR_ENABLED=off\n' })
  await approvePlan($, w)
  await calls($, 100)
  await w.clock.advance(30 * MIN)
  expect(w.models).toHaveLength(0)
  expect(w.opened).toHaveLength(0)
  const s = await watch($)
  expect(s.status).toBe('desactivado')
  expect(s.path).toBe(PLAN)
  const status = await $.tool.call({ tool: 'mcp__nordic-pantheon__var_status' })
  expect(String(status.result)).toContain('desactivado')
})

test('VAR_ENABLED no válido: se toma on', async ($, on) => {
  const w = await world($, on, { config: 'VAR_ENABLED=quizá\n' })
  await approvePlan($, w)
  const s = await watch($)
  expect(s.status).toBe('activo')
  expect(s.enabled).toBe(true)
  expect(s.notes.join(' ')).toMatch(/VAR_ENABLED/)
})

test('umbrales por defecto: tarea corta (25 llamadas, 6 minutos) sin juicio', async ($, on) => {
  const w = await world($, on)
  await approvePlan($, w)
  await calls($, 25)
  await w.clock.advance(6 * MIN)
  await w.clock.settle()
  expect(w.models).toHaveLength(0)
})

test('gana el contador de llamadas: 40 llamadas en 4 minutos, ventana nueva', async ($, on) => {
  const w = await world($, on)
  await approvePlan($, w)
  await w.clock.advance(4 * MIN)
  await calls($, 40)
  await w.clock.settle()
  expect(w.models).toHaveLength(1)
  const s = await watch($)
  expect(s.calls).toBe(0)
  expect(s.windowStart).toBe(w.clock.now())
})

test('gana el tiempo: 12 llamadas y 10 minutos', async ($, on) => {
  const w = await world($, on)
  await approvePlan($, w)
  await calls($, 12)
  await w.clock.advance(10 * MIN + 30_000)
  await w.clock.settle()
  expect(w.models).toHaveLength(1)
})

test('ventana sin llamadas: se reinicia sin juzgar', async ($, on) => {
  const w = await world($, on)
  await approvePlan($, w)
  await w.clock.advance(11 * MIN)
  await w.clock.settle()
  expect(w.models).toHaveLength(0)
  expect((await watch($)).windowStart).toBeGreaterThan(1_000_000 + 10 * MIN - 1)
})

test('umbral cambiado: VAR_TOOL_CALLS=20 dispara a las 20 llamadas', async ($, on) => {
  const w = await world($, on, { config: 'VAR_TOOL_CALLS=20\nVAR_MINUTES=30\n' })
  await approvePlan($, w)
  await calls($, 19)
  await w.clock.settle()
  expect(w.models).toHaveLength(0)
  await calls($, 1)
  await w.clock.settle()
  expect(w.models).toHaveLength(1)
})

test('umbral no válido: VAR_MINUTES=diez usa 10 y lo anota', async ($, on) => {
  const w = await world($, on, { config: 'VAR_MINUTES=diez\nVAR_TOOL_CALLS=0\n' })
  await approvePlan($, w)
  const s = await watch($)
  expect(s.minutes).toBe(10)
  expect(s.toolCalls).toBe(40)
  expect(s.notes.join(' ')).toMatch(/VAR_MINUTES/)
})

test('un solo juicio a la vez: las llamadas durante el juicio cuentan en la ventana nueva', async ($, on) => {
  const w = await world($, on, {
    model: async (_e: any, w: any) => {
      await w.clock.sleep(5000)
      return { value: { isAnswered: true, text: JSON.stringify({ threads: [] }), usage: {} } }
    },
  })
  await approvePlan($, w)
  const first = calls($, 40)
  await first
  await w.clock.settle()
  expect((await watch($)).judging).toBe(true)
  // el tool.call que sigue no espera al juicio
  await calls($, 45)
  expect(w.models).toHaveLength(1)
  expect((await watch($)).calls).toBeGreaterThanOrEqual(40)
  await w.clock.advance(6000)
  await w.clock.settle()
  expect((await watch($)).judging).toBe(false)
})

// ---------------------------------------------------------------- juicio

test('el juicio usa opus/high, judge.md como system y no lleva resultados de herramientas', async ($, on) => {
  const w = await world($, on)
  await approvePlan($, w)
  await calls($, 40)
  await w.clock.settle()
  const req: any = w.models[0]
  expect(req.model).toBe('opus')
  expect(req.effort).toBe('high')
  expect(JSON.stringify(req.system)).toContain('CRITERIO')
  expect(String(req.prompt)).toContain('Read /work/f0.ts')
})

test('JSON no válido dos veces: juicio fallido y no se inyecta nada', async ($, on) => {
  const w = await world($, on, { model: () => ({ value: { isAnswered: true, text: 'no es json', usage: {} } }) })
  await approvePlan($, w)
  await calls($, 40)
  await w.clock.settle()
  expect(w.models).toHaveLength(2)
  expect((await log($)).at(-1).verdict).toBe('fallido')
  expect(w.rows.filter((r: any) => r.message.type === 'user')).toHaveLength(0)
})

test('timeout del modelo: juicio fallido sin inyectar', async ($, on) => {
  const w = await world($, on, { model: () => ({ value: { isAnswered: false, reason: 'aborted', usage: {} } }) })
  await approvePlan($, w)
  await calls($, 40)
  await w.clock.settle()
  expect((await log($)).at(-1).verdict).toBe('fallido')
})

// ---------------------------------------------------------------- tokens del juez

const usageOf = (input: number, output: number, cacheRead: number, cacheCreation: number) => ({
  input_tokens: input,
  output_tokens: output,
  cache_read_input_tokens: cacheRead,
  cache_creation_input_tokens: cacheCreation,
})

test('un juicio automático guarda el usage sumando los intentos y el panel lo muestra con el acumulado', async ($, on) => {
  let n = 0
  const w = await world($, on, {
    model: () => {
      n += 1
      const text = n === 1 ? 'no es json' : JSON.stringify({ threads: [{ thread: 'main', verdict: 'alineado', planStep: 'paso 1', reason: 'ok', correction: '' }] })
      return { value: { isAnswered: true, text, usage: usageOf(100, 10, 1000, 50) } }
    },
  })
  await approvePlan($, w)
  await calls($, 40)
  await w.clock.settle()
  expect(w.models).toHaveLength(2)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /tokens: in 200 · out 20 · cache 2,000\/100/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Juez de Vár: 1 juicios · 2,320 tokens/ })).toBeDefined()
  await ui.unmount()
})

test('una entrada fallida guarda el usage gastado', async ($, on) => {
  const w = await world($, on, { model: () => ({ value: { isAnswered: true, text: 'no es json', usage: usageOf(5, 1, 20, 2) } }) })
  await approvePlan($, w)
  await calls($, 40)
  await w.clock.settle()
  expect((await log($)).at(-1).verdict).toBe('fallido')
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /tokens: in 10 · out 2 · cache 40\/4/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Juez de Vár: 1 juicios · 56 tokens/ })).toBeDefined()
  await ui.unmount()
})

test('var_report manual no lleva usage ni cuenta en el acumulado', async ($, on) => {
  const w = await world($, on, { alive: ['sub1'] })
  await approvePlan($, w)
  await report($, desvio('sub1').threads, { agentId: 'v' })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /\[\/var\] subagente sub1: desvío/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /tokens: in/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /Juez de Vár/ })).toBeUndefined()
  await ui.unmount()
})

// ---------------------------------------------------------------- reconducción

test('desvío en un subagente: append a su bucle, aviso, registro y notificación; el principal no se interrumpe', async ($, on) => {
  const w = await world($, on, { alive: ['sub1'], verdicts: () => desvio('sub1') })
  await approvePlan($, w)
  await calls($, 40, { agentId: 'sub1' })
  await w.clock.settle()
  const rows = w.rows as any[]
  const user = rows.filter(r => r.message.type === 'user')
  expect(user).toHaveLength(1)
  expect(user[0].agentId).toBe('sub1')
  expect(JSON.stringify(user[0].message.content)).toContain('[Vár · corrección del plan]')
  expect(JSON.stringify(user[0].message.content)).toContain('no añade pasos ni autoriza nada')
  expect(rows.some(r => r.message.type === 'system')).toBe(true)
  const entry = (await log($)).at(-1)
  expect(entry.origin).toBe('auto')
  expect(entry.via).toBe('append')
  expect(entry.correction).toContain('Paso que toca')
  expect(w.notified).toHaveLength(1)
})

test('desvío en el hilo principal: append sin agentId', async ($, on) => {
  const w = await world($, on, { verdicts: () => desvio('main') })
  await approvePlan($, w)
  await calls($, 40)
  await w.clock.settle()
  const user = (w.rows as any[]).filter(r => r.message.type === 'user')
  expect(user).toHaveLength(1)
  expect(user[0].agentId).toBeUndefined()
})

test('menor y alineado solo se registran: nada se inyecta ni se notifica', async ($, on) => {
  const w = await world($, on, {
    verdicts: () => ({ threads: [{ thread: 'main', verdict: 'menor', planStep: 'p', reason: 'r', correction: '' }] }),
  })
  await approvePlan($, w)
  await calls($, 40)
  await w.clock.settle()
  expect((w.rows as any[]).filter(r => r.message.type === 'user')).toHaveLength(0)
  expect(w.notified).toHaveLength(0)
  expect((await log($)).at(-1).verdict).toBe('menor')
})

test('append rechazado: reserva por context en el siguiente tool.call del hilo', async ($, on) => {
  const w = await world($, on, { alive: ['sub1'], denyAppendFor: ['sub1'], verdicts: () => desvio('sub1') })
  await approvePlan($, w)
  await calls($, 40, { agentId: 'sub1' })
  await w.clock.settle()
  expect((await log($)).at(-1).via).toBe('context')
  const next = await $.tool.call({ tool: 'Read', file_path: '/work/x.ts', agentId: 'sub1' })
  expect(JSON.stringify(next.context)).toContain('[Vár · corrección del plan]')
  const after = await $.tool.call({ tool: 'Read', file_path: '/work/y.ts', agentId: 'sub1' })
  expect(after.context).toBeUndefined()
})

test('subagente ya terminado: la corrección va al hilo principal nombrándolo', async ($, on) => {
  const w = await world($, on, { alive: [], verdicts: () => desvio('sub9') })
  await approvePlan($, w)
  await calls($, 40, { agentId: 'sub9' })
  await w.clock.settle()
  const user = (w.rows as any[]).filter(r => r.message.type === 'user')
  expect(user).toHaveLength(1)
  expect(user[0].agentId).toBeUndefined()
  expect(JSON.stringify(user[0].message.content)).toContain('sub9')
  expect((await log($)).at(-1).via).toBe('hilo-principal')
})

test('desvío persistente: tercera vez no se inyecta, se marca y se notifica', async ($, on) => {
  const w = await world($, on, { alive: ['sub1'], verdicts: () => desvio('sub1') })
  await approvePlan($, w)
  for (let round = 0; round < 3; round++) {
    await w.clock.advance(MIN)
    await calls($, 40, { agentId: 'sub1' })
    await w.clock.settle()
  }
  const user = (w.rows as any[]).filter(r => r.message.type === 'user')
  expect(user).toHaveLength(2)
  expect((await threads($)).sub1.persistent).toBe(true)
  const last = (await log($)).at(-1)
  expect(last.persistent).toBe(true)
  expect(last.correction).toBeNull()
  expect(w.notified).toHaveLength(3)
  expect(w.notified[2]).toMatch(/persistente/)
})

test('un alineado pone el contador de correcciones a cero', async ($, on) => {
  let next: unknown = desvio('main')
  const w = await world($, on, { verdicts: () => next })
  await approvePlan($, w)
  for (const v of [desvio('main'), desvio('main'), { threads: [{ thread: 'main', verdict: 'alineado', planStep: 'p', reason: 'ok', correction: '' }] }, desvio('main')]) {
    next = v
    await w.clock.advance(MIN)
    await calls($, 40)
    await w.clock.settle()
  }
  expect((w.rows as any[]).filter(r => r.message.type === 'user')).toHaveLength(3)
  expect((await threads($)).main.persistent).toBe(false)
})

// ---------------------------------------------------------------- idioma de la corrección

const desvioLang = (thread: string, lang: unknown) => ({ lang, ...desvio(thread) })

function expectEnglish(text: string) {
  expect(text).toContain('[Vár · plan correction]')
  expect(text).toContain('Current step')
  expect(text).toContain('Drift')
  expect(text).toContain('Stop')
  expect(text).toContain('adds no steps')
  expect(text).not.toContain('Paso que toca')
  expect(text).not.toContain('corrección del plan')
  expect(text).not.toContain('no añade pasos')
}

test('lang en: la corrección por append sale entera en inglés', async ($, on) => {
  const w = await world($, on, { alive: ['sub1'], verdicts: () => desvioLang('sub1', 'en') })
  await approvePlan($, w)
  await calls($, 40, { agentId: 'sub1' })
  await w.clock.settle()
  const user = (w.rows as any[]).filter(r => r.message.type === 'user')
  expect(user).toHaveLength(1)
  expectEnglish(JSON.stringify(user[0].message.content))
  const entry = (await log($)).at(-1)
  expect(entry.via).toBe('append')
  expectEnglish(entry.correction)
})

test('lang en-US en mayúsculas se acepta como inglés', async ($, on) => {
  const w = await world($, on, { alive: ['sub1'], verdicts: () => desvioLang('sub1', 'EN-us') })
  await approvePlan($, w)
  await calls($, 40, { agentId: 'sub1' })
  await w.clock.settle()
  expectEnglish((await log($)).at(-1).correction)
})

test('lang en: la reserva por context también sale en inglés', async ($, on) => {
  const w = await world($, on, { alive: ['sub1'], denyAppendFor: ['sub1'], verdicts: () => desvioLang('sub1', 'en') })
  await approvePlan($, w)
  await calls($, 40, { agentId: 'sub1' })
  await w.clock.settle()
  expect((await log($)).at(-1).via).toBe('context')
  const next = await $.tool.call({ tool: 'Read', file_path: '/work/x.ts', agentId: 'sub1' })
  expectEnglish(JSON.stringify(next.context))
})

test('lang no válido: la corrección sale en español', async ($, on) => {
  const w = await world($, on, { alive: ['sub1'], verdicts: () => desvioLang('sub1', 'fr') })
  await approvePlan($, w)
  await calls($, 40, { agentId: 'sub1' })
  await w.clock.settle()
  const text = String((await log($)).at(-1).correction)
  expect(text).toContain('[Vár · corrección del plan]')
  expect(text).toContain('Paso que toca')
  expect(text).not.toContain('Current step')
})

test('lang en: subagente terminado, el prefijo de reenvío y el nombre del hilo salen en inglés', async ($, on) => {
  const w = await world($, on, { alive: [], verdicts: () => desvioLang('sub9', 'en') })
  await approvePlan($, w)
  await calls($, 40, { agentId: 'sub9' })
  await w.clock.settle()
  const user = (w.rows as any[]).filter(r => r.message.type === 'user')
  expect(user).toHaveLength(1)
  const text = JSON.stringify(user[0].message.content)
  expect(text).toContain('[Vár · subagent sub9 already finished]')
  expect(text).not.toContain('ya terminado')
  expectEnglish(text)
  expect((await log($)).at(-1).via).toBe('hilo-principal')
})

test('plan sin ruta: la corrección dice plan aprobado en esta sesión (es)', async ($, on) => {
  const w = await world($, on, { alive: ['sub1'], verdicts: () => desvio('sub1') })
  w.toolResult.ExitPlanMode = { plan: '# Plan\n1. Paso uno', isAgent: false }
  await $.tool.call({ tool: 'ExitPlanMode' })
  await calls($, 40, { agentId: 'sub1' })
  await w.clock.settle()
  const text = String((await log($)).at(-1).correction)
  expect(text).toContain('Plan: plan aprobado en esta sesión.')
  expect(text).not.toContain('encargo de /var')
})

test('lang en: plan sin ruta, la etiqueta sale en inglés y sin texto español', async ($, on) => {
  const w = await world($, on, { alive: ['sub1'], verdicts: () => desvioLang('sub1', 'en') })
  w.toolResult.ExitPlanMode = { plan: '# Plan\n1. Step one', isAgent: false }
  await $.tool.call({ tool: 'ExitPlanMode' })
  await calls($, 40, { agentId: 'sub1' })
  await w.clock.settle()
  const text = String((await log($)).at(-1).correction)
  expectEnglish(text)
  expect(text).toContain('Plan: plan approved in this session.')
  expect(text).not.toContain('plan aprobado')
  expect(text).not.toContain('/var brief')
})

test('lang en: planStep vacío, el texto de reserva sale en inglés', async ($, on) => {
  const verdicts = () => ({ lang: 'en', threads: [{ thread: 'sub1', verdict: 'desvío', planStep: '', reason: 'refactors auth', correction: 'back to config.ts' }] })
  const w = await world($, on, { alive: ['sub1'], verdicts })
  await approvePlan($, w)
  await calls($, 40, { agentId: 'sub1' })
  await w.clock.settle()
  const text = String((await log($)).at(-1).correction)
  expectEnglish(text)
  expect(text).toContain('Current step: no identifiable step.')
  expect(text).not.toContain('sin paso identificable')
})

test('lang en: la reserva de /var por extractFinalVerdicts sale en inglés con planManual en inglés', async ($, on) => {
  const w = await world($, on, { alive: ['sub1'] })
  w.toolResult.Skill = {
    success: true,
    commandName: 'nordic-pantheon:var',
    status: 'forked',
    agentId: 'varagent',
    result: 'Report\n```json\n' + JSON.stringify(desvioLang('sub1', 'en')) + '\n```',
  }
  await $.tool.call({ tool: 'Skill', skill: 'nordic-pantheon:var' })
  const entry = (await log($)).at(-1)
  expect(entry.origin).toBe('manual')
  expectEnglish(entry.correction)
  expect(entry.correction).toContain('Plan: plan from the /var brief.')
  expect(entry.correction).not.toContain('encargo de /var')
})

// ---------------------------------------------------------------- var_report (/var)

const report = ($: any, threads: unknown[], extra: Record<string, unknown> = {}) =>
  $.tool.call({ tool: 'mcp__nordic-pantheon__var_report', threads, ...extra })

test('var_report con desvío: inyecta, registra con origen manual, notifica y reinicia la ventana', async ($, on) => {
  const w = await world($, on, { alive: ['sub1'] })
  await approvePlan($, w)
  await calls($, 10, { agentId: 'sub1' })
  const r = await report($, desvio('sub1').threads, { agentId: 'varagent' })
  expect(String(r.result)).toContain('corrección inyectada por append')
  const user = (w.rows as any[]).filter(x => x.message.type === 'user')
  expect(user).toHaveLength(1)
  expect(user[0].agentId).toBe('sub1')
  const entry = (await log($)).at(-1)
  expect(entry.origin).toBe('manual')
  expect(w.notified).toHaveLength(1)
  const s = await watch($)
  expect(s.calls).toBe(0)
  expect(s.windowStart).toBe(w.clock.now())
})

test('var_report con lang en: la corrección sale en inglés', async ($, on) => {
  const w = await world($, on, { alive: ['sub1'] })
  await approvePlan($, w)
  await calls($, 10, { agentId: 'sub1' })
  await report($, desvio('sub1').threads, { agentId: 'varagent', lang: 'en' })
  const user = (w.rows as any[]).filter(x => x.message.type === 'user')
  expect(user).toHaveLength(1)
  expectEnglish(JSON.stringify(user[0].message.content))
})

test('var_report con lang no válido: español', async ($, on) => {
  const w = await world($, on, { alive: ['sub1'] })
  await approvePlan($, w)
  await calls($, 10, { agentId: 'sub1' })
  await report($, desvio('sub1').threads, { agentId: 'varagent', lang: 'klingon' })
  const text = String((await log($)).at(-1).correction)
  expect(text).toContain('Paso que toca')
})

test('var_report con VAR_ENABLED=off también corrige', async ($, on) => {
  const w = await world($, on, { config: 'VAR_ENABLED=off', alive: ['sub1'] })
  await approvePlan($, w)
  await report($, desvio('sub1').threads, { agentId: 'varagent' })
  expect((w.rows as any[]).filter(x => x.message.type === 'user')).toHaveLength(1)
  expect(w.notified).toHaveLength(1)
  expect(w.opened).toHaveLength(0)
})

test('un segundo informe igual no inyecta otra vez', async ($, on) => {
  const w = await world($, on, { alive: ['sub1'] })
  await approvePlan($, w)
  await report($, desvio('sub1').threads, { agentId: 'varagent' })
  const again = await report($, desvio('sub1').threads, { agentId: 'varagent' })
  expect(String(again.result)).toMatch(/duplicado/i)
  expect((w.rows as any[]).filter(x => x.message.type === 'user')).toHaveLength(1)
})

test('var_report tras dos correcciones automáticas: persistente', async ($, on) => {
  const w = await world($, on, { alive: ['sub1'], verdicts: () => desvio('sub1') })
  await approvePlan($, w)
  for (let i = 0; i < 2; i++) {
    await w.clock.advance(MIN)
    await calls($, 40, { agentId: 'sub1' })
    await w.clock.settle()
  }
  await w.clock.advance(MIN)
  const r = await report($, desvio('sub1').threads, { agentId: 'varagent' })
  expect(String(r.result)).toMatch(/persistente/)
  expect((w.rows as any[]).filter(x => x.message.type === 'user')).toHaveLength(2)
  expect((await threads($)).sub1.persistent).toBe(true)
})

test('juicio automático y var_report sobre el mismo hilo y ventana: una sola corrección', async ($, on) => {
  const w = await world($, on, { alive: ['sub1'], verdicts: () => desvio('sub1') })
  await approvePlan($, w)
  await calls($, 40, { agentId: 'sub1' })
  await w.clock.settle()
  const r = await report($, desvio('sub1').threads, { agentId: 'varagent' })
  expect(String(r.result)).toMatch(/ya corregido/)
  expect((w.rows as any[]).filter(x => x.message.type === 'user')).toHaveLength(1)
  expect((await log($)).at(-1).origin).toBe('manual')
})

test('las llamadas de /var no cuentan: var_status marca su agentId', async ($, on) => {
  const w = await world($, on)
  await approvePlan($, w)
  await calls($, 5, { agentId: 'varagent' })
  expect((await watch($)).calls).toBe(5)
  await $.tool.call({ tool: 'mcp__nordic-pantheon__var_status', agentId: 'varagent' })
  expect((await watch($)).calls).toBe(0)
  await calls($, 30, { agentId: 'varagent' })
  expect((await watch($)).calls).toBe(0)
})

test('var_status devuelve plan, estado, ventana, búferes y registro', async ($, on) => {
  const w = await world($, on, { alive: ['sub1'] })
  await approvePlan($, w)
  await calls($, 3, { agentId: 'sub1' })
  await report($, desvio('sub1').threads, { agentId: 'varagent' })
  await calls($, 2, { agentId: 'sub1' })
  const status = JSON.parse(String((await $.tool.call({ tool: 'mcp__nordic-pantheon__var_status', agentId: 'x' })).result))
  expect(status.estado).toBe('activo')
  expect(status.plan.ruta).toBe(PLAN)
  expect(status.ventana.llamadas).toBe(2)
  expect(status.hilos[0].hilo).toBe('sub1')
  expect(status.registro).toHaveLength(1)
})

test('reserva: si var_report no llega, se lee el JSON final del resultado de Skill', async ($, on) => {
  const w = await world($, on, { alive: ['sub1'] })
  await approvePlan($, w)
  const json = JSON.stringify(desvio('sub1'))
  w.toolResult.Skill = { success: true, commandName: 'nordic-pantheon:var', status: 'forked', agentId: 'varagent', result: 'Informe\n```json\n' + json + '\n```' }
  await $.tool.call({ tool: 'Skill', skill: 'nordic-pantheon:var' })
  expect((await log($)).at(-1).origin).toBe('manual')
  expect((w.rows as any[]).filter(x => x.message.type === 'user')).toHaveLength(1)
})

// ---------------------------------------------------------------- notificación

test('notify con no-surface: reserva notify-send; alineado no notifica', async ($, on) => {
  const w = await world($, on, { notifySent: false, alive: ['sub1'] })
  await approvePlan($, w)
  await report($, [{ thread: 'main', verdict: 'alineado', planStep: 'p', reason: 'r', correction: '' }], { agentId: 'v' })
  expect(w.ran.filter(a => a[0] === 'notify-send')).toHaveLength(0)
  await report($, desvio('sub1').threads, { agentId: 'v' })
  expect(w.ran.filter(a => a[0] === 'notify-send')).toHaveLength(1)
})

// ---------------------------------------------------------------- panel

const PANE = {
  plugin: 'nordic-pantheon',
  component: 'Pane',
  requestId: 'var',
  props: { title: 'Vár', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} },
} as const

test('el panel muestra plan, contadores, desvío y corrección, en terminal y escritorio', async ($, on) => {
  const w = await world($, on, { alive: ['sub1'] })
  await approvePlan($, w)
  await report($, desvio('sub1').threads, { agentId: 'v' })
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Text', text: /Plan: \/home\/h\/\.claude\/plans\/plan\.md/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /\/var\] subagente sub1: desvío/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Corrección \(append\)/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Umbrales: 10 min · 40 llamadas/ })).toBeDefined()
    await ui.unmount()
  }
})

test('el panel con off lo dice y muestra el registro de /var', async ($, on) => {
  const w = await world($, on, { config: 'VAR_ENABLED=off', alive: ['sub1'] })
  await approvePlan($, w)
  await report($, desvio('sub1').threads, { agentId: 'v' })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /desactivada/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /\[\/var\]/ })).toBeDefined()
  await ui.unmount()
})

test('/var-panel abre el panel a mano, también con off; sin superficie, queda la línea de estado', async ($, on) => {
  const w = await world($, on, { config: 'VAR_ENABLED=off' })
  await approvePlan($, w)
  const out = await $.command.run({ command: 'var-panel', args: '', origin: { kind: 'composer' } as any, presentation: {} as any })
  expect(out.text).toMatch(/abierto/)
  expect(w.opened).toContain('var')
})

test('con un panel no colocado se usa $.ui.status', async ($, on) => {
  const w = await world($, on, { placed: false })
  await approvePlan($, w)
  await calls($, 2)
  expect(String(w.statuses.at(-1))).toMatch(/2\/40 llamadas/)
})
