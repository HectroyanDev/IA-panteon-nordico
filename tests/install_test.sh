#!/usr/bin/env bash
# Pruebas de install.sh con HOME y XDG_CONFIG_HOME temporales y un `claude`
# falso (tests/fixtures/bin/claude). Nunca toca el HOME real.
# Uso: bash tests/install_test.sh
set -uo pipefail

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
FAKE_BIN="$SRC_DIR/tests/fixtures/bin"
SUITE="$(mktemp -d "${TMPDIR:-/tmp}/nordic-install-test.XXXXXX")"
trap 'rm -rf "$SUITE"' EXIT

# Copia del repo: los symlinks y la caché apuntan a ella, no al repo real.
REPO="$SUITE/repo"
mkdir -p "$REPO"
cp -R "$SRC_DIR/install.sh" "$SRC_DIR/skills" "$SRC_DIR/bifrost" "$SRC_DIR/.claude-plugin" "$REPO/"
REPO="$(cd "$REPO" && pwd -P)"

# `openspec` falso, en su propio directorio para poder quitarlo.
OPENSPEC_BIN="$SUITE/openspec-bin"
mkdir -p "$OPENSPEC_BIN"
printf '#!/bin/sh\nexit 0\n' >"$OPENSPEC_BIN/openspec"
chmod +x "$OPENSPEC_BIN/openspec"

# PATH del sistema sin herramientas que los casos añaden o quitan a voluntad:
# symlinks a todo lo de /usr/local/bin, /usr/bin y /bin salvo estas.
SYSBIN="$SUITE/sysbin"
mkdir -p "$SYSBIN"
for d in /usr/local/bin /usr/bin /bin; do
  for f in "$d"/*; do
    n="${f##*/}"
    case "$n" in uv|uvx|pipx|graphify|claude|openspec|git|go) continue ;; esac
    [ -e "$SYSBIN/$n" ] || [ -L "$SYSBIN/$n" ] || ln -s "$f" "$SYSBIN/$n" 2>/dev/null
  done
done
SYS_PATH="$SYSBIN"

# Gestores y CLI de graphify falsos, cada uno en su directorio para poder quitarlos.
UV_BIN="$SRC_DIR/tests/fixtures/uv-bin"
PIPX_BIN="$SRC_DIR/tests/fixtures/pipx-bin"
GRAPHIFY_BIN="$SRC_DIR/tests/fixtures/graphify-bin"
# git y go falsos (instalación de Mimisbrunnr), también quitables del PATH.
GIT_BIN="$SRC_DIR/tests/fixtures/git-bin"
GO_BIN="$SRC_DIR/tests/fixtures/go-bin"
PASS=0 FAIL=0 FAILED=()

# ---------------------------------------------------------------- harness

# Prepara un entorno limpio para un caso.
setup() {
  CASE_DIR="$(mktemp -d "$SUITE/case.XXXXXX")"
  export HOME="$CASE_DIR/home"
  export XDG_CONFIG_HOME="$CASE_DIR/xdg"
  export FAKE_CLAUDE_STATE="$CASE_DIR/claude-state"
  export FAKE_MIMIR=1
  # Donde los gestores falsos dejan `graphify` al instalar (en el PATH del caso)
  # y el lugar fuera del PATH que usa FAKE_TOOL_NOPATH=1.
  export FAKE_TOOL_BIN="$CASE_DIR/tool-bin"
  export FAKE_TOOL_HIDDEN_BIN="$CASE_DIR/hidden-bin"
  unset FAKE_TOOL_FAIL FAKE_TOOL_NOPATH XDG_CACHE_HOME
  unset FAKE_GIT_FAIL FAKE_GO_VERSION FAKE_GO_FAIL FAKE_MCP_ADD_FAIL
  export PATH="$FAKE_BIN:$OPENSPEC_BIN:$FAKE_TOOL_BIN:$SYS_PATH"
  mkdir -p "$HOME" "$FAKE_CLAUDE_STATE"
  CONFIG="$XDG_CONFIG_HOME/nordic-pantheon/config"
  LINK="$HOME/.claude/skills/nordic-pantheon"
  CMD="$HOME/.claude/CLAUDE.md"
  OUT="$CASE_DIR/out.txt"
  ERRORS=()
}

# Ejecuta install.sh; guarda stdout+stderr en $OUT y el código en $RC.
run() {
  "$REPO/install.sh" "$@" </dev/null >"$OUT" 2>&1
  RC=$?
}
run_stdin() { # $1 entrada, resto args
  local input="$1"; shift
  printf '%b' "$input" | "$REPO/install.sh" "$@" >"$OUT" 2>&1
  RC=$?
}

fail() { ERRORS+=("$*"); }
check()      { local msg="$1"; shift; "$@" || fail "$msg"; }
rc_is()      { [ "$RC" = "$1" ] || fail "código $RC, esperado $1"; }
rc_nonzero() { [ "$RC" != 0 ] || fail "código 0, esperado ≠ 0"; }
out_has()    { grep -qF -- "$1" "$OUT" || fail "la salida no contiene: $1"; }
out_lacks()  { ! grep -qF -- "$1" "$OUT" || fail "la salida contiene: $1"; }
cfg_has()    { grep -qxF -- "$1" "$CONFIG" 2>/dev/null || fail "config sin línea: $1"; }
cfg_get()    { grep -E "^$1=" "$CONFIG" | cut -d= -f2-; }
is_link_to() { [ -L "$1" ] && [ "$(readlink -f "$1")" = "$(readlink -f "$2")" ]; }
plugin_listed() { grep -qxF "nordic-pantheon@nordic-pantheon" "$FAKE_CLAUDE_STATE/plugins.txt" 2>/dev/null; }
mp_listed()  { grep -q "^nordic-pantheon"$'\t' "$FAKE_CLAUDE_STATE/marketplaces.txt" 2>/dev/null; }
backups()    { find "$HOME/.claude" -maxdepth 1 -name 'CLAUDE.md.bak-nordic-*' 2>/dev/null | wc -l | tr -d ' '; }
home_empty() { [ -z "$(find "$HOME" "$XDG_CONFIG_HOME" -mindepth 1 2>/dev/null)" ]; }
no_mutating_calls() {
  ! grep -Eq '^plugin (install|uninstall|marketplace (add|remove))' "$FAKE_CLAUDE_STATE/log.txt" 2>/dev/null
}
MIMIR_URL="https://github.com/HectroyanDev/Mimisbrunnr"
mimir_src()  { printf '%s' "$HOME/.cache/nordic-pantheon/mimisbrunnr"; }
mimir_bin()  { printf '%s' "$HOME/.local/bin/mimisbrunnr"; }
mimir_registered() { [ -e "$FAKE_CLAUDE_STATE/mimir-registered" ]; }
log_has()    { grep -qxF -- "$1" "$FAKE_CLAUDE_STATE/log.txt" 2>/dev/null || fail "log.txt sin línea: $1"; }
log_lacks()  { ! grep -qE -- "$1" "$FAKE_CLAUDE_STATE/log.txt" 2>/dev/null || fail "log.txt contiene: $1"; }
# Línea esperada de `claude mcp add` con la base en $1.
mcp_add_line() {
  printf 'mcp add -s user mimisbrunnr -e MIMISBRUNNR_DRIVER=sqlite -e MIMISBRUNNR_SQLITE_PATH=%s -- %s' "$1" "$(mimir_bin)"
}
# Config de escritorio con Mimisbrunnr, para comprobar que no cambia.
seed_desktop_cfg() {
  mkdir -p "$XDG_CONFIG_HOME/Claude"
  DESKTOP_CFG="$XDG_CONFIG_HOME/Claude/claude_desktop_config.json"
  printf '{"mcpServers":{"mimisbrunnr":{"command":"x"}}}' >"$DESKTOP_CFG"
  DESKTOP_SUM="$(cksum <"$DESKTOP_CFG")"
}
# Añade al PATH del caso los gestores y la CLI falsos indicados (uv pipx graphify git go).
use_tools() {
  local t
  for t in "$@"; do
    case "$t" in
      uv)       PATH="$UV_BIN:$PATH" ;;
      pipx)     PATH="$PIPX_BIN:$PATH" ;;
      graphify) PATH="$GRAPHIFY_BIN:$PATH" ;;
      git)      PATH="$GIT_BIN:$PATH" ;;
      go)       PATH="$GO_BIN:$PATH" ;;
    esac
  done
  export PATH
}
TOOLS_LOG() { printf '%s' "$FAKE_CLAUDE_STATE/tools.txt"; }
tools_has()   { grep -qxF -- "$1" "$(TOOLS_LOG)" 2>/dev/null || fail "tools.txt sin línea: $1"; }
tools_count() { grep -cxF -- "$1" "$(TOOLS_LOG)" 2>/dev/null || true; }
tools_lacks() { ! grep -qE -- "$1" "$(TOOLS_LOG)" 2>/dev/null || fail "tools.txt contiene: $1"; }
have_graphify() { command -v graphify >/dev/null 2>&1; }
# Config previa con graphify instalado por el instalador.
seed_config() { # $1 HUGIN_BACKEND, $2 GRAPHIFY_INSTALLED_BY
  mkdir -p "$(dirname "$CONFIG")"
  printf 'INSTALL_MODE=link\nBIFROST_MODE=skill\nMUNIN_BACKEND=memory\nHUGIN_BACKEND=%s\nGRAPHIFY_INSTALLED_BY=%s\nCLAUDE_MD_BACKUP=\nREPO_DIR=%s\n' \
    "$1" "$2" "$REPO" >"$CONFIG"
}
# Simula una instalación previa por marketplace.
seed_marketplace() {
  printf 'nordic-pantheon\t%s\n' "$REPO" >"$FAKE_CLAUDE_STATE/marketplaces.txt"
  echo "nordic-pantheon@nordic-pantheon" >"$FAKE_CLAUDE_STATE/plugins.txt"
  mkdir -p "$FAKE_CLAUDE_STATE/cache/nordic-pantheon@nordic-pantheon"
  cp -R "$REPO/skills" "$REPO/bifrost" "$FAKE_CLAUDE_STATE/cache/nordic-pantheon@nordic-pantheon/"
}

