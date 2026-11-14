# Documentación técnica: Linux Rescue (Fase II)

**Proyecto:** Linux Rescue, videojuego web educativo para aprender comandos de Linux
**Asignatura:** Sistemas Operativos · Grupo 6 · Universidad Manuel Beltrán
**Integrantes:** Paula Román · Hayder Carreño · David Bonilla

---

## 1. Visión general

Linux Rescue es una aplicación web estática (HTML5 + CSS3 + JavaScript puro) que se ejecuta por completo en el navegador. No hay servidor ni base de datos: el contenido del juego está en una estructura de datos (`js/levels.js`) y el progreso se guarda en `localStorage`.

La solución implementa los cinco componentes definidos en la Fase I:

| Componente (Fase I) | Implementación (Fase II) | Archivo |
|---|---|---|
| Datos del juego | Ciclos, glosario y niveles como arreglo de objetos | `js/levels.js` |
| Validador de comandos | Normalización, comparación y diagnóstico | `js/validator.js` |
| Motor o lógica del juego | Flujo de partida, vidas, pistas, puntaje y medallas | `js/app.js` |
| Interfaz web | Pantallas, terminal simulada, arrastrar y soltar, panel de explicación | `index.html`, `js/app.js` |
| Recursos gráficos | Pixel art en SVG generado por código, monitores y temas en CSS | `js/app.js`, `css/*.css` |
| Sonido | Música y efectos 8 bits sintetizados con Web Audio API | `js/audio.js` |

## 2. Arquitectura

```
┌────────────────────────────────────────────────────────────────────┐
│                        NAVEGADOR (cliente)                         │
│                                                                    │
│  index.html ─── pantallas: inicio · pasillo · nivel · modales      │
│      │                                                             │
│      ├── css/styles.css   tema base + época Bronce (CRT)           │
│      ├── css/eras.css     épocas Plata / Oro + transición          │
│      │                                                             │
│      ├── js/levels.js     DATOS ── CYCLES · GLOSSARY · LEVELS      │
│      │                      ▲                                      │
│      ├── js/validator.js  VALIDADOR (funciones puras, sin DOM)     │
│      │                      ▲                                      │
│      └── js/app.js        MOTOR + GESTOR DE INTERFAZ               │
│                             │                                      │
│                             ▼                                      │
│                       localStorage  (progreso del jugador)         │
└────────────────────────────────────────────────────────────────────┘
```

**Flujo de entrada → procesamiento → salida** (igual al de la ficha técnica):

```
ENTRADA                      PROCESAMIENTO                         SALIDA
Comando arrastrado    ──►  Validator.validate(input, paso)  ──►  Salida simulada en la terminal
o escrito                  · normaliza                           Panel de explicación
                           · comandos peligrosos                 Vidas / puntaje / estrellas
                           · soluciones aceptadas                Avance de nivel, medalla
                           · casi correcto (nearMiss)            Transición de época
                           · diagnóstico genérico
```

**Decisiones de diseño:**

1. **Separación datos / lógica / vista.** `levels.js` no tiene lógica, `validator.js` no toca el DOM y `app.js` orquesta. Así el validador se puede probar con Node.js sin navegador.
2. **Motor dirigido por datos.** Para agregar un nivel basta con un objeto nuevo en `LEVELS`; no hay que modificar el código del motor.
3. **Sin dependencias.** Cumple RNF-02: abre con doble clic en cualquier navegador moderno.
4. **Seguridad (RNF-04).** Ningún texto del jugador se ejecuta con `eval` ni se envía al sistema operativo: el validador solo compara cadenas. Todo lo que se pinta en pantalla pasa por `esc()` o por `textContent`, para evitar inyección de HTML.

## 3. Motor de niveles (`js/levels.js`)

### 3.1 Ciclos (épocas)

```js
CYCLES = {
  bronce: { name, era: 'Monitor viejito (CRT)', mode: 'drag', hints: 2, medal: '🥉' },
  plata:  { name, era: 'Monitor moderno',       mode: 'type', hints: 2, medal: '🥈' },
  oro:    { name, era: 'PC gamer',              mode: 'type', hints: 1, medal: '🥇' }
}
```

