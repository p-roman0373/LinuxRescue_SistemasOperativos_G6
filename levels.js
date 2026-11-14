/* =========================================================================
 * LINUX RESCUE - Datos del juego (motor de niveles basado en datos)
 * -------------------------------------------------------------------------
 * Todo el contenido del juego vive aquí: ciclos (épocas), glosario de
 * comandos y la lista de niveles. El motor (app.js) y el validador
 * (validator.js) solo leen esta estructura, así que agregar un nivel nuevo
 * no requiere tocar la lógica: basta con agregar un objeto al arreglo LEVELS.
 *
 * Estructura de un nivel:
 *   id, cycle ('bronce' | 'plata' | 'oro'), boss (true/false),
 *   code, title, fault (falla simulada), steps: [ paso, paso, ... ]
 *
 * Estructura de un paso (un jefe tiene varios pasos consecutivos):
 *   instruction  -> misión que ve el jugador
 *   pieces       -> piezas para arrastrar (solo en modo guiado)
 *   accepted     -> soluciones válidas (la primera es la "oficial")
 *   alternatives -> otras formas válidas que se muestran en la explicación
 *   nearMiss     -> respuestas "casi correctas" con un mensaje específico
 *   hints        -> pistas (el número usable depende del ciclo)
 *   preOutput    -> líneas que se imprimen en la terminal al iniciar el paso
 *   output       -> salida simulada cuando el jugador acierta
 *   explanation  -> { summary, breakdown: [[token, significado]], tip }
 * ========================================================================= */

const CYCLES = {
  bronce: {
    name: 'Ciclo Bronce',
    era: 'Monitor viejito (CRT)',
    mode: 'drag',
    modeLabel: 'Modo guiado: arrastra las piezas',
    hints: 2,
    medal: '🥉',
    color: '#cd7f32'
  },
  plata: {
    name: 'Ciclo Plata',
    era: 'Monitor moderno',
    mode: 'type',
    modeLabel: 'Modo experto: escribe el comando',
    hints: 2,
    medal: '🥈',
    color: '#c0c7d1'
  },
  oro: {
    name: 'Ciclo Oro',
    era: 'PC gamer',
    mode: 'type',
    modeLabel: 'Modo experto: menos ayudas',
    hints: 1,
    medal: '🥇',
    color: '#ffd23f'
  }
};