# Ejecuta un caso: $1 nombre, $2 función.
t() {
  local name="$1" fn="$2"
  setup
  "$fn"
  if [ "${#ERRORS[@]}" = 0 ]; then
    PASS=$((PASS + 1)); printf 'PASS  %s\n' "$name"
  else
    FAIL=$((FAIL + 1)); FAILED+=("$name"); printf 'FAIL  %s\n' "$name"
    printf '      - %s\n' "${ERRORS[@]}"
    sed 's/^/      | /' "$OUT" 2>/dev/null | head -20
  fi
}

# ---------------------------------------------------------------- pantheon-installer

c_unknown_subcommand() {
  run foo
  rc_nonzero; out_has "Subcomandos:"; out_has "--mode=link|marketplace"
  check "HOME modificado" home_empty
}
c_no_subcommand() {
  run
  rc_nonzero; out_has "Subcomandos:"
}
c_help() {
  run --help
  rc_is 0; out_has "Subcomandos:"; out_has "--purge"; out_has "--hugin=plain|graphify"
  out_has "--mimir=install|skip"
  check "HOME modificado" home_empty
  check "claude llamado" test ! -e "$FAKE_CLAUDE_STATE/log.txt"
}
c_all_flags_no_questions() {
  run install --mode=link --munin=memory --bifrost=skill
  rc_is 0; out_lacks "Modo de instalación"; out_lacks "Backend de Munin"; out_lacks "Bifröst global"
  check "sin symlink de skills" is_link_to "$LINK" "$REPO"
  check "CLAUDE.md creado con bifrost=skill" test ! -e "$CMD"
  cfg_has "MUNIN_BACKEND=memory"
}
c_invalid_flag() {
  run install --munin=engram
  rc_nonzero; out_has "mimir memory"
  check "HOME modificado" home_empty
  check "claude llamado" test ! -e "$FAKE_CLAUDE_STATE/log.txt"
}
c_invalid_mode_and_bifrost() {
  run install --mode=copy
  rc_nonzero; out_has "link marketplace"
  run install --bifrost=global
  rc_nonzero; out_has "link skill"
  check "HOME modificado" home_empty
}
c_defaults_yes() {
  run install --yes
  rc_is 0; out_lacks "Modo de instalación"
  cfg_has "INSTALL_MODE=link"; cfg_has "MUNIN_BACKEND=mimir"; cfg_has "BIFROST_MODE=link"
  cfg_has "HUGIN_BACKEND=plain"; cfg_has "GRAPHIFY_INSTALLED_BY="
  check "sin symlink de skills" is_link_to "$LINK" "$REPO"
  check "sin symlink de CLAUDE.md" is_link_to "$CMD" "$REPO/bifrost/CLAUDE.md"
}
c_defaults_yes_no_graphify() {
  use_tools uv pipx
  run install --yes
  rc_is 0; out_lacks "Backend de Hugin"
  check "instaló algo con Hugin plain" test ! -e "$(TOOLS_LOG)"
}
c_interactive_answers() {
  run_stdin 'marketplace\nmemory\nskill\nplain\n' install
  rc_is 0; out_has "Modo de instalación"; out_has "Backend de Munin"; out_has "Bifröst global"; out_has "Backend de Hugin"
  cfg_has "INSTALL_MODE=marketplace"; cfg_has "MUNIN_BACKEND=memory"; cfg_has "BIFROST_MODE=skill"
  cfg_has "HUGIN_BACKEND=plain"
}
c_interactive_defaults() {
  run_stdin '\n\n\n\n' install
  rc_is 0
  cfg_has "INSTALL_MODE=link"; cfg_has "MUNIN_BACKEND=mimir"; cfg_has "BIFROST_MODE=link"
  cfg_has "HUGIN_BACKEND=plain"
}
c_interactive_partial_flags() {
  run_stdin 'memory\n\n' install --mode=link --bifrost=skill
  rc_is 0; out_lacks "Modo de instalación"; out_has "Backend de Munin"; out_lacks "Bifröst global"
  cfg_has "MUNIN_BACKEND=memory"
}
c_hugin_all_flags_no_questions() {
  run install --mode=link --munin=memory --bifrost=skill --hugin=plain
  rc_is 0; out_lacks "Backend de Hugin"; out_lacks "Modo de instalación"
  cfg_has "HUGIN_BACKEND=plain"
}
c_hugin_invalid_flag() {
  run install --hugin=ctags
  rc_nonzero; out_has "plain graphify"
  check "HOME modificado" home_empty
  check "claude llamado" test ! -e "$FAKE_CLAUDE_STATE/log.txt"
}
c_hugin_prompt_only() {
  run_stdin '\n' install --mode=link --munin=memory --bifrost=skill
  rc_is 0; out_has "Backend de Hugin"; out_has "[plain/graphify] (plain)"
  out_lacks "Modo de instalación"; out_lacks "Backend de Munin"; out_lacks "Bifröst global"
  cfg_has "HUGIN_BACKEND=plain"
}
c_hugin_prompt_graphify() {
  use_tools pipx
  run_stdin 'graphify\n' install --mode=link --munin=memory --bifrost=skill
  rc_is 0; out_has "Backend de Hugin"
  cfg_has "HUGIN_BACKEND=graphify"; cfg_has "GRAPHIFY_INSTALLED_BY=pipx"
}
c_hugin_interactive_invalid() {
  run_stdin 'ctags\n' install --mode=link --munin=memory --bifrost=skill
  rc_nonzero; out_has "plain graphify"
  check "config creada" test ! -e "$CONFIG"
}
c_interactive_invalid() {
  run_stdin 'copy\n' install
  rc_nonzero; out_has "link marketplace"
  check "HOME modificado" test ! -e "$HOME/.claude"
  check "config creada" test ! -e "$CONFIG"
}
c_missing_claude() {
  export PATH="$OPENSPEC_BIN:$SYS_PATH"
  run install --yes
  rc_nonzero; out_has "claude"
  check "HOME modificado" home_empty
}
c_missing_mimir_mcp() {
  export FAKE_MIMIR=0
  use_tools git go
  run install --yes --munin=mimir --mimir=skip
  rc_is 0; out_has "mimisbrunnr"
  tools_lacks '^(git|go) '
  log_lacks '^mcp add'
  check "no instaló" is_link_to "$LINK" "$REPO"
}
c_mimir_desktop_only() {
  export FAKE_MIMIR=0
  mkdir -p "$XDG_CONFIG_HOME/Claude"
  printf '{"mcpServers":{"mimisbrunnr":{"command":"x"}}}' >"$XDG_CONFIG_HOME/Claude/claude_desktop_config.json"
  run install --yes --munin=mimir --mimir=skip
  rc_is 0; out_has "solo está configurado en la app de escritorio"
}
c_memory_skips_mimir_check() {
  export FAKE_MIMIR=0
  run install --yes --munin=memory
  rc_is 0; out_lacks "mimisbrunnr"
}
c_mimir_invalid_flag() {
  run install --mimir=maybe
  rc_nonzero; out_has "install skip"
  check "HOME modificado" home_empty
  check "claude llamado" test ! -e "$FAKE_CLAUDE_STATE/log.txt"
}
c_mimir_prompt_only() {
  export FAKE_MIMIR=0
  run_stdin '\n' install --mode=link --munin=mimir --bifrost=skill --hugin=plain --mimir=skip
  out_lacks "Instalar el MCP Mimisbrunnr"
  run_stdin 'skip\n' install --mode=link --munin=mimir --bifrost=skill --hugin=plain
  rc_is 0; out_has "Instalar el MCP Mimisbrunnr"; out_has "[install/skip] (install)"
  out_lacks "Modo de instalación"; out_lacks "Backend de Munin"; out_lacks "Bifröst global"; out_lacks "Backend de Hugin"
}
c_mimir_no_prompt_registered() {
  export FAKE_MIMIR=1
  run install --mode=link --munin=mimir --bifrost=skill --hugin=plain
  rc_is 0; out_lacks "Instalar el MCP Mimisbrunnr"
}
c_mimir_no_prompt_memory() {
  export FAKE_MIMIR=0
  run install --mode=link --munin=memory --bifrost=skill --hugin=plain
  rc_is 0; out_lacks "Instalar el MCP Mimisbrunnr"
  tools_lacks '^(git|go) '
  check "registró Mimisbrunnr" test ! -e "$FAKE_CLAUDE_STATE/mimir-registered"
}
# ---------------------------------------------------------------- instalación de Mimisbrunnr

