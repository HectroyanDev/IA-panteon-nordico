# Spec Delta

## MODIFIED Requirements

### Requirement: Modo interactivo y flags
`install` SHALL preguntar de forma interactiva cada opción (`mode`, `munin`, `bifrost`, `hugin`) que no reciba por flag. Con `--yes`, las opciones sin flag MUST tomar su valor por defecto (`mode=link`, `munin=mimir`, `bifrost=link`, `hugin=plain`) sin preguntar. Un valor de flag no válido MUST abortar sin cambios.

#### Scenario: Todo por flags
- **WHEN** el humano ejecuta `./install.sh install --mode=link --munin=memory --bifrost=skill --hugin=plain`
- **THEN** el script no hace ninguna pregunta y aplica esas opciones

#### Scenario: Flag no válido
- **WHEN** el humano ejecuta `./install.sh install --munin=engram`
- **THEN** el script informa de los valores válidos y sale con código distinto de cero sin modificar nada

#### Scenario: Flag de Hugin no válido
- **WHEN** el humano ejecuta `./install.sh install --hugin=ctags`
- **THEN** el script informa de que los valores válidos son `plain` y `graphify` y sale con código distinto de cero sin modificar nada

#### Scenario: Valores por defecto
- **WHEN** el humano ejecuta `./install.sh install --yes`
- **THEN** el script instala en modo `link`, con Munin `mimir`, Bifröst `link` y Hugin `plain`, sin preguntar y sin instalar graphify

#### Scenario: Pregunta del backend de Hugin
- **WHEN** el humano ejecuta `./install.sh install --mode=link --munin=memory --bifrost=skill` sin `--yes`
- **THEN** el script pregunta solo el backend de Hugin, con `plain` como valor por defecto

### Requirement: Configuración persistida
`install` SHALL escribir `${XDG_CONFIG_HOME:-~/.config}/nordic-pantheon/config` con el modo de instalación, el modo de Bifröst, el backend de Munin, el backend de Hugin (`HUGIN_BACKEND`), quién instaló graphify (`GRAPHIFY_INSTALLED_BY`) y la ruta del backup de `CLAUDE.md` si lo hubo. Reinstalar MUST sobrescribir los valores sin perder la ruta de un backup existente ni un `GRAPHIFY_INSTALLED_BY` no vacío.

#### Scenario: Config tras instalar
- **WHEN** termina `./install.sh install --mode=link --munin=memory --bifrost=skill --hugin=plain`
- **THEN** el archivo de config contiene `INSTALL_MODE=link`, `MUNIN_BACKEND=memory`, `BIFROST_MODE=skill` y `HUGIN_BACKEND=plain`

#### Scenario: Reinstalar conserva quién instaló graphify
- **WHEN** la config indica `GRAPHIFY_INSTALLED_BY=pipx` y el humano reinstala con `--hugin=graphify` o `--hugin=plain`
- **THEN** la config sigue indicando `GRAPHIFY_INSTALLED_BY=pipx`

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

## ADDED Requirements

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
