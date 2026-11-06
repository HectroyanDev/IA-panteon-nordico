#!/usr/bin/env bash
# Banco de fases: Skuld -> Brokkr -> Heimdall -> Hela sobre un repo de juguete
# (evals/bench/fixture) con `claude -p`, una sesión por fase, y tabla de tokens
# por fase con scripts/token-report.ts.
# Cuesta dinero: sin --yes solo imprime lo que haría (dry run).
# Uso: scripts/phase-bench.sh [--yes] [--budget USD]
#
# Flags de `claude -p` usados (comprobados con `claude --help`):
#   --session-id <uuid>        sesión propia por fase
#   --max-budget-usd <n>       tope de gasto por fase (solo con -p)
#   --allowedTools <tools...>  herramientas permitidas (-p no puede preguntar)
#   --plugin-dir <ruta>        carga este repo como plugin (solo esta sesión; no
#                              depende de las fuentes de settings)
#   --permission-mode dontAsk  no hereda defaultMode "auto" del usuario: lo que
#                              no esté en --allowedTools se deniega
#   --setting-sources project  no carga settings de usuario ni locales (CLAUDE.md
#                              global, hooks, plugins); el fixture no tiene settings
# Si el transcript de una fase no aparece en ~/.claude/projects, el agregador
# lo reporta como "sesión no encontrada" (no hay respaldo con stream-json).
# Vár no se mide: no se ha comprobado que su módulo corra en `claude -p`.
set -uo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
BENCH_DIR="$REPO_DIR/evals/bench"
CHANGE="add-version-flag"
BUDGET=3
YES=0
# Comando del agregador (sobrescribible solo para las pruebas).
if [ -n "${PHASE_BENCH_REPORT:-}" ]; then
  read -r -a REPORT_CMD <<<"$PHASE_BENCH_REPORT"
else
  REPORT_CMD=(bun "$REPO_DIR/scripts/token-report.ts")
fi
# Bash acotado: nada de `Bash(bash:*)` ni `Bash(git:*)` (equivalen a shell libre
# o permiten git push / config --global / -C a otros repos).
ALLOWED_TOOLS=(Read Write Edit Glob Grep Skill Agent
  'Bash(openspec:*)' 'Bash(bash greet.sh:*)' 'Bash(./greet.sh:*)'
  'Bash(git status:*)' 'Bash(git diff:*)' 'Bash(git add:*)' 'Bash(git commit:*)' 'Bash(git log:*)')

