# Memoria en archivos (backend `memory`)

## Paths

| Ámbito | Directorio | Para qué |
| --- | --- | --- |
| Proyecto | `~/.claude/projects/<slug>/memory/` | Decisiones, bugs y convenciones de este repo. Es la memoria nativa de Claude Code: el harness carga su `MEMORY.md` en cada sesión |
| Global | `~/.claude/nordic-pantheon/memory/` | Preferencias y aprendizajes que valen en cualquier proyecto |

`<slug>` es la ruta absoluta del directorio de trabajo con cada carácter que no sea letra o número sustituido por `-`:

```bash
slug=$(printf '%s' "$PWD" | sed 's/[^A-Za-z0-9]/-/g')
```

Ejemplo: `/home/h/Documents/proyectos personales/nordic-pantheon` → `-home-h-Documents-proyectos-personales-nordic-pantheon`. Si ese directorio no existe, revisa `ls ~/.claude/projects/` antes de crearlo por si el repo se abrió desde otra ruta.

## Archivo de recuerdo

Un archivo por tema, nombre en kebab-case (`decision-auth-model.md`):

```markdown
---
name: decision-auth-model
description: Una línea; es lo que se lee para decidir si el recuerdo es relevante
metadata:
  type: user | feedback | project | reference
---

El hecho.

**Why:** motivo (solo feedback/project)
**How to apply:** cuándo y cómo usarlo (solo feedback/project)
```

| type | Contenido |
| --- | --- |
| `user` | Quién es el humano: rol, experiencia, preferencias |
| `feedback` | Correcciones y enfoques confirmados sobre cómo trabajar |
| `project` | Trabajo en curso, objetivos o restricciones que no se deducen del código |
| `reference` | Enlaces a recursos externos (tickets, dashboards, URLs) |

Enlaza recuerdos relacionados con `[[name]]` en el cuerpo.

## Índice `MEMORY.md`

Una línea por recuerdo, sin frontmatter ni contenido:

```markdown
- [Modelo de auth](decision-auth-model.md) — JWT de sesión, no OAuth; motivo y alcance
```

Al actualizar un recuerdo existente, cambia su línea solo si cambió el título o el gancho. Al borrar un recuerdo que resultó falso, borra también su línea.
