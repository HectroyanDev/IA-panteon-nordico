# Tasks

## 1. Hecho y vigente

- [x] 1.1 T-1 Migración de IDs: deltas RENAMED de las 7 specs y títulos ADDED de `add-var-drift-watcher` con `REQ-NNN`, simulación de archivo en copia. Verificación: `bun scripts/protocol.ts ids` sale con 0. Cubre: pantheon-handoff-contracts/REQ-003
- [x] 1.2 T-2 `ref` en los veredictos de Vár, `drift.json`, `STEP-N` en plan mode, `decisions.md` opcional y citas de requisitos en Tyr. Verificación: `claude plugin test .` en verde. Cubre: pantheon-handoff-contracts/REQ-003

## 2. Recorte del protocolo

- [x] 2.1 T-3 Recortar `hooks/var/plan.ts` y `scripts/protocol.ts` según design D1-D2 (fuera `plan.json`, ciclos, `renderTasks`, sincronía, `validation.json` y el subcomando `tasks`; `check` sobre `tasks.md`) y ajustar `tests/protocol_test.sh` y `tests/fixtures/protocol/`. Verificación: `bash tests/protocol_test.sh` en verde con un caso por fallo de `check` y `bun scripts/protocol.ts check add-bifrost-protocol` sale con 0. Cubre: pantheon-handoff-contracts/REQ-003
- [x] 2.2 T-4 Quitar la detección de orden de Vár (D3): origen `orden` en `types/index.d.ts`, `hooks/var/watch.ts`, `hooks/var/pure.ts` y el panel de `hooks/var.tsx`; el juez lee las tareas de `tasks.md`; actualizar `hooks/var.test.tsx`, `skills/var/SKILL.md` y `skills/var/references/judge.md`. Verificación: `claude plugin test .` y `tsc -p .` en verde; `grep -rn "plan.json\|'orden'" hooks types skills/var` sin resultados. Cubre: pantheon-handoff-contracts/REQ-003
- [x] 2.3 T-5 Brokkr sigue el orden de `tasks.md` y Heimdall valida cada historia contra sus criterios, sin `validation.json` ni CRITICAL de trazabilidad (`skills/brokkr/`, `skills/heimdall/`). Verificación: `grep -n "plan.json\|validation.json\|trazabilidad incompleta" skills/brokkr skills/heimdall -r` sin resultados; `claude plugin validate .` pasa. Cubre: pantheon-handoff-contracts/REQ-003

## 3. Historias y una sola parada

- [x] 3.1 T-6 Skuld (`SKILL.md`, `references/role.md`): historias con 3-5 criterios, 1-3 por change, ~150 líneas como guía, partir si no cabe, `design.md` solo si OpenSpec lo justifica, `tasks.md` a mano (D1), sin parada tras historias confirmadas. Verificación: `grep` muestra "Como", "150", `ids --next` y `protocol.ts check` y no `plan.json`. Cubre: pantheon-handoff-contracts/REQ-001, pantheon-handoff-contracts/REQ-002
- [x] 3.2 T-7 Odín (`SKILL.md`, `references/role.md`, `references/questioning.md`): en el camino OpenSpec redacta historias en vez del restate de seis campos y pide `Sí, confirmo` sobre ellas; plan mode sin cambios. Verificación: `grep` muestra la confirmación de historias; `bash tests/evals_test.sh` en verde. Cubre: pantheon-handoff-contracts/REQ-002
- [x] 3.3 T-8 Bifröst (`bifrost/CLAUDE.md`): el `Sí, confirmo` a las historias sustituye la revisión de la propuesta y permite encadenar Skuld → Brokkr; preguntas de bloqueo de Skuld al humano. Verificación: `grep -n "historias" bifrost/CLAUDE.md` lo muestra en la tabla de decisión; `bash tests/evals_test.sh` en verde. Cubre: pantheon-handoff-contracts/REQ-002

## 4. Cierre

- [x] 4.1 T-9 Actualizar la tabla de contratos de `README.md` (sin `plan.json` ni `validation.json`, `tasks.md` a mano, `drift.json` sin origen `orden`) y borrar `validation.json` de este change. Verificación: `grep -n "plan.json\|validation.json" README.md` sin resultados; los comandos del README se ejecutan tal cual. Cubre: —
- [x] 4.2 T-10 Suite completa. Verificación: en verde `claude plugin test .`, `tsc -p .`, `bash tests/protocol_test.sh`, `bash tests/install_test.sh`, `bash tests/evals_test.sh`, `claude plugin validate .`, `openspec validate add-bifrost-protocol --strict`, `bun scripts/protocol.ts ids` y `bun scripts/protocol.ts check add-bifrost-protocol`. Cubre: —
- [ ] 4.3 T-11 Prueba manual en la app: forzar un desvío en un change de prueba. Verificación: llega la corrección con `ref` y `drift.json` tiene la entrada. Cubre: pantheon-handoff-contracts/REQ-003

## Workflow follow-up

- Archivar `add-var-drift-watcher` antes que este change (design.md, Risks).
- Validar con Heimdall y archivar con Hela.
