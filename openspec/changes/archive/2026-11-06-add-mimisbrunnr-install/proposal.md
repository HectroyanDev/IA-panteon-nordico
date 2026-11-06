# Proposal

## Why

Munin usa por defecto el backend `mimir`, que necesita el MCP `mimisbrunnr` registrado en la CLI `claude`. Hoy `install.sh` solo comprueba que falta y avisa: el humano tiene que clonar Mimisbrunnr, compilarlo y registrarlo a mano, y hasta entonces Munin no tiene memoria. Como Mimisbrunnr no publica binarios y su `go.mod` declara un módulo que no coincide con la URL del repo (`go install …@latest` falla), el paso manual no es obvio.

## What Changes

- `install.sh` gana la instalación **opcional** del MCP Mimisbrunnr. Solo aplica con `--munin=mimir` y cuando `claude mcp get mimisbrunnr` falla.
- Nuevo flag `--mimir=install|skip`. En modo interactivo, si aplica y no llega por flag, se pregunta (por defecto `install`). Con `--yes`, el valor por defecto es `install`. Un valor no válido aborta sin tocar nada. La elección no se guarda en la config: es una acción puntual y la idempotencia la da `claude mcp get`.
- Obtención del binario: clona `https://github.com/HectroyanDev/Mimisbrunnr` en una caché del panteón y compila con `go build -o ~/.local/bin/mimisbrunnr ./cmd/mimisbrunnr`. Si la caché ya tiene el clon, se actualiza con `git pull --ff-only`. Requiere `git` y Go 1.26+. Siempre que toque instalar se compila, y el binario se sobrescribe si ya existe: no se reutiliza un `~/.local/bin/mimisbrunnr` previo.
- Registro solo en la CLI: `claude mcp add -s user mimisbrunnr` con el binario y `MIMISBRUNNR_DRIVER=sqlite`, `MIMISBRUNNR_SQLITE_PATH=${XDG_CONFIG_HOME:-$HOME/.config}/mimisbrunnr/mimisbrunnr.db` (sin `XDG_CONFIG_HOME`, la misma base que usa la app de escritorio en esta máquina). No toca `claude_desktop_config.json`.
- Sin `git`, sin Go o con Go < 1.26, o si falla la compilación o el registro: aviso con instrucciones y la instalación del plugin termina con éxito.
- Idempotencia: si el MCP ya está registrado en la CLI, no se clona, no se compila ni se registra. `./install.sh update` no compila.
- `uninstall` y el paso a `--munin=memory` no tocan el binario, el registro del MCP, la base de datos ni la caché del clon.
- `tests/install_test.sh` gana `git` y `go` falsos, `claude mcp add` en el `claude` falso y un caso por escenario. README y `--help` documentan el flag y los requisitos. `plugin.json` sube a `1.6.0`.

Fuera de alcance: desinstalar Mimisbrunnr, registrarlo en la app de escritorio, binarios precompilados y arreglar el `go.mod` de Mimisbrunnr.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `pantheon-installer`: flag `--mimir` en modo interactivo y con `--yes`; la falta del MCP con backend `mimir` pasa de solo avisar a ofrecer la instalación; nuevos requisitos de instalación del MCP Mimisbrunnr (obtención, compilación siempre, registro con base de datos según XDG, MCP ya registrado, degradación sin herramientas, `update` y `uninstall` sin efectos sobre Mimisbrunnr).

## Impact

- Modificados: `install.sh` (flag, pregunta, instalación y registro de Mimisbrunnr, ayuda), `tests/install_test.sh` (casos nuevos y ajuste de los que usan `FAKE_MIMIR=0`), `tests/fixtures/bin/claude` (`mcp add`), `README.md` (requisitos, flags, actualizar, desinstalar, cambios en 1.6.0), `.claude-plugin/plugin.json` (versión `1.6.0`).
- Nuevos: `tests/fixtures/git-bin/git` y `tests/fixtures/go-bin/go` (falsos).
- Dependencias externas nuevas, opcionales: `git`, Go 1.26+ y red para clonar y descargar módulos.
- Efectos en la máquina del humano (solo con `install`): `${XDG_CACHE_HOME:-~/.cache}/nordic-pantheon/mimisbrunnr/`, `~/.local/bin/mimisbrunnr` (sobrescrito si existía), `${XDG_CONFIG_HOME:-~/.config}/mimisbrunnr/` y una entrada `mimisbrunnr` de ámbito `user` en la config de MCP de la CLI.
- Convivencia con `add-var-drift-watcher` (sin archivar): ese change modifica "Configuración persistida"; este no la toca, así que no hay conflicto al archivar.
