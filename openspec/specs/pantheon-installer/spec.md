# pantheon-installer Specification

## Purpose
Instalar, actualizar y desinstalar el plugin nordic-pantheon en la máquina local con un único script, sin pasos manuales y dejando `~/.claude` como estaba al desinstalar.

## Requirements

### Requirement: Subcomandos del instalador
El repo SHALL incluir `install.sh` con los subcomandos `install`, `update` y `uninstall`. Sin subcomando o con uno desconocido, el script MUST mostrar la ayuda y salir con código distinto de cero.

#### Scenario: Subcomando desconocido
- **WHEN** el humano ejecuta `./install.sh foo`
- **THEN** el script muestra la ayuda con los subcomandos y flags disponibles y sale con código distinto de cero

#### Scenario: Ayuda
- **WHEN** el humano ejecuta `./install.sh --help`
- **THEN** el script muestra la ayuda y sale con código cero sin modificar nada

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

### Requirement: Instalación en modo enlace
En modo `link`, `install` SHALL crear el symlink `~/.claude/skills/nordic-pantheon` apuntando a la raíz del repo, de modo que el plugin se cargue desde el repo sin copia. Si el plugin está instalado por marketplace, MUST desinstalarlo para que no se cargue dos veces.

#### Scenario: Instalación limpia en modo enlace
- **WHEN** no existe `~/.claude/skills/nordic-pantheon` y el humano instala con `--mode=link`
- **THEN** existe el symlink `~/.claude/skills/nordic-pantheon` → raíz del repo

#### Scenario: Migración desde marketplace
- **WHEN** `nordic-pantheon@nordic-pantheon` está instalado y el humano instala con `--mode=link`
- **THEN** el script desinstala ese plugin, retira el marketplace local y crea el symlink

#### Scenario: Ruta ocupada por otra cosa
- **WHEN** `~/.claude/skills/nordic-pantheon` existe y no es un symlink al repo
- **THEN** el script aborta indicando la ruta y no la toca

### Requirement: Instalación en modo marketplace
En modo `marketplace`, `install` SHALL registrar la raíz del repo como marketplace local e instalar `nordic-pantheon@nordic-pantheon`. Si existe el symlink del modo `link` hacia el repo, MUST retirarlo.

#### Scenario: Instalación por marketplace
- **WHEN** el humano instala con `--mode=marketplace`
- **THEN** `claude plugin list` muestra `nordic-pantheon@nordic-pantheon` instalado y no existe `~/.claude/skills/nordic-pantheon`

### Requirement: Configuración persistida
`install` SHALL escribir `${XDG_CONFIG_HOME:-~/.config}/nordic-pantheon/config` con el modo de instalación, el modo de Bifröst, el backend de Munin, el backend de Hugin (`HUGIN_BACKEND`), quién instaló graphify (`GRAPHIFY_INSTALLED_BY`) y la ruta del backup de `CLAUDE.md` si lo hubo. Reinstalar MUST sobrescribir los valores sin perder la ruta de un backup existente ni un `GRAPHIFY_INSTALLED_BY` no vacío.

#### Scenario: Config tras instalar
- **WHEN** termina `./install.sh install --mode=link --munin=memory --bifrost=skill --hugin=plain`
- **THEN** el archivo de config contiene `INSTALL_MODE=link`, `MUNIN_BACKEND=memory`, `BIFROST_MODE=skill` y `HUGIN_BACKEND=plain`

#### Scenario: Reinstalar conserva quién instaló graphify
- **WHEN** la config indica `GRAPHIFY_INSTALLED_BY=pipx` y el humano reinstala con `--hugin=graphify` o `--hugin=plain`
- **THEN** la config sigue indicando `GRAPHIFY_INSTALLED_BY=pipx`

### Requirement: Instalación idempotente
Ejecutar `install` dos veces con las mismas opciones SHALL dejar el mismo estado que una sola ejecución, sin crear backups adicionales ni fallar.

#### Scenario: Segunda ejecución
- **WHEN** el humano ejecuta `./install.sh install --yes` dos veces seguidas
- **THEN** la segunda termina con éxito, sin crear un segundo backup de `CLAUDE.md`, y el estado es el mismo

### Requirement: Actualización
`update` SHALL dejar visibles los cambios actuales del repo según el modo guardado en la config. En modo `link` MUST verificar el symlink y recrearlo si falta o está roto. En modo `marketplace` MUST refrescar el marketplace y el plugin y, si la copia en caché no coincide con el repo, reinstalarlo. Sin config, MUST pedir ejecutar `install`.

#### Scenario: Update en modo enlace con symlink roto
- **WHEN** la config indica `INSTALL_MODE=link` y el symlink no existe
- **THEN** `update` lo recrea apuntando al repo

#### Scenario: Update en modo marketplace con caché desfasada
- **WHEN** la config indica `INSTALL_MODE=marketplace` y una skill del repo difiere de su copia en caché tras `claude plugin update`
- **THEN** el script reinstala el plugin y la caché coincide con el repo

#### Scenario: Update sin instalar
- **WHEN** no existe el archivo de config
- **THEN** `update` indica que hay que ejecutar `install` y sale con código distinto de cero