El campo `mode` decide la mecánica (`drag` = arrastrar y soltar, `type` = escribir) y `hints` cuántas pistas se permiten por falla. Así la progresión de dificultad queda en los datos.

### 3.2 Estructura de un nivel

```js
{
  id: 6, cycle: 'plata', boss: true, code: 'JEFE',
  title: 'Jefe Plata: el disco del servidor',
  fault: '/dev/sda1 100% en el servidor...',
  steps: [                                   // un jefe tiene 3 pasos consecutivos
    {
      instruction: 'Falla 3: «temporales» es basura acumulada. Bórrala...',
      pieces: [...],                         // solo en modo guiado
      accepted: ['rm -r temporales', 'rm -rf temporales', 'rm -R temporales'],
      alternatives: [{ cmd, note }],         // se muestran en la explicación
      nearMiss: [{ cmd: 'rm temporales', msg: 'rm: ... Es un directorio...', costsLife }],
      hints: ['...', '...'],
      preOutput: ['...'],                    // contexto que imprime la terminal
      output: ['...'],                       // salida simulada al acertar
      explanation: { summary, breakdown: [[token, significado]], tip }
    }
  ]
}
```

### 3.3 Contenido implementado

| # | Ciclo | Código | Falla | Solución de referencia | Concepto de SO |
|---|---|---|---|---|---|
| 1 | Bronce | PC-01 | Archivos perdidos | `cd documentos && ls` | Directorio de trabajo |
| 2 | Bronce | PC-02 | Escritorio desordenado | `mkdir proyectos && cd proyectos` | Directorios e inodos |
| 3 | Bronce | Jefe | Servidor del laboratorio | `pwd` → `cat leeme.txt` → `cd ~ && mkdir respaldo && cd respaldo` | Rutas absolutas, stdout |
| 4 | Plata | PC-03 | ¡Disco lleno! | `df -h` | Particiones, `statfs()` |
| 5 | Plata | PC-04 | Proceso congelado | `ps aux` → `kill 4242` | PID, señales SIGTERM/SIGKILL |
| 6 | Plata | Jefe | Disco del servidor | `df -h` → `du -sh *` → `rm -r temporales` | `df` frente a `du`, borrado recursivo |
| 7 | Oro | PC-05 | Script sin permiso | `chmod +x iniciar.sh` | Permisos rwx y notación octal |
| 8 | Oro | PC-06 | Logs del sistema | `cat sistema.log \| grep ERROR` | Tuberías (IPC) |
| 9 | Oro | Jefe final | El minero oculto | `ps aux \| grep minero` → `kill -9 6666` → `rm minero.sh` | Respuesta ante procesos maliciosos |

### 3.4 Glosario

`GLOSSARY.commands` define 16 comandos (`ls`, `cd`, `pwd`, `mkdir`, `cat`, `rm`, `df`, `du`, `ps`, `kill`, `pkill`, `killall`, `pgrep`, `chmod`, `grep`, `sort`) con su sintaxis, descripción, ejemplo y el significado de cada opción (`flags`) y argumento especial (`args`). `GLOSSARY.operators` explica `&&`, `||`, `|` y `;`. `GLOSSARY.extras` lista comandos reales que no hacen parte de los retos (`sudo`, `top`, `nano`...) para no responder "orden no encontrada" ante comandos que sí existen.

El glosario cumple dos funciones: se muestra al jugador (RF-10) y el validador lo usa para explicar token por token lo que escribió.

## 4. Validador de comandos (`js/validator.js`)

Es un módulo de **funciones puras** (no usa el DOM) que se expone como `window.Validator` en el navegador y como `module.exports` en Node.js.

### 4.1 Normalización

Antes de comparar, tanto la entrada del jugador como las soluciones pasan por `normalize()`:

