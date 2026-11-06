# Spec Delta

## MODIFIED Requirements

### Requirement: Modo interactivo y flags
`install` SHALL preguntar de forma interactiva cada opción (`mode`, `munin`, `bifrost`, `hugin`) que no reciba por flag, y también `mimir` cuando el backend de Munin es `mimir`, `claude mcp get mimisbrunnr` falla y no llega `--mimir`. Con `--yes`, las opciones sin flag MUST tomar su valor por defecto (`mode=link`, `munin=mimir`, `bifrost=link`, `hugin=plain`, `mimir=install`) sin preguntar. Un valor de flag no válido MUST abortar sin cambios.

#### Scenario: Todo por flags
- **WHEN** el humano ejecuta `./install.sh install --mode=link --munin=memory --bifrost=skill --hugin=plain`
- **THEN** el script no hace ninguna pregunta y aplica esas opciones

#### Scenario: Flag no válido
- **WHEN** el humano ejecuta `./install.sh install --munin=engram`
- **THEN** el script informa de los valores válidos y sale con código distinto de cero sin modificar nada

#### Scenario: Flag de Hugin no válido
- **WHEN** el humano ejecuta `./install.sh install --hugin=ctags`
- **THEN** el script informa de que los valores válidos son `plain` y `graphify` y sale con código distinto de cero sin modificar nada

#### Scenario: Flag de Mimir no válido
- **WHEN** el humano ejecuta `./install.sh install --mimir=maybe`
- **THEN** el script informa de que los valores válidos son `install` y `skip` y sale con código distinto de cero sin modificar nada ni llamar a `claude`

#### Scenario: Valores por defecto
- **WHEN** el humano ejecuta `./install.sh install --yes`
- **THEN** el script instala en modo `link`, con Munin `mimir`, Bifröst `link` y Hugin `plain`, sin preguntar y sin instalar graphify, e instala el MCP Mimisbrunnr si `claude mcp get mimisbrunnr` falla

#### Scenario: Pregunta del backend de Hugin
- **WHEN** el humano ejecuta `./install.sh install --mode=link --munin=memory --bifrost=skill` sin `--yes`
- **THEN** el script pregunta solo el backend de Hugin, con `plain` como valor por defecto

#### Scenario: Pregunta de instalar Mimisbrunnr
- **WHEN** `claude mcp get mimisbrunnr` falla y el humano ejecuta `./install.sh install --mode=link --munin=mimir --bifrost=skill --hugin=plain` sin `--yes`
- **THEN** el script pregunta solo si instalar el MCP Mimisbrunnr, con `install` como valor por defecto

#### Scenario: Sin pregunta de Mimisbrunnr si ya está registrado
- **WHEN** `claude mcp get mimisbrunnr` tiene éxito y el humano ejecuta `./install.sh install --mode=link --munin=mimir --bifrost=skill --hugin=plain` sin `--yes`
- **THEN** el script no hace ninguna pregunta

#### Scenario: Sin pregunta de Mimisbrunnr con Munin memory
- **WHEN** `claude mcp get mimisbrunnr` falla y el humano ejecuta `./install.sh install --mode=link --munin=memory --bifrost=skill --hugin=plain` sin `--yes`
- **THEN** el script no hace ninguna pregunta ni compila ni registra Mimisbrunnr

### Requirement: Comprobación de dependencias
`install` SHALL comprobar las dependencias antes de cambiar nada. La ausencia de la CLI `claude` MUST abortar la instalación. La ausencia de `openspec` MUST mostrar un aviso sin abortar. La ausencia del MCP `mimisbrunnr` cuando el backend elegido es `mimir` MUST llevar a instalarlo con `mimir=install` y MUST mostrar un aviso sin abortar con `mimir=skip`.

#### Scenario: Falta la CLI claude
- **WHEN** `claude` no está en el `PATH`
- **THEN** el script aborta con un mensaje que lo indica y no modifica nada

#### Scenario: Falta el MCP de Mimir
- **WHEN** el backend elegido es `mimir`, `claude mcp get mimisbrunnr` falla y el humano instala con `--mimir=skip`
- **THEN** el script avisa de que Munin no tendrá memoria hasta configurar ese MCP, no llama a `git`, `go` ni `claude mcp add`, y continúa con éxito

