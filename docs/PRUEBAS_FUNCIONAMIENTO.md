# Pruebas de funcionamiento: Linux Rescue (Fase II)

**Proyecto:** Linux Rescue · Sistemas Operativos · Grupo 6 · Universidad Manuel Beltrán
**Integrantes:** Paula Román · Hayder Carreño · David Bonilla

## 1. Entorno de pruebas

| Elemento | Detalle |
|---|---|
| Sistema operativo | Linux (Ubuntu). *El equipo debe repetir la prueba en Windows y anotar el resultado.* |
| Navegador | Google Chrome / Chromium (motor Blink), resolución 1440 × 950 |
| Pruebas unitarias | Node.js v22 → `node tests/validator.test.js` |
| Pruebas de extremo a extremo | Python 3 + Playwright → `python tests/e2e_playwright.py` |
| Verificaciones adicionales | Juego abierto como archivo local (`file://`) y con servidor local (`python -m http.server`) |

## 2. Resumen de resultados

| Tipo de prueba | Casos | Aprobados | Fallidos |
|---|---|---|---|
| Unitarias del validador y de los datos (automáticas) | 149 | 149 | 0 |
| Extremo a extremo en navegador real (automáticas) | 31 | 31 | 0 |
| Verificaciones adicionales (sección 7) | 12 | 12 | 0 |
| **Total** | **192** | **192** | **0** |

Las pruebas automáticas se pueden repetir en cualquier momento con los comandos de la sección 1. La prueba de extremo a extremo juega el juego completo y vuelve a generar las capturas de la carpeta `evidencias/`.

---

## 3. Mecánicas retro: Ciclo Bronce (CRT + arrastrar y soltar)

| ID | Caso probado | Entrada / acción realizada | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| UI-05 | Animación de arranque al entrar al primer ciclo | Clic en PC-01 desde el pasillo | El avatar camina y aparece el overlay "ARRANCANDO SISTEMA" | Overlay visible con barra de carga y mensajes de consola ([captura](../evidencias/03_transicion_arranque_crt.png)) | ✅ Aprobado |
| UI-06 | Se aplica la estética CRT | Esperar el fin de la transición | `body[data-era="bronce"]`, monitor beige con scanlines y fósforo verde | Época Bronce aplicada | ✅ Aprobado |
| UI-07 | Modo guiado activo | Entrar a PC-01 | Zona de arrastre visible, input de texto oculto | Solo se ven la línea de comandos y el banco de piezas | ✅ Aprobado |
| UI-08 | Arrastrar y soltar con el mouse | Arrastrar `cd` y `documentos` a la línea de comandos | Las piezas pasan a la línea y la vista previa muestra `cd documentos` | Vista previa = `cd documentos` | ✅ Aprobado |
| UI-09 | Devolver una pieza con clic | Clic en `documentos` dentro de la línea | La pieza vuelve al banco | Vista previa = `cd` | ✅ Aprobado |
| UI-10 | Comando incorrecto armado con piezas | Armar `mkdir documentos` y Ejecutar | Pierde 1 vida y el panel rojo explica qué hace `mkdir` | 1 corazón gris y panel de error con desglose ([captura](../evidencias/05_bronce_error_explicacion.png)) | ✅ Aprobado |
| UI-11 | Uso de pista | Clic en 💡 Pista | La pista se imprime en la terminal y el contador baja de 2 a 1 | "Pista 1: Para moverte a otra carpeta se usa «cd»" y el contador queda en 1 | ✅ Aprobado |
| UI-12 | Comando correcto armado con piezas | Armar `cd documentos && ls` y Ejecutar | Salida simulada + panel verde con desglose de 4 tokens | Panel de acierto con tabla de 4 filas ([captura](../evidencias/06_bronce_acierto_explicacion.png)) | ✅ Aprobado |
| UI-13 | Fin de nivel | Clic en Continuar | Modal "PC-01 reparado" con estrellas y puntaje | Modal mostrado (2 estrellas por 1 error y 1 pista) | ✅ Aprobado |
| UI-14 | Jefe con fallas consecutivas | Entrar al Jefe Bronce | Indicador "Falla 1 de 3" | Indicador visible y avanza a 2 de 3 y 3 de 3 | ✅ Aprobado |
| UI-15 | Medalla de ciclo | Resolver las 3 fallas del jefe | Modal "¡CICLO BRONCE COMPLETADO!" con medalla 🥉 | Medalla mostrada ([captura](../evidencias/08_medalla_bronce.png)) | ✅ Aprobado |
| D-P | Las soluciones se pueden armar con las piezas | Prueba automática en los 5 pasos de Bronce | Cada token de la solución existe en `pieces` | 5/5 pasos armables | ✅ Aprobado |

