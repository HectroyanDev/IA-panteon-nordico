#!/usr/bin/env bash
# Instalador del panteón nórdico (plugin nordic-pantheon para Claude Code).
# Uso: ./install.sh <install|update|uninstall> [flags]. Ver ./install.sh --help.
set -euo pipefail

PLUGIN_NAME="nordic-pantheon"
MARKETPLACE_NAME="nordic-pantheon"
PLUGIN_ID="${PLUGIN_NAME}@${MARKETPLACE_NAME}"

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
CLAUDE_DIR="$HOME/.claude"
SKILLS_LINK="$CLAUDE_DIR/skills/$PLUGIN_NAME"
CLAUDE_MD="$CLAUDE_DIR/CLAUDE.md"
BIFROST_SRC="$REPO_DIR/bifrost/CLAUDE.md"
DATA_DIR="$CLAUDE_DIR/nordic-pantheon"
CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/nordic-pantheon"
CONFIG_FILE="$CONFIG_DIR/config"

# ---------------------------------------------------------------- utilidades

usage() {
  cat <<EOF
Uso: ./install.sh <subcomando> [flags]

Subcomandos:
  install     Instala el panteón (pregunta lo que no llegue por flag)
  update      Deja visibles los cambios del repo según el modo instalado
  uninstall   Retira lo que añadió install y restaura CLAUDE.md

Flags:
  --mode=link|marketplace   link: symlink ~/.claude/skills/nordic-pantheon (por defecto)
                            marketplace: marketplace local + claude plugin install
  --munin=mimir|memory      Backend de Munin (por defecto mimir)
  --bifrost=link|skill      link: ~/.claude/CLAUDE.md → bifrost/CLAUDE.md (por defecto)
                            skill: solo /bifrost
  --hugin=plain|graphify    Backend de Hugin (por defecto plain)
                            plain: lee el código directamente
                            graphify: consulta el grafo de graphify; instala solo la CLI
                            (uv tool install graphifyy, o pipx install graphifyy)
  --mimir=install|skip      Con --munin=mimir y sin el MCP 'mimisbrunnr' en la CLI
                            (por defecto install; no se guarda en la config)
                            install: clona Mimisbrunnr, compila ~/.local/bin/mimisbrunnr
                            (git + Go 1.26+, sobrescribe el binario) y lo registra con
                            claude mcp add -s user
                            skip: solo avisa de que falta
  --yes                     No preguntar; usa los valores por defecto
  --purge                   Con uninstall: borra también ~/.claude/nordic-pantheon/
  --help                    Muestra esta ayuda

Ejemplos:
  ./install.sh install --yes
  ./install.sh install --mode=link --munin=memory --bifrost=skill
  ./install.sh install --hugin=graphify
  ./install.sh install --yes --mimir=skip
  ./install.sh update
  ./install.sh uninstall --purge
EOF
}

info() { printf '%s\n' "$*"; }
warn() { printf 'Aviso: %s\n' "$*" >&2; }
die()  { printf 'Error: %s\n' "$*" >&2; exit 1; }

# Ruta canónica de un destino (sigue symlinks). Vacío si no resuelve.
resolve() { readlink -f -- "$1" 2>/dev/null || true; }

# ¿Es $1 un symlink cuyo destino resuelve a $2?
links_to() {
  [ -L "$1" ] || return 1
  local target
  target="$(resolve "$1")"
  [ -n "$target" ] && [ "$target" = "$(resolve "$2")" ]
}

have_claude() { command -v claude >/dev/null 2>&1; }

# ---------------------------------------------------------------- config

# Lee una clave de la config sin ejecutarla.
config_get() {
  [ -f "$CONFIG_FILE" ] || return 0
  grep -E "^$1=" "$CONFIG_FILE" | tail -n 1 | cut -d= -f2- || true
}