usage() {
  cat <<EOF2
Uso: scripts/phase-bench.sh [flags]

Ejecuta Skuld, Brokkr, Heimdall y Hela, en ese orden, sobre un repo de juguete
con \`claude -p\` (una sesión por fase) y muestra los tokens de cada fase.
Cada fase hace llamadas reales con tu credencial. Sin --yes solo imprime los
comandos que lanzaría. No mide Odín ni el camino plan mode (no hay
AskUserQuestion ni EnterPlanMode en \`claude -p\`) ni a Vár.

Flags:
  --yes          Ejecuta de verdad (cuesta dinero: hasta 4 x --budget)
  --budget USD   Tope de gasto por fase, número > 0 (por defecto $BUDGET)
  -h, --help     Esta ayuda

Códigos de salida: 0 todo bien; 1 alguna fase falló; 64 uso incorrecto.
EOF2
}

while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --yes) YES=1 ;;
    --budget)
      shift
      if [ $# -eq 0 ] || ! [[ "$1" =~ ^[0-9]+(\.[0-9]+)?$ ]] || ! awk -v b="$1" 'BEGIN { exit !(b > 0) }'; then
        echo "scripts/phase-bench.sh: --budget necesita un número > 0" >&2
        usage >&2
        exit 64
      fi
      BUDGET="$1" ;;
    *)
      echo "scripts/phase-bench.sh: flag no reconocido: $1" >&2
      usage >&2
      exit 64 ;;
  esac
  shift
done

if [ "$YES" = 1 ]; then
  for c in claude git openspec uuidgen "${REPORT_CMD[0]}"; do
    if ! command -v "$c" >/dev/null 2>&1; then
      echo "scripts/phase-bench.sh: no encuentro \`$c\` en el PATH" >&2
      exit 1
    fi
  done
fi

PHASES=(skuld brokkr heimdall hela)
CHANGE_TEXT="$(cat "$BENCH_DIR/change.md")"

prompt_for() {
  case "$1" in
    skuld)
      printf 'Carga la skill nordic-pantheon:skuld y genera los artefactos del change "%s" (proposal, specs, design y tasks) con /opsx:propose. Requisitos ya confirmados:\n\n%s' "$CHANGE" "$CHANGE_TEXT" ;;
    brokkr)
      printf 'Carga la skill nordic-pantheon:brokkr e implementa el change "%s" con su tasks.md. Requisitos confirmados:\n\n%s' "$CHANGE" "$CHANGE_TEXT" ;;
    heimdall)
      printf 'Carga la skill nordic-pantheon:heimdall y valida la implementación del change "%s" contra sus artefactos. Requisitos confirmados:\n\n%s' "$CHANGE" "$CHANGE_TEXT" ;;
    hela)
      printf 'Carga la skill nordic-pantheon:hela y archiva el change "%s". Tienes mi autorización para archivarlo y sincronizar sus specs; no hay nadie que responda preguntas.' "$CHANGE" ;;
  esac
}

# run_phase FASE UUID DIRECTORIO: ejecuta o imprime la llamada de la fase.
run_phase() {
  local phase="$1" uuid="$2" dir="$3" prompt
  prompt="$(prompt_for "$phase")"
  local args=(-p "$prompt" --session-id "$uuid" --max-budget-usd "$BUDGET"
    --permission-mode dontAsk --setting-sources project
    --plugin-dir "$REPO_DIR" --allowedTools "${ALLOWED_TOOLS[@]}")
  if [ "$YES" = 1 ]; then
    echo "== Fase $phase (sesión $uuid)"
    (cd "$dir" && claude "${args[@]}") </dev/null
  else
    # El prompt completo no se imprime: solo su primera línea.
    printf '[dry run] (cd <repo de juguete> && claude -p %q' "${prompt%%$'\n'*}"
    printf ' %q' "${args[@]:2}"
    printf ')\n'
  fi
}

new_uuid() {
  if command -v uuidgen >/dev/null 2>&1; then uuidgen | tr 'A-Z' 'a-z'
  else cat /proc/sys/kernel/random/uuid; fi
}

if [ "$YES" = 1 ]; then
  WORK="$(mktemp -d "${TMPDIR:-/tmp}/nordic-phase-bench.XXXXXX")" || {
    echo "scripts/phase-bench.sh: no se pudo crear el directorio temporal" >&2
    exit 1
  }
  if [ -z "$WORK" ] || [ ! -d "$WORK" ]; then
    echo "scripts/phase-bench.sh: el directorio temporal no existe: $WORK" >&2
    exit 1
  fi
  trap 'rm -rf "$WORK"' EXIT
  WORK="$(cd "$WORK" && pwd -P)" || exit 1
  cp -R "$BENCH_DIR/fixture/." "$WORK/"
  (cd "$WORK" && git init -q && openspec init --tools none >/dev/null) || {
    echo "scripts/phase-bench.sh: no se pudo preparar el repo de juguete" >&2
    exit 1
  }
  (cd "$WORK" && git add -A && git -c user.name=bench -c user.email=bench@example.invalid commit -q -m "fixture") || true
else
  WORK="<directorio temporal con copia de evals/bench/fixture>"
  echo "[dry run] no se ejecuta nada; usa --yes para lanzar (hasta 4 x $BUDGET USD)."
  echo "[dry run] se copiaría el fixture, y se ejecutaría: git init && openspec init --tools none"
fi

SESSIONS=()
RC=0
for phase in "${PHASES[@]}"; do
  uuid="$(new_uuid)"
  SESSIONS+=("$phase:$uuid")
  if ! run_phase "$phase" "$uuid" "$WORK"; then
    echo "scripts/phase-bench.sh: la fase $phase terminó con error (¿tope de $BUDGET USD?); se detiene" >&2
    RC=1
    break
  fi
done

if [ "$YES" != 1 ]; then
  echo "[dry run] después: ${REPORT_CMD[*]} --project <dir> --session <uuid> ... (una por fase)"
  exit 0
fi

echo
echo "Fases y sesiones:"
REPORT_ARGS=(--project "$WORK")
for entry in "${SESSIONS[@]}"; do
  echo "  ${entry%%:*} -> ${entry#*:}"
  REPORT_ARGS+=(--session "${entry#*:}")
done
echo
"${REPORT_CMD[@]}" "${REPORT_ARGS[@]}"
exit "$RC"