c_mimir_install() {
  export FAKE_MIMIR=0
  use_tools git go
  seed_desktop_cfg
  run install --yes
  rc_is 0
  tools_has "git clone --depth 1 $MIMIR_URL $(mimir_src)"
  tools_has "go env GOVERSION"
  tools_has "go build -o $(mimir_bin) ./cmd/mimisbrunnr"
  check "binario no ejecutable" test -x "$(mimir_bin)"
  log_has "$(mcp_add_line "$XDG_CONFIG_HOME/mimisbrunnr/mimisbrunnr.db")"
  check "no quedó registrado" mimir_registered
  check "claude mcp get no lo ve" claude mcp get mimisbrunnr
  tools_lacks '^go install'
  [ "$(cksum <"$DESKTOP_CFG")" = "$DESKTOP_SUM" ] || fail "claude_desktop_config.json cambió"
  check "symlink de skills" is_link_to "$LINK" "$REPO"
  cfg_has "MUNIN_BACKEND=mimir"
}
c_mimir_prompt_install() {
  export FAKE_MIMIR=0
  use_tools git go
  run_stdin '\n' install --mode=link --munin=mimir --bifrost=skill --hugin=plain
  rc_is 0; out_has "Instalar el MCP Mimisbrunnr"
  check "no quedó registrado" mimir_registered
}
c_mimir_prev_clone_pull() {
  export FAKE_MIMIR=0
  use_tools git go
  mkdir -p "$(mimir_src)/cmd/mimisbrunnr"; printf '%s\n' "$MIMIR_URL" >"$(mimir_src)/.fake-origin"
  run install --yes
  rc_is 0
  tools_has "git -C $(mimir_src) pull --ff-only"; tools_lacks '^git clone'
  tools_has "go build -o $(mimir_bin) ./cmd/mimisbrunnr"
  check "no quedó registrado" mimir_registered
}
c_mimir_prev_clone_pull_fails() {
  export FAKE_MIMIR=0 FAKE_GIT_FAIL=1
  use_tools git go
  mkdir -p "$(mimir_src)/cmd/mimisbrunnr"; printf '%s\n' "$MIMIR_URL" >"$(mimir_src)/.fake-origin"
  run install --yes
  rc_is 0; out_has "falló 'git pull --ff-only'"
  tools_has "go build -o $(mimir_bin) ./cmd/mimisbrunnr"
  check "no quedó registrado" mimir_registered
}
c_mimir_clone_fails() {
  export FAKE_MIMIR=0 FAKE_GIT_FAIL=1
  use_tools git go
  run install --yes
  rc_is 0; out_has "falló 'git clone"; out_has "go build -o"
  tools_lacks '^go build'
  log_lacks '^mcp add'
  check "symlink de skills" is_link_to "$LINK" "$REPO"
}
c_mimir_foreign_cache() {
  export FAKE_MIMIR=0
  use_tools git go
  mkdir -p "$(mimir_src)"; echo mio >"$(mimir_src)/archivo"
  run install --yes
  rc_is 0; out_has "$(mimir_src)"
  check "caché tocada" test -f "$(mimir_src)/archivo"
  tools_lacks '^go build'; tools_lacks '^git clone'; tools_lacks 'pull'
  log_lacks '^mcp add'
  check "symlink de skills" is_link_to "$LINK" "$REPO"
}
c_mimir_mkdir_bin_fails() {
  export FAKE_MIMIR=0
  use_tools git go
  mkdir -p "$HOME/.local"; echo mio >"$HOME/.local/bin"
  run install --yes
  rc_is 0; out_has "no pude crear $HOME/.local/bin"
  log_lacks '^mcp add'
  check "symlink de skills" is_link_to "$LINK" "$REPO"
  cfg_has "MUNIN_BACKEND=mimir"
}
c_mimir_mkdir_cache_fails() {
  export FAKE_MIMIR=0
  use_tools git go
  mkdir -p "$HOME"; echo mio >"$HOME/.cache"
  run install --yes
  rc_is 0; out_has "no pude crear $HOME/.cache/nordic-pantheon"
  tools_lacks '^git clone'; log_lacks '^mcp add'
  check "symlink de skills" is_link_to "$LINK" "$REPO"
  cfg_has "MUNIN_BACKEND=mimir"
}
c_mimir_mkdir_db_fails() {
  export FAKE_MIMIR=0
  use_tools git go
  mkdir -p "$XDG_CONFIG_HOME"; echo mio >"$XDG_CONFIG_HOME/mimisbrunnr"
  run install --yes
  rc_is 0; out_has "no pude crear $XDG_CONFIG_HOME/mimisbrunnr"
  log_lacks '^mcp add'
  check "symlink de skills" is_link_to "$LINK" "$REPO"
  cfg_has "MUNIN_BACKEND=mimir"
}
c_mimir_not_installed_when_aborting() {
  export FAKE_MIMIR=0
  use_tools git go
  mkdir -p "$LINK"; echo mio >"$LINK/archivo"
  run install --yes
  rc_nonzero
  check "llamó a git o go" test ! -e "$(TOOLS_LOG)"
  log_lacks '^mcp add'
}
c_mimir_always_builds() {
  export FAKE_MIMIR=0
  use_tools git go
  mkdir -p "$(dirname "$(mimir_bin)")"; printf '#!/bin/sh\necho viejo\n' >"$(mimir_bin)"; chmod +x "$(mimir_bin)"
  run install --yes
  rc_is 0
  tools_has "git clone --depth 1 $MIMIR_URL $(mimir_src)"
  tools_has "go build -o $(mimir_bin) ./cmd/mimisbrunnr"
  ! grep -q viejo "$(mimir_bin)" || fail "no sobrescribió el binario previo"
  log_has "$(mcp_add_line "$XDG_CONFIG_HOME/mimisbrunnr/mimisbrunnr.db")"
}
c_mimir_register_with_xdg() {
  export FAKE_MIMIR=0
  use_tools git go
  run install --yes
  rc_is 0
  log_has "$(mcp_add_line "$XDG_CONFIG_HOME/mimisbrunnr/mimisbrunnr.db")"
  check "falta el directorio de la base" test -d "$XDG_CONFIG_HOME/mimisbrunnr"
  check "creó ~/.config/mimisbrunnr" test ! -e "$HOME/.config/mimisbrunnr"
}
c_mimir_register_without_xdg() {
  export FAKE_MIMIR=0
  use_tools git go
  env -u XDG_CONFIG_HOME "$REPO/install.sh" install --yes </dev/null >"$OUT" 2>&1
  RC=$?
  rc_is 0
  log_has "$(mcp_add_line "$HOME/.config/mimisbrunnr/mimisbrunnr.db")"
  check "falta el directorio de la base" test -d "$HOME/.config/mimisbrunnr"
  check "no quedó registrado" mimir_registered
}

