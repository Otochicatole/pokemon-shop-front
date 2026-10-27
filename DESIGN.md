---
name: Nevada TCG Collector Boutique
description: Boutique editorial para coleccionismo Pokémon, en marfil, tinta y rojo medido.
colors:
  paper: "#f4f0e8"
  surface: "#fffdf8"
  surface-2: "#eee9df"
  surface-raised: "#e6dfd3"
  ink: "#171615"
  muted: "#68635d"
  line: "#ded7cc"
  line-strong: "#b9ae9f"
  accent: "#ad202d"
  accent-hover: "#c52c39"
  accent-dark: "#fffdf8"
  accent-ink: "#a51f2b"
  success: "#397052"
  danger: "#a51f2b"
  warning: "#8d651b"
  cyan: "#387789"
  purple: "#705b8c"
typography:
  display:
    fontFamily: "'Palatino Linotype', 'Book Antiqua', Georgia, serif"
    fontSize: "clamp(38px,4.1vw,62px)"
    fontWeight: 700
    lineHeight: 1.03
    letterSpacing: "-.045em"
  headline:
    fontFamily: "'Palatino Linotype', 'Book Antiqua', Georgia, serif"
    fontSize: "clamp(26px,2.5vw,36px)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-.03em"
  section:
    fontFamily: "'Palatino Linotype', 'Book Antiqua', Georgia, serif"
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.24
  body:
    fontFamily: "var(--font-geist), 'Nunito', Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "var(--font-geist), 'Nunito', Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 650
    lineHeight: 1.25
  data:
    fontFamily: "var(--font-mono), ui-monospace, monospace"
    fontSize: "inherit"
    fontWeight: 500
    lineHeight: 1.5
rounded:
  panel: "16px"
  control: "10px"
  small-control: "9px"
  pill: "999px"
spacing:
  compact: "10px"
  small: "16px"
  medium: "24px"
  large: "32px"
  section: "54px"
  desktop-section: "64px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-dark}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    minHeight: "44px"
    padding: "12px 20px"
  button-secondary:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    minHeight: "44px"
  text-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    minHeight: "46px"
  navigation-link:
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    activeColor: "{colors.ink}"
    activeMarker: "{colors.accent}"
  product-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    borderColor: "{colors.line}"
    shadow: "0 10px 28px rgb(45 36 25 / 7%)"
---

# Design System: Nevada TCG Collector Boutique

## Creative North Star

**La Vitrina de Coleccionismo.** Nevada TCG es una boutique de cartas y coleccionables Pokémon. La tienda combina papel marfil, tinta casi negra y rojo Poké Ball con una voz editorial sobria. Las cartas reales llevan el protagonismo; los mapas y sprites pixelados conservan el carácter Pokémon sin convertir controles, formularios ni textos en una pantalla retro.

El sistema cubre la experiencia del cliente. El panel administrativo conserva su estilo independiente. No presenta garantías, verificaciones ni servicios que PRODUCT.md no confirme.

## Color

El lienzo marfil (`paper`, `#f4f0e8`) enmarca superficies claras (`surface`, `#fffdf8`) y planos cálidos de apoyo (`surface-2`, `#eee9df`; `surface-raised`, `#e6dfd3`). Tinta (`ink`, `#171615`) define encabezados y controles; gris cálido (`muted`, `#68635d`) sostiene descripciones y metadatos. Las líneas arena (`line`, `#ded7cc`; `line-strong`, `#b9ae9f`) separan sin endurecer la composición.

El rojo Poké Ball (`accent`, `#ad202d`; hover `#c52c39`) identifica la acción principal, el foco y la selección. Sobre rojo se usa marfil (`accent-dark`, `#fffdf8`). El verde (`#397052`) representa estados positivos; peligro usa rojo oscuro (`#a51f2b`) y advertencia usa ocre (`#8d651b`). Cian y violeta quedan como señales secundarias cuando ayudan a identificar tipos o categorías.

**Regla del rojo medido.** Una acción primaria por grupo recibe el rojo más visible. Enlaces, contornos y estados seleccionados usan rojo con menor peso. El rojo no reemplaza los colores semánticos de éxito y advertencia.

## Tipografía

- **Display:** Palatino Linotype, Book Antiqua o Georgia. H1 a `clamp(38px,4.1vw,62px)`, peso 700 y línea compacta; en móvil baja a `clamp(32px,8vw,44px)`.
- **Encabezados:** la misma serif editorial, de 26–36px para H2 y 19px para H3, con ritmo corto y contraste claro.
- **Cuerpo y controles:** Geist Sans, con Nunito/Arial como respaldo. El cuerpo usa 15px y línea 1.7; etiquetas y controles mantienen un mínimo práctico de 13–14px.
- **Datos:** Geist Mono para precios, totales, stock, SKU y número de carta. Los números usan ancho tabular para facilitar comparación.

