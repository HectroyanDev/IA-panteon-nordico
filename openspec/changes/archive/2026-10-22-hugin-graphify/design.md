# Design

## Context

Ver `proposal.md` (Why). Estado observado:

- `skills/hugin/SKILL.md` corre con `context: fork` + `model: sonnet`, prefiere `/opsx:explore` y devuelve el brief de `references/exploration-output.md`. No tiene ninguna noción de backend.
- Munin ya resuelve la elección de backend en Bifröst: `bifrost/CLAUDE.md` (sección Memoria) lee `MUNIN_BACKEND` de `${XDG_CONFIG_HOME:-$HOME/.config}/nordic-pantheon/config` y carga `munin-mimir` o `munin-memory`. No hay skill "router".
- `install.sh` (391 líneas): `parse_args` valida flags con `validate`; `resolve_options` pregunta con `ask` o aplica defectos con `--yes`; `check_optional_deps` avisa sin abortar; `config_write` reescribe la config entera con 5 claves y `cmd_install` conserva `CLAUDE_MD_BACKUP` leyéndolo antes con `config_get`. `cmd_uninstall` borra la config al final.
- `tests/install_test.sh`: cada caso corre con `HOME`/`XDG_CONFIG_HOME` temporales, `PATH="$FAKE_BIN:$OPENSPEC_BIN:$SYS_PATH"` y `SYS_PATH=/usr/local/bin:/usr/bin:/bin`. `openspec` falso vive en su propio directorio para poder quitarlo del `PATH`. El `claude` falso registra llamadas en `$FAKE_CLAUDE_STATE/log.txt`.
- En esta máquina `pipx` está en `/usr/bin/pipx`, no hay `uv` ni `graphify`, Python 3.14. Con el `SYS_PATH` actual de los tests, el `pipx` real sería visible.
- graphify (README oficial, 2026-10-22): paquete PyPI `graphifyy`, CLI `graphify`, Python 3.10+. `graphify extract --code-only` usa tree-sitter local sin API key y escribe `graphify-out/` (`graph.json`, `GRAPH_REPORT.md`, `graph.html`). `graphify update .` refresca tras cambios. `graphify query`, `path`, `explain` consultan el grafo con códigos de salida 0 (respuesta), 3 (nombre ambiguo) y 4 (sin coincidencia). La sintaxis exacta y la salida no se han probado aquí (tarea 1.1).
- El repo `nordic-pantheon` no es git: sirve para probar el caso "sin `.gitignore`".

## Goals / Non-Goals

**Goals:**
- Que una exploración con grafo cueste menos lecturas que la de Hugin normal sin perder fiabilidad: el grafo orienta, el código confirma donde haga falta.
- Que ningún paso de graphify tenga coste ni efectos fuera del repo sin permiso: solo `--code-only`, sin skills ni hooks globales de graphify.
- Que cambiar de backend sea una línea de config, igual que Munin.

**Non-Goals:**
- Que `./install.sh update` actualice `graphifyy` (se actualiza con `uv tool upgrade` / `pipx upgrade` a mano; se documenta).
- Borrar los `graphify-out/` de los repos al desinstalar: son datos del repo, no del panteón.
- Soportar otros gestores (`pip --user`, conda).

## Decisions

### D1. Skill hermana en lugar de un modo dentro de Hugin
`skills/hugin-graphify/` es una skill completa con su `SKILL.md` y `references/role.md`, como `munin-memory` junto a `munin-mimir`. Hugin no se toca.
*Alternativa*: una sola skill Hugin que lea la config y bifurque. Descartada: mezcla dos flujos en un archivo, obliga a cada invocación a leer la config y rompe el requisito de no cambiar Hugin.

### D2. Flujo de `hugin-graphify`
1. `command -v graphify`. Si falla → aviso en el brief y flujo de Hugin normal (lectura directa). No instala nada.
2. Raíz del repo: `git rev-parse --show-toplevel` si es git; si no, el directorio de trabajo.
3. ¿Existe `<raíz>/graphify-out/graph.json`? (obligatorio comprobarlo: `graphify update .` sin grafo previo construye uno, ver D11)
   - No, y el encargo no trae la autorización → explora como Hugin normal y añade al brief la pregunta para Bifröst (D3).
   - No, y el encargo trae la autorización → `graphify extract . --code-only` en la raíz, `.gitignore` (D4), y sigue en el paso 4.
   - Sí → `graphify update .` en la raíz; si falla, aviso de grafo posiblemente desfasado y sigue.
