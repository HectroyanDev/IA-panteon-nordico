# Design

## Context

Ver `proposal.md` (Why). Estado observado:

- `.claude-plugin/plugin.json` (v1.0.0) y `marketplace.json` con `source: "./"`: el repo es a la vez marketplace y plugin. Hoy está instalado por marketplace y Claude Code lo copió a `~/.claude/plugins/cache/nordic-pantheon/nordic-pantheon/1.0.0/`.
- `~/.claude/CLAUDE.md` ya es un symlink a `bifrost/CLAUDE.md`, creado a mano.
- `claude plugin init` crea plugins en `~/.claude/skills/<nombre>/` que se cargan solos como `<nombre>@skills-dir`, sin caché. En `~/.claude/skills` ya hay skills enlazadas por symlink que cargan bien.
- CLI disponible: `claude plugin {install,uninstall,update,list}`, `claude plugin marketplace {add,remove,update,list}`, `claude mcp get <nombre>`, `claude plugin validate <ruta>`.
- La memoria nativa de Claude Code vive en `~/.claude/projects/<cwd con cada carácter no alfanumérico → ->/memory/` (observado: `~/.claude` → `-home-…--claude`), con un archivo por recuerdo (frontmatter `name`, `description`, `metadata.type`) y un índice `MEMORY.md` de una línea por recuerdo, que el harness carga en contexto.
- Solo `skills/odin/SKILL.md` y `bifrost/CLAUDE.md` nombran herramientas `mimir_*` fuera de Munin. Hugin, Hela y Heimdall ya dicen "Munin" a secas.
- No hay `shellcheck` ni `bats` instalados.

## Goals / Non-Goals

**Goals:**
- Un solo script bash sin dependencias obligatorias más allá de `claude` y coreutils (`python3` es opcional, ver D6).
- Modo `link` como camino por defecto, para editar el repo y ver los cambios en la siguiente sesión.
- Que ninguna skill tenga que reescribirse al cambiar de backend o de modo: la elección vive en un archivo de config.

**Non-Goals:**
- Soporte para macOS o Windows (solo se prueba en Linux; el script evita GNU-ismos donde cueste poco).
- Una skill `munin` "router" que conserve `/munin`.
- Gestionar la instalación del MCP `mimisbrunnr` o de `openspec`: solo se detectan.

## Decisions

### D1. Dos modos de instalación con `link` por defecto
`link` crea `~/.claude/skills/nordic-pantheon` → repo. `marketplace` usa `claude plugin marketplace add <repo>` + `claude plugin install nordic-pantheon@nordic-pantheon`. Los dos modos son excluyentes: al instalar uno se retira el otro, para que el plugin no se cargue dos veces con el mismo namespace.
*Alternativa*: sustituir la carpeta de caché por un symlink. Descartada: una reinstalación o un cambio de versión la deshace sin avisar.
*Verificado (tarea 2.1, 2026-10-22)*: con `HOME` temporal y `~/.claude/skills/nordic-pantheon` como symlink al repo, `claude plugin list --json` muestra `nordic-pantheon@skills-dir` (habilitado, scope `user`) y `claude plugin details nordic-pantheon@skills-dir` lista sus skills. El loader sigue symlinks de directorio; no hace falta el plan B de copia.

### D2. Archivo de config en formato `KEY=valor`
`${XDG_CONFIG_HOME:-$HOME/.config}/nordic-pantheon/config`, con `INSTALL_MODE`, `BIFROST_MODE`, `MUNIN_BACKEND`, `CLAUDE_MD_BACKUP` y `REPO_DIR`. El script lo lee sin hacer `source` (lo parsea línea a línea con `grep`/`cut`) para no ejecutar nada inesperado. Las skills lo leen con `cat`.
*Alternativa*: editar `bifrost/CLAUDE.md` o la tabla de Munin según la elección. Descartada: modificaría el archivo versionado del repo, que es el mismo al que apunta el symlink.

### D3. Bifröst con una sola fuente
`bifrost/CLAUDE.md` sigue siendo la fuente. `skills/bifrost/SKILL.md` es un envoltorio corto que indica leer `../../bifrost/CLAUDE.md` relativo a su directorio base y aplicarlo. Funciona en los dos modos porque el plugin incluye el repo entero (en `link` es el propio repo; en `marketplace`, la caché copia la raíz por `source: "./"`).
La skill se publica siempre: un plugin no puede activar skills de forma condicional. `--bifrost` solo decide si además se crea el symlink global. Si el humano eligió `link`, `/bifrost` es redundante pero inofensivo.
*Alternativa*: duplicar el contenido en `SKILL.md`. Descartada por el riesgo de divergencia.

### D4. Selección de Munin en Bifröst, no en un router
La tabla del panteón en `bifrost/CLAUDE.md` pasa a tener una fila Munin que dice: leer `MUNIN_BACKEND` de la config; `mimir` → `nordic-pantheon:munin-mimir`, `memory` → `nordic-pantheon:munin-memory`; sin config, `munin-mimir` si existen herramientas `mcp__mimisbrunnr__*` y `munin-memory` si no. Odín sustituye su sección Memory por "pide a Bifröst que delegue en Munin".
*Alternativa*: una skill `munin` que lea la config y cargue la otra. Descartada por el humano (se pidieron dos skills) y porque añade un salto más.