| Regla | Ejemplo de entrada | Normalizado |
|---|---|---|
| Espacios múltiples y alrededor de operadores | `  cd   documentos&&ls ` | `cd documentos && ls` |
| Comillas (tipográficas o rectas) | `grep "ERROR" sistema.log` | `grep ERROR sistema.log` |
| Banderas cortas combinadas en cualquier orden | `du -hs *`, `rm -fr x` | `du -hs *`, `rm -fr x` (letras ordenadas, iguales a `-sh` / `-rf`) |
| `/` final en carpetas | `cd documentos/` | `cd documentos` |
| `./` inicial en argumentos | `rm ./minero.sh` | `rm minero.sh` |
| `;` final sobrante | `pwd;` | `pwd` |

No se convierten mayúsculas a minúsculas porque Linux distingue entre ellas (`ERROR` ≠ `error`), y eso es parte de lo que se enseña.

### 4.2 Etapas de validación

```
validate(input, paso, GLOSSARY)
  1. vacío                 → { type: 'empty' }          no quita vida
  2. patrón peligroso      → { type: 'danger' }         quita vida + advertencia
  3. ∈ paso.accepted       → { ok: true }
  4. ∈ paso.nearMiss       → { type: 'near' }           mensaje específico del nivel
  5. comando desconocido   → { type: 'notfound' }       "orden no encontrada" + "¿Quisiste decir...?"
  6. mismos comandos       → { type: 'args' }           revisa argumentos u operador
  7. faltan comandos       → { type: 'incomplete' }
  8. orden distinto        → { type: 'order' }
  9. otro comando real     → { type: 'wrong' }          + descripción del glosario
```

- **Comandos peligrosos** (expresiones regulares): `rm` sobre `/` o `/*`, fork bomb `:(){ :|:& };:`, `mkfs`, `dd of=/dev/...` y `chmod 777 /`. Se bloquean con un mensaje que explica el daño que harían en un sistema real.
- **Sugerencias:** la distancia de Levenshtein contra los comandos del glosario propone la corrección (`dff` → `df`, `lss` → `ls`) cuando la distancia es ≤ 2.
- **Casi correctos (`nearMiss`):** cada paso puede definir respuestas típicas de principiante con una retroalimentación precisa. Por ejemplo, `rm temporales` responde *"rm: no se puede borrar «temporales»: Es un directorio. Agrega -r"* y `kill 1` advierte que el PID 1 es `init/systemd`. Por defecto no quitan vida; las riesgosas tienen `costsLife: true`.

### 4.3 Explicación token por token

`explainTokens(cmd, GLOSSARY)` recorre la entrada y clasifica cada token como `cmd`, `flag`, `arg`, `op` o `unknown`, con su significado. Las banderas combinadas se descomponen (`-sh` → `-s: summarize · -h: tamaños legibles`). Esta información alimenta el panel "Lo que hace realmente lo que escribiste" cuando el jugador falla.

### 4.4 Salida

```js
{ ok, type, message, terminal, costsLife, breakdown }
```

`terminal` es la línea que imita la respuesta de bash (`bash: dff: orden no encontrada`), `message` es la explicación pedagógica y `breakdown` es el desglose del comando.

## 5. Motor del juego (`js/app.js`)

### 5.1 Estado

```js
state = {
  player:   { name, character: 'nino' | 'nina' },
  progress: { unlocked, best: {idNivel: puntaje}, stars: {...}, medals: {bronce, plata, oro} },
  era:      'bronce' | 'plata' | 'oro' | null,     // época visual activa
  current:  { index, step, lives, stepScores[], hintsUsed, errors,
              totalHints, totalErrors, drag: {bank[], line[]}, history[], solved }
}
```

`player` y `progress` se guardan en `localStorage` (clave `linuxRescue.save.v1`) con `try/catch`: si el navegador bloquea el almacenamiento, el juego sigue funcionando en memoria.

### 5.2 Flujo de pantallas