config_write() {
  # $1 install_mode, $2 bifrost_mode, $3 munin_backend, $4 backup,
  # $5 hugin_backend, $6 graphify_installed_by, $7 var_enabled,
  # $8 var_minutes, $9 var_tool_calls
  mkdir -p "$CONFIG_DIR"
  local tmp="$CONFIG_FILE.tmp.$$"
  {
    printf 'INSTALL_MODE=%s\n' "$1"
    printf 'BIFROST_MODE=%s\n' "$2"
    printf 'MUNIN_BACKEND=%s\n' "$3"
    printf 'HUGIN_BACKEND=%s\n' "$5"
    printf 'GRAPHIFY_INSTALLED_BY=%s\n' "$6"
    printf 'VAR_ENABLED=%s\n' "$7"
    printf 'VAR_MINUTES=%s\n' "$8"
    printf 'VAR_TOOL_CALLS=%s\n' "$9"
    printf 'CLAUDE_MD_BACKUP=%s\n' "$4"
    printf 'REPO_DIR=%s\n' "$REPO_DIR"
  } >"$tmp"
  mv -f "$tmp" "$CONFIG_FILE"
}

# ---------------------------------------------------------------- plugin

plugin_installed() {
  claude plugin list --json 2>/dev/null | grep -q "\"$PLUGIN_ID\""
}

marketplace_present() {
  claude plugin marketplace list --json 2>/dev/null \
    | grep -Eq "\"name\"[[:space:]]*:[[:space:]]*\"$MARKETPLACE_NAME\""
}

# Ruta de la caché del plugin según `claude plugin list --json`.
plugin_cache_path() {
  command -v python3 >/dev/null 2>&1 || return 0
  claude plugin list --json 2>/dev/null | python3 -c '
import json, sys
try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)
for p in data:
    if p.get("id") == sys.argv[1] and p.get("installPath"):
        print(p["installPath"]); break
' "$PLUGIN_ID" || true
}

cache_matches_repo() {
  local cache="$1" d
  [ -n "$cache" ] && [ -d "$cache" ] || return 1
  for d in skills bifrost; do
    diff -rq "$REPO_DIR/$d" "$cache/$d" >/dev/null 2>&1 || return 1
  done
}

remove_marketplace_install() {
  if plugin_installed; then
    info "Desinstalando $PLUGIN_ID (modo marketplace)..."
    claude plugin uninstall "$PLUGIN_ID" >/dev/null
  fi
  if marketplace_present; then
    info "Retirando el marketplace $MARKETPLACE_NAME..."
    claude plugin marketplace remove "$MARKETPLACE_NAME" >/dev/null
  fi
}

# Comprueba que el symlink de skills se puede crear o ya es nuestro.
check_skills_link_free() {
  if [ -L "$SKILLS_LINK" ]; then
    links_to "$SKILLS_LINK" "$REPO_DIR" && return 0
    # Symlink roto: se puede sustituir. Symlink a otro sitio existente: ajeno.
    [ -e "$SKILLS_LINK" ] || return 0
    die "$SKILLS_LINK apunta a $(readlink -- "$SKILLS_LINK"), no a este repo. No lo toco; retíralo a mano."
  elif [ -e "$SKILLS_LINK" ]; then
    die "$SKILLS_LINK ya existe y no es un symlink a este repo. No lo toco; retíralo a mano."
  fi
}

ensure_skills_link() {
  check_skills_link_free
  if links_to "$SKILLS_LINK" "$REPO_DIR"; then
    info "Symlink de skills ya correcto: $SKILLS_LINK"
    return 0
  fi
  [ -L "$SKILLS_LINK" ] && rm -f -- "$SKILLS_LINK"
  mkdir -p "$(dirname "$SKILLS_LINK")"
  ln -s "$REPO_DIR" "$SKILLS_LINK"
  info "Creado $SKILLS_LINK → $REPO_DIR"
}

remove_skills_link() {
  if links_to "$SKILLS_LINK" "$REPO_DIR"; then
    rm -f -- "$SKILLS_LINK"
    info "Retirado $SKILLS_LINK"
  fi
}

