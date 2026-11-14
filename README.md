# 🖥️ Linux Rescue — El juego de reparar computadores con comandos

> Videojuego web educativo en 2D (pixel art) para aprender comandos de la terminal de Linux resolviendo fallas simuladas de computadores.

**Universidad Manuel Beltrán · Sistemas Operativos · Grupo 6**

**Integrantes:** Paula Román · Hayder Carreño · David Bonilla

**Estado:** Fase II, prototipo jugable completo (9 retos en 3 ciclos).
**Modalidad de entrega:** Opción A, repositorio GitHub.

### 🎮 [Jugar en línea](https://p-roman0373.github.io/LinuxRescue_SistemasOperativos_G6/) · 📂 [Repositorio](https://github.com/p-roman0373/LinuxRescue_SistemasOperativos_G6)

---

## 📌 Descripción

Para muchos estudiantes la terminal de Linux resulta intimidante: los comandos se memorizan sin contexto y practicar en un equipo real da miedo de equivocarse y dañarlo. **Linux Rescue** convierte ese aprendizaje en una aventura. El jugador es un técnico que recorre un pasillo de computadores averiados (disco lleno, proceso trabado, archivos perdidos, permisos, malware...) y repara cada uno con comandos reales de Linux dentro de una **terminal simulada y segura**.

La dificultad y la interfaz **evolucionan por épocas**:

| Ciclo | Época visual | Mecánica | Comandos |
|---|---|---|---|
| 🥉 **Bronce** (PC-01, PC-02, Jefe) | Monitor CRT antiguo, fósforo verde y líneas de barrido | **Modo guiado:** arrastrar y soltar bloques para armar el comando | `cd`, `ls`, `mkdir`, `pwd`, `cat`, `&&` |
| 🥈 **Plata** (PC-03, PC-04, Jefe) | Terminal moderna estilo Ubuntu/macOS | **Modo experto:** escribir el comando completo | `df -h`, `du -sh`, `ps aux`, `kill`, `rm -r` |
| 🥇 **Oro** (PC-05, PC-06, Jefe final) | PC gamer con bordes RGB | **Modo experto con menos ayudas** (1 pista) | `chmod`, `grep`, tuberías `\|`, `kill -9` |

Después de cada intento, correcto o incorrecto, el **panel de explicación** muestra por qué esa es la solución y desglosa el comando, sus opciones y sus argumentos.

## ✨ Funcionalidades implementadas (Fase II)

- [x] Pantalla de inicio con nombre del jugador y selección de personaje (técnico o técnica en pixel art)
- [x] Pasillo de computadores con avatar que camina hasta el equipo elegido y niveles que se desbloquean en orden
- [x] **3 niveles básicos** (CRT + arrastrar y soltar) y **6 retos avanzados** (terminal moderna/gamer + escritura)
- [x] **Jefe por ciclo:** reto integrador con 3 fallas consecutivas
- [x] **Transición visual automática** entre épocas (CRT → moderno → gamer) con animación de "actualización de hardware"
- [x] **Validador de comandos** con varias soluciones válidas, normalización (espacios, comillas, orden de banderas) y diagnóstico del error
- [x] Detección de **comandos peligrosos** (`rm -rf /`, fork bomb, `mkfs`...) con advertencia educativa
- [x] **Panel de explicación** tras cada respuesta: por qué funciona, desglose token por token, formas alternativas y concepto de Sistemas Operativos
- [x] 3 vidas por nivel, pistas limitadas (2 en Bronce/Plata, 1 en Oro), puntaje y estrellas
- [x] Medallas de Bronce, Plata y Oro por ciclo completado
- [x] Glosario de 16 comandos y 4 operadores, que marca los ya aprendidos
- [x] Progreso guardado en el navegador (`localStorage`) con opción de continuar
- [x] **Sonido y música 8 bits** generados con código: música distinta para el menú y cada época, efectos al acertar, fallar, usar pistas, arrastrar piezas o ganar medallas, y botones para silenciar
- [x] Pruebas automáticas: 149 del validador y 31 de extremo a extremo en navegador

## 🛠️ Tecnologías

| Tecnología | Uso |
|---|---|
| **HTML5** | Estructura de pantallas (inicio, pasillo, nivel, modales) y API nativa de *Drag & Drop* |
| **CSS3** | Pixel art, monitor CRT (scanlines, viñeta, parpadeo), temas por época con variables CSS y animaciones |
| **JavaScript (Vanilla, ES6)** | Motor del juego, validador de comandos y gestor de interfaz, sin frameworks |
| **JSON / arreglo de objetos** | Definición de niveles, soluciones, pistas y explicaciones (`js/levels.js`) |
| **Web Audio API** | Música y efectos de sonido 8 bits sintetizados en tiempo real, sin archivos de audio |
| **localStorage** | Persistencia del progreso del jugador |
| **Node.js** *(solo pruebas)* | Pruebas unitarias del validador |
| **Playwright + Chromium** *(solo pruebas)* | Prueba de extremo a extremo y capturas de evidencia |
| **Git y GitHub** | Control de versiones |
| **Visual Studio Code** | Editor de código |

