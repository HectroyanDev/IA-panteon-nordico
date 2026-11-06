# bifrost-activation Specification

## Purpose
Permitir usar Bifröst como orquestador global de todas las sesiones o solo bajo demanda como skill, sin perder el `CLAUDE.md` global que hubiera antes.

## Requirements

### Requirement: Bifröst como skill
El plugin SHALL incluir la skill `nordic-pantheon:bifrost`, invocable con `/bifrost`, que aplica las instrucciones de `bifrost/CLAUDE.md` del propio plugin. Esas instrucciones MUST tener una única fuente: `bifrost/CLAUDE.md`.

#### Scenario: Invocar Bifröst bajo demanda
- **WHEN** el humano escribe `/bifrost` en una sesión con el plugin cargado
- **THEN** la sesión aplica las instrucciones de `bifrost/CLAUDE.md` del plugin

#### Scenario: Una sola fuente
- **WHEN** se edita `bifrost/CLAUDE.md` en el repo con el plugin en modo `link`
- **THEN** tanto el symlink global como la skill `/bifrost` reflejan el cambio sin tocar otro archivo

### Requirement: Bifröst global por symlink
Con `--bifrost=link`, `install` SHALL crear el symlink `~/.claude/CLAUDE.md` → `bifrost/CLAUDE.md` del repo. Si ya existe un archivo regular o un symlink a otro destino, MUST moverlo antes a un backup con marca de tiempo y guardar su ruta en la config.

#### Scenario: Sin CLAUDE.md previo
- **WHEN** no existe `~/.claude/CLAUDE.md` y el humano instala con `--bifrost=link`
- **THEN** existe el symlink `~/.claude/CLAUDE.md` → `bifrost/CLAUDE.md` y no se crea backup

#### Scenario: CLAUDE.md previo propio
- **WHEN** `~/.claude/CLAUDE.md` es un archivo regular
- **THEN** el script lo mueve a `~/.claude/CLAUDE.md.bak-nordic-<fecha>`, guarda esa ruta en la config y crea el symlink

#### Scenario: Ya enlazado
- **WHEN** `~/.claude/CLAUDE.md` ya es un symlink a `bifrost/CLAUDE.md` del repo
- **THEN** el script lo deja como está y no crea backup

### Requirement: Bifröst solo como skill
Con `--bifrost=skill`, `install` SHALL no crear el symlink de `CLAUDE.md`. Si `~/.claude/CLAUDE.md` es un symlink a `bifrost/CLAUDE.md` del repo, MUST retirarlo y restaurar el backup guardado si existe.

#### Scenario: Cambiar de link a skill
- **WHEN** Bifröst estaba en modo `link` con backup y el humano reinstala con `--bifrost=skill`
- **THEN** el symlink desaparece, el backup vuelve a `~/.claude/CLAUDE.md` y la config indica `BIFROST_MODE=skill`

### Requirement: Restauración al desinstalar
`uninstall` SHALL retirar `~/.claude/CLAUDE.md` solo si es un symlink a `bifrost/CLAUDE.md` del repo y, si la config guarda un backup existente, MUST devolverlo a `~/.claude/CLAUDE.md`. Un `~/.claude/CLAUDE.md` que no apunte al repo MUST quedar intacto.

#### Scenario: Restaurar backup
- **WHEN** el humano desinstala y la config guarda un backup existente
- **THEN** `~/.claude/CLAUDE.md` vuelve a ser el archivo original

#### Scenario: CLAUDE.md ajeno
- **WHEN** el humano desinstala y `~/.claude/CLAUDE.md` es un archivo regular que no apunta al repo
- **THEN** el script no lo toca