## 4. Mecánicas modernas: Ciclos Plata y Oro (escritura)

| ID | Caso probado | Entrada / acción realizada | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| UI-16 | Transición automática al subir de ciclo | Clic en "¡Mejorar el equipo!" tras la medalla Bronce | Overlay "¡ACTUALIZACIÓN DE HARDWARE!" CRT → moderno | Overlay con ambos monitores y barra azul ([captura](../evidencias/09_transicion_crt_a_moderno.png)) | ✅ Aprobado |
| UI-17 | Estética moderna | Fin de la transición | `data-era="plata"`, ventana con botones rojo/amarillo/verde, fondo estilo Ubuntu | Época Plata aplicada | ✅ Aprobado |
| UI-18 | Se desactiva el arrastre | Entrar a PC-03 | Input de texto visible, zona de arrastre oculta | Correcto | ✅ Aprobado |
| UI-19 | Comando inexistente | Escribir `dff -h` + Enter | `bash: dff: orden no encontrada` y "¿Quisiste decir «df»?" | Mensaje y sugerencia mostrados ([captura](../evidencias/10_plata_error_orden_no_encontrada.png)) | ✅ Aprobado |
| UI-20 | Historial de comandos | Tecla ↑ | El input recupera `dff -h` | Correcto | ✅ Aprobado |
| — | Comando correcto escrito | `df -h` + Enter | Tabla de particiones simulada + explicación de `df` y `-h` | Correcto ([captura](../evidencias/11_plata_acierto_df.png)) | ✅ Aprobado |
| — | Proceso en dos pasos | `ps aux`, luego `kill 4242` | Se identifica el PID y se termina el proceso | Correcto | ✅ Aprobado |
| — | Jefe Plata | `df -h` → `du -sh *` → `rm -r temporales` | 3 fallas resueltas y medalla 🥈 | Correcto ([captura](../evidencias/12_jefe_plata_rm_r.png)) | ✅ Aprobado |
| UI-21 | Estética gamer | Pasar al Ciclo Oro | `data-era="oro"`, borde RGB animado | Época Oro aplicada ([captura](../evidencias/13_transicion_moderno_a_gamer.png)) | ✅ Aprobado |
| UI-22 | Menos ayudas en Oro | Entrar a PC-05 | Solo 1 pista por falla | Contador = 1 | ✅ Aprobado |
| UI-23 | Comando peligroso | Escribir `rm -rf /` | Bloqueado con advertencia educativa y −1 vida | "⛔ COMANDO BLOQUEADO POR LINUX RESCUE" ([captura](../evidencias/14_oro_comando_peligroso.png)) | ✅ Aprobado |
| — | Permisos | `chmod +x iniciar.sh` | Permisos pasan de `-rw-r--r--` a `-rwxr-xr-x` | Correcto ([captura](../evidencias/15_oro_acierto_chmod.png)) | ✅ Aprobado |
| — | Tubería | `cat sistema.log \| grep ERROR` | Solo las 3 líneas con ERROR | Correcto ([captura](../evidencias/16_oro_tuberia_grep.png)) | ✅ Aprobado |
| UI-24 | Fin del juego | Vencer al Jefe final | Pantalla final con las 3 medallas y puntaje total | Correcto ([captura](../evidencias/17_final_juego_completado.png)) | ✅ Aprobado |

