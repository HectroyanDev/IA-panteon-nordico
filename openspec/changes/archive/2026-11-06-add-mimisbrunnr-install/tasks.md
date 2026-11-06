# Tasks

## 1. Harness de pruebas

- [x] 1.1 Excluir `git` y `go` de `SYSBIN` en `tests/install_test.sh`, crear `tests/fixtures/git-bin/git` y `tests/fixtures/go-bin/go` según D7 (registro en `tools.txt`, `FAKE_GIT_FAIL`, `FAKE_GO_VERSION`, `FAKE_GO_FAIL`) y ampliar `use_tools` con `git` y `go`; verificar que `bash tests/install_test.sh` sigue entero en verde sin otros cambios
- [x] 1.2 Ampliar `tests/fixtures/bin/claude` con `mcp add` (registro en `log.txt`, marca `mimir-registered`, `FAKE_MCP_ADD_FAIL`), `mcp remove` (solo registro) y `mcp get mimisbrunnr` con éxito si `FAKE_MIMIR=1` o existe la marca; verificar que `bash tests/install_test.sh` sigue en verde

## 2. Flag y pregunta

- [x] 2.1 Añadir `--mimir=install|skip` a `parse_args` (validación antes de llamar a `claude`), a `usage` y a `resolve_options` según D1 y D2 (`MIMIR_REGISTERED`, pregunta la última, defecto `install` con `--yes`); pasar `c_missing_mimir_mcp` y `c_mimir_desktop_only` a `--mimir=skip` y ajustar `check_optional_deps` para que con `install` no avise; añadir los casos "Flag de Mimir no válido", "Pregunta de instalar Mimisbrunnr", "Sin pregunta de Mimisbrunnr si ya está registrado", "Sin pregunta de Mimisbrunnr con Munin memory", "Falta el MCP de Mimir" (con `--mimir=skip`) y comprobar `--mimir=install|skip` en `c_help`; verificar con `bash tests/install_test.sh` entero en verde

## 3. Instalación de Mimisbrunnr

- [x] 3.1 Implementar `ensure_mimisbrunnr` según D3–D6 y llamarla en `cmd_install` tras `ensure_graphify`; añadir los casos de "Instalación del MCP Mimisbrunnr" (con git y Go, sin tocar `claude_desktop_config.json` ni `go install`, clon previo con `pull --ff-only` y con `pull` fallido, caché ajena, no se instala si la instalación aborta), "Mimisbrunnr se compila siempre al instalarlo" (binario previo sin registro que se recompila y sobrescribe), "Registro de Mimisbrunnr en la CLI" (`-s user` y las dos variables, con `XDG_CONFIG_HOME` definido y con `env -u XDG_CONFIG_HOME`, según D5 y D7) y "Valores por defecto" con el MCP sin registrar; verificar con `bash tests/install_test.sh` entero en verde
- [x] 3.2 Añadir los casos de "Mimisbrunnr ya registrado" (MCP registrado sin `git`, `go` ni `mcp add`, segunda ejecución con un solo `go build` y un solo `mcp add`), "Sin herramientas para compilar Mimisbrunnr" (sin Go, Go 1.25, sin git) y "Fallo al instalar Mimisbrunnr" (falla `go build` sin `mcp add`, falla `mcp add` con la orden en el aviso), todos con código de salida cero; verificar con `bash tests/install_test.sh` entero en verde
- [x] 3.3 Añadir los casos de "Update no compila Mimisbrunnr" y "Mimisbrunnr fuera de uninstall y del cambio de backend" (uninstall `--purge` conserva binario, caché y `$XDG_CONFIG_HOME/mimisbrunnr/` sin `mcp remove`; reinstalar con `--munin=memory` igual) sin cambiar `cmd_update` ni `cmd_uninstall`; verificar con `bash tests/install_test.sh` entero en verde

## 4. Documentación y versión

- [x] 4.1 Actualizar `README.md`: fila del MCP `mimisbrunnr` en Requisitos (instalación opcional, `git` y Go 1.26+, compila siempre y sobrescribe `~/.local/bin/mimisbrunnr`, base en `${XDG_CONFIG_HOME:-~/.config}/mimisbrunnr/mimisbrunnr.db` compartida con la app de escritorio solo sin `XDG_CONFIG_HOME`, degradación con aviso, la app de escritorio no se toca), fila de `--mimir` en la tabla de flags y ejemplo `--mimir=skip`, nota en Actualizar (`update` no compila Mimisbrunnr), nota en Desinstalar (no toca binario, registro, base de datos ni caché; cómo retirarlos a mano), sección "Cambios en 1.6.0" y mención de `git` y `go` falsos en Pruebas; subir `.claude-plugin/plugin.json` a `1.6.0`; verificar con `claude plugin validate .` y que cada orden del README coincide con `./install.sh --help`

## 5. Integración

- [x] 5.1 En esta máquina (Go 1.26.2, `git`, binario ya presente en `~/.local/bin/mimisbrunnr`, MCP solo en la app de escritorio, `XDG_CONFIG_HOME` sin definir), ejecutar `./install.sh install --yes` y verificar que clona o actualiza la caché y recompila `~/.local/bin/mimisbrunnr` (fecha de modificación nueva), que `claude mcp get mimisbrunnr` responde con ámbito `user` y la base `~/.config/mimisbrunnr/mimisbrunnr.db`, que `~/.config/Claude/claude_desktop_config.json` no cambió y que una segunda ejecución no vuelve a compilar ni a llamar a `claude mcp add`
