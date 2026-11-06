# Design

## Context

Ver `proposal.md` (Why). Estado observado:

- `install.sh` (476 líneas): `parse_args` valida cada flag con `validate` (línea 237) antes de llamar a `claude`; `cmd_install` hace `require_claude` → `resolve_options` (preguntas con `ask` o defectos con `--yes`) → `check_optional_deps` (solo avisa; distingue el MCP presente solo en `claude_desktop_config.json`, líneas 301-313) → comprobación de la ruta de skills → enlace o marketplace → Bifröst → `ensure_graphify` → `config_write`. `cmd_update` y `cmd_uninstall` no miran Munin.
- `ensure_graphify` es el modelo de dependencia opcional: corre después del enlace y de Bifröst, nunca aborta, avisa y degrada.
- `tests/install_test.sh` (810 líneas): `HOME` y `XDG_CONFIG_HOME` temporales; `SYSBIN` enlaza todo `/usr/local/bin`, `/usr/bin` y `/bin` salvo `uv|uvx|pipx|graphify|claude|openspec`, así que hoy el `git` real (`/usr/bin/git`) es visible y `go` (`/usr/local/go/bin/go`) no. Herramientas falsas en `tests/fixtures/<x>-bin/`, registran en `$FAKE_CLAUDE_STATE/tools.txt`. `setup` exporta `FAKE_MIMIR=1`: el `claude` falso responde con éxito a `mcp get mimisbrunnr` y no simula `mcp add`. `c_missing_mimir_mcp` y `c_mimir_desktop_only` usan `FAKE_MIMIR=0` con `--yes`.
- Mimisbrunnr: repo público sin releases; `go.mod` con `module github.com/Gentleman-Programming/mimisbrunnr` y `go 1.26.2`; binario en `./cmd/mimisbrunnr`.
- En esta máquina: Go 1.26.2 en `/usr/local/go/bin`, `git` en `/usr/bin`, `~/.local/bin/mimisbrunnr` ya existe, `claude mcp get mimisbrunnr` falla y la app de escritorio registra el MCP con `MIMISBRUNNR_DRIVER=sqlite` y `MIMISBRUNNR_SQLITE_PATH=/home/hectorgonzalez/.config/mimisbrunnr/mimisbrunnr.db`.
- `add-var-drift-watcher` (sin archivar) modifica el requisito "Configuración persistida" y añade `VAR_*` a `config_write`.

## Goals / Non-Goals

**Goals:**
- Que `./install.sh install --yes` deje Munin-mimir con memoria en la CLI sin pasos manuales cuando hay `git` y Go 1.26+.
- Que nada de Mimisbrunnr pueda hacer fallar la instalación del plugin.
- Que la CLI y la app de escritorio compartan la misma base de datos cuando `XDG_CONFIG_HOME` no está definido (o vale `~/.config`).

**Non-Goals:**
- Actualizar Mimisbrunnr desde `update` (no compila; un `install` con el MCP sin registrar sí recompila, ver D4).
- Gestionar el ciclo de vida del MCP al desinstalar o al cambiar de backend.
- Elegir otro driver de Mimisbrunnr que no sea `sqlite`.

## Decisions

### D1. Flag `--mimir=install|skip` sin persistir
`parse_args` añade `--mimir=*` con `validate mimir "$MIMIR" install skip`, así un valor no válido aborta antes de llamar a `claude`, igual que los demás flags. Con `--yes`, `MIMIR="${MIMIR:-install}"`. Con `--munin=memory`, `--mimir` se valida pero se ignora sin mensaje.

No se escribe en la config: `install` es la única fase que lo usa, `update` no compila y `uninstall` no toca Mimisbrunnr, así que ningún otro subcomando necesita recordarlo. La idempotencia la da `claude mcp get`. Además, no tocar `config_write` evita modificar "Configuración persistida", que ya modifica `add-var-drift-watcher`.
*Alternativa*: guardar `MIMIR_INSTALL=skip` para que un `install --yes` posterior respete un "no" anterior. Descartada: el humano fijó que `--yes` instala por defecto, y `--mimir=skip` cubre ese caso.

