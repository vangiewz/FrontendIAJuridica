# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

La app se construye con React Native + Expo y corre en web, iOS y Android desde una sola
base de código, pero con **un lenguaje de diseño propio y consistente**, no adaptado por
sistema operativo (decisión confirmada por el usuario). Por eso no rige la guía nativa de
iOS ni la de Android. Sí rigen las restricciones físicas del móvil: áreas seguras, objetivos
táctiles y teclado en pantalla.

## Stack

FastAPI (Python 3.12) + PostgreSQL gestionado en Neon con pgvector · Expo + React Native +
react-native-web + TypeScript. Definido por el usuario, no delegado.

## Users

**Primario: ciudadano y estudiante de derecho.** Alguien con un problema civil concreto
—compró un terreno y no le transfieren, heredó y no sabe qué le corresponde, firmó un
contrato que no entiende— que no maneja vocabulario jurídico y no sabe en qué artículo
buscar. Llega con la pregunta en sus palabras, no con una cita legal.

**Secundario: abogado y usuario profesional.** Usa el análisis de contratos y la detección
de riesgos para acelerar una revisión que hoy hace a mano.

**Terciario: administrador jurídico.** Mantiene el corpus normativo que alimenta a la IA.

## Product Purpose

Permitir consultar, comprender y analizar Derecho Civil boliviano en lenguaje natural,
reduciendo el tiempo que hoy toma buscar e interpretar información jurídica. Éxito es que
alguien sin formación legal entienda su situación y sepa qué norma la regula, con las
fuentes a la vista.

## Positioning

Un buscador legal devuelve artículos; un chatbot genérico devuelve texto plausible sin
respaldo. Este sistema interpreta el caso planteado, lo clasifica dentro del Derecho Civil
boliviano y responde **citando la normativa concreta que usó**, sobre un corpus curado del
Código Civil y el Código Procesal Civil. La trazabilidad no es una función más: es la
condición para que la respuesta sirva.

## Operating Context

El usuario llega con una situación ya ocurrida y algo de ansiedad: un conflicto, una
herencia, un contrato firmado. Muchas veces desde el teléfono, de día, buscando entender
antes de decidir si necesita un abogado. El profesional, en cambio, trabaja en escritorio
con documentos cargados y sesiones más largas.

Documentos que entran al sistema: contratos de compraventa, arrendamiento, préstamo,
acuerdos civiles y documentos de obligaciones.

## Capabilities and Constraints

**Áreas del Derecho Civil cubiertas** (cerradas, del documento de alcance):
contratos · obligaciones y responsabilidad civil · derechos reales y bienes · sucesiones.

**Capacidades** (HU-01 a HU-19): consulta en lenguaje natural, interpretación del contexto,
clasificación automática del problema, respuesta fundamentada con fuentes, búsqueda
semántica, carga y clasificación de documentos, extracción de información, análisis de
contratos, detección de riesgos, comparación de documentos, explicación simplificada de
normas, generación y personalización de documentos, gestión del conocimiento jurídico e
historial de consultas.

**Fuera de alcance, explícito en el documento y no negociable:**
- Jurisprudencia avanzada.
- Procesos judiciales: expedientes, seguimiento, demandas, administración de juzgados.
- **Sustituir al abogado.** El sistema no emite decisiones jurídicas definitivas ni
  sentencias. Es apoyo para consulta, análisis y comprensión.

**Restricción de producto derivada:** ninguna respuesta jurídica se emite sin sus fuentes
(HU-05). Una respuesta sin referencias es un defecto, no una degradación aceptable.

## Evidence on Hand

- `Alcance_Legal_AI.pdf` — alcance funcional, áreas cubiertas y límites.
- `HUs Propuesta.pdf` — HU-01 a HU-19 con criterios de aceptación.

**Estado del corpus (actualizado):** el **Código Civil (DL 12760) ya está cargado**: 1570
artículos, cada uno con su ubicación en el código, su área jurídica, su fuente y su estado de
vigencia. Las citas en pantalla son reales. El **Código Procesal Civil (Ley 439) todavía no
está cargado**.

**Advertencia que sí sigue vigente:** el texto cargado es el texto base del DL 12760, **sin
consolidar** las modificaciones posteriores (Ley 018/2010, Ley 439/2013, Ley 603/2014,
Ley 1071/2018). Por eso cada artículo lleva `estado_vigencia = sin_verificar` y la interfaz
debe mostrarlo tal cual, sin disfrazarlo y sin tratarlo como un error.

**Ausencias que el trabajo futuro no debe inventar:** no hay usuarios reales, ni métricas de
uso, ni casos documentados. El sistema **todavía no redacta respuestas**: devuelve los
artículos aplicables y lo dice.

## Product Principles

1. **La fuente viaja con la respuesta.** Si no se puede citar, no se afirma.
2. **El lenguaje del usuario, no el del código civil.** La respuesta traduce; el artículo
   queda disponible para quien quiera verificar.
3. **Apoyo, nunca veredicto.** El sistema ayuda a entender y a preparar; no decide ni
   reemplaza el criterio profesional.
4. **La incertidumbre se muestra.** Es preferible decir que no hay información suficiente a
   completar con texto plausible.
5. **Una sola experiencia.** Lo que funciona en el teléfono funciona en el escritorio.

## Accessibility & Inclusion

El usuario primario incluye personas sin formación jurídica y el contenido legal ya es
difícil de por sí: la interfaz no debe agregar dificultad. Contraste AA como mínimo,
objetivos táctiles cómodos, y tipografía legible a tamaños de lectura larga. Español
boliviano en toda la interfaz.
