# Tasks

## 1. Plan mode por defecto

- [x] 1.1 T-1 `bifrost/CLAUDE.md`: paso 1 del procedimiento, tabla de decisión, frase de "El camino de trabajo sustancial…" y Camino plan mode con la regla nueva (plan mode salvo capacidad nueva o comportamiento con spec en `openspec/specs/`, camino anunciado en una línea, `AskUserQuestion` solo con duda real); replicar en `skills/bifrost/SKILL.md` si repite la regla. Verificación: `grep -n "merezca spec" bifrost/CLAUDE.md skills/bifrost` sin resultados y `grep -n "capacidad" bifrost/CLAUDE.md` muestra la regla en el paso 1 y en la tabla. Cubre: plan-mode-path/REQ-001
- [x] 1.2 T-2 Evals: en `evals/bifrost-plan-mode-route/` añadir un grader de camino anunciado sin preguntar; caso nuevo `evals/bifrost-plan-mode-behavior/` (cambio de comportamiento sobre algo existente sin spec → plan mode, sin Skuld ni `/opsx:propose`); filas en la tabla de evals del `README.md`. Verificación: `claude plugin validate .` pasa; con permiso del humano (cuesta crédito), `bash tests/evals.sh --case 'bifrost-plan-mode-*'` en verde. Cubre: plan-mode-path/REQ-001

## 2. Cierre encadenado

- [x] 2.1 T-3 `skills/heimdall/` (`SKILL.md`, `references/role.md`): en el camino OpenSpec, el informe termina con `Veredicto: limpio | avisos | crítico` y el número de CRITICAL y WARNING (design D1); con `limpio`, recomendar a Bifröst cargar a Hela sin condicionarlo al humano. Verificación: `grep -n "Veredicto: limpio" skills/heimdall -r` lo muestra en Hard Rules y Output Contract. Cubre: change-closing/REQ-001
- [x] 2.2 T-4 `skills/hela/` (`SKILL.md`, `references/role.md`): con veredicto `limpio` y todas las casillas de `tasks.md` marcadas, archiva sin `AskUserQuestion`; con `avisos` o casillas sin marcar, pregunta `Archivar` / `Mantener abierto`; con `crítico`, devuelve a Bifröst; antes de archivar, comprueba el orden de archivo (design D2) y, si falta otro change, no archiva y avisa; sin commit. Verificación: `grep -n "limpio\|Orden de archivo\|Archive would refuse" skills/hela -r` muestra las cuatro ramas en Decision Gates. Cubre: change-closing/REQ-001
- [x] 2.3 T-5 `bifrost/CLAUDE.md`: tras Brokkr en un change OpenSpec, cargar a Heimdall sin preguntar; con `limpio` cargar a Hela pasándole la línea de veredicto; con `crítico`, presentar hallazgos y ofrecer Brokkr; anti-waterfall según design D4; fila "¿Cumple la spec?" de la tabla de decisión. Verificación: `grep -n "Heimdall sin preguntar\|limpio" bifrost/CLAUDE.md` lo muestra en el procedimiento y en Anti-waterfall; `bash tests/evals_test.sh` en verde. Cubre: change-closing/REQ-001
- [x] 2.4 T-6 Eval `evals/bifrost-close-chain/`: `/bifrost` con el resumen de Brokkr de un change terminado; pasa si carga a Heimdall y no pregunta al humano. Verificación: `claude plugin validate .` pasa; con permiso del humano, `bash tests/evals.sh --case bifrost-close-chain` en verde. Cubre: change-closing/REQ-001

## 3. Cierre

- [x] 3.1 T-7 `README.md`: Camino plan mode con la regla nueva, cierre encadenado en el flujo OpenSpec, "Cambios en 1.9.0" y versión `1.9.0` en `.claude-plugin/plugin.json`. Verificación: `grep -n "merezca spec" README.md` sin resultados y `grep -n "1.9.0" README.md .claude-plugin/plugin.json` en ambos. Cubre: —
- [x] 3.2 T-8 Suite completa. Verificación: en verde `claude plugin test .`, `bash tests/evals_test.sh`, `bash tests/install_test.sh`, `claude plugin validate .`, `openspec validate --all --strict`, `bun scripts/protocol.ts ids` y `bun scripts/protocol.ts check streamline-close-and-path`. Cubre: —

## Workflow follow-up

- Archivar `add-bifrost-protocol` antes que este change (design D3).