c_mimir_already_registered() {
  export FAKE_MIMIR=1
  use_tools git go
  run install --yes --mimir=install
  rc_is 0
  check "llamó a git o go" test ! -e "$(TOOLS_LOG)"
  log_lacks '^mcp add'
}
c_mimir_already_registered_with_binary() {
  export FAKE_MIMIR=1
  use_tools git go
  mkdir -p "$(dirname "$(mimir_bin)")"; printf '#!/bin/sh\necho viejo\n' >"$(mimir_bin)"; chmod +x "$(mimir_bin)"
  run install --yes
  rc_is 0
  check "llamó a git o go" test ! -e "$(TOOLS_LOG)"
  grep -q viejo "$(mimir_bin)" || fail "tocó el binario"
}
c_mimir_second_run() {
  export FAKE_MIMIR=0
  use_tools git go
  run install --yes
  rc_is 0
  run install --yes
  rc_is 0
  [ "$(grep -c '^go build' "$(TOOLS_LOG)")" = 1 ] || fail "go build se ejecutó $(grep -c '^go build' "$(TOOLS_LOG)") veces"
  [ "$(grep -c '^mcp add' "$FAKE_CLAUDE_STATE/log.txt")" = 1 ] || fail "mcp add se ejecutó $(grep -c '^mcp add' "$FAKE_CLAUDE_STATE/log.txt") veces"
}
c_mimir_no_go() {
  export FAKE_MIMIR=0
  use_tools git
  run install --yes
  rc_is 0; out_has "Go 1.26+"; out_has "go build -o"; out_has "claude mcp add -s user mimisbrunnr"
  tools_lacks '^git '
  log_lacks '^mcp add'
  check "symlink de skills" is_link_to "$LINK" "$REPO"
}
c_mimir_old_go() {
  export FAKE_MIMIR=0 FAKE_GO_VERSION=1.25.0
  use_tools git go
  run install --yes
  rc_is 0; out_has "Go 1.26+"; out_has "go1.25.0"
  tools_lacks '^go build'; tools_lacks '^git '
  log_lacks '^mcp add'
}
c_mimir_no_git() {
  export FAKE_MIMIR=0
  use_tools go
  run install --yes
  rc_is 0; out_has "'git'"; out_has "git clone"
  tools_lacks '^go build'
  log_lacks '^mcp add'
  check "symlink de skills" is_link_to "$LINK" "$REPO"
}
c_mimir_build_fails() {
  export FAKE_MIMIR=0 FAKE_GO_FAIL=1
  use_tools git go
  run install --yes
  rc_is 0; out_has "falló 'go build"
  log_lacks '^mcp add'
  check "quedó registrado" test ! -e "$FAKE_CLAUDE_STATE/mimir-registered"
}
c_mimir_add_fails() {
  export FAKE_MIMIR=0 FAKE_MCP_ADD_FAIL=1
  use_tools git go
  run install --yes
  rc_is 0; out_has "falló 'claude mcp add -s user mimisbrunnr'"
  out_has "$(mcp_add_line "$XDG_CONFIG_HOME/mimisbrunnr/mimisbrunnr.db" | sed 's/^mcp/claude mcp/')"
  check "symlink de skills" is_link_to "$LINK" "$REPO"
}

c_mimir_update_does_not_build() {
  run install --yes --munin=mimir
  rc_is 0
  export FAKE_MIMIR=0
  use_tools git go
  run update
  rc_is 0
  check "llamó a git o go" test ! -e "$(TOOLS_LOG)"
  log_lacks '^mcp add'
}
# Instala Mimisbrunnr con las herramientas falsas y deja contenido en su base.
seed_mimir_install() {
  export FAKE_MIMIR=0
  use_tools git go
  run install --yes
  rc_is 0
  check "no quedó registrado" mimir_registered
  echo datos >"$XDG_CONFIG_HOME/mimisbrunnr/mimisbrunnr.db"
}
mimir_artifacts_remain() {
  check "binario borrado" test -x "$(mimir_bin)"
  check "caché borrada" test -d "$(mimir_src)/cmd/mimisbrunnr"
  check "base borrada" test -f "$XDG_CONFIG_HOME/mimisbrunnr/mimisbrunnr.db"
  log_lacks '^mcp remove'
}
c_mimir_uninstall_keeps_it() {
  seed_mimir_install
  run uninstall
  rc_is 0
  mimir_artifacts_remain
}
c_mimir_uninstall_purge_keeps_it() {
  seed_mimir_install
  run uninstall --purge
  rc_is 0
  check "config sigue" test ! -e "$CONFIG"
  mimir_artifacts_remain
}
c_mimir_to_memory_keeps_it() {
  seed_mimir_install
  run install --yes --munin=memory
  rc_is 0
  cfg_has "MUNIN_BACKEND=memory"
  mimir_artifacts_remain
}

