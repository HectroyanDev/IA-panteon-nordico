# Comandos de graphify

Verificado con `graphifyy` 0.9.93 (CLI `graphify`). Todos los comandos corren en local, sin API key ni LLM, y escriben solo dentro de `<raíz>/graphify-out/`. Ejecútalos desde la raíz del repo.

## Comprobaciones previas

| Qué | Comando | Resultado |
| --- | --- | --- |
| ¿Está la CLI? | `command -v graphify` | Falla → sin graphify (ver "Degradación" en `SKILL.md`) |
| Raíz del repo | `git rev-parse --show-toplevel` | Falla → no es git; la raíz es el directorio de trabajo |
| ¿Hay grafo? | `test -f graphify-out/graph.json` | Falla → sin grafo. **No ejecutes `update`**: construiría uno |

## Construir y refrescar

| Qué | Comando | Notas |
| --- | --- | --- |
| Construir (solo con autorización) | `graphify extract . --code-only` | La ruta `.` es obligatoria. Indexa solo código (tree-sitter). Omite docs, papers e imágenes |
| Refrescar | `graphify update .` | Incremental, sin LLM. Imprime un aviso sobre `GEMINI_API_KEY` que se ignora. Si falla (código 1) → avisa de grafo posiblemente desfasado y sigue |

Detalles de `update`:

- Sin `graph.json` previo **construye un grafo nuevo** y sale con 0. Por eso la comprobación de `graph.json` va primero.
- Indexa también los `.md` como nodos de tipo `document`; `extract --code-only` no. Tras el primer refresco el grafo es mayor.
- Reescribe también `graph.html` y `GRAPH_REPORT.md`.
- Con `graph.json` corrupto sale con 1 y pide borrarlo y reconstruir (esa decisión es de Bifröst, no tuya: repórtalo).
- En un directorio sin archivos de código sale con 1 (`No code files found`).

## Consultas

| Pregunta | Comando | Uso |
| --- | --- | --- |
| Abierta ("¿cómo funciona X?", "¿quién llama a Y?") | `graphify query "<pregunta>"` | Recorrido BFS desde los nodos que casan con las palabras. Opciones: `--dfs`, `--budget N` (tokens, 2000 por defecto), `--seed "config_write()"` (etiqueta o id del nodo; no admite `ruta::símbolo`), `--context call` |
| Relación entre dos símbolos | `graphify path "A" "B"` | Camino más corto dirigido. `--undirected` ignora la dirección |
| Un símbolo | `graphify explain "X"` | Archivo, línea, tipo, comunidad y conexiones (las 20 más conectadas; `--all` para todas) |

Los nombres de función llevan paréntesis en el grafo (`config_write()`), pero `explain config_write` también casa.

## Códigos de salida de `query`, `path` y `explain`

| Código | Significado | Qué hacer |
| --- | --- | --- |
| 0 | Respuesta | Úsala (ver la excepción de `path`) |
| 3 | Nombre ambiguo; imprime los candidatos | Repite con `ruta::símbolo` (p. ej. `install.sh::config_get`) o con el id completo de un candidato. No des por buena la primera salida |
| 4 | Sin coincidencia | Busca en el código (`grep`, lectura) y dilo en el brief |
| 1 | Error (p. ej. `graph file not found`) | Trátalo como grafo no disponible: explora leyendo código y avisa |

Excepción: `graphify path` sin camino dirigido **sale con 0** y escribe `No directed path found ... Re-run with --undirected`. No es una respuesta: repite con `--undirected`.

## Ejemplos de salida reales

`graphify explain "install.sh::config_get"` (código 0):

```
Node: config_get()
  ID:        install_config_get
  Source:    install.sh L68
  Type:      code
  Community: install.sh
  Degree:    ...
Connections (...):
  <-- cmd_install() [calls] [EXTRACTED] install.sh:L311
```

`graphify explain "Config"` (código 3):

```
Ambiguous: 'Config' matches 2 nodes in different files.
  README.md
    id: readme_configuración
  install.sh
    id: install_config_get
Retry with path::symbol using one of the paths above (e.g. <path>::Configuración) or the full node id.
```

`graphify path "main()" "config_write()"` (código 0):

```
Shortest path (2 hops):
  main() --calls [EXTRACTED]--> cmd_install() --calls [EXTRACTED]--> config_write()
```

`graphify explain "zzznope_fn"` (código 4):

```
No node matching 'zzznope_fn' found.
```

`graphify query "who calls config_write"` (código 0, recortado): cabecera con el recorrido y los nodos de partida, líneas `NODE nombre [src=archivo loc=Lnn community=...]` y líneas `EDGE A --calls [EXTRACTED context=call]--> B at=archivo:Lnn`. Si la salida se recorta (`[!] TRUNCATED`), sube `--budget` al valor que indica o estrecha la pregunta.

## Etiquetas de las aristas

`EXTRACTED` es una relación leída directamente del código (AST). Otras etiquetas (p. ej. `INFERRED`) son heurísticas: confírmalas leyendo código antes de afirmarlas.