install_marketplace_mode() {
  remove_skills_link
  if ! marketplace_present; then
    info "Registrando el marketplace local $REPO_DIR..."
    claude plugin marketplace add "$REPO_DIR" >/dev/null
  fi
  if plugin_installed; then
    info "$PLUGIN_ID ya instalado."
  else
    info "Instalando $PLUGIN_ID..."
    claude plugin install "$PLUGIN_ID" >/dev/null
  fi
}

# ---------------------------------------------------------------- bifröst

# Variable global: ruta del backup vigente (se conserva entre ejecuciones).
BACKUP=""

bifrost_link() {
  if links_to "$CLAUDE_MD" "$BIFROST_SRC"; then
    info "~/.claude/CLAUDE.md ya apunta a Bifröst."
    return 0
  fi
  mkdir -p "$CLAUDE_DIR"
  if [ -e "$CLAUDE_MD" ] || [ -L "$CLAUDE_MD" ]; then
    local bak
    bak="$CLAUDE_MD.bak-nordic-$(date +%Y%m%d-%H%M%S)"
    mv -- "$CLAUDE_MD" "$bak"
    BACKUP="$bak"
    info "Backup de ~/.claude/CLAUDE.md en $bak"
  fi
  ln -s "$BIFROST_SRC" "$CLAUDE_MD"
  info "Creado ~/.claude/CLAUDE.md → $BIFROST_SRC"
}

# Retira el symlink de Bifröst (si es nuestro) y devuelve el backup.
bifrost_unlink() {
  if links_to "$CLAUDE_MD" "$BIFROST_SRC"; then
    rm -f -- "$CLAUDE_MD"
    info "Retirado el symlink ~/.claude/CLAUDE.md"
  fi
  if [ -n "$BACKUP" ]; then
    if [ ! -e "$BACKUP" ] && [ ! -L "$BACKUP" ]; then
      warn "el backup $BACKUP ya no existe; no hay nada que restaurar."
      BACKUP=""
    elif [ -e "$CLAUDE_MD" ] || [ -L "$CLAUDE_MD" ]; then
      warn "~/.claude/CLAUDE.md existe y no es de Bifröst; dejo el backup en $BACKUP."
    else
      mv -- "$BACKUP" "$CLAUDE_MD"
      info "Restaurado ~/.claude/CLAUDE.md desde $BACKUP"
      BACKUP=""
    fi
  fi
}

# ---------------------------------------------------------------- opciones

MODE="" MUNIN="" BIFROST="" HUGIN="" MIMIR="" MIMIR_REGISTERED=0 YES=0 PURGE=0 SUBCMD=""
# Quién instaló graphifyy según la config (uv, pipx o vacío); lo cambia ensure_graphify.
GRAPHIFY_BY=""

validate() {
  # $1 nombre, $2 valor, resto: válidos
  local name="$1" value="$2" v
  shift 2
  for v in "$@"; do [ "$value" = "$v" ] && return 0; done
  die "valor no válido para --$name: '$value'. Válidos: $*"
}

parse_args() {
  local arg
  for arg in "$@"; do
    case "$arg" in
      --help|-h) usage; exit 0 ;;
    esac
  done
  for arg in "$@"; do
    case "$arg" in
      --mode=*)    MODE="${arg#*=}";    validate mode "$MODE" link marketplace ;;
      --munin=*)   MUNIN="${arg#*=}";   validate munin "$MUNIN" mimir memory ;;
      --bifrost=*) BIFROST="${arg#*=}"; validate bifrost "$BIFROST" link skill ;;
      --hugin=*)   HUGIN="${arg#*=}";   validate hugin "$HUGIN" plain graphify ;;
      --mimir=*)   MIMIR="${arg#*=}";   validate mimir "$MIMIR" install skip ;;
      --yes|-y)    YES=1 ;;
      --purge)     PURGE=1 ;;
      install|update|uninstall)
        [ -z "$SUBCMD" ] || { usage >&2; exit 2; }
        SUBCMD="$arg" ;;
      *) printf 'Argumento desconocido: %s\n\n' "$arg" >&2; usage >&2; exit 2 ;;
    esac
  done
  if [ -z "$SUBCMD" ]; then usage >&2; exit 2; fi
  if [ "$PURGE" = 1 ] && [ "$SUBCMD" != uninstall ]; then
    die "--purge solo vale con uninstall."
  fi
}

