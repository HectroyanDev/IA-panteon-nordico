#!/usr/bin/env bash
# Saluda por su nombre. Uso: greet.sh [-h|--help] NOMBRE
set -euo pipefail

usage() {
  echo "Uso: greet.sh [-h|--help] NOMBRE"
}

case "${1:-}" in
  -h|--help) usage; exit 0 ;;
  "") usage >&2; exit 64 ;;
esac

echo "Hola, $1"