#### Scenario: Mimir solo en la app de escritorio y se omite su instalación
- **WHEN** el backend elegido es `mimir`, `claude mcp get mimisbrunnr` falla, `claude_desktop_config.json` contiene `mimisbrunnr` y el humano instala con `--mimir=skip`
- **THEN** el script avisa de que el MCP solo está en la app de escritorio y Munin no tendrá memoria en sesiones de la CLI, y continúa con éxito

## ADDED Requirements

### Requirement: Instalación del MCP Mimisbrunnr
Con backend `mimir`, `mimir=install` y `claude mcp get mimisbrunnr` fallando, `install` SHALL clonar o actualizar `https://github.com/HectroyanDev/Mimisbrunnr` en `${XDG_CACHE_HOME:-~/.cache}/nordic-pantheon/mimisbrunnr`, compilar `./cmd/mimisbrunnr` con `go build -o ~/.local/bin/mimisbrunnr` y registrar el binario en la CLI con `claude mcp add -s user`. MUST no usar `go install` ni tocar `claude_desktop_config.json`.

#### Scenario: Instalación con git y Go 1.26+
- **WHEN** `claude mcp get mimisbrunnr` falla, hay `git` y Go 1.26 o superior, y el humano ejecuta `./install.sh install --yes`
- **THEN** el script clona el repo en la caché, compila `~/.local/bin/mimisbrunnr`, lo registra con ámbito `user` y al terminar `claude mcp get mimisbrunnr` tiene éxito

#### Scenario: Sin tocar la app de escritorio
- **WHEN** termina una instalación que registra Mimisbrunnr
- **THEN** `claude_desktop_config.json` no ha cambiado y el registro de llamadas a `go` no contiene `install`

#### Scenario: Clon previo en la caché
- **WHEN** la caché ya contiene un clon de `https://github.com/HectroyanDev/Mimisbrunnr` y hay que compilar
- **THEN** el script lo actualiza con `git pull --ff-only` en lugar de clonar de nuevo y compila; si el `pull` falla, avisa y compila lo que hay

#### Scenario: Caché ocupada por otra cosa
- **WHEN** la ruta de la caché existe y no es un clon de `https://github.com/HectroyanDev/Mimisbrunnr`
- **THEN** el script avisa indicando la ruta, no la toca, no compila ni registra, y la instalación del plugin termina con éxito

#### Scenario: No se instala si la instalación aborta
- **WHEN** la instalación aborta antes de cambiar nada (por ejemplo, `~/.claude/skills/nordic-pantheon` ocupado por otra cosa)
- **THEN** el script no llama a `git`, `go` ni `claude mcp add`

### Requirement: Mimisbrunnr se compila siempre al instalarlo
Cuando `install` instala el MCP Mimisbrunnr, SHALL compilar siempre el binario aunque `~/.local/bin/mimisbrunnr` ya exista, y MUST sobrescribirlo en lugar de registrar el binario previo.

#### Scenario: Binario previo sin registro
- **WHEN** `claude mcp get mimisbrunnr` falla, `~/.local/bin/mimisbrunnr` ya existe y es ejecutable, hay `git` y Go 1.26 o superior, y el humano ejecuta `./install.sh install --yes`
- **THEN** el script clona o actualiza la caché, compila con `go build -o ~/.local/bin/mimisbrunnr` sobrescribiendo el binario anterior y lo registra con ámbito `user`

### Requirement: Registro de Mimisbrunnr en la CLI
El registro SHALL usar `claude mcp add -s user`, el nombre `mimisbrunnr`, el comando `~/.local/bin/mimisbrunnr` y las variables `MIMISBRUNNR_DRIVER=sqlite` y `MIMISBRUNNR_SQLITE_PATH=${XDG_CONFIG_HOME:-$HOME/.config}/mimisbrunnr/mimisbrunnr.db`. El directorio de esa base MUST existir antes de registrar.

#### Scenario: Entorno del registro sin XDG_CONFIG_HOME
- **WHEN** `XDG_CONFIG_HOME` no está definido y el script registra el MCP
- **THEN** la llamada a `claude mcp add` usa `-s user`, el nombre `mimisbrunnr`, el comando `~/.local/bin/mimisbrunnr` y las variables `MIMISBRUNNR_DRIVER=sqlite` y `MIMISBRUNNR_SQLITE_PATH=$HOME/.config/mimisbrunnr/mimisbrunnr.db`, y el directorio `$HOME/.config/mimisbrunnr/` existe