# Pregunta una opción. $1 nombre, $2 texto, $3 defecto, resto: válidos.
ask() {
  local name="$1" text="$2" def="$3" ans
  shift 3
  printf '%s [%s] (%s): ' "$text" "$(IFS=/; echo "$*")" "$def" >&2
  ans=""
  read -r ans || printf '\n' >&2
  ans="${ans:-$def}"
  validate "$name" "$ans" "$@"
  printf '%s' "$ans"
}

resolve_options() {
  if [ "$YES" = 1 ]; then
    MODE="${MODE:-link}"; MUNIN="${MUNIN:-mimir}"; BIFROST="${BIFROST:-link}"; HUGIN="${HUGIN:-plain}"
    MIMIR="${MIMIR:-install}"
  else
    [ -n "$MODE" ]    || MODE="$(ask mode "Modo de instalación" link link marketplace)"
    [ -n "$MUNIN" ]   || MUNIN="$(ask munin "Backend de Munin" mimir mimir memory)"
    [ -n "$BIFROST" ] || BIFROST="$(ask bifrost "Bifröst global (link) o solo skill" link link skill)"
    [ -n "$HUGIN" ]   || HUGIN="$(ask hugin "Backend de Hugin" plain plain graphify)"
  fi
  # ¿Está ya el MCP en la CLI? Solo importa con Munin mimir.
  MIMIR_REGISTERED=0
  if [ "$MUNIN" = mimir ] && claude mcp get mimisbrunnr >/dev/null 2>&1; then
    MIMIR_REGISTERED=1
  fi
  # La pregunta de Mimisbrunnr va la última para no mover las demás respuestas.
  if [ "$YES" != 1 ] && [ "$MUNIN" = mimir ] && [ "$MIMIR_REGISTERED" = 0 ] && [ -z "$MIMIR" ]; then
    MIMIR="$(ask mimir "Instalar el MCP Mimisbrunnr (git + Go 1.26+)" install install skip)"
  fi
}

# ---------------------------------------------------------------- subcomandos

require_claude() {
  have_claude || die "no encuentro la CLI 'claude' en el PATH. Instala Claude Code y vuelve a ejecutar."
}

check_optional_deps() {
  command -v openspec >/dev/null 2>&1 \
    || warn "no encuentro 'openspec'. Skuld, Brokkr, Heimdall y Hela lo usan para /opsx:*."
  # Con MIMIR=install se instalará después (ensure_mimisbrunnr): no hay aviso.
  if [ "$MUNIN" = mimir ] && [ "$MIMIR_REGISTERED" = 0 ] && [ "$MIMIR" = skip ]; then
    # La app de escritorio tiene su propia config de MCP, que la CLI no ve.
    local desktop_cfg="${XDG_CONFIG_HOME:-$HOME/.config}/Claude/claude_desktop_config.json"
    if grep -q '"mimisbrunnr"' "$desktop_cfg" 2>/dev/null; then
      warn "el MCP 'mimisbrunnr' solo está configurado en la app de escritorio. Munin tendrá memoria allí, pero no en sesiones de la CLI 'claude'."
    else
      warn "el MCP 'mimisbrunnr' no está configurado. Munin no tendrá memoria hasta configurarlo (o reinstala con --munin=memory)."
    fi
  fi
}