c_missing_openspec() {
  export PATH="$FAKE_BIN:$SYS_PATH"
  run install --yes
  rc_is 0; out_has "openspec"
  check "no instaló" is_link_to "$LINK" "$REPO"
}
c_link_clean() {
  run install --mode=link --munin=mimir --bifrost=skill
  rc_is 0
  check "symlink de skills" is_link_to "$LINK" "$REPO"
  check "plugin de marketplace instalado" eval '! plugin_listed'
  out_has "sesión nueva"
}
c_link_migrates_marketplace() {
  seed_marketplace
  run install --mode=link --yes
  rc_is 0
  check "plugin sigue instalado" eval '! plugin_listed'
  check "marketplace sigue" eval '! mp_listed'
  check "sin symlink" is_link_to "$LINK" "$REPO"
  grep -qx "plugin uninstall nordic-pantheon@nordic-pantheon" "$FAKE_CLAUDE_STATE/log.txt" || fail "no llamó a plugin uninstall"
  grep -qx "plugin marketplace remove nordic-pantheon" "$FAKE_CLAUDE_STATE/log.txt" || fail "no llamó a marketplace remove"
}
c_link_foreign_dir() {
  mkdir -p "$LINK"; echo mio >"$LINK/archivo"
  run install --yes
  rc_nonzero; out_has "$LINK"
  check "ruta tocada" test -f "$LINK/archivo" -a ! -L "$LINK"
  check "config creada" test ! -e "$CONFIG"
  check "CLAUDE.md creado" test ! -e "$CMD"
}
c_link_foreign_symlink() {
  mkdir -p "$CASE_DIR/otro" "$HOME/.claude/skills"
  ln -s "$CASE_DIR/otro" "$LINK"
  seed_marketplace
  run install --yes
  rc_nonzero; out_has "$LINK"
  check "symlink ajeno tocado" is_link_to "$LINK" "$CASE_DIR/otro"
  check "desinstaló el marketplace antes de abortar" plugin_listed
}
c_link_broken_symlink_replaced() {
  mkdir -p "$HOME/.claude/skills"
  ln -s "$CASE_DIR/no-existe" "$LINK"
  run install --yes
  rc_is 0
  check "no reemplazó el symlink roto" is_link_to "$LINK" "$REPO"
}
c_marketplace_install() {
  mkdir -p "$HOME/.claude/skills"; ln -s "$REPO" "$LINK"
  run install --mode=marketplace --yes
  rc_is 0
  check "plugin no instalado" plugin_listed
  check "marketplace no añadido" mp_listed
  check "symlink de modo link sigue" test ! -e "$LINK" -a ! -L "$LINK"
  PATH="$FAKE_BIN:$PATH" claude plugin list --json | grep -q '"nordic-pantheon@nordic-pantheon"' || fail "plugin list no lo muestra"
}
c_marketplace_keeps_foreign_link() {
  mkdir -p "$CASE_DIR/otro" "$HOME/.claude/skills"; ln -s "$CASE_DIR/otro" "$LINK"
  run install --mode=marketplace --yes
  rc_is 0
  check "symlink ajeno retirado" is_link_to "$LINK" "$CASE_DIR/otro"
}
c_config_contents() {
  run install --mode=link --munin=memory --bifrost=skill
  rc_is 0
  cfg_has "INSTALL_MODE=link"; cfg_has "MUNIN_BACKEND=memory"; cfg_has "BIFROST_MODE=skill"
  cfg_has "REPO_DIR=$REPO"; cfg_has "CLAUDE_MD_BACKUP="
  cfg_has "HUGIN_BACKEND=plain"; cfg_has "GRAPHIFY_INSTALLED_BY="
}
c_config_hugin_graphify() {
  use_tools pipx
  run install --mode=link --munin=memory --bifrost=skill --hugin=graphify
  rc_is 0
  cfg_has "INSTALL_MODE=link"; cfg_has "MUNIN_BACKEND=memory"; cfg_has "BIFROST_MODE=skill"
  cfg_has "HUGIN_BACKEND=graphify"; cfg_has "GRAPHIFY_INSTALLED_BY=pipx"
}
c_reinstall_keeps_graphify_by() {
  use_tools pipx
  seed_config graphify pipx
  run install --yes --hugin=graphify
  rc_is 0
  cfg_has "HUGIN_BACKEND=graphify"; cfg_has "GRAPHIFY_INSTALLED_BY=pipx"
  run install --yes --hugin=plain
  rc_is 0
  cfg_has "HUGIN_BACKEND=plain"; cfg_has "GRAPHIFY_INSTALLED_BY=pipx"
}
c_var_defaults() {
  run install --yes
  rc_is 0
  cfg_has "VAR_ENABLED=on"; cfg_has "VAR_MINUTES=10"; cfg_has "VAR_TOOL_CALLS=40"
}
c_var_keeps_thresholds() {
  seed_config plain ""
  printf 'VAR_MINUTES=15\nVAR_TOOL_CALLS=60\n' >>"$CONFIG"
  run install --yes --munin=memory
  rc_is 0
  cfg_has "VAR_MINUTES=15"; cfg_has "VAR_TOOL_CALLS=60"; cfg_has "VAR_ENABLED=on"
}
c_var_keeps_disabled() {
  seed_config plain ""
  printf 'VAR_ENABLED=off\n' >>"$CONFIG"
  run install --yes --munin=memory
  rc_is 0
  cfg_has "VAR_ENABLED=off"; cfg_has "VAR_MINUTES=10"; cfg_has "VAR_TOOL_CALLS=40"
}
# ---------------------------------------------------------------- instalación de graphify