#### Scenario: Entorno del registro con XDG_CONFIG_HOME
- **WHEN** `XDG_CONFIG_HOME` está definido y el script registra el MCP
- **THEN** la llamada a `claude mcp add` usa `MIMISBRUNNR_SQLITE_PATH=$XDG_CONFIG_HOME/mimisbrunnr/mimisbrunnr.db`, el directorio `$XDG_CONFIG_HOME/mimisbrunnr/` existe y no se crea `$HOME/.config/mimisbrunnr/`

### Requirement: Mimisbrunnr ya registrado
`install` SHALL no clonar, actualizar, compilar ni registrar Mimisbrunnr si `claude mcp get mimisbrunnr` tiene éxito, exista o no `~/.local/bin/mimisbrunnr`.

#### Scenario: MCP ya registrado
- **WHEN** `claude mcp get mimisbrunnr` tiene éxito y el humano ejecuta `./install.sh install --yes --mimir=install`
- **THEN** el script no llama a `git`, `go` ni `claude mcp add`

#### Scenario: Segunda ejecución
- **WHEN** el humano ejecuta `./install.sh install --yes` dos veces seguidas con `git` y Go 1.26+ disponibles y sin el MCP registrado al empezar
- **THEN** `go build` y `claude mcp add` se ejecutan una sola vez

### Requirement: Sin herramientas para compilar Mimisbrunnr
Si hay que compilar Mimisbrunnr y falta `git`, falta `go` o la versión de Go es menor que 1.26, `install` SHALL avisar indicando qué falta y cómo instalar el MCP a mano, no registrar nada y terminar el resto de la instalación con éxito.

#### Scenario: Sin Go
- **WHEN** hay que compilar Mimisbrunnr y `go` no está en el `PATH`
- **THEN** el script avisa de que necesita Go 1.26+ con los pasos manuales, no llama a `git` ni a `claude mcp add` y el código de salida es cero

#### Scenario: Go demasiado antiguo
- **WHEN** hay que compilar Mimisbrunnr y `go` informa de la versión 1.25
- **THEN** el script avisa de que necesita Go 1.26+, no compila ni registra y el código de salida es cero

#### Scenario: Sin git
- **WHEN** hay que compilar Mimisbrunnr y `git` no está en el `PATH`
- **THEN** el script avisa de que necesita `git` con los pasos manuales, no llama a `go build` ni a `claude mcp add` y el código de salida es cero

### Requirement: Fallo al instalar Mimisbrunnr
Si falla el clon, la compilación o `claude mcp add`, `install` SHALL avisar con la orden que falló y los pasos manuales, y terminar el resto de la instalación con éxito. Un fallo de compilación MUST no registrar el MCP.

#### Scenario: Falla la compilación
- **WHEN** `go build` termina con código distinto de cero
- **THEN** el script avisa, no llama a `claude mcp add` y el código de salida es cero

#### Scenario: Falla el registro
- **WHEN** `claude mcp add` termina con código distinto de cero
- **THEN** el script avisa con la orden de registro para ejecutarla a mano y el código de salida es cero

### Requirement: Update no compila Mimisbrunnr
`update` SHALL no clonar, actualizar, compilar ni registrar Mimisbrunnr.

#### Scenario: Update en modo enlace
- **WHEN** la config indica `MUNIN_BACKEND=mimir`, `claude mcp get mimisbrunnr` falla y el humano ejecuta `./install.sh update`
- **THEN** el script no llama a `git`, `go` ni `claude mcp add`

### Requirement: Mimisbrunnr fuera de uninstall y del cambio de backend
`uninstall` (con o sin `--purge`) y reinstalar con `--munin=memory` SHALL no borrar `~/.local/bin/mimisbrunnr`, la caché del clon ni `${XDG_CONFIG_HOME:-~/.config}/mimisbrunnr/`, y MUST no llamar a `claude mcp remove`.

#### Scenario: Desinstalar tras instalar Mimisbrunnr
- **WHEN** el instalador registró Mimisbrunnr y el humano ejecuta `./install.sh uninstall --purge`
- **THEN** `~/.local/bin/mimisbrunnr`, la caché del clon y `${XDG_CONFIG_HOME:-~/.config}/mimisbrunnr/` siguen en disco y no hubo llamada a `claude mcp remove`

#### Scenario: De mimir a memory
- **WHEN** el instalador registró Mimisbrunnr y el humano reinstala con `--munin=memory`
- **THEN** la config contiene `MUNIN_BACKEND=memory`, el binario sigue en disco y no hubo llamada a `claude mcp remove`