4. Consultas: `query` para preguntas abiertas, `path A B` para relaciones entre dos símbolos, `explain X` para un símbolo. Código 3 → repetir con un nombre más específico de los candidatos que imprime; código 4 → búsqueda en código (`grep`, lectura).
5. Lectura de código solo para lo que el grafo no responde o para confirmar una afirmación que vaya a decidir un cambio.
6. Brief con la plantilla de Hugin (`../hugin/references/exploration-output.md`, misma fuente) más una línea **Fuente** (grafo / código / mixto) y, si aplica, la pregunta de construcción.

No usa `/opsx:explore`: ese modo es una conversación de diseño, no una consulta de hechos, y su exploración leería archivos igualmente.
La tabla de comandos, los códigos de salida y la forma de la salida van en `references/graphify-commands.md`, escrita con lo verificado en la tarea 1.1.
*Alternativa*: refrescar solo si `graph.json` es más antiguo que el último cambio. Descartada: `update` ya es incremental y calcular "último cambio" sin git no es fiable.

### D3. Construir el grafo: pregunta devuelta y autorización en el encargo
`hugin-graphify` no puede preguntar (subagente). Devuelve a Bifröst una pregunta con opciones concretas, por ejemplo: "Construir el grafo ahora (`graphify extract --code-only`, local, sin coste; añade `graphify-out/` al `.gitignore`)" / "Seguir sin grafo". Bifröst la lanza con `AskUserQuestion` y, con un sí, vuelve a delegar con el encargo original más la línea `Construir grafo: sí`. La autorización vale para esa invocación; las siguientes ya encuentran el grafo.
*Alternativa*: construir siempre sin preguntar. Descartada por el humano: escribe en el repo y puede tardar en repos grandes.

### D4. `.gitignore` solo en repos git y solo si hace falta
Tras el primer `extract`: si es repo git y `git check-ignore -q graphify-out/` falla, añadir `graphify-out/` al `.gitignore` de la raíz (creándolo si no existe y asegurando salto de línea final). Fuera de git, nada. No se toca en refrescos posteriores.
*Alternativa*: `.git/info/exclude`. Descartada: el humano pidió `.gitignore` (supuesto aceptado) y así el resto del equipo tampoco versiona el grafo.

### D5. Selección del backend en Bifröst
`bifrost/CLAUDE.md`: la fila Hugin pasa a decir `nordic-pantheon:hugin` o `nordic-pantheon:hugin-graphify` (ver Exploración), y se añade una sección **Exploración** paralela a Memoria: leer `HUGIN_BACKEND`; `graphify` → `hugin-graphify`; `plain`, ausente o desconocido → `hugin`. Incluye cómo relanzar la pregunta de construcción (D3). La regla "preferir `/opsx:explore` si existe" se queda solo para `hugin`.
*Alternativa*: decidir por la presencia de `graphify-out/` en el repo. Descartada: el humano pidió elección por config, y Bifröst tendría que mirar el repo antes de delegar.

### D6. Flag `--hugin` en el instalador
- `parse_args`: `--hugin=*` validado contra `plain graphify`. `resolve_options`: defecto `plain` con `--yes`; si no, `ask hugin "Backend de Hugin" plain plain graphify`. Ayuda y ejemplos actualizados.
- Nueva función `ensure_graphify`, llamada en `cmd_install` después de `check_optional_deps` y de los cambios del plugin, antes de `config_write`:
  - Se salta la instalación si `command -v graphify` tiene éxito o si la config ya tiene `GRAPHIFY_INSTALLED_BY` no vacío (instalado antes por nosotros aunque `~/.local/bin` no esté en el `PATH`; evita reinstalar en la segunda ejecución).
  - Si no: `uv tool install graphifyy` si hay `uv`; si no, `pipx install graphifyy`; registra el gestor en `GRAPHIFY_INSTALLED_BY`.
  - Sin gestor o con fallo del gestor → `warn` y `HUGIN=plain`. La instalación del panteón no aborta: graphify es opcional.
  - Si tras instalar `graphify` sigue sin estar en el `PATH` → aviso para añadir el directorio de binarios (`uv tool update-shell` / `pipx ensurepath`); `HUGIN_BACKEND` queda en `graphify` porque la skill ya degrada (D2.1).
