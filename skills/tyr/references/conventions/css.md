# CSS (y SCSS)

Las reglas del repo (`.stylelintrc*`, metodología como BEM o utilidades) mandan. Gravedad por defecto entre paréntesis.

## Nomenclatura y estructura (BAJA)

- Clases en `kebab-case`; BEM (`bloque__elemento--modificador`) si el repo lo usa.
- No usar IDs para estilos; especificidad baja y plana.
- Anidación SCSS de 3 niveles como máximo.
- Sin `!important` salvo utilidades o sobrescritura documentada (MEDIA si rompe otros componentes).

## Valores (BAJA)

- Colores, espaciados y tipografías con variables (custom properties o variables SCSS), no valores mágicos sueltos.
- Unidades relativas (`rem`, `em`, `%`) para tipografía y espaciado; `0` sin unidad.
- Mobile-first: media queries con `min-width` si es la convención del repo.

## Rendimiento y comportamiento (MEDIA)

- Animar `transform` y `opacity`, no `top`/`left`/`width`.
- Sin selectores universales o muy profundos en hojas globales.
- `z-index` desde una escala definida, no números arbitrarios.

## Accesibilidad (MEDIA)

- No quitar `outline` de foco sin alternativa visible.
- Respetar `prefers-reduced-motion` en animaciones nuevas.
- No ocultar contenido necesario para lectores de pantalla con `display: none` cuando debería ser visualmente oculto (`.sr-only`).