**Regla editorial.** Reservá la serif para títulos y encabezados. La sans mantiene formularios, texto extenso y controles fáciles de recorrer; la mono señala valores que se comparan.

## Composición y ritmo

El header mide 78px en escritorio y 70px en móvil. El contenido general puede llegar a 1460px y usa márgenes laterales fluidos. Las páginas de cuenta, compra y catálogo respiran con al menos 20px en móvil y 54px de separación superior en escritorio.

La portada mantiene dos columnas: promesa editorial y acciones a la izquierda, escena pixel art original de Kanto a la derecha. La imagen se mantiene rectangular, sin círculo detrás del personaje. En móvil el texto y las acciones aparecen antes de la escena y del selector de compañero.

El catálogo alinea filtros y resultados en escritorio; por debajo de 1050px los filtros pasan a un drawer. Hay tres columnas de productos por defecto, cuatro en pantallas anchas, dos en móvil y una hasta 360px. Las fichas priorizan imagen real, nombre, colección, condición, stock y precio.

El login y el registro conservan Pueblo Primavera, distinto del mapa de Kanto de la portada. La escena queda junto al formulario en escritorio y debajo en móvil. El círculo de fondo eliminado no vuelve.

## Superficies, bordes y movimiento

Tarjetas y paneles usan bordes de un píxel, tonos arena y radios de 14–16px. Los campos y botones tienen radios de 10px y objetivos táctiles de al menos 44px. La profundidad es suave: tarjetas en reposo alrededor de `0 10px 28px rgb(45 36 25 / 7%)`; la ilustración puede tener una sombra mayor para separar el sprite del mapa.

Hover y foco mueven la superficie apenas y aclaran el borde. Los productos se elevan pocos píxeles; los controles cambian color y contorno en unos 180ms. `prefers-reduced-motion` suprime viajes, transiciones y animaciones no esenciales. El foco de teclado usa un contorno visible rojo con separación.

**Regla de superficie.** Marfil, superficie clara y borde deben seguir diferenciándose sin recurrir a paneles oscuros o sombras pesadas.

## Componentes

### Botones y campos

El primario usa rojo, texto marfil y una sombra roja suave. El secundario usa un plano cálido con texto de tinta; los botones fantasma mantienen el ruido bajo. Inputs y selects tienen una superficie clara, línea arena, texto de alto contraste y foco rojo. Errores aparecen junto al campo y en rojo oscuro.

### Navegación

El header usa marfil traslúcido, una línea fina y un desenfoque moderado. La ruta actual tiene texto tinta y una marca roja. El contador del carrito va en una cápsula roja; menús y controles de cuenta conservan blancos cálidos.

### Tarjetas y compra

Las tarjetas de producto usan superficie clara, borde arena y radios amplios. El recuadro de imagen es cálido y neutro, no introduce una imagen Pokémon decorativa en lugar del producto. Precio, disponibilidad, subtotales y total mantienen datos reales y números tabulares. Resumen de carrito y checkout usan la misma superficie que el catálogo.

### Estados

Carga usa un brillo cálido tenue; vacío, error y éxito usan texto directo, iconos reconocibles y color semántico. Los avisos no prometen compra protegida, autenticidad ni envíos garantizados sin confirmación en PRODUCT.md.

## Arte Pokémon y fidelidad de datos

La identidad Pokémon aparece en los mapas de Kanto y Pueblo Primavera y en sprites pixelados, conservando `image-rendering: pixelated`. El pixel art no se desenfoca, no se sustituye por personajes genéricos y no invade la tipografía ni los controles. Las imágenes, precios, condición, rareza, stock, SKU y números de cartas vienen del catálogo.

## Accesibilidad y adaptación

Mantener navegación por teclado, foco visible, contraste legible y estados `disabled`, cargando, vacío y error. Las etiquetas no dependen solo del color. En anchuras de 390px y 344px, el header, el hero, el filtro, las fichas, los formularios y las acciones deben permanecer dentro del viewport; la barra de secciones de cuenta puede desplazarse horizontalmente de forma explícita.

## Reglas de uso

- Usar marfil, tinta y rojo medido en todas las rutas del cliente.
- Usar serif editorial en títulos, sans legible en tareas y mono en datos comparables.
- Mantener mapas distintos en home y autenticación, y sprites nítidos.
- Priorizar imagen y datos reales de las cartas.
- Mantener administración separada y evitar afirmaciones comerciales no verificadas.
- No usar tipografía pixelada, bordes gruesos, sombras duras o amarillo como acción primaria en el storefront.
- No restaurar el gran círculo detrás del Pokémon en autenticación.