### D2. Cuándo y en qué orden se pregunta
`resolve_options` calcula una vez `MIMIR_REGISTERED` (`claude mcp get mimisbrunnr`) cuando `MUNIN=mimir`; `require_claude` ya corrió. La pregunta "Instalar el MCP Mimisbrunnr (git + Go 1.26+)" `[install/skip] (install)` va **la última**, después de Hugin, y solo si `MUNIN=mimir`, no está registrado y no llegó `--mimir`. Ir al final mantiene el orden de respuestas por stdin de los casos actuales.
*Alternativa*: preguntarla justo después de Munin. Descartada: cambia el orden de las respuestas para quien automatiza con stdin.

`check_optional_deps` reutiliza `MIMIR_REGISTERED`: con `skip` mantiene los dos avisos actuales (solo en escritorio / no configurado); con `install` no avisa, porque se instalará después.

### D3. Función `ensure_mimisbrunnr`, después de `ensure_graphify`
Se llama en `cmd_install` tras `ensure_graphify` y antes de `config_write`, por lo que no corre si la instalación aborta antes (ruta de skills ajena). Flujo:

1. Sale si `MUNIN≠mimir`, `MIMIR=skip` o `MIMIR_REGISTERED=1`.
2. Herramientas: `command -v git`, `command -v go` y versión con `go env GOVERSION` (`go1.26.2` → mayor 1, menor 26; se exige ≥ 1.26). Versión no reconocible (p. ej. `devel …`) → se trata como insuficiente. Si algo falla → aviso con lo que falta y los pasos manuales (D6) y sale.
3. Caché `MIMIR_SRC="${XDG_CACHE_HOME:-$HOME/.cache}/nordic-pantheon/mimisbrunnr"`:
   - No existe → `git clone --depth 1 https://github.com/HectroyanDev/Mimisbrunnr "$MIMIR_SRC"`; si falla, aviso y sale.
   - Existe y `git -C "$MIMIR_SRC" remote get-url origin` es la URL → `git -C "$MIMIR_SRC" pull --ff-only`; si falla, aviso y sigue con lo que hay.
   - Existe y no es ese clon → aviso con la ruta y sale sin tocarla (mismo criterio que la ruta de skills ajena).
4. `mkdir -p ~/.local/bin` y `(cd "$MIMIR_SRC" && go build -o "$HOME/.local/bin/mimisbrunnr" ./cmd/mimisbrunnr)`, sobrescribiendo el binario si ya existe; si falla, aviso y sale sin registrar.
5. `MIMIR_DB_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/mimisbrunnr"`, `mkdir -p "$MIMIR_DB_DIR"` y `claude mcp add -s user mimisbrunnr -e MIMISBRUNNR_DRIVER=sqlite -e MIMISBRUNNR_SQLITE_PATH="$MIMIR_DB_DIR/mimisbrunnr.db" -- "$HOME/.local/bin/mimisbrunnr"`. El nombre va antes de `-e` porque `-e` es variádico y se comería el nombre; `--` separa el comando. Si falla, aviso con esa orden. Si tiene éxito, se comprueba con `claude mcp get mimisbrunnr` e `info` con el resultado.

*Alternativa*: `go install github.com/HectroyanDev/Mimisbrunnr/cmd/mimisbrunnr@latest`. Descartada: la ruta de módulo del `go.mod` no coincide con la URL y Go la rechaza.

### D4. Compilar siempre que haya que instalar
Si el MCP no está registrado en la CLI y `MIMIR=install`, se clona o actualiza la caché y se compila siempre, sobrescribiendo `~/.local/bin/mimisbrunnr` si ya existe. Así el binario registrado corresponde al último código del repo y no hace falta explicar cómo recompilar a mano un binario viejo. La idempotencia no cambia: con el MCP registrado, `ensure_mimisbrunnr` sale en el paso 1 y no compila ni registra.
*Alternativa*: reutilizar un `~/.local/bin/mimisbrunnr` ejecutable y registrarlo sin compilar. Descartada por el humano: registraría un binario de origen y versión desconocidos. Coste: hace falta `git` y Go 1.26+ aunque ya haya un binario, y se sobrescribe el que hubiera (en esta máquina, el que usa la app de escritorio, que pasa a ser el recién compilado).

