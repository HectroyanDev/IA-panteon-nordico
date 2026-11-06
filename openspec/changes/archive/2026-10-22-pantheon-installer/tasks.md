# Tasks

## 1. Munin en dos skills

- [x] 1.1 Renombrar `skills/munin/` a `skills/munin-mimir/`, cambiar `name: munin-mimir` en el frontmatter y las rutas internas de `references/role.md` y `SKILL.md`; verificar con `grep -rn "skills/munin/\|nordic-pantheon:munin\b" skills` sin coincidencias
- [x] 1.2 Crear `skills/munin-memory/SKILL.md`, `references/role.md` y `references/memory-format.md` (ámbitos proyecto/global, cálculo de la ruta de proyecto, formato de archivo y `MEMORY.md`, recall en ambos ámbitos, save con upsert por tema, sin `mimir_*`); verificar que `claude plugin validate .` acepta la skill y que el texto cubre cada escenario de `munin-memory-backends`
- [x] 1.3 Sustituir en `skills/odin/SKILL.md` la sección Memory por la delegación genérica en Munin vía Bifröst; verificar con `grep -rn "mimir_" skills --exclude-dir=munin-mimir` sin coincidencias

## 2. Plugin cargable por symlink

- [x] 2.1 Verificar que un symlink de directorio en `~/.claude/skills/` carga el plugin: con `HOME` temporal, enlazar `$HOME/.claude/skills/nordic-pantheon` → repo y comprobar que `claude plugin list --json` (o `claude plugin details nordic-pantheon@skills-dir`) lo muestra con sus skills; anotar el resultado en `design.md` (D1) y, si falla, cambiar el modo `link` a copia antes de seguir
- [x] 2.2 Crear `skills/bifrost/SKILL.md` que lea y aplique `../../bifrost/CLAUDE.md` relativo a su directorio base; verificar con `claude plugin validate .` y comprobando que la ruta relativa resuelve tanto desde el repo como desde una copia del repo
- [x] 2.3 Actualizar `bifrost/CLAUDE.md`: fila Munin con la selección por `MUNIN_BACKEND` y la regla sin config (D4), sección Memoria sin `mimir_*`, mención a `/bifrost`; verificar con `grep -n "mimir_" bifrost/CLAUDE.md` sin coincidencias
- [x] 2.4 Subir `.claude-plugin/plugin.json` a `1.1.0` y actualizar la descripción si cita Munin; verificar con `claude plugin validate .`

## 3. Modelo por especialista

- [x] 3.1 Añadir `context: fork` y `model` al frontmatter de Hugin (`sonnet`), Munin-mimir (`haiku`), Munin-memory (`haiku`), Skuld (`opus`), Brokkr (`sonnet`), Heimdall (`opus`) y Bragi (`sonnet`), sin tocar Odín, Forseti ni Hela; verificar con `grep -n "^context:\|^model:" skills/*/SKILL.md` y `claude plugin validate .`
- [x] 3.2 Sustituir en Skuld y Brokkr (`SKILL.md` y `references/role.md`) las preguntas con `AskUserQuestion` por "devolver a Bifröst la pregunta con opciones"; verificar con `grep -rn AskUserQuestion skills` que solo queda en Odín, Forseti y Hela
- [x] 3.3 Añadir a `bifrost/CLAUDE.md` la regla de delegación a especialistas en subagente (encargo completo, relanzar sus preguntas con `AskUserQuestion`, volver a delegar con las respuestas); verificar que cubre los escenarios de `specialist-execution`
- [x] 3.4 Comprobar en una sesión nueva que `munin-mimir` en subagente ve las herramientas `mcp__mimisbrunnr__mimir_*` (por ejemplo, un `mimir_ping`); si no las ve, quitarle `context` y `model` y anotarlo en `design.md` (D9)

## 4. Instalador

- [x] 4.1 Crear `install.sh` con parseo de subcomandos y flags (`--mode`, `--munin`, `--bifrost`, `--yes`, `--purge`, `--help`), validación de valores y ayuda; verificar con `bash -n install.sh`, `./install.sh --help` (código 0) y `./install.sh foo` (código ≠ 0)
- [x] 4.2 Implementar preguntas interactivas para las opciones sin flag y valores por defecto con `--yes`; verificar ejecutando con entrada por `stdin` en `HOME` temporal
- [x] 4.3 Implementar la comprobación de dependencias (`claude` obligatoria; `openspec` y `claude mcp get mimisbrunnr` como avisos) antes de cualquier cambio; verificar con el `claude` falso ausente y con `mcp get` fallando
- [x] 4.4 Implementar lectura y escritura de la config (`KEY=valor`, sin `source`, conservando `CLAUDE_MD_BACKUP`); verificar el contenido del archivo tras instalar
- [x] 4.5 Implementar `install` en modo `link` y `marketplace`, cada uno retirando el otro, y abortando si `~/.claude/skills/nordic-pantheon` es ajeno; verificar los escenarios de "Instalación en modo enlace" y "Instalación en modo marketplace"
- [x] 4.6 Implementar Bifröst `link`/`skill` con backup con marca de tiempo, detección de symlink ya correcto y restauración al pasar a `skill`; verificar los escenarios de `bifrost-activation`
- [x] 4.7 Implementar `update` según el modo (D6), incluida la comparación con la caché y la reinstalación; verificar los escenarios de "Actualización"
- [x] 4.8 Implementar `uninstall` y `--purge` (D7); verificar los escenarios de "Desinstalación" y "Restauración al desinstalar"

## 5. Pruebas y documentación del instalador

- [x] 5.1 Crear `tests/install_test.sh` con `HOME`/`XDG_CONFIG_HOME` temporales y un `claude` falso en el `PATH`, con un caso por escenario de `pantheon-installer` y `bifrost-activation` (incluida la idempotencia); verificar que `bash tests/install_test.sh` pasa entero
- [x] 5.2 Crear `README.md` con qué es el panteón, requisitos, uso de `install.sh` (modos, flags, ejemplos), cómo cambiar de backend de Munin el cambio BREAKING de `/munin` y qué modelo usa cada especialista y cómo cambiarlo; verificar que cada comando del README se ejecuta tal cual en `HOME` temporal

## 6. Integración

- [x] 6.1 Migrar la instalación real con `./install.sh install --mode=link --bifrost=link` y el backend elegido por Héctor; verificar que `claude plugin list` ya no muestra `nordic-pantheon@nordic-pantheon`, que existe `~/.claude/skills/nordic-pantheon` y que `~/.claude/CLAUDE.md` sigue apuntando a `bifrost/CLAUDE.md` sin backup nuevo
- [x] 6.2 En una sesión nueva, comprobar que están disponibles `nordic-pantheon:bifrost`, `nordic-pantheon:munin-mimir` y `nordic-pantheon:munin-memory`, que un recall con `munin-memory` lee la memoria del proyecto y la global, y que `/hugin` se ejecuta en un subagente con `sonnet` sin cambiar el modelo de la sesión

## Workflow follow-up

- Validar con Heimdall (`/opsx:verify`) y, si pasa, cerrar con Hela (`/opsx:archive`).
- Guardar con Munin los aprendizajes del change.