c_graphify_with_uv() {
  use_tools uv pipx
  run install --yes --hugin=graphify
  rc_is 0
  tools_has "uv tool install graphifyy"; tools_lacks '^pipx '
  cfg_has "HUGIN_BACKEND=graphify"; cfg_has "GRAPHIFY_INSTALLED_BY=uv"
  check "graphify no quedó en el PATH" have_graphify
  out_lacks "Aviso"
}
c_graphify_with_pipx() {
  use_tools pipx
  run install --yes --hugin=graphify
  rc_is 0
  tools_has "pipx install graphifyy"; tools_lacks '^uv '
  cfg_has "HUGIN_BACKEND=graphify"; cfg_has "GRAPHIFY_INSTALLED_BY=pipx"
}
c_graphify_no_skills_or_hooks() {
  use_tools uv
  run install --yes --hugin=graphify
  rc_is 0
  tools_lacks '^graphify '
  # También con la CLI ya instalada: tampoco se la llama.
  use_tools graphify
  run install --yes --hugin=graphify
  rc_is 0
  tools_lacks '^graphify '
}
c_graphify_preinstalled() {
  use_tools uv pipx graphify
  run install --yes --hugin=graphify
  rc_is 0
  check "llamó a uv o pipx" test ! -e "$(TOOLS_LOG)"
  cfg_has "HUGIN_BACKEND=graphify"; cfg_has "GRAPHIFY_INSTALLED_BY="
}
c_graphify_preinstalled_keeps_by() {
  use_tools pipx graphify
  seed_config graphify pipx
  run install --yes --hugin=graphify
  rc_is 0
  tools_lacks '^pipx '
  cfg_has "GRAPHIFY_INSTALLED_BY=pipx"
}
c_graphify_second_run() {
  use_tools pipx
  export FAKE_TOOL_NOPATH=1   # graphify queda fuera del PATH, como ~/.local/bin sin configurar
  run install --yes --hugin=graphify
  rc_is 0; out_has "pipx ensurepath"
  run install --yes --hugin=graphify
  rc_is 0
  [ "$(tools_count 'pipx install graphifyy')" = 1 ] || fail "pipx install se ejecutó $(tools_count 'pipx install graphifyy') veces"
  cfg_has "HUGIN_BACKEND=graphify"; cfg_has "GRAPHIFY_INSTALLED_BY=pipx"
}
c_graphify_second_run_in_path() {
  use_tools pipx
  run install --yes --hugin=graphify
  run install --yes --hugin=graphify
  rc_is 0
  [ "$(tools_count 'pipx install graphifyy')" = 1 ] || fail "pipx install se ejecutó $(tools_count 'pipx install graphifyy') veces"
  cfg_has "GRAPHIFY_INSTALLED_BY=pipx"
}
c_graphify_uv_not_in_path_warns() {
  use_tools uv
  export FAKE_TOOL_NOPATH=1
  run install --yes --hugin=graphify
  rc_is 0; out_has "uv tool update-shell"
  cfg_has "HUGIN_BACKEND=graphify"; cfg_has "GRAPHIFY_INSTALLED_BY=uv"
}
c_graphify_no_manager() {
  run install --yes --hugin=graphify
  rc_is 0; out_has "no puedo instalar graphify"
  cfg_has "HUGIN_BACKEND=plain"; cfg_has "GRAPHIFY_INSTALLED_BY="
  check "el resto de la instalación no se hizo" is_link_to "$LINK" "$REPO"
}
c_graphify_install_fails() {
  use_tools pipx
  export FAKE_TOOL_FAIL=1
  run install --yes --hugin=graphify
  rc_is 0; out_has "falló la instalación de graphifyy"
  cfg_has "HUGIN_BACKEND=plain"; cfg_has "GRAPHIFY_INSTALLED_BY="
  check "el resto de la instalación no se hizo" is_link_to "$LINK" "$REPO"
}
c_graphify_uv_install_fails() {
  use_tools uv pipx
  export FAKE_TOOL_FAIL=1
  run install --yes --hugin=graphify
  rc_is 0; out_has "falló la instalación de graphifyy"
  tools_lacks '^pipx '
  cfg_has "HUGIN_BACKEND=plain"; cfg_has "GRAPHIFY_INSTALLED_BY="
}
c_graphify_back_to_plain() {
  use_tools uv graphify
  seed_config graphify uv
  run install --yes --hugin=plain
  rc_is 0
  tools_lacks 'uninstall'
  cfg_has "HUGIN_BACKEND=plain"; cfg_has "GRAPHIFY_INSTALLED_BY=uv"
  check "desinstaló graphify" have_graphify
}
c_graphify_not_installed_when_aborting() {
  use_tools uv
  mkdir -p "$LINK"; echo mio >"$LINK/archivo"
  run install --yes --hugin=graphify
  rc_nonzero
  check "instaló graphify aunque abortó" test ! -e "$(TOOLS_LOG)"
}
c_config_is_not_sourced() {
  # Una línea maliciosa en la config no se ejecuta.
  mkdir -p "$(dirname "$CONFIG")"
  printf 'INSTALL_MODE=link\n$(touch %s/pwned)\nCLAUDE_MD_BACKUP=\n' "$CASE_DIR" >"$CONFIG"
  run update
  rc_is 0
  check "la config se ejecutó" test ! -e "$CASE_DIR/pwned"
}
c_reinstall_keeps_backup() {
  mkdir -p "$HOME/.claude"; echo original >"$CMD"
  run install --yes
  local bak; bak="$(cfg_get CLAUDE_MD_BACKUP)"
  [ -n "$bak" ] || fail "no guardó backup"
  run install --yes --munin=memory
  rc_is 0
  cfg_has "CLAUDE_MD_BACKUP=$bak"; cfg_has "MUNIN_BACKEND=memory"
}
c_idempotent() {
  mkdir -p "$HOME/.claude"; echo original >"$CMD"
  run install --yes
  rc_is 0
  local cfg1 tree1; cfg1="$(cat "$CONFIG")"; tree1="$(cd "$HOME" && find . | sort)"
  run install --yes
  rc_is 0
  [ "$(backups)" = 1 ] || fail "backups: $(backups), esperado 1"
  [ "$cfg1" = "$(cat "$CONFIG")" ] || fail "la config cambió"
  [ "$tree1" = "$(cd "$HOME" && find . | sort)" ] || fail "el árbol de HOME cambió"
}
c_idempotent_marketplace() {
  run install --mode=marketplace --yes
  run install --mode=marketplace --yes
  rc_is 0
  [ "$(grep -c '^plugin install' "$FAKE_CLAUDE_STATE/log.txt")" = 1 ] || fail "instaló dos veces"
  [ "$(grep -c '^plugin marketplace add' "$FAKE_CLAUDE_STATE/log.txt")" = 1 ] || fail "añadió el marketplace dos veces"
}
c_update_link_missing() {
  run install --yes
  rm "$LINK"
  run update
  rc_is 0; out_has "sesión nueva"
  check "no recreó el symlink" is_link_to "$LINK" "$REPO"
}
c_update_link_broken() {
  run install --yes
  rm "$LINK"; ln -s "$CASE_DIR/no-existe" "$LINK"
  run update
  rc_is 0
  check "no recreó el symlink roto" is_link_to "$LINK" "$REPO"
}
c_update_marketplace_stale() {
  run install --mode=marketplace --yes
  local cache="$FAKE_CLAUDE_STATE/cache/nordic-pantheon@nordic-pantheon"
  echo "versión vieja" >>"$cache/skills/odin/SKILL.md"
  : >"$FAKE_CLAUDE_STATE/log.txt"
  run update
  rc_is 0
  grep -qx "plugin marketplace update nordic-pantheon" "$FAKE_CLAUDE_STATE/log.txt" || fail "no refrescó el marketplace"
  grep -qx "plugin update nordic-pantheon@nordic-pantheon" "$FAKE_CLAUDE_STATE/log.txt" || fail "no llamó a plugin update"
  grep -qx "plugin uninstall nordic-pantheon@nordic-pantheon" "$FAKE_CLAUDE_STATE/log.txt" || fail "no desinstaló"
  grep -qx "plugin install nordic-pantheon@nordic-pantheon" "$FAKE_CLAUDE_STATE/log.txt" || fail "no reinstaló"
  diff -rq "$REPO/skills" "$cache/skills" >/dev/null || fail "la caché no coincide con el repo"
}
c_update_marketplace_fresh() {
  run install --mode=marketplace --yes
  : >"$FAKE_CLAUDE_STATE/log.txt"
  run update
  rc_is 0
  ! grep -q "^plugin uninstall" "$FAKE_CLAUDE_STATE/log.txt" || fail "reinstaló sin necesidad"
}
c_update_without_install() {
  run update
  rc_nonzero; out_has "install"
  check "HOME modificado" home_empty
}
c_uninstall_link() {
  run install --yes
  mkdir -p "$HOME/.claude/nordic-pantheon/memory"; echo x >"$HOME/.claude/nordic-pantheon/memory/MEMORY.md"
  run uninstall
  rc_is 0
  check "symlink sigue" test ! -e "$LINK" -a ! -L "$LINK"
  check "config sigue" test ! -e "$CONFIG"
  check "memoria borrada" test -f "$HOME/.claude/nordic-pantheon/memory/MEMORY.md"
  check "CLAUDE.md sigue" test ! -e "$CMD" -a ! -L "$CMD"
}
c_uninstall_marketplace() {
  run install --mode=marketplace --yes
  run uninstall
  rc_is 0
  check "plugin sigue" eval '! plugin_listed'
  check "marketplace sigue" eval '! mp_listed'
  check "config sigue" test ! -e "$CONFIG"
}
c_uninstall_purge() {
  run install --yes
  mkdir -p "$HOME/.claude/nordic-pantheon/memory"; echo x >"$HOME/.claude/nordic-pantheon/memory/MEMORY.md"
  run uninstall --purge
  rc_is 0
  check "~/.claude/nordic-pantheon sigue" test ! -e "$HOME/.claude/nordic-pantheon"
  check "symlink sigue" test ! -L "$LINK"
}
c_uninstall_foreign_skills_link() {
  mkdir -p "$CASE_DIR/otro" "$HOME/.claude/skills"; ln -s "$CASE_DIR/otro" "$LINK"
  run uninstall
  rc_is 0
  check "symlink ajeno retirado" is_link_to "$LINK" "$CASE_DIR/otro"
}
c_uninstall_graphify_uv() {
  use_tools uv
  run install --yes --hugin=graphify
  check "graphify no instalado" have_graphify
  run uninstall
  rc_is 0
  tools_has "uv tool uninstall graphifyy"
  check "graphify sigue" eval '! have_graphify'
  check "config sigue" test ! -e "$CONFIG"
}
c_uninstall_graphify_pipx() {
  use_tools pipx
  run install --yes --hugin=graphify
  run uninstall
  rc_is 0
  tools_has "pipx uninstall graphifyy"
  check "graphify sigue" eval '! have_graphify'
}
c_uninstall_graphify_by_human() {
  use_tools uv pipx graphify
  run install --yes --hugin=graphify
  run uninstall
  rc_is 0
  check "llamó a uv o pipx" test ! -e "$(TOOLS_LOG)"
  check "graphify retirado" have_graphify
}
c_uninstall_graphify_by_missing_in_config() {
  use_tools uv pipx graphify
  mkdir -p "$(dirname "$CONFIG")"
  printf 'INSTALL_MODE=link\nBIFROST_MODE=skill\nMUNIN_BACKEND=memory\nCLAUDE_MD_BACKUP=\n' >"$CONFIG"
  run uninstall
  rc_is 0
  check "llamó a uv o pipx" test ! -e "$(TOOLS_LOG)"
}
c_uninstall_graphify_manager_missing() {
  use_tools uv
  run install --yes --hugin=graphify
  export PATH="$FAKE_BIN:$OPENSPEC_BIN:$SYS_PATH"   # sin uv
  run uninstall
  rc_is 0; out_has "uv tool uninstall graphifyy"; out_has "Aviso"
  check "config sigue" test ! -e "$CONFIG"
  check "symlink sigue" test ! -L "$LINK"
}
c_uninstall_graphify_fails() {
  use_tools pipx
  run install --yes --hugin=graphify
  export FAKE_TOOL_FAIL=1
  run uninstall
  rc_is 0; out_has "falló 'pipx uninstall graphifyy'"
  check "config sigue" test ! -e "$CONFIG"
}
c_uninstall_graphify_purge_keeps_graph_out() {
  use_tools pipx
  run install --yes --hugin=graphify
  mkdir -p "$CASE_DIR/proyecto/graphify-out"; echo '{}' >"$CASE_DIR/proyecto/graphify-out/graph.json"
  run uninstall --purge
  rc_is 0
  tools_has "pipx uninstall graphifyy"
  check "graphify-out borrado" test -f "$CASE_DIR/proyecto/graphify-out/graph.json"
}
c_purge_requires_uninstall() {
  run install --yes --purge
  rc_nonzero
  check "HOME modificado" home_empty
}