No necesita instalar dependencias, compilar ni tener servidor: **corre directamente en el navegador**.

## 📁 Estructura del repositorio

```
linux-rescue/
├── index.html                 # Punto de entrada: todas las pantallas del juego
├── css/
│   ├── styles.css             # Estilos base, pixel art y época Bronce (CRT + drag & drop)
│   └── eras.css               # Épocas Plata y Oro + animación de transición
├── js/
│   ├── levels.js              # Datos: ciclos, glosario y los 9 niveles (motor basado en datos)
│   ├── validator.js           # Validador de comandos (normaliza, compara y diagnostica)
│   ├── audio.js               # Música y efectos 8 bits (Web Audio API)
│   └── app.js                 # Motor del juego y gestor de interfaz dinámica
├── tests/
│   ├── validator.test.js      # 149 pruebas automáticas del validador (Node.js)
│   └── e2e_playwright.py      # 31 pruebas en navegador real + capturas
├── docs/
│   ├── DOCUMENTACION_TECNICA.md
│   ├── PRUEBAS_FUNCIONAMIENTO.md
│   └── GUIA_GIT.md
├── evidencias/                # Capturas de pantalla del funcionamiento
├── .gitignore
└── README.md
```

## ⚙️ Configuración del entorno de trabajo

| Elemento | Versión / detalle usado |
|---|---|
| Sistema operativo | Windows 10/11 o cualquier distribución Linux (probado también en Ubuntu) |
| Navegador | Google Chrome, Microsoft Edge o Firefox actualizados |
| Editor | Visual Studio Code + extensión **Live Server** (opcional) |
| Control de versiones | Git 2.x y una cuenta de GitHub |
| Para las pruebas (opcional) | Node.js 18+ y Python 3.10+ con Playwright |

Pasos para preparar el entorno:

```bash
# 1. Clonar el repositorio
git clone https://github.com/p-roman0373/LinuxRescue_SistemasOperativos_G6.git
cd LinuxRescue_SistemasOperativos_G6

# 2. (Opcional) Abrir en VS Code
code .
```

## ▶️ Instrucciones de ejecución

**Opción 1, la más simple:** doble clic en `index.html`. Se abre en el navegador y ya se puede jugar.

**Opción 2, Live Server (VS Code):** clic derecho sobre `index.html` → *Open with Live Server*.

**Opción 3, servidor local desde la terminal:**

```bash
python3 -m http.server 8000      # en Windows: python -m http.server 8000
# abrir http://localhost:8000
```

**Opción 4, en línea con GitHub Pages:** en el repositorio ir a *Settings → Pages → Branch: `main` / root → Save*. El juego está publicado en **https://p-roman0373.github.io/LinuxRescue_SistemasOperativos_G6/**

### Cómo jugar

1. Escribe el nombre de tu técnico, elige personaje y pulsa **Nueva partida**.
2. En el pasillo, haz clic en el computador averiado desbloqueado.
3. Lee la **falla** y la **misión**.
   - **Bronce:** arrastra las piezas (o haz clic en ellas) hasta la línea de comandos en el orden correcto y pulsa **▶ Ejecutar**. Sobran piezas a propósito.
   - **Plata y Oro:** escribe el comando en la terminal y presiona **Enter**. `↑` repite el último comando, `help` muestra la misión y `clear` limpia la pantalla.
4. Lee el **panel de explicación** después de cada intento.
5. Vence a los tres jefes para conseguir las medallas 🥉 🥈 🥇.

**Puntaje:** 100 pts por reto (150 en jefes), −25 por cada pista y −20 por cada error (mínimo 20). Las estrellas dependen de errores y pistas usados.

### Ejecutar las pruebas (opcional)

```bash
node tests/validator.test.js                 # pruebas del validador
pip install playwright && playwright install chromium
python tests/e2e_playwright.py               # juega el juego completo y genera capturas en evidencias/
```

## 📸 Evidencias del funcionamiento

> Las capturas se generaron automáticamente con la prueba de extremo a extremo (`tests/e2e_playwright.py`). Debajo hay espacios para agregar capturas propias del equipo.

