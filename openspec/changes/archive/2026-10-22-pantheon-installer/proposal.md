# Proposal

## Why

Instalar el panteón hoy exige pasos manuales (añadir el marketplace, instalar el plugin, enlazar `~/.claude/CLAUDE.md`) y la instalación por marketplace copia el plugin a la caché, así que los cambios del repo no se ven sin reinstalar. Además Munin está atado a Mimisbrunnr: sin ese MCP no hay memoria, aunque Claude Code ya trae una memoria nativa por archivos.

## What Changes

- Nuevo `install.sh` en la raíz del repo con subcomandos `install`, `update` y `uninstall`. Pregunta lo que falte de forma interactiva y acepta flags para no preguntar: `--mode=link|marketplace` (por defecto `link`), `--munin=mimir|memory`, `--bifrost=link|skill`, `--yes`.
- Modo `link`: symlink `~/.claude/skills/nordic-pantheon` → repo (plugin `nordic-pantheon@skills-dir`, cambios en vivo). Modo `marketplace`: marketplace local + `claude plugin install` (copia en caché).
- Comprobación de dependencias: CLI `claude` (obligatoria), `openspec` y MCP `mimisbrunnr` si se elige Mimir (avisos).
- Bifröst opcional como orquestador global: `link` crea el symlink `~/.claude/CLAUDE.md` → `bifrost/CLAUDE.md` con backup previo; `skill` lo deja solo como skill del plugin.
- Nueva skill `nordic-pantheon:bifrost` que carga `bifrost/CLAUDE.md` bajo demanda (`/bifrost`).
- Archivo de configuración `~/.config/nordic-pantheon/config` con el modo de instalación, el modo de Bifröst, el backend de Munin y el backup de `CLAUDE.md`.
- **BREAKING**: la skill `munin` pasa a llamarse `munin-mimir` (`/munin` deja de existir; se usa `/munin-mimir` o `/munin-memory`).
- Nueva skill `munin-memory`: memoria nativa de Claude Code por proyecto (`~/.claude/projects/<proyecto>/memory/` + `MEMORY.md`) más una memoria global en `~/.claude/nordic-pantheon/memory/`.
- Bifröst elige la skill de Munin según la config; Odín y `bifrost/CLAUDE.md` dejan de nombrar herramientas `mimir_*` y hablan de "Munin".
- Modelo por especialista: Hugin, Munin-mimir, Munin-memory, Skuld, Brokkr, Heimdall y Bragi se ejecutan en un subagente (`context: fork`) con `model` fijo en su frontmatter; Odín, Forseti y Hela siguen en el hilo principal con el modelo de la sesión porque preguntan al humano. Los especialistas en subagente devuelven sus preguntas a Bifröst.
- `plugin.json` sube a `1.1.0`.

## Capabilities

### New Capabilities
- `pantheon-installer`: instalación, actualización y desinstalación del panteón en la máquina local, en modo enlace o marketplace, con comprobación de dependencias y configuración persistida.
- `bifrost-activation`: activación de Bifröst como orquestador global (symlink a `CLAUDE.md`) o como skill invocable, con backup y restauración del `CLAUDE.md` previo.
- `munin-memory-backends`: memoria del panteón con dos backends intercambiables (Mimisbrunnr o memoria nativa de Claude Code) y selección del backend activo por configuración.
- `specialist-execution`: dónde se ejecuta cada especialista (hilo principal o subagente), con qué modelo y cómo llegan sus preguntas al humano.

### Modified Capabilities

(ninguna: no hay specs previas en `openspec/specs/`)

## Impact

- Nuevos: `install.sh`, `tests/install_test.sh`, `skills/bifrost/`, `skills/munin-memory/`, `README.md`.
- Renombrado: `skills/munin/` → `skills/munin-mimir/`.
- Modificados: `bifrost/CLAUDE.md` (tabla del panteón, sección Memoria, delegación a subagentes; se retiran las filas de Docker porque la skill `docker` se eliminó del repo antes de implementar), `skills/odin/SKILL.md` (sección Memory), frontmatter de `skills/{hugin,munin-mimir,munin-memory,skuld,brokkr,heimdall,bragi}/SKILL.md` y los pasos de Skuld y Brokkr que hoy preguntan con `AskUserQuestion`, `.claude-plugin/plugin.json` (versión).
- Fuera del repo (en ejecución): `~/.claude/skills/nordic-pantheon`, `~/.claude/CLAUDE.md`, `~/.config/nordic-pantheon/config`, `~/.claude/nordic-pantheon/memory/`, registro de plugins y marketplaces de Claude Code.
- La instalación actual de Héctor (marketplace + symlink de `CLAUDE.md`) se migra al ejecutar `install` en modo `link`.
- Fuera de alcance: publicar el repo, migrar recuerdos entre backends, cambiar el comportamiento del resto de especialistas.
