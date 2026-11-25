# Proposal

## Why

Tras aprobar las historias, el humano sigue lanzando a mano Heimdall y Hela aunque la implementación salga limpia, y el trabajo pequeño acaba en OpenSpec cuando la regla actual ("¿merece spec?") deja dudas. Es el segundo change que anunció `add-bifrost-protocol`: cierre encadenado y plan mode por defecto.

## What Changes

- **Cierre encadenado** (camino OpenSpec): cuando Brokkr termina, Bifröst lanza Heimdall sin preguntar. Sin CRITICAL ni WARNING y sin tareas pendientes, Bifröst carga a Hela, que archiva sin preguntar e informa. Con WARNING o pendientes (incluidas manuales), Hela pregunta como hoy (`Archivar` / `Mantener abierto`). Con CRITICAL no se archiva: Bifröst presenta los hallazgos y ofrece volver a Brokkr. Si el change declara que otro debe archivarse antes y ese otro sigue abierto, Hela no archiva y avisa.
- **Plan mode por defecto**: ajustes, refactors, arreglos y cambios de comportamiento sobre algo existente van por plan mode. OpenSpec solo si el cambio crea una capacidad que no existe o modifica comportamiento que describe una spec de `openspec/specs/`. Bifröst anuncia el camino en una línea, sin preguntar, salvo duda real (`AskUserQuestion`).
- El anti-waterfall de Bifröst admite la cadena Brokkr → Heimdall → Hela tras el `Sí, confirmo` a las historias (ya admitía Skuld → Brokkr); antes de esa confirmación no cambia.

Fuera de alcance: el commit sigue necesitando permiso explícito del humano (Forseti); no se tocan changes abiertos ni archivados.

## Capabilities

### New Capabilities
- `change-closing`: validación y archivo encadenados de un change OpenSpec tras implementar.

### Modified Capabilities
- `plan-mode-path`: la elección entre plan mode y OpenSpec pasa a plan mode por defecto, con el camino anunciado en una línea.

## Impact

- Textos: `bifrost/CLAUDE.md` (procedimiento, tabla de decisión, anti-waterfall, camino plan mode), `skills/hela/` (`SKILL.md`, `references/role.md`), `skills/heimdall/` (veredicto limpio), `skills/bifrost/` si replica reglas, `README.md`.
- Evals: `evals/bifrost-plan-mode-route/` y un caso nuevo de enrutado a plan mode para un cambio de comportamiento sin spec; `tests/evals_test.sh` si cuenta casos.
- Orden de archivo: `add-bifrost-protocol` antes que este change (design.md, D3).