```
Inicio ──(nombre + personaje)──► Pasillo ──(clic en PC)──► avatar camina
                                    ▲                            │
                                    │                 ¿cambia la época?
                                    │                   sí ─► transición
                                    │                            ▼
                     modal resultado ◄── completar todos los pasos ◄── Nivel
                     (estrellas / medalla / final)
```

### 5.3 Reglas del juego

| Regla | Valor |
|---|---|
| Vidas por nivel | 3 (compartidas entre las fallas de un jefe) |
| Pistas por falla | 2 en Bronce y Plata, 1 en Oro |
| Puntaje por falla | 100 (150 en jefes) − 25 × pistas − 20 × errores, mínimo 20 |
| Estrellas | 3 sin errores ni pistas · 2 con 1–2 penalizaciones · 1 con más |
| Sin vidas | Se revela la solución con su explicación y se ofrece reintentar el nivel |
| Desbloqueo | Lineal: completar un nivel desbloquea el siguiente |
| Medallas | Se ganan al vencer al jefe de cada ciclo |

### 5.4 Modo guiado: arrastrar y soltar (Ciclo Bronce)

- Las piezas (`step.pieces`) se barajan e incluyen **distractores** (`rm`, `|`, `pwd`...) para que el jugador piense en lugar de usar todo.
- Cada pieza tiene un `id` único, porque una misma palabra puede repetirse (`proyectos` aparece dos veces en PC-02).
- Se usa la **API nativa de Drag & Drop de HTML5** (`dragstart`, `dragover`, `drop`). La posición de inserción se calcula con `getBoundingClientRect()`, así que también se pueden reordenar piezas dentro de la línea.
- Como alternativa accesible y para pantallas táctiles, **un clic** mueve la pieza entre el banco y la línea.
- El comando armado es `line.map(p => p.text).join(' ')` y pasa por el mismo validador que el modo experto.

### 5.5 Modo experto: escritura (Ciclos Plata y Oro)

- Input integrado en la terminal: `Enter` ejecuta y `↑`/`↓` recorren el historial.
- Comandos internos que no cuestan vidas: `help` (repite la misión) y `clear` (limpia la pantalla).

## 6. Gestor de interfaz dinámica

### 6.1 Temas por época

La época activa se indica con un atributo en el `<body>`:

```html
<body data-era="bronce">   <!-- plata | oro -->
```

Toda la apariencia del monitor se define con **variables CSS** (`--term-bg`, `--term-fg`, `--term-font`, `--accent`...) que cada época sobrescribe:

| Época | Monitor | Terminal |
|---|---|---|
| Bronce (`styles.css`) | Carcasa beige con bordes curvos, pantalla abombada, scanlines (`repeating-linear-gradient`), viñeta y parpadeo | Fuente VT323, fósforo verde con `text-shadow` |
| Plata (`eras.css`) | Ventana moderna con barra de título y botones rojo/amarillo/verde, base de aluminio | Fondo morado de Ubuntu, JetBrains Mono |
| Oro (`eras.css`) | Borde RGB animado (`linear-gradient` + `background-position`), resplandor neón | Tema oscuro con acentos rosa y cian |

El HTML del monitor es el mismo en las tres épocas; solo cambia el CSS. Por eso la transición es inmediata y no se duplica código.

### 6.2 Transición entre épocas

`startLevel(i)` compara `state.era` con el ciclo del nivel. Si son distintos ejecuta `playTransition()`:

1. Muestra un overlay negro con animación de encendido de CRT (`clip-path` que se abre desde una línea).
2. El equipo anterior se apaga (escala de grises) y aparece el nuevo con un efecto de escala.
3. Barra de progreso por pasos (`steps(20)`) y mensajes tipo consola ("Retirando el monitor CRT...", "Instalando tarjeta gráfica RGB...").
4. Después de 2,7 s (o al hacer clic) cambia `data-era` y empieza el nivel.

Así la transición ocurre **automáticamente** al subir de ciclo, ya sea desde el botón "¡Mejorar el equipo!" del modal de medalla o desde el pasillo.

### 6.3 Panel de explicación