# Instala la CLI de graphify si hace falta (solo con --hugin=graphify). Nunca
# ejecuta subcomandos de graphify que registren skills o hooks. Graphify es
# opcional: si no se puede instalar, avisa y deja HUGIN=plain.
ensure_graphify() {
  [ "$HUGIN" = graphify ] || return 0
  local mgr=""
  if command -v graphify >/dev/null 2>&1; then
    info "graphify ya está en el PATH; no lo reinstalo."
    return 0
  fi
  if [ -n "$GRAPHIFY_BY" ]; then
    info "graphifyy ya lo instaló este instalador ($GRAPHIFY_BY); no lo reinstalo."
  else
    if command -v uv >/dev/null 2>&1; then mgr=uv
    elif command -v pipx >/dev/null 2>&1; then mgr=pipx
    else
      warn "no encuentro 'uv' ni 'pipx': no puedo instalar graphify. Backend de Hugin: plain."
      HUGIN=plain
      return 0
    fi
    info "Instalando graphifyy con $mgr..."
    if [ "$mgr" = uv ]; then
      uv tool install graphifyy || mgr=""
    else
      pipx install graphifyy || mgr=""
    fi
    if [ -z "$mgr" ]; then
      warn "falló la instalación de graphifyy. Backend de Hugin: plain."
      HUGIN=plain
      return 0
    fi
    GRAPHIFY_BY="$mgr"
  fi
  if ! command -v graphify >/dev/null 2>&1; then
    case "$GRAPHIFY_BY" in
      uv)   warn "'graphify' no está en el PATH. Ejecuta 'uv tool update-shell' y abre una terminal nueva. Hasta entonces Hugin lee el código directamente." ;;
      pipx) warn "'graphify' no está en el PATH. Ejecuta 'pipx ensurepath' y abre una terminal nueva. Hasta entonces Hugin lee el código directamente." ;;
    esac
  fi
}

# Desinstala graphifyy si lo instaló este instalador ($1: uv, pipx o vacío).
remove_graphify() {
  case "$1" in
    "") return 0 ;;
    uv|pipx) ;;
    *) warn "GRAPHIFY_INSTALLED_BY desconocido ('$1'); no toco graphifyy."; return 0 ;;
  esac
  local cmd="uv tool uninstall graphifyy"
  [ "$1" = pipx ] && cmd="pipx uninstall graphifyy"
  if ! command -v "$1" >/dev/null 2>&1; then
    warn "no encuentro '$1'; desinstala graphifyy a mano con: $cmd"
    return 0
  fi
  info "Desinstalando graphifyy ($1)..."
  if ! $cmd >/dev/null; then
    warn "falló '$cmd'; hazlo a mano."
  fi
}

MIMIR_REPO_URL="https://github.com/HectroyanDev/Mimisbrunnr"

# Pasos manuales para instalar Mimisbrunnr (se añaden a cada aviso de degradación).
# $1 (opcional): ruta donde clonar; por defecto la caché. Rutas entrecomilladas
# para que la receta se pueda pegar tal cual aunque contengan espacios.
mimir_manual_steps() {
  local src="${1:-${XDG_CACHE_HOME:-$HOME/.cache}/nordic-pantheon/mimisbrunnr}"
  local db="${XDG_CONFIG_HOME:-$HOME/.config}/mimisbrunnr/mimisbrunnr.db"
  local bin="$HOME/.local/bin/mimisbrunnr"
  printf '%s' "Instálalo a mano: git clone $MIMIR_REPO_URL \"$src\" && (cd \"$src\" && go build -o \"$bin\" ./cmd/mimisbrunnr) ; claude mcp add -s user mimisbrunnr -e MIMISBRUNNR_DRIVER=sqlite -e \"MIMISBRUNNR_SQLITE_PATH=$db\" -- \"$bin\" (o reinstala con --munin=memory)."
}

# ¿Es $1 una versión de Go >= 1.26 (formato `go1.26.2`)?
go_version_ok() {
  local v="$1"
  [[ "$v" =~ ^go([0-9]+)\.([0-9]+) ]] || return 1
  local major="${BASH_REMATCH[1]}" minor="${BASH_REMATCH[2]}"
  [ "$major" -gt 1 ] || { [ "$major" -eq 1 ] && [ "$minor" -ge 26 ]; }
}

