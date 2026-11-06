# Spec Delta

## MODIFIED Requirements

### Requirement: Configuración persistida
`install` SHALL escribir `${XDG_CONFIG_HOME:-~/.config}/nordic-pantheon/config` con el modo de instalación, el modo de Bifröst, el backend de Munin, el backend de Hugin (`HUGIN_BACKEND`), quién instaló graphify (`GRAPHIFY_INSTALLED_BY`), la ruta del backup de `CLAUDE.md` si lo hubo, la activación de la vigilancia de Vár (`VAR_ENABLED`, `on` u `off`) y sus umbrales (`VAR_MINUTES`, `VAR_TOOL_CALLS`). Reinstalar MUST sobrescribir los valores sin perder la ruta de un backup existente, un `GRAPHIFY_INSTALLED_BY` no vacío, el `VAR_ENABLED` ni los umbrales de Vár que ya hubiera.

#### Scenario: Config tras instalar
- **WHEN** termina `./install.sh install --mode=link --munin=memory --bifrost=skill --hugin=plain`
- **THEN** el archivo de config contiene `INSTALL_MODE=link`, `MUNIN_BACKEND=memory`, `BIFROST_MODE=skill` y `HUGIN_BACKEND=plain`

#### Scenario: Reinstalar conserva quién instaló graphify
- **WHEN** la config indica `GRAPHIFY_INSTALLED_BY=pipx` y el humano reinstala con `--hugin=graphify` o `--hugin=plain`
- **THEN** la config sigue indicando `GRAPHIFY_INSTALLED_BY=pipx`

#### Scenario: Umbrales de Vár por defecto
- **WHEN** termina `./install.sh install --yes` sin config previa
- **THEN** el archivo de config contiene `VAR_ENABLED=on`, `VAR_MINUTES=10` y `VAR_TOOL_CALLS=40`

#### Scenario: Reinstalar conserva los umbrales de Vár
- **WHEN** la config indica `VAR_MINUTES=15` y `VAR_TOOL_CALLS=60` y el humano reinstala con otras opciones
- **THEN** la config sigue indicando `VAR_MINUTES=15` y `VAR_TOOL_CALLS=60`

#### Scenario: Reinstalar conserva la vigilancia desactivada
- **WHEN** la config indica `VAR_ENABLED=off` y el humano reinstala con otras opciones
- **THEN** la config sigue indicando `VAR_ENABLED=off`