const GLOSSARY = {
  commands: {
    ls: {
      syntax: 'ls [opciones] [ruta]',
      desc: 'Lista el contenido de un directorio (list).',
      example: 'ls -la',
      flags: {
        '-l': 'formato largo: permisos, dueño, tamaño y fecha',
        '-a': 'incluye archivos ocultos (los que empiezan por punto)',
        '-h': 'tamaños legibles (K, M, G) junto con -l'
      }
    },
    cd: {
      syntax: 'cd [directorio]',
      desc: 'Cambia el directorio de trabajo actual (change directory).',
      example: 'cd documentos',
      args: {
        '..': 'el directorio padre (un nivel arriba)',
        '~': 'tu carpeta personal (home)',
        '/': 'la raíz del sistema de archivos'
      }
    },
    pwd: {
      syntax: 'pwd',
      desc: 'Muestra la ruta absoluta del directorio actual (print working directory).',
      example: 'pwd'
    },
    mkdir: {
      syntax: 'mkdir [opciones] nombre',
      desc: 'Crea directorios nuevos (make directory).',
      example: 'mkdir -p proyectos/2026',
      flags: { '-p': 'crea también los directorios padres y no da error si ya existe' }
    },
    cat: {
      syntax: 'cat archivo',
      desc: 'Muestra (concatena) el contenido de archivos en la salida estándar.',
      example: 'cat leeme.txt'
    },
    rm: {
      syntax: 'rm [opciones] archivo',
      desc: 'Elimina archivos o directorios. ¡En la terminal no hay papelera de reciclaje!',
      example: 'rm -r temporales',
      flags: {
        '-r': 'recursivo: borra un directorio y todo su contenido',
        '-R': 'igual que -r (recursivo)',
        '-f': 'forzar: no pregunta ni avisa si algo no existe',
        '-i': 'interactivo: pregunta antes de borrar cada archivo'
      }
    },
    df: {
      syntax: 'df [opciones]',
      desc: 'Informa el espacio usado y libre de los sistemas de archivos montados (disk free).',
      example: 'df -h',
      flags: {
        '-h': 'human-readable: tamaños en K, M, G (potencias de 1024)',
        '-H': 'tamaños legibles usando potencias de 1000'
      }
    },
    du: {
      syntax: 'du [opciones] [ruta]',
      desc: 'Calcula cuánto espacio ocupan archivos y directorios (disk usage).',
      example: 'du -sh *',
      flags: {
        '-s': 'summarize: un solo total por cada elemento',
        '-h': 'tamaños legibles (K, M, G)',
        '-d': 'profundidad máxima a recorrer'
      }
    },
    ps: {
      syntax: 'ps [opciones]',
      desc: 'Muestra los procesos en ejecución (process status).',
      example: 'ps aux',
      flags: {
        '-e': 'todos los procesos del sistema',
        '-f': 'formato completo (incluye el proceso padre PPID)',
        '-a': 'procesos de todos los usuarios con terminal',
        '-u': 'formato orientado al usuario',
        '-x': 'incluye procesos sin terminal'
      },
      args: {
        aux: 'a = todos los usuarios, u = muestra dueño, %CPU y %MEM, x = incluye procesos sin terminal',
        ax: 'a = todos los usuarios, x = incluye procesos sin terminal'
      }
    },
    kill: {
      syntax: 'kill [-señal] PID',
      desc: 'Envía una señal a un proceso usando su PID. Por defecto envía SIGTERM (15), que le pide terminar.',
      example: 'kill -9 4242',
      flags: {
        '-9': 'SIGKILL: el kernel termina el proceso de inmediato; no se puede ignorar',
        '-15': 'SIGTERM: pide al proceso terminar de forma ordenada (señal por defecto)',
        '-KILL': 'nombre de la señal 9 (SIGKILL)',
        '-SIGKILL': 'nombre completo de la señal 9',
        '-SIGTERM': 'nombre completo de la señal 15'
      }
    },
    pkill: {
      syntax: 'pkill [-señal] nombre',
      desc: 'Envía una señal a los procesos que coinciden con un nombre.',
      example: 'pkill navegador',
      flags: { '-9': 'SIGKILL: terminación forzada' }
    },
    killall: {
      syntax: 'killall [-señal] nombre',
      desc: 'Termina todos los procesos con un nombre exacto.',
      example: 'killall navegador',
      flags: { '-9': 'SIGKILL: terminación forzada' }
    },
    pgrep: {
      syntax: 'pgrep [opciones] nombre',
      desc: 'Busca procesos por nombre y muestra su PID.',
      example: 'pgrep -a minero',
      flags: { '-l': 'muestra también el nombre', '-a': 'muestra la línea de comando completa' }
    },
    chmod: {
      syntax: 'chmod permisos archivo',
      desc: 'Cambia los permisos de lectura (r), escritura (w) y ejecución (x) de un archivo (change mode).',
      example: 'chmod +x iniciar.sh',
      args: {
        '+x': '+ agrega, x = permiso de ejecución (para dueño, grupo y otros)',
        'u+x': 'agrega ejecución solo al dueño (u = user)',
        'a+x': 'agrega ejecución a todos (a = all)',
        'ugo+x': 'agrega ejecución a dueño, grupo y otros',
        '755': 'rwx para el dueño; r-x para grupo y otros (7=4+2+1, 5=4+1)',
        '744': 'rwx para el dueño; solo lectura para grupo y otros',
        '700': 'rwx solo para el dueño',
        '644': 'rw- para el dueño; r-- para grupo y otros',
        '777': 'rwx para TODOS: inseguro, cualquiera puede modificar el archivo'
      }
    },
    grep: {
      syntax: 'grep [opciones] patrón [archivo]',
      desc: 'Busca y muestra las líneas que contienen un patrón de texto.',
      example: 'grep ERROR sistema.log',
      flags: {
        '-i': 'ignora mayúsculas y minúsculas',
        '-r': 'busca recursivamente dentro de directorios',
        '-n': 'muestra el número de línea',
        '-c': 'cuenta las coincidencias'
      }
    },
    sort: {
      syntax: 'sort [opciones]',
      desc: 'Ordena líneas de texto.',
      example: 'du -sh * | sort -h',
      flags: { '-h': 'ordena tamaños legibles (K < M < G)', '-r': 'orden inverso' }
    }
  },
  operators: {
    '&&': 'operador AND: ejecuta el siguiente comando solo si el anterior terminó con éxito (código de salida 0)',
    '||': 'operador OR: ejecuta el siguiente comando solo si el anterior falló',
    '|': 'tubería (pipe): envía la salida del comando de la izquierda como entrada del de la derecha',
    ';': 'separador: ejecuta los comandos uno tras otro, aunque el anterior falle'
  },
  /* Comandos que existen en Linux pero no forman parte de los retos.
     Sirven para distinguir "orden no encontrada" de "no resuelve la falla". */
  extras: ['sudo', 'echo', 'top', 'htop', 'touch', 'mv', 'cp', 'nano', 'vim', 'vi', 'find',
    'head', 'tail', 'less', 'more', 'whoami', 'clear', 'help', 'man', 'history', 'exit', 'tree', 'free', 'uname']
};

