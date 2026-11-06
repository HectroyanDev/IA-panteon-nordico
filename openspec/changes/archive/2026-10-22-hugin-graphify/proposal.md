# Proposal

## Why

Cada exploración de Hugin lee archivos enteros para responder "¿cómo funciona X?" o "¿quién llama a Y?", y en repos grandes eso es la mayor parte del coste de la sesión. graphify construye en local (tree-sitter, sin LLM ni API key) un grafo del código que se consulta por CLI, así que Hugin puede responder preguntas de estructura con una consulta y leer código solo donde el grafo no llega.

## What Changes

- Nueva skill `skills/hugin-graphify/` (`nordic-pantheon:hugin-graphify`), hermana de `skills/hugin/`, con `context: fork` y `model: sonnet`. Antes de consultar refresca el grafo con `graphify update .`; responde con `graphify query`, `graphify path` y `graphify explain`; lee código solo donde el grafo no basta. No pregunta al humano: devuelve sus preguntas a Bifröst.
- Repo sin grafo (`graphify-out/` no existe): `hugin-graphify` no lo construye por su cuenta. Explora como Hugin normal y devuelve a Bifröst la pregunta de si construirlo con `graphify extract --code-only`. Al construirlo por primera vez añade `graphify-out/` al `.gitignore` si el repo es git.
- Si la CLI `graphify` no está en el `PATH` al ejecutarse, `hugin-graphify` lo avisa y explora como Hugin normal.
- Bifröst elige `nordic-pantheon:hugin` o `nordic-pantheon:hugin-graphify` según `HUGIN_BACKEND=plain|graphify` en la config del panteón; sin config o sin clave, `hugin`. Mismo patrón que Munin.
- `install.sh`: nuevo flag `--hugin=plain|graphify` (por defecto `plain`), preguntado en modo interactivo y resuelto con `--yes`. Con `graphify` instala solo la CLI (`uv tool install graphifyy` si hay `uv`, si no `pipx install graphifyy`) salvo que `graphify` ya esté en el `PATH`. No ejecuta `graphify install` ni `graphify claude install`. Sin `uv` ni `pipx`: aviso y `HUGIN_BACKEND=plain`.
- La config gana `HUGIN_BACKEND` y `GRAPHIFY_INSTALLED_BY` (`uv`, `pipx` o vacío). `uninstall` desinstala `graphifyy` solo si lo instaló el instalador.
- `tests/install_test.sh` gana `graphify`, `uv` y `pipx` falsos y casos para cada escenario nuevo. README actualizado.
- `plugin.json` sube a `1.2.0`. El `hugin` actual no cambia.

## Capabilities

### New Capabilities
- `hugin-exploration-backends`: exploración del código con dos backends intercambiables (lectura directa o grafo de graphify), comportamiento de `hugin-graphify` (refresco, consultas, construcción con permiso, degradación sin CLI) y selección del backend activo por Bifröst.

### Modified Capabilities
- `pantheon-installer`: flag `--hugin` en modo interactivo y con `--yes`, instalación de la CLI de graphify, claves nuevas en la config y desinstalación de `graphifyy`.
- `specialist-execution`: `hugin-graphify` se añade a la lista de especialistas en subagente con modelo propio (`sonnet`).

## Impact

- Nuevos: `skills/hugin-graphify/SKILL.md`, `skills/hugin-graphify/references/role.md`, `skills/hugin-graphify/references/graphify-commands.md`, `tests/fixtures/bin/{graphify,uv,pipx}` (o equivalentes en directorios propios del harness).
- Modificados: `install.sh` (flag, pregunta, instalación y desinstalación de `graphifyy`, config), `tests/install_test.sh`, `bifrost/CLAUDE.md` (fila Hugin, sección de selección de backend de Hugin), `README.md` (tabla del panteón, requisitos, flag, cambio de backend), `.claude-plugin/plugin.json` (versión `1.2.0`).
- Sin cambios: `skills/hugin/`.
- Fuera del repo (en ejecución): `graphifyy` instalado con `uv tool` o `pipx`; `graphify-out/` y una línea en `.gitignore` de cada repo explorado cuyo grafo se construya.
- Dependencia nueva opcional: paquete PyPI `graphifyy` (CLI `graphify`, Python 3.10+).
- Fuera de alcance: MCP de graphify, extracción de docs/PDF/imágenes (requiere LLM), git hooks de graphify, skill `/graphify` global, cambiar el Hugin actual.
