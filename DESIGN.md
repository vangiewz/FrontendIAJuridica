---
name: Asistencia Jurídica Civil Boliviana
description: La cartilla de derechos llevada a producto — papel claro, tinta densa y un concepto por bloque.
colors:
  papel: "#FFFDF8"
  superficie: "#FFFFFF"
  tinta: "#22201C"
  tinta-suave: "#5F5952"
  linea: "#E5DFD4"
  accion: "#1B6B4A"
  accion-texto: "#FFFDF8"
  destacado: "#E8A33D"
  alerta: "#C8102E"
  area-contratos: "#2B4C8C"
  area-obligaciones: "#C25A1C"
  area-derechos-reales: "#2F6B4F"
  area-sucesiones: "#6B3A7A"
typography:
  numeral:
    fontFamily: "Archivo_900Black"
    fontSize: "48px"
    fontWeight: 900
    lineHeight: "48px"
  display:
    fontFamily: "Archivo_900Black"
    fontSize: "34px"
    fontWeight: 900
  headline:
    fontFamily: "Archivo_900Black"
    fontSize: "26px"
    fontWeight: 900
  title:
    fontFamily: "Archivo_900Black"
    fontSize: "20px"
    fontWeight: 900
  body:
    fontFamily: "AtkinsonHyperlegibleNext_400Regular"
    fontSize: "17px"
    fontWeight: 400
  label:
    fontFamily: "AtkinsonHyperlegibleNext_700Bold"
    fontSize: "14px"
    fontWeight: 700
rounded:
  s: "4px"
  m: "8px"
  l: "16px"
  xl: "24px"
  round: "9999px"
spacing:
  xs: "4px"
  s: "8px"
  m: "16px"
  l: "24px"
  xl: "32px"
  xxl: "48px"
components:
  boton-primario:
    backgroundColor: "{colors.accion}"
    textColor: "{colors.accion-texto}"
    typography: "{typography.label}"
    rounded: "{rounded.m}"
    padding: "16px 24px"
  boton-secundario:
    backgroundColor: "transparent"
    textColor: "{colors.tinta}"
    typography: "{typography.label}"
    rounded: "{rounded.m}"
    padding: "16px 24px"
  boton-peligro:
    backgroundColor: "{colors.alerta}"
    textColor: "{colors.superficie}"
    typography: "{typography.label}"
    rounded: "{rounded.m}"
    padding: "16px 24px"
  campo-texto:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    typography: "{typography.body}"
    rounded: "{rounded.s}"
    padding: "16px"
  campo-texto-error:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.s}"
    padding: "16px"
  ficha-area-activa:
    backgroundColor: "{colors.area-contratos}"
    textColor: "{colors.superficie}"
    typography: "{typography.label}"
    rounded: "{rounded.m}"
    padding: "8px 16px"
  ficha-area-inactiva:
    backgroundColor: "transparent"
    textColor: "{colors.tinta-suave}"
    typography: "{typography.label}"
    rounded: "{rounded.m}"
    padding: "8px 16px"
  aviso-info:
    backgroundColor: "{colors.linea}"
    textColor: "{colors.tinta}"
    typography: "{typography.label}"
    rounded: "{rounded.s}"
    padding: "16px"
  aviso-error:
    backgroundColor: "transparent"
    textColor: "{colors.alerta}"
    typography: "{typography.label}"
    rounded: "{rounded.s}"
    padding: "16px"
  tarjeta:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.m}"
    padding: "24px"
---

# Sistema de diseño: Asistencia Jurídica Civil Boliviana

## Overview

**Creative North Star: "La cartilla de derechos"**

Es el folleto que la Defensoría del Pueblo y las ONG reparten para explicarle a la gente qué
le corresponde, llevado a producto. Papel claro y cálido, tinta casi negra, un concepto por
bloque y márgenes anchos. La pantalla no intenta parecer un despacho de abogados: rechaza
deliberadamente el arreglo por defecto de la categoría —panel azul institucional, tarjetas
uniformes, jerga de bufete— porque ese arreglo le habla al profesional y no a quien tiene el
problema.