### D5. `munin-memory` reutiliza el formato nativo
Mismo formato de archivo y de `MEMORY.md` que la memoria de Claude Code, para que lo guardado por Munin y lo guardado por el harness convivan en el ámbito proyecto. La ruta de proyecto se calcula desde el directorio de trabajo (sustituyendo cada carácter que no sea letra o número por `-`, como hace Claude Code); si el directorio no existe, se crea. Ámbito global en `~/.claude/nordic-pantheon/memory/` con el mismo formato. Recall: leer ambos `MEMORY.md`, después los archivos relevantes. Save: buscar primero un archivo del mismo tema y actualizarlo.

### D6. `update` según el modo
- `link`: comprobar que el symlink existe y apunta a `REPO_DIR`; si no, recrearlo. No hace falta nada más: los cambios ya son visibles en la siguiente sesión.
- `marketplace`: `claude plugin marketplace update nordic-pantheon` y `claude plugin update nordic-pantheon@nordic-pantheon`; después comparar `skills/` y `bifrost/` del repo con la ruta de caché (`diff -rq`). Si difieren (la versión no cambió y Claude Code no recopió), `uninstall` + `install` del plugin.
  La ruta de caché sale del campo `installPath` de `claude plugin list --json`, que es una interfaz de la CLI y no un archivo interno. Se lee con `python3`; si no hay `python3` o no aparece la ruta, se trata como desfasada y se reinstala. Resultado correcto en ambos casos, solo más lento sin `python3`.
  *Alternativa*: leer `installed_plugins.json` (descartada: formato interno que puede cambiar) o parsear el JSON con `grep`/`sed` (descartada: frágil con rutas con espacios).

### D7. Backups y desinstalación conservadores
Backup de `~/.claude/CLAUDE.md` en `~/.claude/CLAUDE.md.bak-nordic-<YYYYmmdd-HHMMSS>`, solo si existe y no apunta ya al repo. `uninstall` solo retira symlinks que apunten a `REPO_DIR`. La memoria global se conserva salvo `--purge`.

### D8. Pruebas con HOME aislado y `claude` simulado
`tests/install_test.sh` ejecuta el instalador con `HOME` y `XDG_CONFIG_HOME` en un directorio temporal y un `claude` falso al principio del `PATH` que registra las llamadas y simula `plugin list`, `mcp get`, etc. Así se prueban los escenarios de las specs sin tocar la instalación real. Comprobación estática con `bash -n` (no hay `shellcheck`).

### D9. Modelo por especialista con enfoque híbrido
Según la documentación de Claude Code, `model` en el frontmatter de una skill que corre en el hilo principal cambia el modelo durante el resto del turno; con `context: fork` la skill corre en un subagente y `model` solo afecta a ese subagente. Los subagentes no tienen `AskUserQuestion`.
- Hugin, Munin-mimir, Munin-memory, Skuld, Brokkr, Heimdall y Bragi: `context: fork` + `model` (ver spec `specialist-execution`). Sus pasos que hoy preguntan (Skuld y Brokkr piden el nombre del change) pasan a devolver la pregunta a Bifröst.
- Odín, Forseti y Hela: sin `context` ni `model`; siguen en el hilo principal porque su trabajo es preguntar o pedir permiso.
- `bifrost/CLAUDE.md` gana una regla: al delegar en un especialista en subagente, pasar un encargo completo y lanzar con `AskUserQuestion` las preguntas que devuelva.
*Alternativas*: `model` en el hilo principal (descartada: arrastra el modelo al resto del turno de Bifröst); agentes de plugin en `agents/*.md` (descartada: duplicaría cada especialista en dos archivos y los agentes de plugin ignoran `mcpServers`).

## Risks / Trade-offs

- [El subagente no ve la conversación] → Bifröst pasa un encargo completo (requisito "Encargo completo al delegar").
- [Munin-mimir en subagente sin acceso a `mimir_*`] → Verificado en la tarea 3.4 (2026-10-22): desde la app de escritorio, `munin-mimir` en subagente corre con `claude-haiku-5-5` y `mimir_ping` devuelve `ok`. Ojo: `mimisbrunnr` está solo en la config de la app de escritorio, así que en sesiones de la CLI no hay `mimir_*`; el instalador lo avisa.
- [Un modelo no permitido por la organización] → El subagente falla al arrancar; el README explica cómo cambiar el `model` de una skill.

- [El loader de `skills-dir` no sigue symlinks] → Se verifica pronto (tarea 2.1); si falla, el modo `link` copia en lugar de enlazar y se documenta que `update` vuelve a ser necesario.
- [Cambio BREAKING de `/munin`] → Se documenta en el README y en el resumen de la versión 1.1.0. Las referencias internas pasan por Bifröst.
- [Cambia la salida de `claude plugin list --json` o falta `python3`] → `update` en modo `marketplace` solo la usa para localizar la caché; si no la encuentra, reinstala directamente.
- [Dos sesiones guardando en el mismo `MEMORY.md`] → Riesgo bajo en uso personal; no se añade bloqueo.
- [Reinstalar con `--bifrost=skill` retira un symlink creado a mano] → Solo si apunta a `bifrost/CLAUDE.md` del repo, que es justo el caso que el humano está cambiando.

## Migration Plan

1. Implementar y probar con `tests/install_test.sh`.
2. En la máquina real: `./install.sh install --mode=link --munin=<elección> --bifrost=link`. El script desinstala `nordic-pantheon@nordic-pantheon`, retira el marketplace, crea el symlink de skills-dir y reconoce el symlink de `CLAUDE.md` existente sin crear backup.
3. Abrir una sesión nueva y comprobar que aparecen `nordic-pantheon:bifrost`, `nordic-pantheon:munin-mimir` y `nordic-pantheon:munin-memory`.

Rollback: `./install.sh uninstall` y, si se quiere el estado anterior, `./install.sh install --mode=marketplace --bifrost=link`.
