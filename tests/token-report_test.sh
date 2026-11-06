#!/usr/bin/env bash
# Pruebas de scripts/token-report.ts sobre tests/fixtures/token-report.
# Sin llamadas a la API. Necesita `bun`.
# Uso: bash tests/token-report_test.sh
set -uo pipefail

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
FIX="$SRC_DIR/tests/fixtures/token-report"
SCRIPT="$SRC_DIR/scripts/token-report.ts"
OUT="$(mktemp "${TMPDIR:-/tmp}/nordic-token-report.XXXXXX")"
trap 'rm -f "$OUT"' EXIT
export CLAUDE_PROJECTS_DIR="$FIX/projects"

if ! command -v bun >/dev/null 2>&1; then
  echo "tests/token-report_test.sh: no encuentro \`bun\` en el PATH" >&2
  exit 1
fi

PASS=0 FAIL=0 ERRORS=()
fail()    { ERRORS+=("$*"); }
run()     { bun "$SCRIPT" "$@" </dev/null >"$OUT" 2>&1; RC=$?; }
rc_is()   { [ "$RC" = "$1" ] || fail "código $RC, esperado $1"; }
out_has() { grep -qF -- "$1" "$OUT" || fail "la salida no contiene: $1"; }
same_as() { diff -u "$FIX/$1" "$OUT" >/dev/null || fail "la salida difiere de $1: $(diff "$FIX/$1" "$OUT" | head -5 | tr '\n' '|')"; }

case_() { CURRENT="$1"; ERRORS=(); }
end_case() {
  if [ "${#ERRORS[@]}" -eq 0 ]; then
    PASS=$((PASS + 1)); printf 'ok   %s\n' "$CURRENT"
  else
    FAIL=$((FAIL + 1)); printf 'FAIL %s\n' "$CURRENT"; printf '       - %s\n' "${ERRORS[@]}"
  fi
}

case_ "todas las sesiones: deduplica, agrupa por skill/hilo/modelo y suma"
run --project /fake/proj
rc_is 0; same_as expected-all.txt
out_has 'nordic-pantheon:odin   principal  claude-opus-5-5           3     16     170'
end_case

case_ "duplicados de un requestId con usage distinto: gana el mayor output (empate: el último)"
run --project /fake/proj --session sess-a
# req_6: output 3, 60, 60 (input 4 y 5), 7 -> una llamada con output 60 e input 5.
out_has 'nordic-pantheon:odin   principal  claude-opus-5-5           3     16     170'
out_has 'TOTAL                                                       6     44     450'
end_case

case_ "línea sin attributionSkill cae en (sin skill)"
run --project /fake/proj
out_has '(sin skill)'
end_case

case_ "subagente en fork aparece como hilo subagente"
run --project /fake/proj --session sess-a
rc_is 0; same_as expected-session.txt
out_has 'nordic-pantheon:hugin  subagente'
end_case

case_ "--session filtra: no aparece la otra sesión"
run --project /fake/proj --session sess-b
rc_is 0; out_has 'Sesión sess-b'; ! grep -qF 'sess-a' "$OUT" || fail "aparece sess-a"
end_case

case_ "--since descarta sesiones anteriores"
run --project /fake/proj --since 2026-11-05
rc_is 0; same_as expected-since.txt
! grep -qF 'sess-b' "$OUT" || fail "aparece sess-b"
end_case

case_ "chat lateral: no es sesión aparte y su requestId propio se suma una vez"
run --project /fake/proj
# side-x.jsonl lleva sessionId sess-a, repite req_1 y req_2 y aporta req_7 (output 30).
! grep -qF 'side-x' "$OUT" || fail "aparece side-x como sesión"
[ "$(grep -c '^Sesión ' "$OUT")" = 4 ] || fail "se esperaban 4 sesiones"
run --project /fake/proj --session sess-a
out_has '(sin skill)            principal  claude-opus-5-5           2      8      80'
out_has 'TOTAL                                                       6     44     450'
run --project /fake/proj --session side-x
rc_is 0; out_has 'sesión no encontrada: side-x'
end_case

case_ "respuestas sin usage final: aviso y diferencia con cost-state"
run --project /fake/proj --session sess-c
out_has 'aviso: 1 respuestas sin usage final; el output puede estar por debajo del real'
out_has 'output vs cost-state: 28 / 100 (claude-opus-5-5)'
end_case

case_ "cost-state que cuadra y sin respuestas incompletas: sin avisos"
run --project /fake/proj --session sess-d
! grep -qF 'aviso' "$OUT" || fail "aparece un aviso"
! grep -qF 'output vs cost-state' "$OUT" || fail "aparece diferencia con cost-state"
end_case

case_ "total USD es el de la última cost-state"
run --project /fake/proj --session sess-a
out_has 'total real: 1.25 USD'
end_case

case_ "flag desconocido: 64"
run --project /fake/proj --json
rc_is 64; out_has 'flag no reconocido'
end_case

case_ "proyecto sin transcripts: 64"
run --project /no/existe
rc_is 64; out_has 'no hay transcripts'
end_case

printf '\n%d ok, %d fallan\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
