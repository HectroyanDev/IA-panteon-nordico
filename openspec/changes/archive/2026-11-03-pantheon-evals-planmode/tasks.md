# Tasks

## 1. Verificaciones previas

- [x] 1.1 En una copia del repo en el scratchpad, crear un caso mínimo con `claude plugin eval init --bare probe` y ejecutarlo con `--runs 1 --no-publish --max-cost-usd 0.3 --ablation none` variando prompt y graders para fijar (D8): si `/odin` al inicio del prompt invoca la skill; qué ocurre tras `AskUserQuestion`; si `EnterPlanMode` está disponible; la sintaxis de negación de `tool_used`, `file_exists` y `regex` (consultando también code.claude.com/docs/en/plugin-evals.md); si `evals/mocks/mimisbrunnr/*.md` expone `mimir_*` con `--mocks record`; cuál es el cwd del agente; verificar anotando cada resultado en `design.md` (D8) y ajustando D1–D3 si algo los contradice, sin que se publique nada (salida del comando sin URL de claude.ai)
- [x] 1.2 En una sesión de prueba, entrar en plan mode y anotar en `design.md` la ruta exacta del archivo de plan que da el mensaje de sistema, si un fork de solo lectura (Hugin) puede ejecutarse en plan mode y qué ofrece la app tras aprobar con `ExitPlanMode`; verificar que las tres notas están en `design.md` (D9/D10) y que no se editó ningún archivo del repo

## 2. Script de evals

- [x] 2.1 Crear `tests/evals.sh` según D4/D5 (`--runs`, `--case`, `--baseline`, `--help`; siempre `--no-publish`, `--max-cost-usd 2`, `--ablation none` salvo `--baseline`; salida 64 en uso incorrecto; propaga el código de `claude plugin eval`; imprime la ruta del informe); verificar con `bash -n tests/evals.sh` y `tests/evals.sh --help`
- [x] 2.2 Crear `tests/fixtures/evals-bin/claude` (registra argumentos, sale con `FAKE_EVAL_RC`) y `tests/evals_test.sh` con los casos de D6 al estilo de `install_test.sh`; verificar que `bash tests/evals_test.sh` pasa entero y que en todas las llamadas registradas aparecen `--no-publish` y `--max-cost-usd 2`
- [x] 2.3 Comprobar que `install.sh` no referencia `evals` ni `plugin eval`; verificar con `grep -n 'evals\|plugin eval' install.sh` sin coincidencias

## 3. Suite de evals

- [x] 3.1 Crear `evals/odin-incomplete/`, `evals/bifrost-no-waterfall/` y `evals/bifrost-lookup/` con `prompt.md` (`max_turns` ≤ 10, `allowed_tools` mínimos) y graders según D1/D2 y lo fijado en 1.1; verificar con `tests/evals.sh --case 'odin-*'` y `--case 'bifrost-*'` que cada caso pasa
- [x] 3.2 Crear `evals/skuld-no-name/` y `evals/brokkr-no-change/` con graders deterministas de pregunta devuelta, sin `Write`/`Edit` ni directorios bajo `openspec/changes/`; verificar ejecutándolos con `--case` que pasan y que el coste por caso queda anotado en `design.md` (riesgo del tope con `opus`)
- [x] 3.3 Crear `evals/mocks/mimisbrunnr/{mimir_context,mimir_search,mimir_get}.md` vacíos (o la variante degradada de D3 si 1.1 mostró que no se aplican) y `evals/munin-mimir-empty/` con `regex` de "no hay" y grader `llm` cuyo cuerpo justifica por qué no basta uno determinista; verificar ejecutándolo con `--case` que pasa
- [x] 3.4 Crear `evals/hugin-graphify-no-graph/` con `Bash` en `allowed_tools`, `file_exists` negativo de `graphify-out/` y `regex` de la pregunta de construcción o del aviso de CLI ausente; verificar con `tests/evals.sh --case 'hugin-*'` que pasa y que un intento de `graphify extract` en el prompt queda rechazado
- [x] 3.5 Crear `.gitignore` en la raíz con `evals/results/`; verificar con `grep -x 'evals/results/' .gitignore` y que `bash tests/install_test.sh` sigue en verde

