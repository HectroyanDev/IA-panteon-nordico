#!/usr/bin/env bash
# Pruebas de scripts/protocol.ts sobre tests/fixtures/protocol (un openspec/ de juguete por caso).
# Sin red ni modelo. Necesita `bun`.
# Uso: bash tests/protocol_test.sh
set -uo pipefail

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
FIX="$SRC_DIR/tests/fixtures/protocol"
SCRIPT="$SRC_DIR/scripts/protocol.ts"
OUT="$(mktemp "${TMPDIR:-/tmp}/nordic-protocol.XXXXXX")"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/nordic-protocol-work.XXXXXX")"
trap 'rm -rf "$OUT" "$WORK"' EXIT

if ! command -v bun >/dev/null 2>&1; then
  echo "tests/protocol_test.sh: no encuentro \`bun\` en el PATH" >&2
  exit 1
fi

PASS=0 FAIL=0 ERRORS=()
fail()     { ERRORS+=("$*"); }
# run <fixture|ruta> <args...>: ejecuta el script con --root sobre un fixture (o una copia de trabajo)
run()      { local root="$1"; shift; [ -d "$root" ] || root="$FIX/$root"; bun "$SCRIPT" --root "$root" "$@" </dev/null >"$OUT" 2>&1; RC=$?; }
rc_is()    { [ "$RC" = "$1" ] || fail "código $RC, esperado $1 ($(tr '\n' '|' <"$OUT" | cut -c1-200))"; }
rc_fails() { [ "$RC" = "1" ] || fail "código $RC, esperado 1 ($(tr '\n' '|' <"$OUT" | cut -c1-200))"; }
out_has()  { grep -qF -- "$1" "$OUT" || fail "la salida no contiene: $1 ($(tr '\n' '|' <"$OUT" | cut -c1-200))"; }
out_lacks(){ ! grep -qF -- "$1" "$OUT" || fail "la salida contiene: $1"; }
# copia de trabajo del fixture `check`
fresh()    { rm -rf "$WORK/r"; mkdir -p "$WORK/r"; cp -r "$FIX/check/openspec" "$WORK/r/openspec"; CH="$WORK/r/openspec/changes/add-x"; }

case_() { CURRENT="$1"; ERRORS=(); }
end_case() {
  if [ "${#ERRORS[@]}" -eq 0 ]; then
    PASS=$((PASS + 1)); printf 'ok   %s\n' "$CURRENT"
  else
    FAIL=$((FAIL + 1)); printf 'FAIL %s\n' "$CURRENT"; printf '       - %s\n' "${ERRORS[@]}"
  fi
}

# ---------------------------------------------------------------- REQ-003: IDs en el título

case_ "REQ-003 ids: títulos con ID y únicos pasan"
run ids-ok ids; rc_is 0
end_case

case_ "REQ-003 ids: un RENAMED pendiente no da falsos fallos"
run ids-renamed-pendiente ids; rc_is 0
end_case

case_ "REQ-003 ids: ID duplicado en la spec nombra la capability y el ID"
run ids-duplicado ids; rc_fails; out_has 'foo: REQ-001 repetido'
end_case

case_ "REQ-003 ids: ID de un ADDED que ya existe en la spec"
run ids-duplicado-delta ids; rc_fails; out_has 'foo: REQ-001 repetido'; out_has 'ADDED de add-x'
end_case

case_ "REQ-003 ids: requisito sin ID (en la spec y en un change abierto)"
run ids-sin-id ids; rc_fails; out_has '"Sin ID" no empieza por REQ-NNN'; out_has '"Otro sin ID" (ADDED de add-x)'
end_case

# ---------------------------------------------------------------- REQ-003: numeración

case_ "REQ-003 ids --next: uno más que el mayor de la spec y de los changes abiertos"
run next-libre ids --next foo; rc_is 0; out_has 'REQ-012'
end_case

case_ "REQ-003 ids --next: un número eliminado en un change archivado no se reutiliza"
run next-eliminado ids --next foo; rc_is 0; out_has 'REQ-011'
end_case

case_ "REQ-003 ids --next: capability nueva empieza en REQ-001"
run next-libre ids --next capability-nueva; rc_is 0; out_has 'REQ-001'
end_case

# ---------------------------------------------------------------- REQ-003: check sobre tasks.md

case_ "REQ-003 check: tasks.md válido sale con 0 (un RENAMED no exige tarea)"
fresh; run "$WORK/r" check add-x; rc_is 0; out_has 'sin fallos'
end_case

case_ "REQ-003 check: T-n repetido"
fresh; echo '- [ ] 1.3 T-1 Repetida. Verificación: v. Cubre: —' >> "$CH/tasks.md"
run "$WORK/r" check add-x; rc_fails; out_has 'T-1 repetida'
end_case

case_ "REQ-003 check: tarea que cubre un requisito que no es del change"
fresh; sed -i 's|Cubre: foo/REQ-003|Cubre: foo/REQ-003, foo/REQ-002|' "$CH/tasks.md"
run "$WORK/r" check add-x; rc_fails; out_has 'T-1 cubre foo/REQ-002, que no es un requisito del change'
end_case

case_ "REQ-003 check: requisito ADDED sin tarea"
fresh; sed -i 's|Cubre: foo/REQ-003|Cubre: —|' "$CH/tasks.md"
run "$WORK/r" check add-x; rc_fails; out_has 'requisito sin tarea: foo/REQ-003'
end_case

case_ "REQ-003 check: sin tasks.md"
fresh; rm "$CH/tasks.md"
run "$WORK/r" check add-x; rc_fails; out_has 'tasks.md no existe'
end_case

case_ "REQ-003 check: marcar una casilla no cambia el resultado"
fresh; sed -i 's/^- \[ \] 1.1 T-1/- [x] 1.1 T-1/' "$CH/tasks.md"
run "$WORK/r" check add-x; rc_is 0
end_case

echo
echo "protocol: $PASS ok, $FAIL con fallos"
[ "$FAIL" -eq 0 ]