Tiene cuatro estados, cada uno con su propio color de borde:

| Estado | Cuándo aparece | Contenido |
|---|---|---|
| Inicial (azul) | Al cargar un paso | Cómo jugar el nivel, vidas y pistas disponibles |
| Correcto (verde) | Al acertar | Puntos obtenidos, por qué funciona, desglose del comando, otras formas válidas y concepto de SO |
| Casi o error (amarillo/rojo) | Al fallar | Diagnóstico, qué hace realmente lo que escribiste (token por token) y vidas restantes |
| Sin vidas (rojo) | Al perder las 3 vidas | Diagnóstico + solución completa con su desglose y alternativas |

### 6.4 Pixel art

Los personajes se definen como matrices de caracteres con una paleta de colores y se convierten a `<svg>` con un `<rect>` por píxel (`shape-rendering: crispEdges`). Los íconos de los computadores se dibujan solo con CSS. No hay archivos de imagen, lo que cumple RNF-07 (carga mínima).

## 6.5 Sonido y música 8 bits (`js/audio.js`)

El audio se **sintetiza en tiempo real** con la Web Audio API usando osciladores de onda cuadrada, triangular y diente de sierra, como el chip de sonido de las consolas de los 80. No hay archivos de audio que descargar.

- **Efectos:** clic, recoger pieza, tecleo, pasos del avatar, acierto (arpegio ascendente), error (zumbido descendente), "casi", pista, alarma de comando peligroso, nivel completado, medalla, sin vidas y arranque de hardware en la transición.
- **Música:** secuenciador de 32 pasos con melodía y bajo, y una canción por pantalla: menú, Bronce (misteriosa, en La menor), Plata (tranquila) y Oro (rápida, 148 bpm, con percusión). Las notas se programan por adelantado con `AudioContext.currentTime` para que no haya desfases.
- **Controles:** botones 🔊 (efectos) y 🎵 (música) fijos en la esquina; la preferencia se guarda en `localStorage`.
- Los navegadores bloquean el sonido hasta que el usuario interactúa, así que el audio arranca con el primer clic o tecla. Si el navegador no soporta Web Audio, el juego sigue funcionando en silencio.

## 7. Relación con Sistemas Operativos

| Concepto | Dónde se practica |
|---|---|
| Interfaz de línea de comandos (shell) | Todo el juego: terminal simulada, prompt, historial |
| Sistema de archivos y rutas | PC-01, PC-02, Jefe Bronce (`cd`, `ls`, `mkdir`, `pwd`, `~`) |
| Entrada y salida estándar | `cat`, explicación de stdin/stdout/stderr |
| Gestión de almacenamiento | PC-03 y Jefe Plata (`df -h`, `du -sh`) |
| Procesos, PID y señales | PC-04 y Jefe final (`ps aux`, `kill`, SIGTERM vs SIGKILL, PID 1) |
| Permisos | PC-05 (`chmod`, rwx, notación octal 755) |
| Comunicación entre procesos (IPC) | PC-06 y Jefe final (tuberías `\|`) |
| Seguridad | Bloqueo de `rm -rf /`, advertencias sobre `chmod 777` y `sudo` innecesario |

## 8. Cómo agregar un nivel nuevo

1. Abrir `js/levels.js` y agregar un objeto al arreglo `LEVELS` con la estructura de la sección 3.2.
2. Si usa un comando nuevo, agregarlo a `GLOSSARY.commands`.
3. Ejecutar `node tests/validator.test.js`: las pruebas comprueban automáticamente que todas las soluciones validen y que en modo guiado la solución se pueda armar con las piezas.

## 9. Limitaciones conocidas

- La terminal no tiene un sistema de archivos virtual completo: las salidas son simuladas por paso.
- El progreso se guarda por navegador (`localStorage`); la persistencia en SQLite propuesta en la Fase I requiere un servidor y queda como trabajo futuro.
- Las fuentes pixel se cargan desde Google Fonts. Sin internet se usan fuentes monoespaciadas del sistema y el juego sigue funcionando.
