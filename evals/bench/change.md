# Change: add-version-flag

Requisitos confirmados (no hace falta preguntar nada):

- `greet.sh` acepta `-V` y `--version`: imprime `greet 1.0.0` en la salida estándar y sale con 0, sin exigir nombre.
- La ayuda (`-h`, `--help`) y el README mencionan el nuevo flag.
- Con otros argumentos el comportamiento no cambia.
- Fuera de alcance: cualquier otro flag, tests automáticos, cambios de formato.
