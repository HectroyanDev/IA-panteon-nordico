#!/usr/bin/env bash
# Pruebas de tests/evals.sh con un `claude` falso (tests/fixtures/evals-bin).
# No hace llamadas reales ni gasta crédito.
# Uso: bash tests/evals_test.sh
set -uo pipefail

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
FAKE_BIN="$SRC_DIR/tests/fixtures/evals-bin"
SCRIPT="$SRC_DIR/tests/evals.sh"
SUITE="$(mktemp -d "${TMPDIR:-/tmp}/nordic-evals-test.XXXXXX")"
trap 'rm -rf "$SUITE"' EXIT

# PATH del sistema sin `claude`, para el caso "sin claude".
SYSBIN="$SUITE/sysbin"
mkdir -p "$SYSBIN"
for d in /usr/local/bin /usr/bin /bin; do
  for f in "$d"/*; do
    n="${f##*/}"
    [ "$n" = claude ] && continue
    [ -e "$SYSBIN/$n" ] || [ -L "$SYSBIN/$n" ] || ln -s "$f" "$SYSBIN/$n" 2>/dev/null
  done
done

PASS=0 FAIL=0 FAILED=()

setup() {
  CASE_DIR="$(mktemp -d "$SUITE/case.XXXXXX")"
  export FAKE_EVAL_LOG="$CASE_DIR/calls.txt"
  export PATH="$FAKE_BIN:$SYSBIN"
  unset FAKE_EVAL_RC FAKE_EVAL_NEWREPORT
  export EVALS_RESULTS_DIR="$CASE_DIR/results"
  mkdir -p "$EVALS_RESULTS_DIR/viejo"
  OUT="$CASE_DIR/out.txt"
  ERRORS=()
  : >"$FAKE_EVAL_LOG"
}

run() {
  "$SCRIPT" "$@" </dev/null >"$OUT" 2>&1
  RC=$?
}

fail() { ERRORS+=("$*"); }
rc_is()      { [ "$RC" = "$1" ] || fail "código $RC, esperado $1"; }
out_has()    { grep -qF -- "$1" "$OUT" || fail "la salida no contiene: $1"; }
calls()      { wc -l <"$FAKE_EVAL_LOG" | tr -d ' '; }
calls_is()   { [ "$(calls)" = "$1" ] || fail "llamadas a claude: $(calls), esperadas $1"; }
call_has()   { grep -qE -e "$1" "$FAKE_EVAL_LOG" || fail "la llamada no contiene: $1"; }
call_lacks() { ! grep -qE -e "$1" "$FAKE_EVAL_LOG" || fail "la llamada contiene: $1"; }
# Toda llamada registrada lleva --no-publish y el tope de 2 USD.
guards_ok() {
  local n
  n="$(wc -l <"$FAKE_EVAL_LOG" | tr -d ' ')"
  [ "$(grep -c -- '--no-publish' "$FAKE_EVAL_LOG")" = "$n" ] || fail "falta --no-publish en alguna llamada"
  [ "$(grep -c -- '--max-cost-usd 2 ' "$FAKE_EVAL_LOG")" = "$n" ] || fail "falta --max-cost-usd 2 en alguna llamada"
  ! grep -q -- '--publish-report' "$FAKE_EVAL_LOG" || fail "aparece --publish-report"
}

# case_ NOMBRE: abre un caso; end_case lo cierra y lo cuenta.
case_() { CURRENT="$1"; setup; }
end_case() {
  if [ "${#ERRORS[@]}" -eq 0 ]; then
    PASS=$((PASS + 1)); printf 'ok   %s\n' "$CURRENT"
  else
    FAIL=$((FAIL + 1)); FAILED+=("$CURRENT")
    printf 'FAIL %s\n' "$CURRENT"
    printf '       - %s\n' "${ERRORS[@]}"
  fi
}

# ---------------------------------------------------------------- casos

case_ "por defecto: --runs 1, sin publicar, tope 2, sin brazo base"
run
rc_is 0; calls_is 1
call_has '^plugin eval '; call_has '--runs 1 '; call_has '--ablation none'
call_lacks '--case'; call_has '--allow-tools'; guards_ok
end_case

case_ "--runs 3"
run --runs 3
rc_is 0; calls_is 1; call_has '--runs 3 '; guards_ok
end_case

case_ "--case se pasa tal cual"
run --case 'bifrost-*'
rc_is 0; calls_is 1; call_has "--case bifrost-\\*"; guards_ok
end_case

case_ "--baseline activa with-without"
run --baseline
rc_is 0; calls_is 1; call_has '--ablation with-without'; guards_ok
end_case

case_ "bash acotado: solo comprobaciones de lectura"
run
call_has "Bash\\(command -v:\\*\\)"; call_has "Bash\\(ls:\\*\\)"
call_lacks 'graphify extract'; call_lacks 'Bash\)'; call_lacks 'Write'; call_lacks 'Edit'
end_case

case_ "--help muestra la ayuda y no llama a claude"
run --help
rc_is 0; calls_is 0; out_has 'Uso: tests/evals.sh'; out_has '--runs N'
end_case

case_ "flag desconocido: ayuda, 64 y sin llamar a claude"
run --publish-report
rc_is 64; calls_is 0; out_has 'Uso: tests/evals.sh'
end_case

case_ "--max-cost-usd 10 no se admite"
run --max-cost-usd 10
rc_is 64; calls_is 0
end_case

case_ "--runs 0 no se admite"
run --runs 0
rc_is 64; calls_is 0
end_case

case_ "--runs abc no se admite"
run --runs abc
rc_is 64; calls_is 0
end_case

case_ "--runs sin valor no se admite"
run --runs
rc_is 64; calls_is 0
end_case

case_ "código 2 (tope alcanzado) se propaga"
export FAKE_EVAL_RC=2
run
rc_is 2; calls_is 1
end_case

case_ "código 1 (caso por debajo del umbral) se propaga"
export FAKE_EVAL_RC=1
run
rc_is 1
end_case

case_ "sin claude en el PATH: aborta sin llamar"
export PATH="$SYSBIN"
run
rc_is 1; calls_is 0; out_has 'claude'
end_case

case_ "informe: solo se imprime si esta ejecución generó uno nuevo"
run
rc_is 0; ! grep -qF 'Informe:' "$OUT" || fail "imprime informe antiguo"
export FAKE_EVAL_NEWREPORT=1
run
rc_is 0; out_has 'results/nuevo/report.html'
end_case

printf '\n%d ok, %d fallan\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
