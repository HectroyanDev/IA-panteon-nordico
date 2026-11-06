# Mimir tools (MCP server `mimisbrunnr` → `mcp__mimisbrunnr__mimir_*`)

| Tool | Use |
| --- | --- |
| `mimir_ping` | Health check |
| `mimir_context` | Recent session context (fast, start here on recall) |
| `mimir_search` | Full-text search by project + query |
| `mimir_get` | Full observation by numeric id (required after search for decisions) |
| `mimir_list` | List observations for a project |
| `mimir_save` | Upsert observation; use `topic_key` for evolving topics |
| `mimir_session_start` | Begin session for a project |
| `mimir_session_end` | Close session with structured summary |

**Recall path:** `mimir_context` → `mimir_search` → `mimir_get`

**Project namespace:** use the current workspace project name (e.g. repo basename) unless Bifröst passes another.