# Instala el MCP Mimisbrunnr en la CLI (solo con Munin mimir, --mimir=install y
# el MCP sin registrar). Es opcional: nunca aborta, avisa y degrada. Compila
# siempre y sobrescribe ~/.local/bin/mimisbrunnr; no toca la app de escritorio.
ensure_mimisbrunnr() {
  [ "$MUNIN" = mimir ] || return 0
  [ "$MIMIR" = install ] || return 0
  [ "$MIMIR_REGISTERED" = 0 ] || return 0

  local gover=""
  if ! command -v git >/dev/null 2>&1; then
    warn "para instalar Mimisbrunnr necesito 'git' y no lo encuentro. $(mimir_manual_steps)"
    return 0
  fi
  if ! command -v go >/dev/null 2>&1; then
    warn "para instalar Mimisbrunnr necesito Go 1.26+ y no encuentro 'go'. $(mimir_manual_steps)"
    return 0
  fi
  gover="$(go env GOVERSION 2>/dev/null || true)"
  if ! go_version_ok "$gover"; then
    warn "para instalar Mimisbrunnr necesito Go 1.26+ y tienes '${gover:-versión desconocida}'. $(mimir_manual_steps)"
    return 0
  fi

  local src="${XDG_CACHE_HOME:-$HOME/.cache}/nordic-pantheon/mimisbrunnr"
  if [ ! -e "$src" ] && [ ! -L "$src" ]; then
    info "Clonando Mimisbrunnr en $src..."
    mkdir -p "$(dirname "$src")" || {
      warn "no pude crear $(dirname "$src"); no instalo Mimisbrunnr. $(mimir_manual_steps)"
      return 0
    }
    if ! git clone --depth 1 "$MIMIR_REPO_URL" "$src"; then
      warn "falló 'git clone $MIMIR_REPO_URL $src'. $(mimir_manual_steps)"
      return 0
    fi
  elif [ "$(git -C "$src" remote get-url origin 2>/dev/null || true)" = "$MIMIR_REPO_URL" ]; then
    info "Actualizando la caché de Mimisbrunnr en $src..."
    git -C "$src" pull --ff-only \
      || warn "falló 'git pull --ff-only' en $src; compilo lo que hay."
  else
    warn "$src existe y no es un clon de $MIMIR_REPO_URL. No lo toco; no instalo Mimisbrunnr. Clónalo en otra ruta, esta receta ya la usa. $(mimir_manual_steps "$src-manual")"
    return 0
  fi

  local bin="$HOME/.local/bin/mimisbrunnr"
  mkdir -p "$HOME/.local/bin" || {
    warn "no pude crear $HOME/.local/bin; no instalo Mimisbrunnr. $(mimir_manual_steps)"
    return 0
  }
  info "Compilando Mimisbrunnr en $bin..."
  if ! (cd "$src" && go build -o "$bin" ./cmd/mimisbrunnr); then
    warn "falló 'go build -o $bin ./cmd/mimisbrunnr' en $src; no registro el MCP. $(mimir_manual_steps)"
    return 0
  fi

  local db_dir="${XDG_CONFIG_HOME:-$HOME/.config}/mimisbrunnr"
  mkdir -p "$db_dir" || {
    warn "no pude crear $db_dir; no registro el MCP. $(mimir_manual_steps)"
    return 0
  }
  if ! claude mcp add -s user mimisbrunnr \
      -e MIMISBRUNNR_DRIVER=sqlite \
      -e "MIMISBRUNNR_SQLITE_PATH=$db_dir/mimisbrunnr.db" \
      -- "$bin"; then
    warn "falló 'claude mcp add -s user mimisbrunnr'. Ejecútalo a mano: claude mcp add -s user mimisbrunnr -e MIMISBRUNNR_DRIVER=sqlite -e MIMISBRUNNR_SQLITE_PATH=$db_dir/mimisbrunnr.db -- $bin"
    return 0
  fi
  if claude mcp get mimisbrunnr >/dev/null 2>&1; then
    info "MCP mimisbrunnr registrado en la CLI (ámbito user, base $db_dir/mimisbrunnr.db)."
  else
    warn "registré mimisbrunnr pero 'claude mcp get mimisbrunnr' no lo encuentra; revísalo con 'claude mcp list'."
  fi
}

remind_session() {
  info ""
  info "Listo. Abre una sesión nueva de Claude Code para cargar los cambios."
}