## 4. Camino plan mode en las skills

- [x] 4.1 Crear `skills/odin/references/plan-mode.md` con el flujo de Odín en plan mode y la plantilla de plan de D10 (Requisitos, Enfoque, Pasos con su comprobación, Verificación); actualizar `skills/odin/SKILL.md` (Decision Gates, Execution Steps, References) y `skills/odin/references/role.md` (la aprobación con `ExitPlanMode` sustituye `Sí, confirmo`); verificar que el texto cubre los escenarios de "Plan escrito por Odín" y "Aprobación con ExitPlanMode" y que `claude plugin validate .` pasa
- [x] 4.2 Actualizar `skills/brokkr/SKILL.md` y `skills/brokkr/references/role.md` según D11 (encargo con plan, sin `/opsx:apply`, no modifica el plan, salida con pasos hechos/pendientes; sin change ni plan → pregunta a Bifröst); verificar que cubre los escenarios de "Implementación desde el plan" y que el camino OpenSpec del archivo sigue intacto (diff solo con añadidos y la fila de "sin change")
- [x] 4.3 Actualizar `skills/heimdall/SKILL.md` y `skills/heimdall/references/role.md` según D11 (validación contra pasos y Verificación, severidades, nunca Hela en plan mode); verificar que cubre los escenarios de "Validación contra el plan" y que `claude plugin validate .` pasa
- [x] 4.4 Actualizar `bifrost/CLAUDE.md` según D9 (regla de elección en Procedimiento, fila en la tabla de decisión, sección Camino plan mode, encargo con ruta y contenido del plan, nota sobre sesiones paralelas); crear `evals/bifrost-plan-mode-route/` según D1 y lo fijado en 1.1; verificar con `tests/evals.sh --case 'bifrost-plan-mode-route'` que pasa, que el texto cubre los escenarios de "Elección entre plan mode y OpenSpec", "Entrada en plan mode con permiso", "Sin artefactos OpenSpec en plan mode" y el MODIFIED de `specialist-execution`, y que `grep -n mimir_ bifrost/CLAUDE.md` sigue sin coincidencias
- [x] 4.5 Volver a ejecutar `tests/evals.sh` completo tras 4.1–4.4; verificar que todos los casos pasan, que la salida no contiene URL de publicación y que el código de salida es 0 (no 2 por tope)

## 5. Documentación y versión

- [x] 5.1 Actualizar `README.md`: sección "Evals" (qué miden los casos, `tests/evals.sh` y sus flags, tope de 2 USD, sin publicar, resultados en `evals/results/`, no forma parte del instalador), sección "Camino plan mode" (cuándo se elige, flujo, ruta del plan anotada en 1.2, nota de sesiones paralelas), `tests/evals_test.sh` en "Pruebas" y "Cambios en 1.3.0"; subir `.claude-plugin/plugin.json` a `1.3.0`; verificar que `tests/evals.sh --help` coincide con lo documentado y que `claude plugin validate .` pasa

## 6. Integración

- [x] 6.1 En una sesión nueva con `/bifrost`, pedir un cambio pequeño de prueba (por ejemplo, reordenar una tabla del README sin cambiar contenido); verificar que Bifröst elige plan mode, Odín escribe el plan con las cuatro secciones, la aprobación con `ExitPlanMode` lleva a Brokkr con ruta y contenido del plan, Heimdall valida contra el plan y `openspec/` no cambia (comparando `find openspec -type f -newer` con una marca previa)

## Workflow follow-up

- Validar con Heimdall (`/opsx:verify`) y, si pasa, cerrar con Hela (`/opsx:archive`).
- Guardar con Munin los aprendizajes (comportamiento real del sandbox de evals, ruta del plan y plan mode en forks).