# ---------------------------------------------------------------- bifrost-activation

c_bifrost_no_previous() {
  run install --yes --bifrost=link
  rc_is 0
  check "sin symlink" is_link_to "$CMD" "$REPO/bifrost/CLAUDE.md"
  [ "$(backups)" = 0 ] || fail "creó backup"
  cfg_has "CLAUDE_MD_BACKUP="
}
c_bifrost_previous_file() {
  mkdir -p "$HOME/.claude"; echo original >"$CMD"
  run install --yes --bifrost=link
  rc_is 0
  check "sin symlink" is_link_to "$CMD" "$REPO/bifrost/CLAUDE.md"
  [ "$(backups)" = 1 ] || fail "backups: $(backups)"
  local bak; bak="$(cfg_get CLAUDE_MD_BACKUP)"
  [[ "$bak" =~ /CLAUDE\.md\.bak-nordic-[0-9]{8}-[0-9]{6}$ ]] || fail "ruta de backup inesperada: $bak"
  [ "$(cat "$bak" 2>/dev/null)" = original ] || fail "backup sin el contenido original"
}
c_bifrost_previous_foreign_symlink() {
  mkdir -p "$HOME/.claude"; echo ajeno >"$CASE_DIR/ajeno.md"; ln -s "$CASE_DIR/ajeno.md" "$CMD"
  run install --yes --bifrost=link
  rc_is 0
  check "sin symlink" is_link_to "$CMD" "$REPO/bifrost/CLAUDE.md"
  local bak; bak="$(cfg_get CLAUDE_MD_BACKUP)"
  check "backup no es el symlink ajeno" is_link_to "$bak" "$CASE_DIR/ajeno.md"
}
c_bifrost_already_linked() {
  mkdir -p "$HOME/.claude"; ln -s "$REPO/bifrost/CLAUDE.md" "$CMD"
  run install --yes --bifrost=link
  rc_is 0
  [ "$(backups)" = 0 ] || fail "creó backup"
  check "symlink cambiado" is_link_to "$CMD" "$REPO/bifrost/CLAUDE.md"
  cfg_has "CLAUDE_MD_BACKUP="
}
c_bifrost_single_source() {
  run install --yes --bifrost=link
  echo "línea nueva" >>"$REPO/bifrost/CLAUDE.md"
  grep -qx "línea nueva" "$CMD" || fail "el symlink no refleja el cambio"
  grep -qx "línea nueva" "$LINK/bifrost/CLAUDE.md" || fail "la skill no ve el cambio"
  sed -i '$d' "$REPO/bifrost/CLAUDE.md"
}
c_bifrost_link_to_skill() {
  mkdir -p "$HOME/.claude"; echo original >"$CMD"
  run install --yes --bifrost=link
  run install --yes --bifrost=skill
  rc_is 0
  check "CLAUDE.md sigue siendo symlink" test ! -L "$CMD"
  [ "$(cat "$CMD" 2>/dev/null)" = original ] || fail "no restauró el original"
  [ "$(backups)" = 0 ] || fail "el backup sigue en disco"
  cfg_has "BIFROST_MODE=skill"; cfg_has "CLAUDE_MD_BACKUP="
}
c_bifrost_skill_keeps_foreign() {
  mkdir -p "$HOME/.claude"; echo propio >"$CMD"
  run install --yes --bifrost=skill
  rc_is 0
  [ "$(cat "$CMD")" = propio ] || fail "tocó CLAUDE.md ajeno"
  [ "$(backups)" = 0 ] || fail "creó backup"
}
c_uninstall_restores_backup() {
  mkdir -p "$HOME/.claude"; echo original >"$CMD"
  run install --yes
  run uninstall
  rc_is 0
  check "CLAUDE.md sigue siendo symlink" test ! -L "$CMD"
  [ "$(cat "$CMD" 2>/dev/null)" = original ] || fail "no restauró el original"
  [ "$(backups)" = 0 ] || fail "el backup sigue en disco"
}
c_uninstall_foreign_claude_md() {
  mkdir -p "$HOME/.claude"; echo propio >"$CMD"
  run install --yes --bifrost=skill
  run uninstall
  rc_is 0
  [ "$(cat "$CMD")" = propio ] || fail "tocó CLAUDE.md ajeno"
  check "CLAUDE.md convertido en symlink" test ! -L "$CMD"
}

# ---------------------------------------------------------------- ejecución

