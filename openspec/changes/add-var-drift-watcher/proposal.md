# Proposal

## Why

Las tareas largas del panteón (Brokkr implementando un plan aprobado o un `tasks.md`, o el hilo principal trabajando tras `ExitPlanMode`) se desvían del plan sin que nadie lo note hasta que Heimdall valida al final, cuando corregir ya cuesta rehacer trabajo. Hace falta un vigilante que compare lo que se está haciendo con lo que se aprobó mientras la tarea sigue en marcha, y que reconduzca a tiempo sin parar al humano.

## What Changes

- Nuevo especialista **Vár** (diosa de los juramentos): skill `nordic-pantheon:var` con `SKILL.md` y `references/role.md`, como el resto del panteón. Define el contrato del juicio de alineación (qué es desvío y qué no) y se puede invocar a mano con `/var` para una comprobación puntual que informa del veredicto y, si hay desvío, corrige por la misma vía que la vigilancia automática.
- Nuevo **módulo de hooks** del plugin (`hooks/hooks.json` + `hooks/var.tsx`, un mod de Claude Code) que hace el trabajo en segundo plano:
  - Detecta el plan activo: el plan aprobado con `ExitPlanMode` (camino plan mode) o el `tasks.md` del change OpenSpec en implementación (camino OpenSpec).
  - Cuenta tiempo y llamadas a herramientas del hilo principal y de los subagentes desde que el plan está activo. Al pasar 10 minutos o 40 llamadas (lo que llegue antes; configurable) lanza un juicio de alineación con `opus`/`high` y reinicia la ventana.
  - Ante desvío (del juicio automático o de `/var`), inyecta una corrección en el hilo o subagente que se desvió, sin esperar al humano, y lo registra. `/var` no inyecta por su cuenta: entrega su veredicto al módulo con una herramienta propia del plugin (`var_report`).
  - Muestra en un panel lateral de la app de escritorio el plan vigilado, cada juicio, qué se desvió y qué corrección se envió; lanza una notificación del sistema cuando hay desvío.
  - Se apaga con `VAR_ENABLED=off` en la config del panteón; `/var` sigue funcionando (informa y corrige) porque lo pide el humano.
- `install.sh` escribe en la config del panteón la activación y los umbrales de Vár (`VAR_ENABLED`, `VAR_MINUTES`, `VAR_TOOL_CALLS`) con sus valores por defecto (`on`, 10, 40) y conserva los que el humano haya cambiado al reinstalar.
- `bifrost/CLAUDE.md` (fuente de `~/.claude/CLAUDE.md` y de `/bifrost`): Vár entra en la tabla del panteón y en la tabla de decisión; regla para tratar las correcciones de Vár. `README.md` y `plugin.json` se actualizan.
- Nuevo caso de eval para Vár.

Fuera de alcance: validar calidad, bugs o cumplimiento final (Heimdall), editar el plan o `tasks.md`, sesiones en la nube, guardar el historial de desvíos en memoria (Munin).

## Capabilities

### New Capabilities
- `plan-drift-watch`: vigilancia en segundo plano de la alineación entre el trabajo en curso y el plan aprobado (activación configurable, disparo por umbrales, fuente del plan, juicio, reconducción del hilo principal y de subagentes, registro, panel y notificación), la comprobación manual `/var` que informa y corrige, y el lugar de Vár en el panteón.

### Modified Capabilities
- `pantheon-installer`: la config persistida gana `VAR_ENABLED`, `VAR_MINUTES` y `VAR_TOOL_CALLS`, con valores por defecto y conservados al reinstalar.
- `pantheon-evals`: la suite gana un caso de Vár.

## Impact

- Archivos nuevos: `skills/var/SKILL.md`, `skills/var/references/role.md`, `hooks/hooks.json`, `hooks/var.tsx` (y sus módulos auxiliares), `types/index.d.ts` (contrato de `$.state`), `hooks/var.test.tsx`, `evals/var-*/`.
- Archivos modificados: `.claude-plugin/plugin.json` (versión, descripción, `types`), `install.sh` y `tests/install_test.sh`, `bifrost/CLAUDE.md`, `README.md`.
- Dependencia nueva: la API de mods (function hooks) de Claude Code, que es de acceso anticipado y cambia entre versiones. El módulo se escribe contra los tipos de la versión de la app de escritorio (2.1.309 en esta máquina); la CLI instalada es 2.1.301.
- Coste: cada juicio es una llamada de `opus`/`high` sin herramientas. Con los umbrales por defecto, una tarea de 200 llamadas genera unas 5. Cada `/var` es un subagente `opus`/`high` con herramientas de solo lectura, solo cuando el humano lo pide; con `VAR_ENABLED=off` no hay coste en segundo plano.
- Sin cambios en Heimdall, Brokkr ni en los artefactos que vigila.
