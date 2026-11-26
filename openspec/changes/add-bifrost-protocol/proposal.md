# Proposal

## Why

El protocolo de traspaso que se había montado (grafo de tareas en `plan.json`, `tasks.md` generado, `validation.json` obligatorio, detección de orden en Vár) produjo un change de 764 líneas con 20 requisitos: demasiado para revisarlo de un vistazo y con piezas que nadie cita. Lo que sí rinde son los IDs estables (`REQ-NNN`, `T-n`, `STEP-N`), porque Vár y Heimdall los citan. Este change reduce el protocolo a eso y cambia el formato de las specs a historias de usuario cortas, confirmadas una sola vez.

## What Changes

- **Historias de usuario**: cada requisito es una historia ("Como <rol> quiero <capacidad> para <beneficio>") con 3-5 escenarios como criterios de aceptación; 1-3 historias por change y ~150 líneas de artefactos como guía, sin comprobación automática. Si el trabajo no cabe, Skuld propone partirlo. `design.md` solo cuando OpenSpec lo justifica. Este change ya usa el formato.
- **Una sola parada**: en el camino OpenSpec, Odín redacta las historias en lugar del restate de seis campos; el `Sí, confirmo` a esas historias sustituye también la revisión de la propuesta. Skuld convierte las historias en artefactos sin otra parada salvo bloqueo, y Bifröst puede encadenar Skuld → Brokkr.
- **Se mantiene**: `REQ-NNN` por capability (con `bun scripts/protocol.ts ids --next`), `T-n` en `tasks.md`, `STEP-N` en plan mode, `ref` en los veredictos de Vár y `drift.json`, `decisions.md` opcional, citas de requisitos en Tyr y la migración de IDs ya hecha (deltas RENAMED de las 7 specs y títulos de `add-var-drift-watcher`).
- **Sale** (**BREAKING** para el formato de este change): `plan.json` con `deps` y el orden por dependencias; la detección de tareas fuera de orden de Vár (origen `orden`); `validation.json` obligatorio y el CRITICAL "trazabilidad incompleta" de Heimdall; el subcomando `protocol.ts tasks`. Skuld vuelve a escribir `tasks.md` a mano.

Fuera de alcance: que Hela archive sola con verify verde y plan mode por defecto (segundo change); reescribir `add-var-drift-watcher` o changes archivados en formato de historias; un esquema OpenSpec propio; checks automáticos de tamaño.

## Capabilities

### New Capabilities
- `pantheon-handoff-contracts`: formato de historias y tope de Skuld, confirmación única de las historias de Odín, e IDs de traspaso sin grafo.

### Modified Capabilities
- `bifrost-activation`, `hugin-exploration-backends`, `munin-memory-backends`, `pantheon-evals`, `pantheon-installer`, `plan-mode-path`, `specialist-execution`: solo RENAMED (IDs en los títulos).

## Impact

- Código a recortar: `scripts/protocol.ts`, `hooks/var/plan.ts`, `hooks/var/watch.ts`, `hooks/var/pure.ts`, `hooks/var.tsx`, `hooks/var.test.tsx`, `types/index.d.ts`, `tests/protocol_test.sh`, `tests/fixtures/protocol/`.
- Textos: `skills/skuld/`, `skills/odin/` (`SKILL.md`, `references/role.md`, `references/questioning.md`), `skills/brokkr/`, `skills/heimdall/`, `skills/var/`, `bifrost/CLAUDE.md`, `README.md`.
- Orden de archivo: `add-var-drift-watcher` antes que este change (design.md).
