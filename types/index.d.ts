// Contrato de `$.state` del módulo de Vár (hooks/var.tsx). Estado de sesión:
// nada de esto se guarda entre sesiones.

export type VarVerdict = 'alineado' | 'menor' | 'desvío'

/** Idioma del plan vigilado, con el que se redacta la corrección inyectada. */
export type VarLang = 'es' | 'en'

/** Veredicto de un hilo: `thread` es `main` o un `agentId`. */
export type ThreadVerdict = {
  thread: string
  verdict: VarVerdict
  planStep: string
  reason: string
  correction: string
  /** Idioma del plan según el juez; sin él, `es`. */
  lang?: VarLang
}

/** Resumen de una llamada a herramienta (nunca su resultado). */
export type CallSummary = {
  id: string
  tool: string
  target: string
  isError: boolean
}

export type WatchStatus = 'activo' | 'desactivado' | 'cerrado' | 'sin-plan' | 'ambiguo'

export type WatchSource = 'plan-mode' | 'openspec'

export type Watch = {
  status: WatchStatus
  source: WatchSource | null
  /** Archivo de plan (plan mode) o `tasks.md` (OpenSpec). */
  path: string | null
  /** Texto del plan cuando no hay archivo. */
  planText: string | null
  changeName: string | null
  /** `proposal.md` y `design.md` del change, como contexto del juicio. */
  contextPaths: string[]
  activatedAt: number
  /** Inicio de la ventana actual (ms desde epoch). */
  windowStart: number
  /** Número de la ventana: sube con cada juicio y cada informe de `/var`. */
  windowId: number
  /** Llamadas de la ventana actual, de todos los hilos. */
  calls: number
  /** Últimas llamadas de la ventana, por hilo (`main` o `agentId`). */
  buffers: Record<string, CallSummary[]>
  enabled: boolean
  minutes: number
  toolCalls: number
  /** Avisos de configuración y de detección para el panel. */
  notes: string[]
  /** `agentId` de los subagentes de `/var`: no cuentan. */
  varAgentIds: string[]
  judging: boolean
  lastJudgmentAt: number | null
  lastJudgment: string | null
  /** Correcciones a la espera del siguiente `tool.call` del hilo (reserva por `context`). */
  pending: Record<string, string>
  /** Claves de informes de `/var` ya aplicados. */
  handledReports: string[]
  /** `false` si la superficie no colocó el panel: queda `$.ui.status`. */
  panelPlaced: boolean | null
}

export type LogOrigin = 'auto' | 'manual'

/** Tokens gastados por el juez automático de Vár (modelo y cuatro contadores). */
export type JudgeTokens = { input: number; output: number; cacheRead: number; cacheCreation: number }

export type LogUsage = JudgeTokens & { model: string }

/** Acumulado de la sesión del juez: no sale del LOG porque este se recorta. */
export type JudgeUsage = JudgeTokens & { judgments: number }

export type LogEntry = {
  at: number
  origin: LogOrigin
  thread: string
  verdict: VarVerdict | 'fallido'
  planStep: string
  reason: string
  /** Corrección enviada, si la hubo. */
  correction: string | null
  /** Vía de la corrección: `append`, `context` o `hilo-principal`. */
  via: string | null
  persistent: boolean
  note: string | null
  /** Tokens del juicio automático que produjo la entrada; ausente en `/var` (manual). */
  usage?: LogUsage
}

export type ThreadState = {
  /** Correcciones enviadas desde el último `alineado`. */
  corrections: number
  persistent: boolean
  /** `windowId` de la ventana en que se inyectó la última corrección (-1: ninguna). */
  lastCorrectionWindow: number
}

declare module 'claude-code' {
  interface PluginState {
    'nordic-pantheon': {
      watch: Watch
      log: LogEntry[]
      threads: Record<string, ThreadState>
      judgeUsage: JudgeUsage
    }
  }
}
