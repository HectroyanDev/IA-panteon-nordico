#!/usr/bin/env bash
# Lanza la suite de evals del panteón con `claude plugin eval`.
# Cada ejecución hace llamadas reales con tu credencial: va siempre con
# --no-publish y --max-cost-usd 2, y esos dos valores no se pueden cambiar.
# Uso: tests/evals.sh [--runs N] [--case GLOB] [--baseline]
set -uo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
MAX_COST_USD=2
# Directorio de informes (sobrescribible solo para las pruebas).
RESULTS_DIR="${EVALS_RESULTS_DIR:-$REPO_DIR/evals/results}"
# Bash acotado para el caso hugin-graphify-no-graph: solo lectura.
ALLOWED_TOOLS=('Bash(command -v:*)' 'Bash(test -f:*)' 'Bash(test -d:*)' 'Bash(git rev-parse:*)' 'Bash(ls:*)')

usage() {
  cat <<EOF2
Uso: tests/evals.sh [flags]

Ejecuta los casos de evals/ contra el plugin con \`claude plugin eval\`.
Cada ejecución consume crédito de tu cuenta (tope fijo de $MAX_COST_USD USD, sin publicar el informe).

Flags:
  --runs N       Ejecuciones por caso, entero >= 1 (por defecto 1)
  --case GLOB    Solo los casos cuyo nombre coincide con el glob (p. ej. 'bifrost-*')
  --baseline     Añade el brazo sin plugin (--ablation with-without; dobla el coste)
  -h, --help     Esta ayuda

Códigos de salida: los de \`claude plugin eval\` (0 todo pasa, 1 algún caso
falla, 2 tope de coste alcanzado, 143 terminado); 64 por uso incorrecto.
Resultados en evals/results/<fecha>/ (fuera del control de versiones).
EOF2
}

RUNS=1
CASE_GLOB=""
BASELINE=0

while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --runs)
      shift
      if [ $# -eq 0 ] || ! [[ "$1" =~ ^[0-9]+$ ]] || [ "$1" -lt 1 ]; then
        echo "tests/evals.sh: --runs necesita un entero >= 1" >&2
        usage >&2
        exit 64
      fi
      RUNS="$1" ;;
    --case)
      shift
      if [ $# -eq 0 ] || [ -z "$1" ]; then
        echo "tests/evals.sh: --case necesita un glob" >&2
        usage >&2
        exit 64
      fi
      CASE_GLOB="$1" ;;
    --baseline) BASELINE=1 ;;
    *)
      echo "tests/evals.sh: flag no reconocido: $1" >&2
      usage >&2
      exit 64 ;;
  esac
  shift
done

if ! command -v claude >/dev/null 2>&1; then
  echo "tests/evals.sh: no encuentro \`claude\` en el PATH" >&2
  exit 1
fi

ABLATION=none
[ "$BASELINE" = 1 ] && ABLATION=with-without

MARK="$(mktemp "${TMPDIR:-/tmp}/nordic-evals-mark.XXXXXX")"
trap 'rm -f "$MARK"' EXIT
ARGS=(plugin eval "$REPO_DIR" --trust-plugin --no-publish --max-cost-usd "$MAX_COST_USD"
  --runs "$RUNS" --ablation "$ABLATION")
[ -n "$CASE_GLOB" ] && ARGS+=(--case "$CASE_GLOB")
ARGS+=(--allow-tools "${ALLOWED_TOOLS[@]}")

claude "${ARGS[@]}"
RC=$?

# Solo si esta ejecución generó un informe nuevo (posterior a la marca).
LATEST="$(find "$RESULTS_DIR" -mindepth 1 -maxdepth 1 -type d -newer "$MARK" 2>/dev/null | sort | tail -n 1)"
[ -n "$LATEST" ] && echo "Informe: ${LATEST%/}/report.html"
exit "$RC"
