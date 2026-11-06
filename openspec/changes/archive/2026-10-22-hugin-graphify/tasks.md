# Tasks

## 1. Verificación de graphify

- [x] 1.1 Instalar `graphifyy` con `pipx` en `PIPX_HOME`/`PIPX_BIN_DIR` temporales del scratchpad (sin tocar la instalación real), ejecutar sobre una copia de este repo `graphify extract --code-only`, `graphify update .`, `graphify query`, `graphify path`, `graphify explain` (con un nombre ambiguo y uno inexistente) y anotar en `design.md` (D11) la sintaxis exacta, la salida, los códigos 0/3/4, si `update` pide API key o LLM, si escribe fuera de `graphify-out/` y si instala en Python 3.14; ajustar D2 si algo lo contradice; verificar retirando el entorno temporal y comprobando que `command -v graphify` sigue fallando

## 2. Skill hugin-graphify

- [x] 2.1 Crear `skills/hugin-graphify/references/graphify-commands.md` con la tabla de comandos, los códigos de salida y ejemplos de salida reales de la tarea 1.1; verificar que cada comando citado se ejecutó tal cual en 1.1
- [x] 2.2 Crear `skills/hugin-graphify/SKILL.md` (`name: hugin-graphify`, `context: fork`, `model: sonnet`, sin `AskUserQuestion`) con el flujo de D2: CLI ausente → aviso y lectura directa; sin grafo → exploración normal más la pregunta de construcción para Bifröst (D3); con autorización → `extract --code-only` y `.gitignore` (D4); con grafo → `update .` y consultas; brief con la plantilla `../hugin/references/exploration-output.md` y línea **Fuente**; verificar con `claude plugin validate .` y comprobando que el texto cubre cada escenario de `hugin-exploration-backends` salvo los de Bifröst
- [x] 2.3 Crear `skills/hugin-graphify/references/role.md` siguiendo el formato de `skills/hugin/references/role.md` (alcance, activación, reglas duras, handoff); verificar con `grep -rn "AskUserQuestion" skills/hugin-graphify` sin coincidencias de uso y `diff -r` de `skills/hugin/` contra una copia previa sin diferencias
- [x] 2.4 Probar a mano la skill con la CLI de la tarea 1.1 en el `PATH`: en una copia git de este repo sin grafo (devuelve la pregunta y no crea `graphify-out/`), con `Construir grafo: sí` (crea `graphify-out/`, añade la línea al `.gitignore`, `git status` no lo muestra), con grafo existente (ejecuta `update .` antes de consultar), en una copia sin git (no crea `.gitignore`) y sin `graphify` en el `PATH` (avisa y lee código); verificar cada resultado y anotar desviaciones en `design.md`

## 3. Bifröst

- [x] 3.1 Actualizar `bifrost/CLAUDE.md`: fila Hugin con `nordic-pantheon:hugin` o `nordic-pantheon:hugin-graphify` (ver Exploración) y `/opsx:explore` solo para `hugin`; nueva sección Exploración con la selección por `HUGIN_BACKEND` (`graphify` → `hugin-graphify`; `plain`, ausente o desconocido → `hugin`) y cómo relanzar la pregunta de construcción y volver a delegar con `Construir grafo: sí` (D3, D5); verificar que cubre los escenarios "Selección del backend de Hugin" y "Pregunta de construcción relanzada por Bifröst"
- [x] 3.2 Subir `.claude-plugin/plugin.json` a `1.2.0`; verificar con `claude plugin validate .`

## 4. Instalador

- [x] 4.1 Reconstruir el entorno de `tests/install_test.sh`: `SYS_PATH` como `$SUITE/sysbin` con symlinks a `/usr/local/bin`, `/usr/bin` y `/bin` salvo `uv`, `uvx`, `pipx`, `graphify`, `claude` y `openspec`; fakes `uv`, `pipx` y `graphify` en directorios propios que registran llamadas en `$FAKE_CLAUDE_STATE/tools.txt`, dejan un `graphify` falso en `$CASE_DIR/tool-bin` al instalar y fallan con `FAKE_TOOL_FAIL=1` (D9); verificar que `bash tests/install_test.sh` sigue pasando entero sin cambios en `install.sh`
- [x] 4.2 Añadir `--hugin=plain|graphify` a `parse_args`, `resolve_options` (defecto `plain` con `--yes`, pregunta "Backend de Hugin" si falta) y la ayuda; con sus casos en `tests/install_test.sh` (todo por flags, flag no válido, `--yes`, pregunta solo de Hugin, `--help` lo muestra); verificar que la suite pasa
- [x] 4.3 Extender `config_write` con `HUGIN_BACKEND` y `GRAPHIFY_INSTALLED_BY`, conservando `GRAPHIFY_INSTALLED_BY` entre reinstalaciones (D7); con casos de contenido de la config y de reinstalación con `GRAPHIFY_INSTALLED_BY=pipx` previo; verificar que la suite pasa
- [x] 4.4 Implementar `ensure_graphify` (D6): saltar si `graphify` está en el `PATH` o `GRAPHIFY_INSTALLED_BY` no está vacío; `uv tool install graphifyy` con `uv`, `pipx install graphifyy` sin `uv`; sin gestor o con fallo → aviso y `HUGIN_BACKEND=plain`; aviso si tras instalar `graphify` no está en el `PATH`; nunca `graphify install` ni `claude install`; con un caso por escenario de "Instalación de la CLI de graphify", "graphify ya disponible", "Sin gestor para instalar graphify" y "Volver a plain no desinstala graphify"; verificar que la suite pasa
- [x] 4.5 Implementar la desinstalación de `graphifyy` en `cmd_uninstall` según `GRAPHIFY_INSTALLED_BY` (D8), con aviso si falta el gestor o falla; con casos para `uv`, `pipx`, vacío y gestor ausente; verificar que la suite pasa y que `bash -n install.sh` no da errores

## 5. Documentación

- [x] 5.1 Actualizar `README.md`: fila Hugin-graphify en la tabla del panteón, `graphifyy` (vía `uv` o `pipx`) en requisitos, `--hugin` en la tabla de flags y en los ejemplos, `HUGIN_BACKEND`/`GRAPHIFY_INSTALLED_BY` en el ejemplo de config, sección "Cambiar el backend de Hugin" (qué hace cada backend, la pregunta de construir el grafo, `graphify-out/` en `.gitignore`, cómo actualizar `graphifyy` a mano) y la desinstalación del paquete; verificar que cada comando nuevo del README se ejecuta tal cual con `HOME` temporal y los fakes de la suite

## 6. Integración

- [x] 6.1 En la máquina real, `./install.sh install --hugin=graphify` manteniendo el resto de opciones de la config actual; verificar que la config contiene `HUGIN_BACKEND=graphify` y `GRAPHIFY_INSTALLED_BY=pipx`, que `graphify --help` responde y que no existen skills ni hooks de graphify en `~/.claude`
- [x] 6.2 En una sesión nueva con Bifröst, pedir una exploración en un repo git sin grafo; verificar que Bifröst carga `nordic-pantheon:hugin-graphify` en subagente con `sonnet`, relanza la pregunta de construcción con `AskUserQuestion` y, con el sí, entrega un brief basado en el grafo con `graphify-out/` ignorado por git

## Workflow follow-up

- Validar con Heimdall (`/opsx:verify`) y, si pasa, cerrar con Hela (`/opsx:archive`).
- Guardar con Munin los aprendizajes del change (comportamiento real de `graphify update` y de los códigos de salida).