cmd_install() {
  require_claude
  resolve_options
  check_optional_deps
  # Comprobación previa: abortar antes de tocar nada si la ruta es ajena.
  [ "$MODE" = link ] && check_skills_link_free

  BACKUP="$(config_get CLAUDE_MD_BACKUP)"
  GRAPHIFY_BY="$(config_get GRAPHIFY_INSTALLED_BY)"
  # Vigilancia de Vár: se conserva lo que ya hubiera; por defecto on, 10 y 40.
  VAR_EN="$(config_get VAR_ENABLED)"; VAR_EN="${VAR_EN:-on}"
  VAR_MIN="$(config_get VAR_MINUTES)"; VAR_MIN="${VAR_MIN:-10}"
  VAR_CALLS="$(config_get VAR_TOOL_CALLS)"; VAR_CALLS="${VAR_CALLS:-40}"

  if [ "$MODE" = link ]; then
    remove_marketplace_install
    ensure_skills_link
  else
    install_marketplace_mode
  fi

  if [ "$BIFROST" = link ]; then
    bifrost_link
  else
    bifrost_unlink
  fi

  ensure_graphify
  ensure_mimisbrunnr

  config_write "$MODE" "$BIFROST" "$MUNIN" "$BACKUP" "$HUGIN" "$GRAPHIFY_BY" "$VAR_EN" "$VAR_MIN" "$VAR_CALLS"
  info "Config guardada en $CONFIG_FILE (modo $MODE, Munin $MUNIN, Bifröst $BIFROST, Hugin $HUGIN)."
  remind_session
}

cmd_update() {
  [ -f "$CONFIG_FILE" ] || die "no hay instalación previa ($CONFIG_FILE no existe). Ejecuta ./install.sh install."
  local mode
  mode="$(config_get INSTALL_MODE)"
  case "$mode" in
    link)
      ensure_skills_link
      ;;
    marketplace)
      require_claude
      info "Refrescando el marketplace y el plugin..."
      claude plugin marketplace update "$MARKETPLACE_NAME" >/dev/null
      claude plugin update "$PLUGIN_ID" >/dev/null
      if cache_matches_repo "$(plugin_cache_path)"; then
        info "La caché coincide con el repo."
      else
        info "La caché no coincide con el repo; reinstalando $PLUGIN_ID..."
        plugin_installed && claude plugin uninstall "$PLUGIN_ID" >/dev/null
        claude plugin install "$PLUGIN_ID" >/dev/null
        cache_matches_repo "$(plugin_cache_path)" \
          || warn "tras reinstalar, la caché sigue sin coincidir con el repo."
      fi
      ;;
    *) die "INSTALL_MODE no válido en $CONFIG_FILE: '$mode'. Ejecuta ./install.sh install." ;;
  esac
  remind_session
}

cmd_uninstall() {
  BACKUP="$(config_get CLAUDE_MD_BACKUP)"
  GRAPHIFY_BY="$(config_get GRAPHIFY_INSTALLED_BY)"
  remove_skills_link
  if have_claude; then
    remove_marketplace_install
  else
    warn "no encuentro la CLI 'claude'; si el plugin estaba instalado por marketplace, retíralo a mano."
  fi
  bifrost_unlink
  remove_graphify "$GRAPHIFY_BY"
  if [ -f "$CONFIG_FILE" ]; then
    rm -f -- "$CONFIG_FILE"
    rmdir -- "$CONFIG_DIR" 2>/dev/null || true
    info "Retirada la config $CONFIG_FILE"
  fi
  if [ "$PURGE" = 1 ]; then
    rm -rf -- "$DATA_DIR"
    info "Borrado $DATA_DIR"
  elif [ -d "$DATA_DIR" ]; then
    info "Se conserva $DATA_DIR (usa --purge para borrarlo)."
  fi
  info "Panteón desinstalado."
}

main() {
  parse_args "$@"
  case "$SUBCMD" in
    install)   cmd_install ;;
    update)    cmd_update ;;
    uninstall) cmd_uninstall ;;
  esac
}

main "$@"