## 5. Validaciones del validador de comandos

| ID | Caso probado | Entrada | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| A-* | Todas las soluciones aceptadas validan | 71 soluciones de los 9 niveles | `ok: true` en todas | 71/71 correctas | ✅ Aprobado |
| N-* | Respuestas casi correctas dan mensaje específico | 35 `nearMiss` definidos | `type: 'near'` (o `danger`) | 35/35 correctas | ✅ Aprobado |
| V-01 | Espacios irregulares | `  cd   documentos&&ls ` | Aceptado | Aceptado | ✅ Aprobado |
| V-02 | Barra final en carpeta | `cd documentos/ && ls` | Aceptado | Aceptado | ✅ Aprobado |
| V-03 | Banderas en otro orden | `du -hs *` | Igual que `du -sh *` | Aceptado | ✅ Aprobado |
| V-04 | Banderas en otro orden | `rm -fr temporales` | Igual que `rm -rf temporales` | Aceptado | ✅ Aprobado |
| V-05 | Comillas en el patrón | `grep "ERROR" sistema.log` | Aceptado | Aceptado | ✅ Aprobado |
| V-06 | Prefijo `./` | `rm ./minero.sh` | Aceptado | Aceptado | ✅ Aprobado |
| E-01 | Comando mal escrito | `lss documentos && ls` | `notfound` + sugerencia `ls` | "«lss» no es un comando de Linux. ¿Quisiste decir «ls»?" | ✅ Aprobado |
| E-02 | Borrado de la raíz | `rm -rf /` | `danger`, quita vida | Bloqueado | ✅ Aprobado |
| E-03 | Fork bomb | `:(){ :\|:& };:` | `danger` | Bloqueado | ✅ Aprobado |
| E-04 | Opción equivocada | `df -k` | `args`: "comandos correctos, revisa opciones" | Correcto | ✅ Aprobado |
| E-05 | Patrón equivocado | `cat sistema.log \| grep WARNING` | `args` | Correcto | ✅ Aprobado |
| E-06 | Comando real que no resuelve | `mkdir documentos` | `wrong` + descripción de `mkdir` | Correcto | ✅ Aprobado |
| E-07 | Entrada vacía | (vacío) | Aviso, sin perder vida | Correcto | ✅ Aprobado |
| E-08 | Casi correcto | `ls documentos` | "¡Casi! ... pide ENTRAR primero con cd", sin perder vida | Correcto | ✅ Aprobado |
| E-09 | Acción riesgosa | `kill 1` | Advertencia sobre init/systemd, quita vida | Correcto | ✅ Aprobado |
| E-10 | Comando incompleto | `cd documentos` en PC-02 | Rechazado | Rechazado | ✅ Aprobado |
| X-01 | Explicación token por token | `du -sh * \| sort -h` | 6 tokens: comando, banderas, comodín, tubería... | 6 tokens bien clasificados | ✅ Aprobado |
| D-01…05 | Estructura de datos | — | 9 niveles, 3 por ciclo, 1 jefe por ciclo, modos correctos | Correcto | ✅ Aprobado |

## 6. Progreso, vidas y persistencia