- Nunca llama a `graphify` con subcomandos de instalación (`install`, `claude install`, hooks).
*Alternativa*: `pip install --user graphifyy`. Descartada: choca con PEP 668 en distros recientes y mezcla dependencias con el Python del sistema.

### D7. Config con dos claves más
`config_write` pasa a escribir `HUGIN_BACKEND` y `GRAPHIFY_INSTALLED_BY` además de las cinco actuales. `cmd_install` lee `GRAPHIFY_INSTALLED_BY` con `config_get` al principio (como `CLAUDE_MD_BACKUP`) y solo lo cambia `ensure_graphify` al instalar. Volver a `plain` no desinstala (spec "Volver a plain no desinstala graphify"): así un cambio de backend no cuesta una reinstalación y `uninstall` sigue sabiendo qué retirar.

### D8. Desinstalación de `graphifyy`
`cmd_uninstall` lee `GRAPHIFY_INSTALLED_BY` antes de borrar la config. `uv` → `uv tool uninstall graphifyy`; `pipx` → `pipx uninstall graphifyy`; vacío → nada. Si falta el gestor o el comando falla → `warn` con el comando para hacerlo a mano y sigue. `--purge` no cambia esto ni toca `graphify-out/` de ningún repo.

### D9. Pruebas sin el `pipx` real
- Fakes en directorios propios, como `openspec`: `$SUITE/uv-bin/uv`, `$SUITE/pipx-bin/pipx`, `$SUITE/graphify-bin/graphify`. Cada caso decide cuáles entran en el `PATH`.
- `uv` y `pipx` falsos registran sus argumentos en `$FAKE_CLAUDE_STATE/tools.txt`; `tool install graphifyy` / `install graphifyy` dejan un `graphify` falso en `$CASE_DIR/tool-bin` (en el `PATH` del caso) y `FAKE_TOOL_FAIL=1` los hace fallar. `graphify` falso registra sus argumentos para comprobar que nunca recibe `install` ni `claude install`.
- `SYS_PATH` deja de ser `/usr/local/bin:/usr/bin:/bin`: se construye `$SUITE/sysbin` con symlinks a todo lo de esos directorios salvo `uv`, `uvx`, `pipx`, `graphify`, `claude` y `openspec`. Así "sin `uv` ni `pipx`" se puede probar en esta máquina y en cualquier otra.
*Alternativa*: una variable de entorno que el instalador use para ignorar gestores. Descartada: código de test dentro del instalador.

### D10. Versión 1.2.0
Skill nueva y flag nuevo sin cambios incompatibles → `plugin.json` sube a `1.2.0`.

### D11. Verificar graphify antes de escribir la skill
La tarea 1.1 instala `graphifyy` con `pipx` en un `PIPX_HOME`/`PIPX_BIN_DIR` temporales del scratchpad (no en la instalación real), construye el grafo de una copia de este repo y anota aquí y en `references/graphify-commands.md`: sintaxis exacta de `extract --code-only`, `update .`, `query`, `path`, `explain`; forma de la salida y de los candidatos con código 3; si `update` necesita API key o LLM en un grafo `--code-only`; si escribe algo fuera de `graphify-out/` (por ejemplo, cachés en `$HOME`); compatibilidad con Python 3.14. Si algo contradice D2, se ajusta D2 antes de la tarea 2.