La densidad es baja a propósito. Cada vista ocupa una columna centrada y estrecha (400 px en
formularios, 800 px en contenido), con `xl` (32 px) de aire alrededor y bloques separados por
`l` (24 px) o `xxl` (48 px). Las superficies son planas: no hay una sola sombra en todo el
build. La profundidad se construye con dos valores de papel —el fondo cálido `papel` contra
las superficies blancas `superficie`— y con reglas finas de 1 px en `linea`. La jerarquía la
carga la tipografía, no la elevación.

El contraste tipográfico es el gesto central: Archivo Black, pesadísima, para las preguntas y
los numerales; Atkinson Hyperlegible Next para todo lo que se lee de corrido. La segunda no
es una elección de gusto: el Braille Institute la diseñó para diferenciar caracteres
confundibles, y acá el lector primario es un ciudadano sin formación jurídica leyendo texto
legal, muchas veces desde el teléfono y con algo de ansiedad.

**Key Characteristics:**
- Papel cálido (#FFFDF8) sobre el que flotan superficies blancas puras, sin sombras.
- Contraste de dos familias: Archivo Black voceando, Atkinson Hyperlegible explicando.
- Verde didáctico como única acción; rojo estrictamente reservado al riesgo.
- Cuatro colores de área, siempre los cuatro visibles y siempre con su nombre escrito.
- Reglas finas de 1 px (`linea`) como único recurso de separación y de contorno.

## Colors

Una paleta de papel impreso: fondo cálido, tinta densa, y un puñado de tintas planas de
folleto —verde, ámbar, rojo y cuatro colores de área— que nunca se mezclan ni se degradan.

### Primary
- **Verde didáctico** (`accion`): el único color de acción del sistema. Fondo de todo botón
  primario, color de la pestaña activa en la barra inferior y color del dato de área en la
  ficha de consulta. Si algo es pulsable y avanza la tarea, es este verde.
- **Papel sobre verde** (`accion-texto`): el texto de los botones primarios. Es el mismo
  blanco cálido del fondo, no blanco puro: la acción se lee como papel recortado.

### Secondary
- **Ámbar de numeral** (`destacado`): el color de los numerales de paso grandes. Es el único
  acento decorativo permitido y hoy tiene un solo consumidor en el build (`PasoNumerado`).

### Tertiary
Los cuatro colores de área del Derecho Civil. No son decorativos: son identificadores de
dominio y se muestran siempre los cuatro juntos.
- **Azul expediente** (`area-contratos`): Contratos.
- **Terracota** (`area-obligaciones`): Obligaciones y responsabilidad civil.
- **Verde catastro** (`area-derechos-reales`): Derechos reales y bienes.
- **Ciruela** (`area-sucesiones`): Sucesiones.

### Neutral
- **Papel de cartilla** (`papel`): fondo de toda pantalla, sin excepción.
- **Superficie blanca** (`superficie`): campos de texto, tarjetas, cabeceras y barra de
  pestañas. Es el bloque recortado sobre el papel.
- **Tinta** (`tinta`): todo texto de lectura, títulos y valores.
- **Tinta suave** (`tinta-suave`): etiquetas, marcas de agua del campo, texto secundario,
  pestañas inactivas y fichas de área no seleccionadas.
- **Línea** (`linea`): borde de 1 px de campos, tarjetas, fichas y barra de pestañas; y fondo
  del aviso informativo.

### Alerta
- **Rojo reservado** (`alerta`): borde del campo con error, texto del error, texto y borde
  del aviso de error, y fondo del botón de variante peligro.

### Named Rules
**La regla del rojo reservado.** `alerta` (#C8102E) pertenece a errores, riesgos y acciones
destructivas. No es acento decorativo, no marca énfasis, no titula una sección y no se usa
para llamar la atención sobre algo que funciona bien. Prueba de auditoría: si el rojo aparece
en una pantalla donde nada salió mal, está mal usado.

**La regla de las cuatro áreas.** Las cuatro áreas del Derecho Civil se muestran siempre las
cuatro. La detectada o seleccionada se enciende con su color de área y texto blanco; las
otras tres quedan tenues —contorno `linea`, texto `tinta-suave`— pero legibles y presentes.
Nunca se oculta un área ni se muestra solo la activa: el usuario ve el mapa completo, no su
casilla.

**La regla del token único.** Ningún valor literal de color, familia, tamaño, espaciado o
radio fuera de `src/theme/`. Un `StyleSheet` consume `colores`, `tipografia`, `espaciado` y
`radios`; nunca escribe un hex, un nombre de fuente ni un número de padding. Si falta un
token, se agrega al tema, no se improvisa en la vista.

## Typography

**Display Font:** Archivo Black (`Archivo_900Black`, vía `@expo-google-fonts/archivo`)
**Body Font:** Atkinson Hyperlegible Next (`AtkinsonHyperlegibleNext_400Regular` y
`AtkinsonHyperlegibleNext_700Bold`, vía `@expo-google-fonts/atkinson-hyperlegible-next`)

Ambas se cargan con `useFonts` en el layout raíz y la app no renderiza hasta que están
listas: no hay estado en que se vea una fuente de sistema.

**Character:** Archivo Black grita la pregunta con la autoridad de un titular de folleto;
Atkinson Hyperlegible Next contesta en voz baja y clara. El salto entre las dos es el
contraste principal del sistema, y reemplaza a cualquier recurso de énfasis decorativo.

### Hierarchy
- **Numeral** (Archivo Black, 48 px, line-height 48 px): los numerales de paso, en ámbar.
  Enormes a propósito: son el ancla visual de una secuencia numerada.
- **Display** (Archivo Black, 34 px): la pregunta única de la Home ("¿Qué te pasó?"). Un solo
  display por pantalla.
- **Headline** (Archivo Black, 26 px): títulos de pantalla, títulos de cabecera de navegación
  y el encabezado del estado vacío.
- **Title** (Archivo Black, 20 px): escalón definido en el tema y todavía sin consumidor en el
  build. Disponible para subtítulos de sección.
- **Body** (Atkinson Hyperlegible Next Regular, 17 px): todo texto de lectura, el contenido
  de los campos y las marcas de agua. 17 px es el piso de lectura del sistema; texto legal no
  baja de acá.
- **Label** (Atkinson Hyperlegible Next Bold, 14 px): etiquetas de campo, texto de botones,
  fichas de área, avisos y texto secundario. El único escalón chico permitido, y siempre en
  bold para que sostenga el contraste.

### Named Rules
**La regla de la legibilidad primero.** El cuerpo es Atkinson Hyperlegible Next por una razón
funcional, no estética: la diseñó el Braille Institute para maximizar la distinción entre
caracteres, y el lector primario es un ciudadano sin formación jurídica enfrentando texto
legal. No se sustituye por una fuente "más linda", no se baja de 17 px en lectura corrida y
no se recorta el interletrado.

**La regla de las dos voces.** Solo dos familias. Archivo Black para lo que titula o numera,
Atkinson para todo lo demás. Una tercera familia —o una itálica decorativa, o versalitas—
no pertenece al sistema.

## Layout

Columna única centrada sobre fondo `papel`, dentro de un `ScrollView` que crece. El
contenedor lleva `xl` (32 px) de padding en todos los lados y se centra con `alignSelf`, con
un ancho máximo según el tipo de contenido: 400 px para formularios y estados vacíos, 600 px
para el perfil, 800 px para consulta y home. Esos tres anchos son la única respuesta
responsive del sistema: no hay breakpoints ni reordenamientos: en el teléfono la columna
ocupa el ancho disponible y en escritorio se detiene en su máximo. Una sola experiencia en
web, iOS y Android, sin adaptación por sistema operativo.

El ritmo vertical sale de la escala de espaciado: `xs` (4) separa una etiqueta de su campo,
`m` (16) es el padding interno estándar y la separación entre campos, `l` (24) separa un
título de su contenido, `xl` (32) separa bloques mayores y `xxl` (48) marca el corte grande
—entre la acción principal y el bloque de áreas al pie. Los formularios de login usan `gap`
con `m` entre acciones.

Los bloques anclados al pie (las fichas de área en Home, el aviso legal en Consulta) se
empujan con `marginTop: 'auto'`: quedan al final del viewport sin fijarse, respetando el
scroll. Las fichas de área fluyen en fila con `flexWrap`, separadas por `s` (8 px) en ambos
ejes.

La navegación principal es una barra de pestañas inferior con tres destinos etiquetados
(Consulta, Historial, Perfil); la pantalla de análisis existe como ruta sin pestaña.

## Elevation & Depth

**El sistema es plano. No hay ni una sombra en el build.** No existen tokens de sombra ni
elevación, y ningún componente declara `shadow*` o `elevation`. La profundidad se comunica de
dos maneras, ambas tomadas del folleto impreso: el cambio de papel —`superficie` blanco puro
recortado sobre el `papel` cálido del fondo— y la regla fina de 1 px en `linea` que contornea
campos, tarjetas y fichas.

### Named Rules
**La regla del papel recortado.** Un elemento se despega del fondo cambiando de papel y
poniéndose un contorno de 1 px, nunca levantándose con sombra. Si una superficie necesita
más presencia, gana contorno o padding, no altura.

## Shapes

Radios suaves y consistentes, sin esquinas vivas ni cápsulas. La escala es `s` (4 px) para
los elementos de entrada y los avisos —lo que contiene texto y quiere leerse como campo—,
`m` (8 px) para lo que se pulsa o se agrupa: botones, tarjetas y fichas de área. `l` (16 px),
`xl` (24 px) y `round` (9999 px) están definidos en el tema y aún no tienen consumidor.

El contorno es siempre `borderWidth: 1` en `linea`. La ficha de área inactiva y la ficha
activa comparten el mismo borde de 1 px —la activa lo declara transparente— para que al
encenderse no salte de tamaño: el color cambia, la geometría no.

## Components

### Botones (`Boton`)
Bloque sólido y ancho, sin ornamento; se lee como el botón de un formulario de trámite hecho
bien.
- **Forma:** esquinas suaves (8 px, `rounded.m`), padding vertical 16 px y horizontal 24 px,
  contenido centrado.
- **Primario:** fondo verde `accion`, texto `accion-texto` en label bold de 14 px. Es la
  variante por defecto.
- **Secundario:** fondo transparente, contorno de 1 px en `linea`, texto `tinta`.
- **Peligro:** fondo `alerta`, texto blanco. Reservado a acciones destructivas.
- **Estado de carga:** la etiqueta se reemplaza por un `ActivityIndicator` y el botón se
  deshabilita; el bloque no cambia de tamaño. El indicador toma `tinta` en la variante
  secundaria y `accion-texto` en las demás.
- **No hay estado hover declarado:** el sistema usa el atenuado táctil por defecto de
  `TouchableOpacity`, y `activeOpacity: 0.8` en las fichas de área.

### Campos de texto (`CampoTexto`)
Etiqueta arriba, siempre escrita; nunca un campo que dependa solo de su marca de agua.
- **Estructura:** label en 14 px bold `tinta`, separado 4 px (`xs`) del campo; el bloque
  completo deja 16 px (`m`) por debajo.
- **Estilo:** fondo `superficie`, contorno de 1 px en `linea`, radio 4 px (`rounded.s`),
  padding 16 px, texto de cuerpo 17 px en `tinta`.
- **Marca de agua:** en `tinta-suave`, y en la Home lleva un ejemplo real y completo del
  problema del usuario, no una instrucción genérica.
- **Error:** el contorno pasa a `alerta` y aparece debajo un texto de 14 px en `alerta`,
  separado 4 px. El campo no cambia de tamaño.
- **Campo de consulta abierta:** el textarea de la Home es la variante grande —altura fija de
  200 px, `multiline`, `textAlignVertical: 'top'`, radio 8 px— y domina el primer viewport.

### Fichas de área (`FichaArea`) — componente de firma
Etiqueta rectangular chica con el nombre del área escrito. Es el mapa del Derecho Civil
reducido a cuatro piezas.
- **Forma:** radio 8 px, padding 8 px vertical y 16 px horizontal, separación de 8 px entre
  fichas en ambos ejes, contorno de 1 px siempre presente.
- **Activa:** fondo en el color de su área, texto blanco en label bold.
- **Inactiva:** fondo transparente, contorno `linea`, texto `tinta-suave` — tenue pero
  legible, nunca desaparecida.
- **Regla de contenido:** el nombre del área siempre visible y escrito completo ("Derechos
  Reales", no una abreviatura ni un pictograma). Ninguna ficha se identifica solo por color.

### Avisos (`Aviso`)
La nota al margen de la cartilla: bloque de texto chico que aclara o advierte.
- **Info:** fondo `linea`, texto `tinta` en 14 px, radio 4 px, padding 16 px, 16 px de
  separación inferior. Lleva el aviso legal permanente de que el sistema es apoyo y no
  sustituye al abogado.
- **Error:** fondo transparente, contorno de 1 px en `alerta` y texto en `alerta`. La
  advertencia se dibuja con línea, no con relleno rojo: el rojo pleno queda para el botón de
  peligro.

### Numeral de paso (`PasoNumerado`)
El número grande del folleto: Archivo Black a 48 px en ámbar `destacado`, con line-height
igual al tamaño para que el dígito se apoye exacto, y 16 px de separación a su derecha. Es la
pieza que marca una secuencia ordenada de estaciones. Existe en el build y todavía no tiene
uso en ninguna vista.

### Tarjetas
- **Forma:** radio 8 px, fondo `superficie`, contorno de 1 px en `linea`, padding 24 px
  (`l`), 32 px de separación inferior.
- **Sombra:** ninguna, por la regla del papel recortado.
- **Contenido típico:** una etiqueta de 14 px en `tinta-suave`, el valor en cuerpo de 17 px
  en `tinta`, y un dato de área en 14 px bold en `accion`.

### Navegación
Barra de pestañas inferior sobre `superficie`, con borde superior en `linea`. Pestaña activa
en `accion`, inactiva en `tinta-suave`, siempre con su etiqueta de texto. La cabecera usa
fondo `superficie` y título en Archivo Black sobre `tinta`.

## Do's and Don'ts

### Do:
- **Do** consumir todo estilo desde `src/theme/` (`colores`, `tipografia`, `espaciado`,
  `radios`). Si falta un token, se agrega al tema.
- **Do** mostrar siempre las cuatro áreas del Derecho Civil, cada una con su nombre escrito,
  con la activa encendida en su color y las otras tres tenues pero legibles.
- **Do** reservar `alerta` (#C8102E) a errores, riesgos y acciones destructivas.
- **Do** usar Atkinson Hyperlegible Next a 17 px o más para todo texto de lectura corrida, y
  Archivo Black solo para títulos y numerales.
- **Do** separar con papel y con reglas de 1 px en `linea`, y mantener las superficies planas.
- **Do** centrar el contenido en una columna con `xl` (32 px) de padding y tope de ancho
  según el tipo de pantalla.
- **Do** etiquetar toda pestaña, ficha y control con texto.
- **Do** mantener el mismo lenguaje visual en web, iOS y Android, sin adaptaciones por
  sistema operativo.

### Don't:
- **Don't** escribir un hex, un nombre de fuente, un tamaño, un radio o un espaciado literal
  dentro de un `StyleSheet`.
- **Don't** usar el rojo como acento decorativo, énfasis o color de titular.
- **Don't** ocultar áreas del Derecho Civil ni mostrar solo la detectada.
- **Don't** identificar un control únicamente por color o por pictograma: el nombre va
  escrito.
- **Don't** agregar sombras ni elevación; la profundidad se resuelve con papel y contorno.
- **Don't** introducir una tercera familia tipográfica, itálicas decorativas ni versalitas.
- **Don't** dejar que un valor de contenido jurídico aparezca sin su fuente o sin marcarse
  como ilustrativo mientras el corpus no esté cargado.