### D5. Ruta de la base de datos según XDG y binario en ruta fija
`MIMISBRUNNR_SQLITE_PATH` es `${XDG_CONFIG_HOME:-$HOME/.config}/mimisbrunnr/mimisbrunnr.db`, el mismo criterio que la config del panteón (`CONFIG_DIR`) y la detección de `claude_desktop_config.json`. Sin `XDG_CONFIG_HOME` coincide con la ruta que usa la app de escritorio, así que ambas comparten memoria. El binario va a `$HOME/.local/bin` aunque no esté en el `PATH`: el registro usa la ruta absoluta.
*Alternativa*: fijar `$HOME/.config/mimisbrunnr/mimisbrunnr.db`. Descartada por el humano: ignora `XDG_CONFIG_HOME`.

### D6. Mensajes de degradación
Todos con `warn` y terminan con la receta manual, en una sola línea por paso:
`git clone https://github.com/HectroyanDev/Mimisbrunnr <dir> && cd <dir> && go build -o ~/.local/bin/mimisbrunnr ./cmd/mimisbrunnr` y la orden de `claude mcp add` de D3. Añaden "o reinstala con --munin=memory".

### D7. Pruebas con herramientas falsas
- `SYSBIN` excluye también `git` y `go`. Nuevos `tests/fixtures/git-bin/git` y `tests/fixtures/go-bin/go`, añadidos al `PATH` del caso con `use_tools git go`. Registran cada llamada en `tools.txt`.
- `git` falso: `clone … <dir>` crea `<dir>/cmd/mimisbrunnr/` y guarda la URL; `-C <dir> remote get-url origin` la devuelve; `-C <dir> pull --ff-only` no hace nada. `FAKE_GIT_FAIL=1` hace fallar `clone` y `pull`.
- `go` falso: `env GOVERSION` imprime `go${FAKE_GO_VERSION:-1.26.2}`; `build -o <x> ./cmd/mimisbrunnr` crea `<x>` ejecutable. `FAKE_GO_FAIL=1` hace fallar `build`.
- `claude` falso: `mcp add …` registra los argumentos en `log.txt` y crea `$FAKE_CLAUDE_STATE/mimir-registered`; `mcp get mimisbrunnr` tiene éxito con `FAKE_MIMIR=1` o si existe ese archivo; `FAKE_MCP_ADD_FAIL=1` hace fallar `mcp add`; `mcp remove` se registra para poder comprobar que no se llama.
- Los casos que hoy usan `FAKE_MIMIR=0` con `--yes` pasan a `--mimir=skip` para conservar lo que prueban.
- `setup` exporta `XDG_CONFIG_HOME`, así que los casos comprueban por defecto la base bajo `$XDG_CONFIG_HOME/mimisbrunnr/`; el caso sin XDG ejecuta el instalador con `env -u XDG_CONFIG_HOME` y comprueba `$HOME/.config/mimisbrunnr/`.

## Risks / Trade-offs

- [Go 1.26.0 o 1.26.1 con `go 1.26.2` en el `go.mod`] → con `GOTOOLCHAIN=auto` (por defecto) Go descarga la 1.26.2; con `GOTOOLCHAIN=local` falla el `go build` y se cae en el aviso de D6. No se fuerza ninguno de los dos.
- [`go build` necesita red para módulos] → sin red falla y se avisa; la instalación del plugin no se ve afectada.
- [Se sobrescribe un `~/.local/bin/mimisbrunnr` previo (D4)] → el humano lo eligió; si el clon o la compilación fallan, el binario previo no se toca porque `go build -o` solo escribe al terminar bien.
- [`XDG_CONFIG_HOME` distinto de `~/.config`] → la CLI usa otra base que la app de escritorio, que tiene su ruta fija en `claude_desktop_config.json`; README lo indica.
- [La caché queda en disco tras `uninstall`] → decisión de alcance (uninstall no toca Mimisbrunnr); README indica la ruta para borrarla a mano.
- [Cambios en el repo de Mimisbrunnr (ruta `./cmd/mimisbrunnr`, variables de entorno)] → el fallo cae en D6; el instalador no se rompe.
- [`--mimir` se parece a `--munin=mimir`] → la ayuda y el README los explican juntos.

## Migration Plan

Sin migración de config. Tras actualizar el repo, `./install.sh install` (o `install --yes`) en una máquina con `--munin=mimir` sin el MCP en la CLI lo registra; en esta máquina actualiza la caché, recompila y sobrescribe `~/.local/bin/mimisbrunnr` (D4). Rollback: `claude mcp remove -s user mimisbrunnr` y borrar la caché a mano; el plugin no depende de ello.
