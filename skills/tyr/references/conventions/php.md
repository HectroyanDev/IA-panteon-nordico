# PHP (agnóstico, PSR-1 / PSR-4 / PSR-12)

Las reglas del repo (`phpcs.xml`, `.php-cs-fixer*`, `phpstan.neon`) mandan. Gravedad por defecto entre paréntesis.

## Estilo (BAJA)

- PSR-12: 4 espacios, llave de clase y método en línea propia, llave de control en la misma línea, una sentencia por línea, sin `?>` final en archivos solo PHP.
- Clases `PascalCase`, métodos y variables `camelCase`, constantes `UPPER_SNAKE_CASE`. Un archivo por clase, namespace acorde a PSR-4.
- `use` ordenados, sin imports sin usar.
- Arrays cortos `[]`, comillas simples salvo interpolación.

## Tipos y contratos (MEDIA si causa bug, si no BAJA)

- `declare(strict_types=1);` en archivos nuevos.
- Tipos en parámetros, retorno y propiedades; `?Tipo` o uniones explícitas, `void` cuando no devuelve nada.
- Comparación estricta `===` / `!==`; `in_array($x, $a, true)`.
- No devolver tipos mixtos (`false|array`) en código nuevo: excepción o `null`.

## Errores (MEDIA)

- No `@` para silenciar errores.
- No `catch (\Exception $e) {}` vacío; registra o relanza con contexto.
- Excepciones específicas del dominio en vez de `\Exception` genérica.

## Diseño (BAJA, MEDIA si afecta a tests o acoplamiento)

- Inyección de dependencias por constructor; nada de `new` de servicios dentro de lógica de negocio ni estado global (`global`, singletons nuevos).
- Métodos cortos con una responsabilidad; early return en vez de anidar.
- Sin lógica de negocio en vistas/plantillas.
- Fechas con `DateTimeImmutable`.

## Base de datos y rendimiento (MEDIA)

- Consultas preparadas siempre (ver lente de seguridad).
- Sin consultas dentro de bucles (N+1).
- Transacciones cuando se escriben varias tablas relacionadas.

## Seguridad que también es convención (lo marca la lente de seguridad)

- Salida en HTML con `htmlspecialchars($v, ENT_QUOTES, 'UTF-8')`.
- `password_hash` / `password_verify`; nunca `md5`/`sha1` para contraseñas.
- `random_bytes` / `random_int` para tokens.