t "subcomando desconocido muestra ayuda y falla"        c_unknown_subcommand
t "sin subcomando muestra ayuda y falla"                c_no_subcommand
t "--help sale con 0 sin modificar nada"                c_help
t "todo por flags: sin preguntas"                       c_all_flags_no_questions
t "flag --munin no válido aborta sin cambios"           c_invalid_flag
t "flags --mode/--bifrost no válidos abortan"           c_invalid_mode_and_bifrost
t "--yes usa los valores por defecto"                   c_defaults_yes
t "--yes con uv y pipx disponibles no instala graphify" c_defaults_yes_no_graphify
t "--hugin: todo por flags, sin preguntas"              c_hugin_all_flags_no_questions
t "--hugin no válido aborta sin cambios"                c_hugin_invalid_flag
t "pregunta solo el backend de Hugin"                   c_hugin_prompt_only
t "pregunta de Hugin: graphify instala la CLI"          c_hugin_prompt_graphify
t "pregunta de Hugin: respuesta no válida aborta"       c_hugin_interactive_invalid
t "interactivo: respuestas por stdin"                   c_interactive_answers
t "interactivo: Enter acepta los defectos"              c_interactive_defaults
t "interactivo: solo pregunta lo que falta"             c_interactive_partial_flags
t "interactivo: respuesta no válida aborta sin cambios" c_interactive_invalid
t "falta la CLI claude: aborta sin cambios"             c_missing_claude
t "falta el MCP de Mimir: avisa y continúa"             c_missing_mimir_mcp
t "Mimir solo en la app de escritorio: avisa distinto"      c_mimir_desktop_only
t "Munin memory no comprueba Mimir"                     c_memory_skips_mimir_check
t "--mimir no válido aborta sin llamar a claude"        c_mimir_invalid_flag
t "pregunta solo si instalar Mimisbrunnr"               c_mimir_prompt_only
t "sin pregunta de Mimisbrunnr si ya está registrado"   c_mimir_no_prompt_registered
t "sin pregunta de Mimisbrunnr con Munin memory"        c_mimir_no_prompt_memory
t "Mimisbrunnr: instala con git y Go"                   c_mimir_install
t "Mimisbrunnr: la pregunta por defecto instala"        c_mimir_prompt_install
t "Mimisbrunnr: clon previo se actualiza con pull"      c_mimir_prev_clone_pull
t "Mimisbrunnr: pull fallido avisa y compila"           c_mimir_prev_clone_pull_fails
t "Mimisbrunnr: clon fallido avisa y termina bien"      c_mimir_clone_fails
t "Mimisbrunnr: caché ajena no se toca"                 c_mimir_foreign_cache
t "Mimisbrunnr: mkdir de ~/.local/bin falla, avisa y termina bien" c_mimir_mkdir_bin_fails
t "Mimisbrunnr: mkdir de la caché falla, avisa y termina bien"     c_mimir_mkdir_cache_fails
t "Mimisbrunnr: mkdir de la base falla, no registra y termina bien" c_mimir_mkdir_db_fails
t "Mimisbrunnr: no se instala si la instalación aborta" c_mimir_not_installed_when_aborting
t "Mimisbrunnr: compila siempre y sobrescribe"          c_mimir_always_builds
t "Mimisbrunnr: registro con XDG_CONFIG_HOME"           c_mimir_register_with_xdg
t "Mimisbrunnr: registro sin XDG_CONFIG_HOME"           c_mimir_register_without_xdg
t "Mimisbrunnr: ya registrado no hace nada"             c_mimir_already_registered
t "Mimisbrunnr: ya registrado no toca el binario"       c_mimir_already_registered_with_binary
t "Mimisbrunnr: segunda ejecución no recompila"         c_mimir_second_run
t "Mimisbrunnr: sin Go avisa y termina bien"            c_mimir_no_go
t "Mimisbrunnr: Go 1.25 avisa y termina bien"           c_mimir_old_go
t "Mimisbrunnr: sin git avisa y termina bien"           c_mimir_no_git
t "Mimisbrunnr: falla go build, no registra"            c_mimir_build_fails
t "Mimisbrunnr: falla mcp add, avisa con la orden"      c_mimir_add_fails
t "Mimisbrunnr: update no compila ni registra"          c_mimir_update_does_not_build
t "Mimisbrunnr: uninstall no lo toca"                   c_mimir_uninstall_keeps_it
t "Mimisbrunnr: uninstall --purge no lo toca"           c_mimir_uninstall_purge_keeps_it
t "Mimisbrunnr: de mimir a memory no lo toca"           c_mimir_to_memory_keeps_it
t "falta openspec: avisa y continúa"                    c_missing_openspec
t "modo enlace: instalación limpia"                     c_link_clean
t "modo enlace: migración desde marketplace"            c_link_migrates_marketplace
t "modo enlace: ruta ocupada por un directorio"         c_link_foreign_dir
t "modo enlace: ruta ocupada por un symlink ajeno"      c_link_foreign_symlink
t "modo enlace: symlink roto se sustituye"              c_link_broken_symlink_replaced
t "modo marketplace: instala y retira el symlink"       c_marketplace_install
t "modo marketplace: no toca un symlink ajeno"          c_marketplace_keeps_foreign_link
t "config tras instalar"                                c_config_contents
t "config con Hugin graphify"                           c_config_hugin_graphify
t "reinstalar conserva GRAPHIFY_INSTALLED_BY"           c_reinstall_keeps_graphify_by
t "la config no se ejecuta al leerla"                   c_config_is_not_sourced
t "graphify con uv: no llama a pipx"                    c_graphify_with_uv
t "graphify sin uv, con pipx"                           c_graphify_with_pipx
t "graphify: nunca skills, hooks ni install"            c_graphify_no_skills_or_hooks
t "graphify preinstalado: no se reinstala"              c_graphify_preinstalled
t "graphify preinstalado conserva GRAPHIFY_INSTALLED_BY" c_graphify_preinstalled_keeps_by
t "graphify: segunda ejecución fuera del PATH"          c_graphify_second_run
t "graphify: segunda ejecución con CLI en el PATH"      c_graphify_second_run_in_path
t "graphify con uv fuera del PATH: avisa"               c_graphify_uv_not_in_path_warns
t "graphify sin uv ni pipx: plain y éxito"              c_graphify_no_manager
t "graphify: falla pipx, plain y éxito"                 c_graphify_install_fails
t "graphify: falla uv, plain y no prueba pipx"          c_graphify_uv_install_fails
t "volver a plain no desinstala graphify"               c_graphify_back_to_plain
t "graphify no se instala si la instalación aborta"     c_graphify_not_installed_when_aborting
t "reinstalar conserva CLAUDE_MD_BACKUP"                c_reinstall_keeps_backup
t "umbrales de Vár por defecto"                         c_var_defaults
t "reinstalar conserva los umbrales de Vár"             c_var_keeps_thresholds
t "reinstalar conserva la vigilancia desactivada"       c_var_keeps_disabled
t "idempotencia: dos install --yes"                     c_idempotent
t "idempotencia: dos install en marketplace"            c_idempotent_marketplace
t "update enlace: symlink ausente se recrea"            c_update_link_missing
t "update enlace: symlink roto se recrea"               c_update_link_broken
t "update marketplace: caché desfasada se reinstala"    c_update_marketplace_stale
t "update marketplace: caché al día no reinstala"       c_update_marketplace_fresh
t "update sin instalar pide install"                    c_update_without_install
t "uninstall tras modo enlace conserva la memoria"      c_uninstall_link
t "uninstall tras modo marketplace"                     c_uninstall_marketplace
t "uninstall --purge borra ~/.claude/nordic-pantheon"   c_uninstall_purge
t "uninstall no toca un symlink de skills ajeno"        c_uninstall_foreign_skills_link
t "uninstall retira graphifyy instalado con uv"         c_uninstall_graphify_uv
t "uninstall retira graphifyy instalado con pipx"       c_uninstall_graphify_pipx
t "uninstall no toca graphify instalado por el humano"  c_uninstall_graphify_by_human
t "uninstall sin clave en la config no toca graphify"   c_uninstall_graphify_by_missing_in_config
t "uninstall sin el gestor: avisa y termina"            c_uninstall_graphify_manager_missing
t "uninstall con fallo del gestor: avisa y termina"     c_uninstall_graphify_fails
t "uninstall --purge no toca graphify-out de proyectos" c_uninstall_graphify_purge_keeps_graph_out
t "--purge fuera de uninstall aborta"                   c_purge_requires_uninstall
t "Bifröst link sin CLAUDE.md previo"                   c_bifrost_no_previous
t "Bifröst link con CLAUDE.md propio: backup"           c_bifrost_previous_file
t "Bifröst link con symlink ajeno: backup"              c_bifrost_previous_foreign_symlink
t "Bifröst ya enlazado: sin backup"                     c_bifrost_already_linked
t "Bifröst: una sola fuente"                            c_bifrost_single_source
t "Bifröst link → skill restaura el backup"             c_bifrost_link_to_skill
t "Bifröst skill no toca CLAUDE.md ajeno"               c_bifrost_skill_keeps_foreign
t "uninstall restaura el backup"                        c_uninstall_restores_backup
t "uninstall no toca CLAUDE.md ajeno"                   c_uninstall_foreign_claude_md

printf '\n%d pasan, %d fallan\n' "$PASS" "$FAIL"
if [ "$FAIL" != 0 ]; then
  printf 'Fallan: %s\n' "${FAILED[@]}"
  exit 1
fi