### Inicio y pasillo
| Inicio y selección de personaje | Pasillo de computadores |
|---|---|
| ![Inicio](evidencias/01_inicio_seleccion_personaje.png) | ![Pasillo](evidencias/02_pasillo_computadores.png) |

### Ciclo Bronce: monitor CRT y arrastrar y soltar
| Armando el comando con piezas | Error con explicación | Acierto con desglose |
|---|---|---|
| ![Drag](evidencias/04_bronce_arrastrar_piezas.png) | ![Error](evidencias/05_bronce_error_explicacion.png) | ![Acierto](evidencias/06_bronce_acierto_explicacion.png) |

### Transiciones entre épocas
| Arranque CRT | CRT → moderno | Moderno → gamer |
|---|---|---|
| ![T1](evidencias/03_transicion_arranque_crt.png) | ![T2](evidencias/09_transicion_crt_a_moderno.png) | ![T3](evidencias/13_transicion_moderno_a_gamer.png) |

### Ciclo Plata: terminal moderna
| Orden no encontrada + sugerencia | `df -h` correcto | Jefe Plata (`rm -r`) |
|---|---|---|
| ![P1](evidencias/10_plata_error_orden_no_encontrada.png) | ![P2](evidencias/11_plata_acierto_df.png) | ![P3](evidencias/12_jefe_plata_rm_r.png) |

### Ciclo Oro: PC gamer
| Comando peligroso bloqueado | `chmod +x` | Tubería con `grep` |
|---|---|---|
| ![O1](evidencias/14_oro_comando_peligroso.png) | ![O2](evidencias/15_oro_acierto_chmod.png) | ![O3](evidencias/16_oro_tuberia_grep.png) |

### Final, glosario y progreso
| Juego completado | Glosario | Sin vidas: se revela la solución |
|---|---|---|
| ![F1](evidencias/17_final_juego_completado.png) | ![F2](evidencias/18_glosario.png) | ![F3](evidencias/20_sin_vidas_solucion.png) |

### Capturas del equipo
<!-- Reemplazar con capturas propias: por ejemplo, el juego abierto en el PC de cada integrante, VS Code con el proyecto, GitHub Pages funcionando o el historial de commits -->
| Evidencia | Captura |
|---|---|
| Proyecto abierto en VS Code | `![VS Code](evidencias/equipo_vscode.png)` |
| Juego publicado en GitHub Pages | `![Pages](evidencias/equipo_github_pages.png)` |
| Historial de commits | `![Commits](evidencias/equipo_commits.png)` |

## 📚 Documentación

- [Documentación técnica](docs/DOCUMENTACION_TECNICA.md): arquitectura, motor de niveles, validador y gestor de interfaz
- [Pruebas de funcionamiento](docs/PRUEBAS_FUNCIONAMIENTO.md): casos de prueba y resultados
- [Guía de Git](docs/GUIA_GIT.md): comandos usados para versionar el proyecto

## 🔄 Avance respecto a la Fase I

| Planeado en la Fase I | Estado en la Fase II |
|---|---|
| Inicio, nombre y selección de personaje (RF-01, RF-02) | ✅ Implementado |
| Niveles con fallas simuladas (RF-03) | ✅ 9 retos en 3 ciclos |
| Ingresar o seleccionar comandos según el modo (RF-04) | ✅ Arrastrar y soltar (Bronce) y escritura (Plata/Oro) |
| Validación de comandos (RF-05) | ✅ Validador con alternativas y diagnóstico |
| Mensajes de acierto, error y orientación (RF-06) | ✅ Panel de explicación detallada |
| Vidas y pistas (RF-07) | ✅ 3 vidas, 2 o 1 pistas según el ciclo |
| Puntaje (RF-08) | ✅ Puntaje, estrellas y total |
| Progreso (RF-09) | ✅ `localStorage` (SQLite queda para una fase futura con servidor) |
| Glosario (RF-10) | ✅ 16 comandos y 4 operadores |
| Jefes por ciclo (RF-11) | ✅ 3 jefes con 3 fallas consecutivas cada uno |
| No ejecutar comandos reales (RNF-04) | ✅ El validador solo analiza texto |

## 🚀 Mejoras futuras

- Más ciclos y niveles (redes con `ping`/`ip`, usuarios con `sudo`/`chown`, editores).
- Sistema de archivos virtual completo, para que `ls` y `cd` respondan de forma dinámica.
- Ranking de jugadores y persistencia en SQLite mediante un pequeño servidor.
- Sonidos retro y modo de alto contraste.

---

*Linux Rescue · Ficha técnica · Sistemas Operativos · Universidad Manuel Beltrán*