const LEVELS = [
  /* ============================ CICLO BRONCE ============================ */
  {
    id: 1,
    cycle: 'bronce',
    boss: false,
    code: 'PC-01',
    title: 'Archivos perdidos',
    fault: 'Un usuario jura que perdió su informe final. Está dentro de alguna carpeta de su home.',
    steps: [{
      instruction: 'Entra a la carpeta «documentos» y lista su contenido para encontrar el informe.',
      pieces: ['cd', 'documentos', '&&', 'ls', 'rm', 'mkdir', '|', 'pwd'],
      accepted: ['cd documentos && ls', 'cd documentos ; ls'],
      alternatives: [
        { cmd: 'cd documentos; ls', note: 'con ; el ls se ejecuta aunque cd falle' },
        { cmd: 'ls documentos', note: 'lista la carpeta sin entrar en ella' }
      ],
      nearMiss: [
        { cmd: 'ls documentos', msg: '¡Casi! Eso lista la carpeta, pero la misión pide ENTRAR en ella primero con cd.' },
        { cmd: 'ls && cd documentos', msg: 'El orden importa: listaste antes de entrar. Primero cd, luego ls.' },
        { cmd: 'cd documentos', msg: '¡Bien! Ya entraste. Ahora encadena el comando que lista los archivos.' }
      ],
      hints: [
        'Para moverte a otra carpeta se usa «cd» (change directory).',
        'Encadena dos comandos con && → cd ... && ls'
      ],
      preOutput: ['$ ls', 'descargas/  documentos/  musica/  escritorio/'],
      output: ['informe_final.odt  notas.txt  fotos/', '✔ ¡Informe encontrado!'],
      explanation: {
        summary: 'Usamos cd para entrar en la carpeta y && para que, solo si cd tuvo éxito, se ejecute ls y muestre lo que hay dentro.',
        breakdown: [
          ['cd', 'change directory: cambia el directorio de trabajo de la shell.'],
          ['documentos', 'argumento de cd: la carpeta destino (ruta relativa al lugar donde estás).'],
          ['&&', 'operador AND: ejecuta lo siguiente solo si el comando anterior terminó bien.'],
          ['ls', 'list: muestra los archivos y carpetas del directorio actual.']
        ],
        tip: 'Concepto de SO: cada proceso tiene un "directorio de trabajo". cd cambia el de tu shell y por eso los comandos siguientes trabajan desde allí.'
      }
    }]
  },
  {
    id: 2,
    cycle: 'bronce',
    boss: false,
    code: 'PC-02',
    title: 'Escritorio desordenado',
    fault: 'Los archivos del proyecto están regados por todo el home. No hay un lugar para guardarlos.',
    steps: [{
      instruction: 'Crea una carpeta llamada «proyectos» y entra en ella.',
      pieces: ['mkdir', 'proyectos', '&&', 'cd', 'proyectos', 'rm', 'ls', '-r'],
      accepted: ['mkdir proyectos && cd proyectos', 'mkdir -p proyectos && cd proyectos', 'mkdir proyectos ; cd proyectos'],
      alternatives: [
        { cmd: 'mkdir -p proyectos && cd proyectos', note: '-p evita el error si la carpeta ya existe' },
        { cmd: 'mkdir proyectos; cd proyectos', note: 'funciona, pero si mkdir falla igual intenta entrar' }
      ],
      nearMiss: [
        { cmd: 'mkdir proyectos', msg: '¡Bien! Creaste la carpeta, pero falta entrar en ella con cd.' },
        { cmd: 'cd proyectos && mkdir proyectos', msg: 'El orden importa: no puedes entrar a una carpeta que todavía no existe. Primero créala.' },
        { cmd: 'cd proyectos', msg: 'bash: cd: proyectos: No existe el archivo o el directorio. Primero hay que crearla.' }
      ],
      hints: [
        'El comando para crear directorios es «mkdir» (make directory).',
        'Crea y luego entra: mkdir ... && cd ...'
      ],
      preOutput: ['$ ls', 'tarea1.c  tarea2.c  foto.png  notas.txt  main.py'],
      output: ['tecnico@rescue:~/proyectos$', '✔ Carpeta creada. Ahora estás en /home/tecnico/proyectos'],
      explanation: {
        summary: 'mkdir crea la carpeta y, gracias a &&, cd entra en ella solo si la creación fue exitosa.',
        breakdown: [
          ['mkdir', 'make directory: crea un directorio nuevo.'],
          ['proyectos', 'argumento de mkdir: el nombre de la carpeta a crear.'],
          ['&&', 'operador AND: ejecuta cd únicamente si mkdir no falló.'],
          ['cd', 'change directory: nos movemos dentro de la nueva carpeta.'],
          ['proyectos', 'argumento de cd: la carpeta a la que entramos.']
        ],
        tip: 'Concepto de SO: un directorio es un archivo especial que guarda la lista de nombres y sus inodos. mkdir crea esa entrada en el sistema de archivos.'
      }
    }]
  },
  {
    id: 3,
    cycle: 'bronce',
    boss: true,
    code: 'JEFE',
    title: 'Jefe Bronce: el servidor del laboratorio',
    fault: 'El servidor del laboratorio arrancó en una carpeta desconocida y el administrador dejó un mensaje. Tres fallas seguidas.',
    steps: [
      {
        instruction: 'Falla 1: ¿Dónde estás? Muestra la ruta completa del directorio actual.',
        pieces: ['pwd', 'ls', 'cd', '~', 'cat'],
        accepted: ['pwd'],
        alternatives: [{ cmd: 'echo $PWD', note: 'imprime la variable de entorno PWD' }],
        nearMiss: [{ cmd: 'ls', msg: 'ls muestra QUÉ hay en la carpeta, pero no DÓNDE estás. Busca el comando que imprime la ruta.' }],
        hints: ['Es un comando de 3 letras: print working directory.', 'Es una sola pieza que empieza por «p».'],
        preOutput: ['*** SERVIDOR LAB-OS v1.0 ***', 'Arranque completado con advertencias.'],
        output: ['/var/laboratorio'],
        explanation: {
          summary: 'pwd imprime la ruta absoluta del directorio de trabajo: así sabes exactamente en qué parte del árbol de archivos estás.',
          breakdown: [['pwd', 'print working directory: muestra la ruta absoluta, desde la raíz /.']],
          tip: 'Las rutas absolutas empiezan en / (la raíz). Las relativas dependen del directorio actual.'
        }
      },
      {
        instruction: 'Falla 2: Lee el archivo «leeme.txt» que dejó el administrador.',
        pieces: ['cat', 'leeme.txt', 'ls', 'rm', 'mkdir', '|'],
        accepted: ['cat leeme.txt'],
        alternatives: [{ cmd: 'less leeme.txt', note: 'muestra el archivo página por página' }],
        nearMiss: [{ cmd: 'rm leeme.txt', msg: '¡Cuidado! rm borraría el mensaje sin leerlo. Usa el comando que MUESTRA el contenido.', costsLife: true }],
        hints: ['El comando que muestra el contenido de un archivo es «cat».', 'cat + nombre del archivo.'],
        preOutput: ['$ ls', 'leeme.txt  logs/  config/'],
        output: ['ADMIN: Ve a tu carpeta personal, crea la carpeta «respaldo» y entra en ella.'],
        explanation: {
          summary: 'cat lee el archivo y envía su contenido a la salida estándar (la pantalla).',
          breakdown: [
            ['cat', 'concatenate: muestra el contenido de uno o varios archivos.'],
            ['leeme.txt', 'argumento: el archivo que queremos leer.']
          ],
          tip: 'Todo proceso tiene tres canales: entrada estándar (stdin), salida estándar (stdout) y salida de error (stderr).'
        }
      },
      {
        instruction: 'Falla 3: Obedece al admin. Ve a tu carpeta personal (~), crea «respaldo» y entra en ella, todo en una sola línea.',
        pieces: ['cd', '~', '&&', 'mkdir', 'respaldo', '&&', 'cd', 'respaldo', 'rm', 'pwd'],
        accepted: [
          'cd ~ && mkdir respaldo && cd respaldo',
          'cd && mkdir respaldo && cd respaldo',
          'cd ~ ; mkdir respaldo ; cd respaldo',
          'mkdir ~/respaldo && cd ~/respaldo',
          'cd ~ && mkdir -p respaldo && cd respaldo'
        ],
        alternatives: [
          { cmd: 'mkdir ~/respaldo && cd ~/respaldo', note: 'usa rutas con ~ sin moverte primero' },
          { cmd: 'cd && mkdir respaldo && cd respaldo', note: 'cd sin argumentos también te lleva al home' }
        ],
        nearMiss: [
          { cmd: 'mkdir respaldo && cd respaldo', msg: 'Casi: así creas «respaldo» dentro de /var/laboratorio. Primero ve a tu carpeta personal con cd ~.' },
          { cmd: 'cd ~ && mkdir respaldo', msg: '¡Bien! Ya la creaste en tu home. Falta entrar en ella.' }
        ],
        hints: ['Son tres comandos encadenados con &&: moverse, crear y entrar.', 'cd ~ && mkdir ... && cd ...'],
        output: ['tecnico@rescue:~/respaldo$', '✔ ¡Servidor del laboratorio rescatado!'],
        explanation: {
          summary: 'Encadenamos tres comandos con &&: cada uno solo se ejecuta si el anterior funcionó, evitando crear la carpeta en el lugar equivocado.',
          breakdown: [
            ['cd ~', 'nos lleva a la carpeta personal (home) del usuario.'],
            ['&&', 'continúa solo si cd tuvo éxito.'],
            ['mkdir respaldo', 'crea la carpeta respaldo dentro del home.'],
            ['&&', 'continúa solo si mkdir tuvo éxito.'],
            ['cd respaldo', 'entramos en la carpeta recién creada.']
          ],
          tip: '~ es un atajo que la shell expande a tu carpeta personal, por ejemplo /home/tecnico.'
        }
      }
    ]
  },

  /* ============================ CICLO PLATA ============================= */
  {
    id: 4,
    cycle: 'plata',
    boss: false,
    code: 'PC-03',
    title: '¡Disco lleno!',
    fault: '/dev/sda1 100% ¡Disco lleno! El equipo no deja guardar ningún archivo.',
    steps: [{
      instruction: 'Revisa el espacio usado y libre de los discos con tamaños fáciles de leer (G, M).',
      accepted: ['df -h', 'df -H', 'df -h /'],
      alternatives: [
        { cmd: 'df -H', note: 'usa potencias de 1000 en lugar de 1024' },
        { cmd: 'df -h /', note: 'muestra solo el sistema de archivos raíz' }
      ],
      nearMiss: [{ cmd: 'df', msg: '¡El comando es correcto! Pero sin opciones los tamaños salen en bloques de 1K, difíciles de leer. Agrega la opción para humanos.' }],
      hints: ['El comando es «df» (disk free).', 'Agrega la opción -h (human-readable).'],
      preOutput: ['ERROR: No se pudo guardar "tarea.odt": no queda espacio en el dispositivo'],
      output: [
        'S.ficheros     Tamaño  Usados  Disp  Uso%  Montado en',
        '/dev/sda1         20G     20G     0  100%  /',
        'tmpfs            1,9G    2,1M  1,9G    1%  /run',
        '✔ Diagnóstico: la partición raíz / está al 100%.'
      ],
      explanation: {
        summary: 'df consulta al sistema operativo cuánto espacio tiene cada sistema de archivos montado; -h lo muestra en unidades legibles.',
        breakdown: [
          ['df', 'disk free: reporta tamaño, usado, disponible y % de uso por partición.'],
          ['-h', 'human-readable: convierte bloques en K, M o G.']
        ],
        tip: 'Concepto de SO: los discos se dividen en particiones con un sistema de archivos (ext4, NTFS...). df lee sus estadísticas con la llamada al sistema statfs().'
      }
    }]
  },
  {
    id: 5,
    cycle: 'plata',
    boss: false,
    code: 'PC-04',
    title: 'Proceso congelado',
    fault: 'El navegador se congeló y consume 99% de CPU. La ventana no responde y el ventilador suena como avión.',
    steps: [
      {
        instruction: 'Paso 1: Lista TODOS los procesos del sistema para encontrar el PID del navegador.',
        accepted: ['ps aux', 'ps -aux', 'ps -ef', 'ps -e', 'ps ax', 'ps -A'],
        alternatives: [
          { cmd: 'ps -ef', note: 'formato estándar System V, muestra también el PPID' },
          { cmd: 'top', note: 'monitor interactivo en tiempo real' }
        ],
        nearMiss: [
          { cmd: 'ps', msg: 'ps solo muestra los procesos de esta terminal. Necesitas ver TODOS los procesos (prueba con opciones).' },
          { cmd: 'top', msg: 'top también sirve en la vida real, pero aquí usa ps para obtener una foto de todos los procesos.' }
        ],
        hints: ['El comando es «ps» (process status).', 'Usa las opciones aux: ps aux'],
        output: [
          'USER      PID  %CPU %MEM  COMMAND',
          'root        1   0.0  0.1  /sbin/init',
          'tecnico   812   0.3  1.2  terminal',
          'tecnico  4242  99.0 34.5  navegador --pestanas=187',
          'tecnico  4300   0.1  0.4  musica',
          '✔ El culpable es «navegador» con PID 4242.'
        ],
        explanation: {
          summary: 'ps aux toma una "foto" de todos los procesos del sistema con su dueño, PID y consumo de CPU/memoria.',
          breakdown: [
            ['ps', 'process status: lista procesos en ejecución.'],
            ['aux', 'a = de todos los usuarios, u = formato con dueño/%CPU/%MEM, x = incluye procesos sin terminal.']
          ],
          tip: 'Concepto de SO: el PID (Process ID) es el número único que el kernel asigna a cada proceso. El PID 1 es init/systemd, el padre de todos.'
        }
      },
      {
        instruction: 'Paso 2: El PID del navegador es 4242. Termina ese proceso.',
        accepted: ['kill 4242', 'kill -9 4242', 'kill -15 4242', 'kill -SIGTERM 4242', 'kill -SIGKILL 4242', 'kill -KILL 4242', 'pkill navegador', 'killall navegador'],
        alternatives: [
          { cmd: 'kill -9 4242', note: 'SIGKILL: fuerza el cierre si el proceso ignora SIGTERM' },
          { cmd: 'pkill navegador', note: 'busca el proceso por nombre en lugar de PID' }
        ],
        nearMiss: [
          { cmd: 'kill', msg: 'kill necesita saber a quién enviar la señal: agrega el PID.' },
          { cmd: 'kill 1', msg: '¡ALTO! El PID 1 es init/systemd, el padre de todos los procesos. Terminarlo tumbaría el sistema. Usa el PID del navegador.', costsLife: true },
          { cmd: 'kill navegador', msg: 'kill recibe un número (PID), no un nombre. Usa 4242 o el comando pkill.' }
        ],
        hints: ['El comando que envía señales a procesos es «kill».', 'kill + el PID: kill 4242'],
        output: ['[1]+  Terminado              navegador --pestanas=187', '✔ CPU al 3%. ¡El equipo respira de nuevo!'],
        explanation: {
          summary: 'kill envía la señal SIGTERM al proceso 4242, pidiéndole que termine y libere la CPU y la memoria que estaba usando.',
          breakdown: [
            ['kill', 'envía una señal a un proceso (por defecto SIGTERM = 15).'],
            ['4242', 'el PID del proceso destino, obtenido con ps.']
          ],
          tip: 'SIGTERM (15) pide terminar de forma ordenada; SIGKILL (9) obliga al kernel a eliminar el proceso sin darle opción.'
        }
      }
    ]
  },
  {
    id: 6,
    cycle: 'plata',
    boss: true,
    code: 'JEFE',
    title: 'Jefe Plata: el disco del servidor',
    fault: '/dev/sda1 100% en el servidor de la universidad. Hay que liberar espacio sin borrar nada importante.',
    steps: [
      {
        instruction: 'Falla 1: Confirma el problema revisando el espacio de los discos en formato legible.',
        accepted: ['df -h', 'df -H', 'df -h /'],
        alternatives: [{ cmd: 'df -H', note: 'potencias de 1000' }],
        nearMiss: [{ cmd: 'df', msg: 'Correcto, pero agrega la opción para que los tamaños sean legibles.' }],
        hints: ['Ya lo usaste en PC-03: disk free.', 'df -h'],
        output: ['/dev/sda1   20G   20G   0  100%  /', '✔ Confirmado: 0 bytes libres.'],
        explanation: {
          summary: 'Antes de borrar nada, un buen técnico confirma el diagnóstico con df -h.',
          breakdown: [['df', 'disk free: espacio por partición.'], ['-h', 'tamaños legibles.']],
          tip: 'Diagnosticar antes de actuar evita borrar lo que no es.'
        }
      },
      {
        instruction: 'Falla 2: Averigua qué ocupa tanto: muestra el tamaño total de cada elemento del directorio actual en formato legible.',
        accepted: ['du -sh *', 'du -sh ./*', 'du -h -d 1', 'du -h --max-depth=1', 'du -sh * | sort -h', 'du -sh * | sort -rh'],
        alternatives: [
          { cmd: 'du -sh * | sort -h', note: 'además ordena del más pequeño al más grande' },
          { cmd: 'du -h --max-depth=1', note: 'recorre solo un nivel de profundidad' }
        ],
        nearMiss: [
          { cmd: 'du', msg: 'du sin opciones lista CADA subcarpeta en bloques. Usa -s para un resumen por elemento y -h para leerlo fácil.' },
          { cmd: 'du -h', msg: 'Vas bien, pero falta -s para obtener un solo total por elemento y * para incluirlos todos.' },
          { cmd: 'df -h', msg: 'df mide particiones completas. Para saber qué CARPETA ocupa más, usa du.' }
        ],
        hints: ['El comando es «du» (disk usage).', 'Resumen (-s), legible (-h) y todo (*): du -sh *'],
        preOutput: ['$ pwd', '/srv/universidad'],
        output: ['512M   documentos', '3,1G   proyectos', '12G    temporales', '✔ ¡«temporales» ocupa 12G!'],
        explanation: {
          summary: 'du recorre cada carpeta y suma lo que ocupan sus archivos; con -sh obtenemos un total legible por elemento.',
          breakdown: [
            ['du', 'disk usage: calcula el espacio ocupado.'],
            ['-sh', '-s resume en un total por elemento, -h usa K/M/G.'],
            ['*', 'comodín: la shell lo expande a todos los archivos y carpetas del directorio.']
          ],
          tip: 'df mira la partición completa; du mira archivos y carpetas concretas.'
        }
      },
      {
        instruction: 'Falla 3: «temporales» es basura acumulada. Bórrala con todo su contenido.',
        accepted: ['rm -r temporales', 'rm -rf temporales', 'rm -R temporales', 'rm -Rf temporales'],
        alternatives: [{ cmd: 'rm -rf temporales', note: '-f no pregunta ni avisa errores: úsalo con mucho cuidado' }],
        nearMiss: [
          { cmd: 'rm temporales', msg: 'rm: no se puede borrar «temporales»: Es un directorio. Agrega -r (recursivo).' },
          { cmd: 'rm -rf *', msg: '¡Eso borraría TODO: documentos y proyectos incluidos! Sé específico con el nombre.', costsLife: true },
          { cmd: 'rmdir temporales', msg: 'rmdir solo borra carpetas VACÍAS. Esta tiene 12G adentro.' }
        ],
        hints: ['Para borrar carpetas con contenido, rm necesita una opción recursiva.', 'rm -r temporales'],
        output: ['$ df -h', '/dev/sda1   20G   7,9G   12G   40%  /', '✔ ¡12G liberados! Servidor rescatado.'],
        explanation: {
          summary: 'rm -r elimina el directorio y, recursivamente, todo lo que contiene. Así liberamos 12G sin tocar documentos ni proyectos.',
          breakdown: [
            ['rm', 'remove: elimina archivos.'],
            ['-r', 'recursivo: entra en las subcarpetas y borra todo su contenido.'],
            ['temporales', 'la carpeta a eliminar.']
          ],
          tip: 'En la terminal no hay papelera: lo que borra rm desaparece. Por eso primero diagnosticamos con df y du.'
        }
      }
    ]
  },

  /* ============================= CICLO ORO ============================== */
  {
    id: 7,
    cycle: 'oro',
    boss: false,
    code: 'PC-05',
    title: 'Script sin permiso',
    fault: 'Al ejecutar ./iniciar.sh aparece: «bash: ./iniciar.sh: Permiso denegado».',
    steps: [{
      instruction: 'Dale permiso de ejecución al script «iniciar.sh».',
      accepted: ['chmod +x iniciar.sh', 'chmod u+x iniciar.sh', 'chmod a+x iniciar.sh', 'chmod ugo+x iniciar.sh', 'chmod 755 iniciar.sh', 'chmod 744 iniciar.sh', 'chmod 700 iniciar.sh'],
      alternatives: [
        { cmd: 'chmod 755 iniciar.sh', note: 'notación octal: rwx r-x r-x' },
        { cmd: 'chmod u+x iniciar.sh', note: 'solo el dueño puede ejecutarlo' }
      ],
      nearMiss: [
        { cmd: 'chmod 777 iniciar.sh', msg: 'Funciona, pero 777 da permiso de ESCRITURA a todos los usuarios: es un riesgo de seguridad. Usa +x o 755.' },
        { cmd: './iniciar.sh', msg: 'Ese es justamente el error. Primero cambia los permisos con chmod.' },
        { cmd: 'sudo chmod +x iniciar.sh', msg: 'No necesitas sudo: el archivo es tuyo (dueño: tecnico). Evita usar privilegios de más.' }
      ],
      hints: ['El comando que cambia permisos es «chmod» y la x significa ejecución.'],
      preOutput: ['$ ls -l iniciar.sh', '-rw-r--r-- 1 tecnico tecnico 512 nov 13 iniciar.sh', '$ ./iniciar.sh', 'bash: ./iniciar.sh: Permiso denegado'],
      output: ['$ ls -l iniciar.sh', '-rwxr-xr-x 1 tecnico tecnico 512 nov 13 iniciar.sh', '$ ./iniciar.sh', 'Iniciando servicios... OK', '✔ ¡Script ejecutable!'],
      explanation: {
        summary: 'chmod +x agrega el permiso de ejecución (x). Sin él, el kernel se niega a ejecutar el archivo aunque sea un script válido.',
        breakdown: [
          ['chmod', 'change mode: modifica los bits de permiso del archivo.'],
          ['+x', '+ agrega un permiso; x es ejecución. Sin u/g/o se aplica a todos.'],
          ['iniciar.sh', 'el archivo al que cambiamos los permisos.']
        ],
        tip: 'Permisos en octal: r=4, w=2, x=1. 755 = 7 (rwx dueño) + 5 (r-x grupo) + 5 (r-x otros).'
      }
    }]
  },
  {
    id: 8,
    cycle: 'oro',
    boss: false,
    code: 'PC-06',
    title: 'Logs del sistema',
    fault: 'La PC se apaga sola. El archivo sistema.log tiene 50.000 líneas y nadie sabe por qué.',
    steps: [{
      instruction: 'Muestra SOLO las líneas de «sistema.log» que contienen la palabra ERROR, usando una tubería (|).',
      accepted: ['cat sistema.log | grep ERROR', 'grep ERROR sistema.log', 'cat sistema.log | grep -i error', 'grep -i error sistema.log', 'cat sistema.log | grep -i ERROR', 'grep -n ERROR sistema.log'],
      alternatives: [
        { cmd: 'grep ERROR sistema.log', note: 'más eficiente: grep lee el archivo directamente, sin cat' },
        { cmd: 'grep -i error sistema.log', note: '-i ignora mayúsculas y minúsculas' }
      ],
      nearMiss: [
        { cmd: 'cat sistema.log', msg: 'Eso imprime las 50.000 líneas. Envía esa salida por una tubería | hacia grep para filtrar.' },
        { cmd: 'cat sistema.log | grep error', msg: 'grep distingue mayúsculas: «error» ≠ «ERROR». Escribe ERROR o usa la opción -i.' },
        { cmd: 'grep sistema.log ERROR', msg: 'El orden de grep es: grep PATRÓN ARCHIVO. Primero va lo que buscas.' }
      ],
      hints: ['cat muestra el archivo y grep filtra líneas: únelos con |.'],
      preOutput: ['$ wc -l sistema.log', '50000 sistema.log'],
      output: [
        '[08:12:03] ERROR: ventilador CPU 0 RPM',
        '[08:14:47] ERROR: temperatura CPU 97°C',
        '[08:15:02] ERROR: apagado de emergencia por temperatura',
        '✔ Diagnóstico: el ventilador está dañado y la CPU se sobrecalienta.'
      ],
      explanation: {
        summary: 'La tubería | conecta la salida de cat con la entrada de grep, que deja pasar solo las líneas que contienen ERROR.',
        breakdown: [
          ['cat sistema.log', 'envía las 50.000 líneas del archivo a la salida estándar.'],
          ['|', 'pipe: la salida de cat se convierte en la entrada de grep.'],
          ['grep', 'filtra y muestra solo las líneas que coinciden con el patrón.'],
          ['ERROR', 'el patrón a buscar (distingue mayúsculas).']
        ],
        tip: 'Concepto de SO: una tubería es un mecanismo de comunicación entre procesos (IPC). El kernel crea un búfer que conecta stdout de un proceso con stdin del otro.'
      }
    }]
  },
  {
    id: 9,
    cycle: 'oro',
    boss: true,
    code: 'JEFE',
    title: 'Jefe final: el minero oculto',
    fault: 'La PC gamer va lentísima. Alguien instaló un minero de criptomonedas que se esconde entre los procesos.',
    steps: [
      {
        instruction: 'Falla 1: Busca el proceso «minero» filtrando la lista de procesos con una tubería.',
        accepted: ['ps aux | grep minero', 'ps -aux | grep minero', 'ps -ef | grep minero', 'ps -e | grep minero', 'ps aux | grep -i minero', 'pgrep minero', 'pgrep -l minero', 'pgrep -a minero'],
        alternatives: [
          { cmd: 'pgrep -a minero', note: 'busca el proceso por nombre directamente' },
          { cmd: 'ps -ef | grep minero', note: 'misma idea con formato System V' }
        ],
        nearMiss: [
          { cmd: 'ps aux', msg: 'Bien, pero hay 300 procesos. Filtra con | grep minero.' },
          { cmd: 'grep minero', msg: 'grep necesita recibir texto: envíale la lista de procesos con ps aux | ...' }
        ],
        hints: ['Combina lo que aprendiste: ps aux | grep ...'],
        preOutput: ['$ uptime', 'carga promedio: 7,98  8,02  7,95   (¡8 núcleos al 100%!)'],
        output: ['hacker    6666  98.7 12.3  ./minero.sh --pool=xmr', 'tecnico   7001   0.0  0.0  grep minero', '✔ ¡Te encontré! PID 6666.'],
        explanation: {
          summary: 'ps aux lista todos los procesos y la tubería se los pasa a grep, que muestra solo las líneas que contienen "minero".',
          breakdown: [
            ['ps aux', 'lista todos los procesos del sistema.'],
            ['|', 'pipe: conecta la salida de ps con la entrada de grep.'],
            ['grep minero', 'filtra las líneas que contienen la palabra minero.']
          ],
          tip: 'Verás también la línea del propio grep: es un proceso más mientras se ejecuta.'
        }
      },
      {
        instruction: 'Falla 2: El minero (PID 6666) ignora SIGTERM. Fuérzalo a terminar con la señal que no se puede ignorar.',
        accepted: ['kill -9 6666', 'kill -KILL 6666', 'kill -SIGKILL 6666', 'pkill -9 minero', 'killall -9 minero'],
        alternatives: [
          { cmd: 'kill -SIGKILL 6666', note: 'la misma señal escrita con su nombre' },
          { cmd: 'pkill -9 minero', note: 'por nombre en lugar de PID' }
        ],
        nearMiss: [
          { cmd: 'kill 6666', msg: 'Enviaste SIGTERM (15) y el minero la ignora. Necesitas la señal número 9.', costsLife: true },
          { cmd: 'kill -9', msg: 'Falta indicar el PID del minero.' }
        ],
        hints: ['La señal que el proceso no puede ignorar es SIGKILL, la número 9.'],
        output: ['[1]+  Matado                 ./minero.sh --pool=xmr', '✔ CPU al 6%.'],
        explanation: {
          summary: 'kill -9 envía SIGKILL: el kernel elimina el proceso de inmediato, sin darle oportunidad de ignorar la señal.',
          breakdown: [
            ['kill', 'envía una señal a un proceso.'],
            ['-9', 'SIGKILL: terminación forzada, no se puede capturar ni ignorar.'],
            ['6666', 'PID del minero.']
          ],
          tip: 'Usa -9 como último recurso: el proceso no puede guardar datos ni limpiar sus archivos temporales.'
        }
      },
      {
        instruction: 'Falla 3: Elimina el archivo malicioso «minero.sh» para que no vuelva a arrancar.',
        accepted: ['rm minero.sh', 'rm -f minero.sh', 'rm -i minero.sh'],
        alternatives: [{ cmd: 'rm -i minero.sh', note: 'pide confirmación antes de borrar' }],
        nearMiss: [
          { cmd: 'rm -rf /', msg: '⛔ ¡Eso destruiría todo el sistema! Solo hay que borrar minero.sh.', costsLife: true },
          { cmd: 'cat minero.sh', msg: 'Ya sabemos que es malicioso: ahora hay que eliminarlo.' }
        ],
        hints: ['Para eliminar un archivo se usa rm + nombre.'],
        preOutput: ['$ ls', 'juegos/  minero.sh  partidas/'],
        output: ['$ ls', 'juegos/  partidas/', '✔ ¡PC GAMER RESCATADA! Has completado Linux Rescue.'],
        explanation: {
          summary: 'rm elimina el archivo del minero, así no podrá volver a ejecutarse en el próximo arranque.',
          breakdown: [
            ['rm', 'remove: elimina el archivo.'],
            ['minero.sh', 'el script malicioso.']
          ],
          tip: 'Resumen del rescate: encontrar (ps + grep) → detener (kill -9) → eliminar (rm). Es el flujo básico de respuesta ante un proceso malicioso.'
        }
      }
    ]
  }
];

/* Permite reutilizar los datos en las pruebas automáticas con Node.js */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CYCLES, GLOSSARY, LEVELS };
}