| ID | Caso probado | Entrada / acción realizada | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| UI-01 | Carga inicial | Abrir `index.html` | Pantalla de inicio | Correcto ([captura](../evidencias/01_inicio_seleccion_personaje.png)) | ✅ Aprobado |
| UI-02 | Nombre obligatorio | "Nueva partida" sin nombre | Aviso "Escribe el nombre de tu técnico" | Correcto | ✅ Aprobado |
| UI-03 | Pasillo | Iniciar partida | 9 computadores agrupados en 3 ciclos | Correcto ([captura](../evidencias/02_pasillo_computadores.png)) | ✅ Aprobado |
| UI-04 | Desbloqueo progresivo | Partida nueva | Solo PC-01 disponible | 1 de 9 habilitado | ✅ Aprobado |
| UI-25 | Glosario | Abrir glosario al final | Comandos aprendidos marcados en verde | 16 de 16 marcados ([captura](../evidencias/18_glosario.png)) | ✅ Aprobado |
| UI-26 | Pasillo completo | Volver al pasillo | 9 equipos reparados con estrellas | Correcto ([captura](../evidencias/19_pasillo_completado.png)) | ✅ Aprobado |
| UI-27 | Guardado | Recargar la página | Progreso conservado y botón "Continuar" visible | `unlocked = 9`, botón visible | ✅ Aprobado |
| UI-28 | Sin vidas | 3 comandos incorrectos en PC-04 | "Sin vidas": se muestra la solución con su explicación y botón Reintentar | Correcto ([captura](../evidencias/20_sin_vidas_solucion.png)) | ✅ Aprobado |
| UI-29 | Reintentar | Clic en Reintentar nivel | Vuelven las 3 vidas | Correcto | ✅ Aprobado |
| UI-31 | Sonido | Abrir el juego y alternar el botón 🎵 | Efectos y música activos; el botón apaga y vuelve a encender la música | Correcto | ✅ Aprobado |
| UI-30 | Estabilidad | Partida completa | Ningún error de JavaScript en la consola | 0 errores | ✅ Aprobado |

## 7. Verificaciones adicionales

Estos casos se comprobaron en el navegador con un script de Playwright. M-01 y M-02 conviene repetirlos en el computador de cada integrante (Windows, Live Server) y agregar una captura en `evidencias/`.

| ID | Caso probado | Entrada / acción realizada | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| M-01 | Ejecución sin servidor | Doble clic en `index.html` | El juego carga y funciona | Funciona | ✅ Aprobado |
| M-02 | Servidor local | `python -m http.server` o *Open with Live Server* en VS Code | El juego carga desde `http://localhost` | Funciona | ✅ Aprobado |
| M-03 | Reordenar piezas | Arrastrar una pieza de la línea a otra posición | Se inserta donde se suelta | Funciona | ✅ Aprobado |
| M-04 | Devolver pieza arrastrando | Arrastrar de la línea al banco | La pieza vuelve al banco | Funciona | ✅ Aprobado |
| M-05 | Botón Limpiar | Clic en ⟲ Limpiar | Todas las piezas vuelven al banco | Funciona | ✅ Aprobado |
| M-06 | Comando `help` | Escribir `help` en Plata | Repite la misión sin perder vida | Funciona | ✅ Aprobado |
| M-07 | Comando `clear` | Escribir `clear` | Limpia la terminal sin perder vida | Funciona | ✅ Aprobado |
| M-08 | Saltar transición | Clic durante la animación | Pasa directo al nivel | Funciona | ✅ Aprobado |
| M-09 | Nueva partida con progreso | "Nueva partida" con datos guardados | Pide confirmación antes de borrar | Funciona | ✅ Aprobado |
| M-10 | Diseño adaptable | Ventana < 960 px | El panel de explicación pasa debajo del monitor | Funciona | ✅ Aprobado |
| M-11 | Inyección de HTML | Escribir `<b>hola</b>` como comando | Se muestra como texto, no se interpreta | Se muestra como texto | ✅ Aprobado |
| M-12 | Sin internet | Abrir sin conexión | Funciona con fuentes del sistema | Funciona | ✅ Aprobado |

## 8. Conclusión

Las 192 pruebas pasaron. Quedan verificadas:

- la **mecánica retro** (CRT + arrastrar y soltar con mouse o clic),
- la **mecánica moderna** (escritura con historial y comandos internos),
- la **transición automática** entre las tres épocas,
- el **validador** (soluciones múltiples, normalización, diagnóstico, comandos peligrosos y sugerencias),
- el **panel de explicación** en acierto, error y sin vidas,
- y el sistema de vidas, pistas, puntaje, medallas, glosario y guardado del progreso.
