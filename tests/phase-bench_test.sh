#!/usr/bin/env bash
# Pruebas de scripts/phase-bench.sh con un `claude` y un `openspec` falsos
# (tests/fixtures/phase-bench-bin). No hace llamadas reales ni gasta crédito.
# Uso: bash tests/phase-bench_test.sh
set -uo pipefail

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
FAKE_BIN="$SRC_DIR/tests/fixtures/phase-bench-bin"
SCRIPT="$SRC_DIR/scripts/phase-bench.sh"
SUITE="$(mktemp -d "${TMPDIR:-/tmp}/nordic-bench-test.XXXXXX")"
trap 'rm -rf "$SUITE"' EXIT

# Agregador falso: registra sus argumentos.
cat >"$SUITE/report" <<'EOF2'
#!/usr/bin/env bash
printf '%s\n' "$*" >>"${FAKE_REPORT_LOG:?}"
echo "tabla falsa"
EOF2
chmod +x "$SUITE/report"

PASS=0 FAIL=0 ERRORS=()

setup() {
  CASE_DIR="$(mktemp -d "$SUITE/case.XXXXXX")"
  export FAKE_BENCH_LOG="$CASE_DIR/calls.txt" FAKE_REPORT_LOG="$CASE_DIR/report.txt"
  export PHASE_BENCH_REPORT="$SUITE/report"
  export PATH="$FAKE_BIN:$PATH"
  OUT="$CASE_DIR/out.txt"
  ERRORS=()
  : >"$FAKE_BENCH_LOG"; : >"$FAKE_REPORT_LOG"
}

run() {
  "$SCRIPT" "$@" </dev/null >"$OUT" 2>&1
  RC=$?
}

fail() { ERRORS+=("$*"); }
rc_is()      { [ "$RC" = "$1" ] || fail "código $RC, esperado $1"; }
out_has()    { grep -qF -- "$1" "$OUT" || fail "la salida no contiene: $1"; }
calls()      { wc -l <"$FAKE_BENCH_LOG" | tr -d ' '; }
calls_is()   { [ "$(calls)" = "$1" ] || fail "llamadas a claude: $(calls), esperadas $1"; }
# Cuántas llamadas contienen el patrón.
count_is()   { local n; n="$(grep -cE -e "$1" "$FAKE_BENCH_LOG")"; [ "$n" = "$2" ] || fail "'$1' en $n llamadas, esperadas $2"; }
report_calls_is() { [ "$(wc -l <"$FAKE_REPORT_LOG" | tr -d ' ')" = "$1" ] || fail "llamadas al agregador distintas de $1"; }

case_() { CURRENT="$1"; setup; }
end_case() {
  if [ "${#ERRORS[@]}" -eq 0 ]; then
    PASS=$((PASS + 1)); printf 'ok   %s\n' "$CURRENT"
  else
    FAIL=$((FAIL + 1)); printf 'FAIL %s\n' "$CURRENT"; printf '       - %s\n' "${ERRORS[@]}"
  fi
}

# ---------------------------------------------------------------- casos

case_ "sin --yes: dry run, no se llama a claude ni al agregador"
run
rc_is 0; calls_is 0; report_calls_is 0; out_has '[dry run]'
out_has 'nordic-pantheon:skuld'; out_has 'nordic-pantheon:hela'
end_case

case_ "con --yes: cuatro llamadas a claude, una por fase"
run --yes
rc_is 0; calls_is 4
count_is 'nordic-pantheon:skuld' 1; count_is 'nordic-pantheon:brokkr' 1
count_is 'nordic-pantheon:heimdall' 1; count_is 'nordic-pantheon:hela' 1
end_case

case_ "cada llamada lleva su --session-id, el tope de gasto y --allowedTools"
run --yes
count_is '^-p ' 4; count_is '--session-id [0-9a-f-]{36} ' 4
count_is '--max-budget-usd 3 ' 4; count_is '--allowedTools ' 4
[ "$(grep -o -- '--session-id [0-9a-f-]*' "$FAKE_BENCH_LOG" | sort -u | wc -l | tr -d ' ')" = 4 ] || fail "los session-id no son distintos"
end_case

case_ "--budget se propaga a las cuatro fases"
run --yes --budget 1.5
count_is '--max-budget-usd 1.5 ' 4
end_case

case_ "cada llamada lleva --permission-mode dontAsk y --setting-sources project"
run --yes
count_is '--permission-mode dontAsk ' 4; count_is '--setting-sources project ' 4
count_is '--plugin-dir ' 4
end_case

case_ "--allowedTools está acotado: sin intérpretes ni git libres"
run --yes
! grep -qE 'Bash( |$)' "$FAKE_BENCH_LOG" || fail "Bash sin acotar"
for interp in bash sh zsh python python3 node bun; do
  ! grep -qE "Bash\\($interp:\\*\\)" "$FAKE_BENCH_LOG" || fail "Bash($interp:*) sin argumento"
done
! grep -qE 'Bash\(git:\*\)' "$FAKE_BENCH_LOG" || fail "Bash(git:*) sin acotar"
count_is "Bash\\(openspec:\\*\\)" 4
count_is "Bash\\(bash greet.sh:\\*\\)" 4
for sub in status diff add commit log; do count_is "Bash\\(git $sub:\\*\\)" 4; done
end_case

case_ "mktemp falla: sale con error sin copiar ni borrar nada"
mkdir "$CASE_DIR/bin"
cat >"$CASE_DIR/bin/mktemp" <<'EOF2'
#!/usr/bin/env bash
exit 1
EOF2
cat >"$CASE_DIR/bin/rm" <<'EOF2'
#!/usr/bin/env bash
echo "rm $*" >>"${FAKE_RM_LOG:?}"
EOF2
cat >"$CASE_DIR/bin/cp" <<'EOF2'
#!/usr/bin/env bash
echo "cp $*" >>"${FAKE_RM_LOG:?}"
EOF2
chmod +x "$CASE_DIR/bin/"*
export FAKE_RM_LOG="$CASE_DIR/rmcp.txt"; : >"$FAKE_RM_LOG"
PATH="$CASE_DIR/bin:$PATH" run --yes
rc_is 1; calls_is 0; report_calls_is 0
out_has 'directorio temporal'
[ ! -s "$FAKE_RM_LOG" ] || fail "se llamó a rm o cp: $(cat "$FAKE_RM_LOG")"
end_case

case_ "el agregador recibe las cuatro sesiones de claude"
run --yes
rc_is 0; report_calls_is 1
for id in $(grep -o -- '--session-id [0-9a-f-]*' "$FAKE_BENCH_LOG" | cut -d' ' -f2); do
  grep -qF -- "--session $id" "$FAKE_REPORT_LOG" || fail "falta la sesión $id"
done
grep -qF -- '--project ' "$FAKE_REPORT_LOG" || fail "falta --project"
out_has 'tabla falsa'
end_case

case_ "--budget 0 no se admite"
run --budget 0
rc_is 64; calls_is 0
end_case

case_ "--budget abc no se admite"
run --budget abc
rc_is 64; calls_is 0
end_case

case_ "flag desconocido: ayuda, 64 y sin llamar a claude"
run --publish
rc_is 64; calls_is 0; out_has 'Uso: scripts/phase-bench.sh'
end_case

case_ "--help muestra la ayuda"
run --help
rc_is 0; calls_is 0; out_has '--budget USD'
end_case

printf '\n%d ok, %d fallan\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