**Resultado de 1.1 (graphifyy 0.9.93, verificado en aislado):**
- Instala con `pipx install graphifyy` en Python 3.14.4 (CLI `graphify`, además `graphify-mcp`). Sin ningún cambio de plan por la versión de Python.
- Sintaxis real: `graphify extract <ruta> --code-only` (la ruta es obligatoria: `graphify extract . --code-only`), `graphify update <ruta>`, `graphify query "<pregunta>"`, `graphify path "A" "B"` (`--undirected` opcional), `graphify explain "X"`. Todas sin API key ni LLM; `update` solo imprime un aviso ("set GEMINI_API_KEY...") para extracción semántica de docs, que no ejecuta.
- Escritura: todo dentro de `<ruta>/graphify-out/` (`graph.json`, `manifest.json`, `cache/`, y con `update` también `graph.html` y `GRAPH_REPORT.md`). Con `HOME` vacío no aparece nada en `$HOME`; no toca `.gitignore` ni hooks.
- Códigos de salida: `query`/`path`/`explain` devuelven 0 con respuesta, 3 con nombre ambiguo y 4 sin coincidencia (`No node matching ... found.` / `No matching nodes found.`). Un grafo ausente da 1 (`error: graph file not found`).
- Nombre ambiguo (3): imprime los candidatos con su archivo e id y pide reintentar con `ruta::símbolo` (p. ej. `install.sh::config_get`) o con el id completo; ambos funcionan.
- Los nombres de función en el grafo llevan paréntesis (`config_write()`); las preguntas de `query` casan por palabras clave.
- `path` sin camino dirigido sale con **código 0** y el texto "No directed path found ... Re-run with --undirected": no es una respuesta, hay que repetir con `--undirected`.
- Desviaciones respecto a D2: (a) `extract` necesita la ruta (`graphify extract . --code-only`); (b) `graphify update .` **construye un grafo nuevo** si no existe (no falla), así que la puerta "¿existe `graph.json`?" del paso 3 es imprescindible para no construir sin permiso; (c) `update` indexa también los `.md` como nodos (sin LLM) mientras `extract --code-only` los omite, por lo que el grafo crece tras el primer refresco; (d) `update` falla con código 1 si `graph.json` está corrupto (el mensaje pide borrarlo y reconstruir) o si no hay archivos de código: el flujo ya lo trata como "refresco fallido". Nada contradice el plan, no hay alternativa que activar.

**Resultado de 2.4 (pruebas a mano con la CLI aislada):** se ejecutaron los pasos de la skill, como secuencia de comandos de shell sobre copias del repo (no una invocación real del subagente, que solo se puede comprobar en la sesión nueva de 6.2): git sin grafo y sin autorización (no se llama a `extract`, no existe `graphify-out/`); autorizado (se crea `graphify-out/`, se añade la línea al `.gitignore` también cuando faltaba el salto de línea final, `git status` no muestra `graphify-out/`); repo que ya lo ignora (`.gitignore` idéntico); grafo existente (`graphify update .` sale 0 y la consulta posterior responde); sin git (no se crea `.gitignore`); sin `graphify` en el `PATH` (`command -v` falla). Sin desviaciones respecto a lo anotado en 1.1.

## Risks / Trade-offs

- [`graphify update` intenta extraer docs con LLM o pide API key en un grafo `--code-only`] → Se verifica en la tarea 1.1. Si ocurre, el refresco pasa a ser `graphify extract --code-only` de nuevo (más lento pero sin coste) y se anota en D2.
- [El grafo responde con algo desfasado o incompleto y Sonnet lo da por bueno] → `update` antes de cada invocación, línea **Fuente** en el brief y lectura de código obligatoria para afirmaciones que decidan un cambio.
- [`graphifyy` no instala en Python 3.14 (wheels de tree-sitter)] → Se detecta en la tarea 1.1; el instalador ya degrada a `plain` si el gestor falla. Con `uv` se puede fijar otra versión de Python (`uv tool install --python 3.12`), que se documentaría en el README.
- [`~/.local/bin` fuera del `PATH` tras instalar] → Aviso con el comando del gestor; la skill degrada a Hugin normal mientras tanto.
- [El humano instaló `graphifyy` a mano y luego reinstala el panteón] → `GRAPHIFY_INSTALLED_BY` queda vacío y `uninstall` no lo toca.
- [Construir el grafo en un repo grande tarda] → Solo con permiso explícito (D3); la pregunta lo menciona.
- [`graphify-out/` versionado en repos no git que luego pasan a git] → Fuera de alcance; el README lo menciona.
- [Construir `sysbin` con symlinks ralentiza la suite] → Se hace una vez por suite, no por caso.

## Migration Plan

1. Tarea 1.1 (verificación aislada) y el resto de tareas; `bash tests/install_test.sh` en verde.
2. En la máquina real: `./install.sh install --hugin=graphify` (con el resto de opciones como están en la config). Sin `uv`, usa `pipx`.
3. Sesión nueva: `/hugin-graphify` en un repo git sin grafo → devuelve la pregunta; con el sí, construye, añade `graphify-out/` al `.gitignore` y responde desde el grafo.

Rollback: `./install.sh install --hugin=plain` (Bifröst vuelve a Hugin; `graphifyy` sigue instalado) o `./install.sh uninstall` (retira también `graphifyy` si lo instaló el instalador).