### Requirement: Desinstalación
`uninstall` SHALL retirar lo que `install` añadió: el symlink del modo `link` o el plugin y marketplace del modo `marketplace`, el symlink de Bifröst con restauración del backup (ver `bifrost-activation`), el paquete `graphifyy` si la config indica que lo instaló el instalador y el archivo de config. Los recuerdos de `~/.claude/nordic-pantheon/memory/` MUST conservarse salvo con `--purge`.

#### Scenario: Desinstalar tras instalar en modo enlace
- **WHEN** el humano ejecuta `./install.sh uninstall` tras instalar en modo `link`
- **THEN** no existen `~/.claude/skills/nordic-pantheon` ni el archivo de config, y la memoria global sigue en disco

#### Scenario: Purga
- **WHEN** el humano ejecuta `./install.sh uninstall --purge`
- **THEN** además se borra `~/.claude/nordic-pantheon/`

#### Scenario: graphify instalado por el instalador
- **WHEN** la config indica `GRAPHIFY_INSTALLED_BY=uv` (o `pipx`) y el humano ejecuta `./install.sh uninstall`
- **THEN** el script ejecuta `uv tool uninstall graphifyy` (o `pipx uninstall graphifyy`)

#### Scenario: graphify instalado por el humano
- **WHEN** `GRAPHIFY_INSTALLED_BY` está vacío o no existe en la config y el humano ejecuta `./install.sh uninstall`
- **THEN** el script no llama a `uv` ni a `pipx` y `graphify` sigue instalado

### Requirement: Instalación de la CLI de graphify
Con `--hugin=graphify`, `install` SHALL instalar solo la CLI de graphify: `uv tool install graphifyy` si hay `uv` en el `PATH` y, si no, `pipx install graphifyy`, registrando el gestor usado en `GRAPHIFY_INSTALLED_BY`. MUST no ejecutar `graphify install`, `graphify claude install` ni ningún otro subcomando que registre skills o hooks de graphify.

#### Scenario: Con uv
- **WHEN** `graphify` no está en el `PATH`, hay `uv` y el humano instala con `--hugin=graphify`
- **THEN** el script ejecuta `uv tool install graphifyy`, no llama a `pipx` y la config contiene `HUGIN_BACKEND=graphify` y `GRAPHIFY_INSTALLED_BY=uv`

#### Scenario: Sin uv, con pipx
- **WHEN** `graphify` no está en el `PATH`, no hay `uv`, hay `pipx` y el humano instala con `--hugin=graphify`
- **THEN** el script ejecuta `pipx install graphifyy` y la config contiene `HUGIN_BACKEND=graphify` y `GRAPHIFY_INSTALLED_BY=pipx`

#### Scenario: Sin registrar skills ni hooks
- **WHEN** termina una instalación con `--hugin=graphify`
- **THEN** el registro de llamadas a `graphify` no contiene `install`, `claude install` ni `hook`

### Requirement: graphify ya disponible
Si `graphify` ya está en el `PATH`, `install --hugin=graphify` SHALL no reinstalarlo y MUST dejar `GRAPHIFY_INSTALLED_BY` como estaba en la config (vacío si no había valor), para no desinstalar al final algo que el instalador no puso.

#### Scenario: CLI preinstalada por el humano
- **WHEN** `graphify` está en el `PATH`, la config no tiene `GRAPHIFY_INSTALLED_BY` y el humano instala con `--hugin=graphify`
- **THEN** el script no llama a `uv` ni a `pipx`, la config contiene `HUGIN_BACKEND=graphify` y `GRAPHIFY_INSTALLED_BY` vacío

#### Scenario: Segunda ejecución
- **WHEN** el humano ejecuta `./install.sh install --yes --hugin=graphify` dos veces seguidas con `pipx` disponible
- **THEN** `pipx install graphifyy` se ejecuta una sola vez y la config sigue indicando `GRAPHIFY_INSTALLED_BY=pipx`

### Requirement: Sin gestor para instalar graphify
Con `--hugin=graphify`, si `graphify` no está en el `PATH` y no hay `uv` ni `pipx`, o si el gestor elegido falla, `install` SHALL avisar, escribir `HUGIN_BACKEND=plain` en la config y terminar el resto de la instalación con éxito.

#### Scenario: Ni uv ni pipx
- **WHEN** no hay `graphify`, `uv` ni `pipx` en el `PATH` y el humano instala con `--hugin=graphify`
- **THEN** el script avisa de que no puede instalar graphify, la config contiene `HUGIN_BACKEND=plain` y el código de salida es cero

#### Scenario: Falla la instalación
- **WHEN** `pipx install graphifyy` termina con código distinto de cero
- **THEN** el script avisa, la config contiene `HUGIN_BACKEND=plain` y `GRAPHIFY_INSTALLED_BY` no cambia

### Requirement: Volver a plain no desinstala graphify
Reinstalar con `--hugin=plain` SHALL cambiar `HUGIN_BACKEND` a `plain` sin desinstalar `graphifyy`; la desinstalación del paquete MUST ocurrir solo en `uninstall`.

#### Scenario: De graphify a plain
- **WHEN** la config indica `HUGIN_BACKEND=graphify` y `GRAPHIFY_INSTALLED_BY=uv` y el humano reinstala con `--hugin=plain`
- **THEN** el script no llama a `uv tool uninstall` y la config contiene `HUGIN_BACKEND=plain` y `GRAPHIFY_INSTALLED_BY=uv`

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
