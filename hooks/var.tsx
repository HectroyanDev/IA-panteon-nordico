// Vár: vigila en segundo plano que el trabajo no se desvíe del plan aprobado.
// La skill (skills/var) decide el juicio de `/var`; este módulo actúa: cuenta,
// juzga con umbrales, reconduce, registra, muestra el panel y notifica.
import type { Register } from 'claude-code'
import {
  PANE_ID,
  VAR_REPORT_TOOL,
  VAR_STATUS_TOOL,
  closeWatch,
  ensureSetup,
  handleToolCall,
  onApplyStarted,
  onSessionEnd,
  openPanel,
  readJudgeUsage,
  readLog,
  readThreads,
  readWatch,
} from './var/watch'
import { isEndSkill, isStartSkill, threadLabel, trunc } from './var/pure'

function tokens(n: number): string {
  return n.toLocaleString('en-US')
}

function hhmm(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await ensureSetup($)
    return next(e)
  })

  on('session.end', async ($, e, next) => {
    await onSessionEnd($)
    return next(e)
  })

  // Un hook sobre toda llamada: cuenta, detecta el plan y sirve var_status/var_report.
  on('tool.call', async ($, e, next) => handleToolCall($, e as Record<string, any>, next as (e: any) => Promise<any>)).catch(($, e, next) => next(e))

  // Respaldo: `/opsx:apply` y `/opsx:verify` escritos por el humano pasan por skill.prompt.
  on('skill.prompt', async ($, e, next) => {
    if (isEndSkill(e.skill)) await closeWatch($, `Empezó la validación (${e.skill})`)
    else if (isStartSkill(e.skill)) await onApplyStarted($, e.text, true)
    return next(e)
  })

  on('command.run', { command: 'var-panel' }, async $ => {
    const placed = await openPanel($)
    return { text: placed ? 'Panel de Vár abierto.' : 'Esta superficie no coloca paneles: el resumen está en la línea de estado.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE_ID }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const w = await readWatch($)
    const log = await readLog($)
    const threads = await readThreads($)
    const judgeUsage = await readJudgeUsage($)
    const now = await $.clock.now()
    const entries = [...log].reverse()
    const persistent = Object.entries(threads).filter(([, t]) => t.persistent)

    return (
      <Box flexDirection="column">
        <Text bold>Vár · vigilancia del plan</Text>
        {!w.enabled && w.status !== 'sin-plan' && <Text color="yellow">Vigilancia automática desactivada (VAR_ENABLED=off): solo /var.</Text>}
        {w.status === 'sin-plan' && <Text dimColor>Sin plan activo. Se activa al aprobar un plan o al implementar un change.</Text>}
        {w.status === 'ambiguo' && <Text color="yellow">Change ambiguo: vigilancia no activada.</Text>}
        {w.status === 'cerrado' && <Text dimColor>Vigilancia cerrada.</Text>}
        {w.path && <Text>Plan: {w.path}</Text>}
        {!w.path && w.planText && <Text>Plan: texto del plan aprobado</Text>}
        {w.source && <Text dimColor>Fuente: {w.source === 'plan-mode' ? 'plan mode' : `OpenSpec (${w.changeName ?? '?'})`}</Text>}
        {w.status === 'activo' && (
          <Text>
            Ventana: {w.calls}/{w.toolCalls} llamadas · {Math.max(0, Math.floor((now - w.windowStart) / 60000))}/{w.minutes} min
          </Text>
        )}
        {w.status !== 'sin-plan' && (
          <Text dimColor>
            Umbrales: {w.minutes} min · {w.toolCalls} llamadas · vigilancia automática {w.enabled ? 'on' : 'off'}
          </Text>
        )}
        {w.judging && <Text color="cyan">Juzgando…</Text>}
        {w.lastJudgment && <Text dimColor>Último juicio: {trunc(w.lastJudgment, 160)}</Text>}
        {w.notes.map(n => (
          <Text color="yellow">Aviso: {trunc(n, 200)}</Text>
        ))}
        {persistent.map(([thread]) => (
          <Text bold color="red">
            DESVÍO PERSISTENTE en {threadLabel(thread)}: ya no se corrige, decide tú.
          </Text>
        ))}
        {judgeUsage.judgments > 0 && (
          <Text dimColor>
            Juez de Vár: {judgeUsage.judgments} juicios · {tokens(judgeUsage.input + judgeUsage.output + judgeUsage.cacheRead + judgeUsage.cacheCreation)} tokens
          </Text>
        )}
        <Text bold>Registro</Text>
        {entries.length === 0 && <Text dimColor>Sin juicios todavía.</Text>}
        {entries.slice(0, 30).map(l => (
          <Box flexDirection="column">
            <Text bold={l.verdict === 'desvío'} color={l.verdict === 'desvío' ? 'red' : l.verdict === 'fallido' ? 'yellow' : undefined} dimColor={l.verdict === 'alineado'}>
              {hhmm(l.at)} [{l.origin === 'manual' ? '/var' : 'auto'}] {threadLabel(l.thread)}: {l.verdict}
              {l.persistent ? ' · PERSISTENTE' : ''}
              {l.planStep ? ` · ${trunc(l.planStep, 80)}` : ''}
            </Text>
            {l.reason && l.verdict !== 'alineado' && <Text dimColor>  {trunc(l.reason, 200)}</Text>}
            {l.correction && <Text color="red">  Corrección ({l.via}): {trunc(l.correction, 300)}</Text>}
            {l.note && <Text dimColor>  {l.note}</Text>}
            {l.usage && (
              <Text dimColor>
                {'  '}tokens: in {tokens(l.usage.input)} · out {tokens(l.usage.output)} · cache {tokens(l.usage.cacheRead)}/{tokens(l.usage.cacheCreation)}
              </Text>
            )}
          </Box>
        ))}
      </Box>
    )
  })
}

// Los nombres de las herramientas se exportan para las pruebas.
export { VAR_REPORT_TOOL, VAR_STATUS_TOOL }
