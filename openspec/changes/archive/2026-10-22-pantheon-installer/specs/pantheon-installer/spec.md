# Spec Delta

## Purpose

Instalar, actualizar y desinstalar el plugin nordic-pantheon en la máquina local con un único script, sin pasos manuales y dejando `~/.claude` como estaba al desinstalar.

## ADDED Requirements

### Requirement: Subcomandos del instalador
El repo SHALL incluir `install.sh` con los subcomandos `install`, `update` y `uninstall`. Sin subcomando o con uno desconocido, el script MUST mostrar la ayuda y salir con código distinto de cero.

#### Scenario: Subcomando desconocido
- **WHEN** el humano ejecuta `./install.sh foo`
- **THEN** el script muestra la ayuda con los subcomandos y flags disponibles y sale con código distinto de cero

#### Scenario: Ayuda
- **WHEN** el humano ejecuta `./install.sh --help`
- **THEN** el script muestra la ayuda y sale con código cero sin modificar nada

### Requirement: Modo interactivo y flags
`install` SHALL preguntar de forma interactiva cada opción (`mode`, `munin`, `bifrost`) que no reciba por flag. Con `--yes`, las opciones sin flag MUST tomar su valor por defecto (`mode=link`, `munin=mimir`, `bifrost=link`) sin preguntar. Un valor de flag no válido MUST abortar sin cambios.

#### Scenario: Todo por flags
- **WHEN** el humano ejecuta `./install.sh install --mode=link --munin=memory --bifrost=skill`
- **THEN** el script no hace ninguna pregunta y aplica esas opciones

#### Scenario: Flag no válido
- **WHEN** el humano ejecuta `./install.sh install --munin=engram`
- **THEN** el script informa de los valores válidos y sale con código distinto de cero sin modificar nada

#### Scenario: Valores por defecto
- **WHEN** el humano ejecuta `./install.sh install --yes`
- **THEN** el script instala en modo `link`, con Munin `mimir` y Bifröst `link`, sin preguntar

### Requirement: Comprobación de dependencias
`install` SHALL comprobar las dependencias antes de cambiar nada. La ausencia de la CLI `claude` MUST abortar la instalación. La ausencia de `openspec`, o del MCP `mimisbrunnr` cuando el backend elegido es `mimir`, MUST mostrar un aviso sin abortar.

#### Scenario: Falta la CLI claude
- **WHEN** `claude` no está en el `PATH`
- **THEN** el script aborta con un mensaje que lo indica y no modifica nada

#### Scenario: Falta el MCP de Mimir
- **WHEN** el backend elegido es `mimir` y `claude mcp get mimisbrunnr` falla
- **THEN** el script avisa de que Munin no tendrá memoria hasta configurar ese MCP y continúa

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
`install` SHALL escribir `${XDG_CONFIG_HOME:-~/.config}/nordic-pantheon/config` con el modo de instalación, el modo de Bifröst, el backend de Munin y la ruta del backup de `CLAUDE.md` si lo hubo. Reinstalar MUST sobrescribir los valores sin perder la ruta de un backup existente.

#### Scenario: Config tras instalar
- **WHEN** termina `./install.sh install --mode=link --munin=memory --bifrost=skill`
- **THEN** el archivo de config contiene `INSTALL_MODE=link`, `MUNIN_BACKEND=memory` y `BIFROST_MODE=skill`

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
`uninstall` SHALL retirar lo que `install` añadió: el symlink del modo `link` o el plugin y marketplace del modo `marketplace`, el symlink de Bifröst con restauración del backup (ver `bifrost-activation`) y el archivo de config. Los recuerdos de `~/.claude/nordic-pantheon/memory/` MUST conservarse salvo con `--purge`.

#### Scenario: Desinstalar tras instalar en modo enlace
- **WHEN** el humano ejecuta `./install.sh uninstall` tras instalar en modo `link`
- **THEN** no existen `~/.claude/skills/nordic-pantheon` ni el archivo de config, y la memoria global sigue en disco

#### Scenario: Purga
- **WHEN** el humano ejecuta `./install.sh uninstall --purge`
- **THEN** además se borra `~/.claude/nordic-pantheon/`
