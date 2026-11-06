# JavaScript / TypeScript

Las reglas del repo (`eslint.config.*`, `.eslintrc*`, `.prettierrc*`, `tsconfig.json`) mandan. Gravedad por defecto entre paréntesis.

## Estilo (BAJA)

- `const` por defecto, `let` si se reasigna, nunca `var`.
- Variables y funciones `camelCase`, clases `PascalCase`, constantes de módulo `UPPER_SNAKE_CASE`.
- ES modules (`import`/`export`); sin imports sin usar.
- Template literals en vez de concatenar cadenas.
- Sin `console.log` / `debugger` olvidados (MEDIA si filtran datos).

## Corrección (MEDIA, ALTA si rompe un flujo)

- `===` / `!==`; cuidado con `0`, `''` y `NaN` en condiciones truthy.
- Optional chaining `?.` y `??` en vez de `||` cuando `0` o `''` son válidos.
- `async`/`await`: toda promesa se espera o se maneja; `try/catch` alrededor de I/O; nada de `forEach` con callbacks `async` si importa el orden o el resultado (usa `for...of` o `Promise.all`).
- No mutar argumentos ni objetos compartidos; copia con spread o `structuredClone`.
- `parseInt` con radix; fechas con cuidado de zona horaria.

## TypeScript (si aplica)

- Sin `any` nuevo (BAJA; MEDIA si oculta un bug); `unknown` + estrechamiento.
- Sin `!` non-null assertion sin justificar.
- Tipos de retorno explícitos en funciones exportadas.

## Diseño y rendimiento (BAJA, MEDIA si es medible)

- Funciones pequeñas, early return.
- Sin listeners, intervalos o timeouts que no se limpian.
- Debounce/throttle en eventos frecuentes (scroll, input, resize).
- Sin fetch dentro de bucles si se puede agrupar.
