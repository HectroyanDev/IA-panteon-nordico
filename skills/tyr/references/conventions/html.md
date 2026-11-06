# HTML

Aplica también a plantillas (Twig, Blade, PHP con HTML, JSX en lo que toca al marcado). Gravedad por defecto entre paréntesis.

## Semántica (BAJA, MEDIA si afecta a accesibilidad)

- Elementos semánticos: `header`, `nav`, `main`, `section`, `article`, `footer`, `button`, `a`.
- Un solo `h1` por página y jerarquía de encabezados sin saltos.
- `button` para acciones, `a` con `href` para navegación; nunca `div`/`span` clicables.
- `type` explícito en `button` dentro de formularios.

## Accesibilidad (MEDIA)

- `alt` en todas las `img` (vacío `alt=""` si es decorativa).
- Cada `input`, `select`, `textarea` con `label` asociado o `aria-label`.
- Contraste y foco visible: no `outline: none` sin alternativa.
- ARIA solo cuando no hay elemento nativo; roles y estados correctos (`aria-expanded`, `aria-controls`).
- `lang` en `html`.

## Formularios y seguridad

- Token CSRF en formularios que cambian estado (lo marca la lente de seguridad).
- `autocomplete` adecuado en campos de credenciales y datos personales (BAJA).
- `target="_blank"` con `rel="noopener noreferrer"` (BAJA).

## Estilo (BAJA)

- Atributos en minúsculas, comillas dobles, indentación coherente con el archivo.
- Sin estilos inline ni `onclick` inline en código nuevo.
- IDs únicos; clases según la convención CSS del repo.
- Imágenes con `width`/`height` o `aspect-ratio` y `loading="lazy"` fuera del primer pantallazo.
