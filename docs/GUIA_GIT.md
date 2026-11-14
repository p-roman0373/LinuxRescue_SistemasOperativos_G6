# Guía de Git: cómo se versionó Linux Rescue

El historial del repositorio se construyó con **5 commits**, uno por cada etapa del desarrollo:

| # | Etapa | Archivos |
|---|---|---|
| 1 | Estructura base | `.gitignore`, `index.html` |
| 2 | Interfaz retro (CRT + arrastrar y soltar) y datos de niveles | `css/styles.css`, `js/levels.js` |
| 3 | Interfaz moderna y gamer + transición de épocas | `css/eras.css` |
| 4 | Lógica de validación, motor del juego y pruebas | `js/validator.js`, `js/app.js`, `tests/` |
| 5 | Documentación y evidencias | `README.md`, `docs/`, `evidencias/` |

> Los comandos funcionan en **Git Bash** (Windows), en la terminal de Linux y en macOS.

---

## 0. Configuración inicial (una sola vez por computador)

```bash
git --version                                   # comprobar que Git está instalado
git config --global user.name "Paula Román"     # cada integrante pone SU nombre
git config --global user.email "correo@ejemplo.com"   # el mismo correo de su cuenta de GitHub
```

---

## Caso A: el repositorio YA existe en GitHub (recomendado)

```bash
# 1. Clonar el repositorio del grupo
git clone https://github.com/<usuario>/<repositorio>.git
cd <repositorio>

# 2. Copiar DENTRO de esta carpeta todo el contenido de la carpeta linux-rescue
#    (index.html, css/, js/, tests/, docs/, evidencias/, README.md, .gitignore).
#    Si pregunta, reemplazar el README.md anterior.

# 3. Revisar qué archivos son nuevos o cambiaron
git status
```

Luego seguir con **los 5 commits** (sección C).

## Caso B: crear el repositorio desde cero

1. En GitHub: **New repository** → nombre `linux-rescue` → **sin** README, sin .gitignore ni licencia → *Create repository*.
2. En la terminal, dentro de la carpeta del proyecto:

```bash
cd linux-rescue
git init
git branch -M main
git remote add origin https://github.com/<usuario>/linux-rescue.git
git remote -v            # comprobar el enlace con GitHub
```

Luego seguir con **los 5 commits** (sección C).

---

## C. Los 5 commits del desarrollo

### Commit 1: estructura base

```bash
git add .gitignore index.html
git commit -m "feat: estructura base del proyecto y pantallas HTML" -m "Pantallas de inicio, pasillo de computadores, nivel, transición y modales. Estructura de carpetas css/, js/, docs/ y evidencias/."
```

### Commit 2: interfaz retro (CRT + arrastrar y soltar)

```bash
git add css/styles.css js/levels.js
git commit -m "feat: interfaz retro CRT, modo arrastrar y soltar y datos de niveles" -m "Monitor CRT con fósforo verde, scanlines y viñeta. Estilos de piezas y zona de arrastre. Definición de ciclos, glosario y los 9 niveles en levels.js."
```

### Commit 3: interfaz moderna y transición de épocas

```bash
git add css/eras.css
git commit -m "feat: interfaz moderna (Plata) y gamer (Oro) con transición entre épocas" -m "Terminal estilo Ubuntu/macOS, PC gamer con borde RGB y animación de actualización de hardware al subir de ciclo."
```

### Commit 4: lógica de validación y motor del juego

```bash
git add js/validator.js js/app.js tests/
git commit -m "feat: validador de comandos, motor del juego y pruebas automáticas" -m "Normalización, soluciones alternativas, diagnóstico de errores y bloqueo de comandos peligrosos. Vidas, pistas, puntaje, medallas, panel de explicación y guardado en localStorage. 149 pruebas unitarias y 30 E2E."
```

### Commit 5: documentación y evidencias

```bash
git add README.md docs/ evidencias/
git commit -m "docs: README, documentación técnica, pruebas de funcionamiento y evidencias" -m "Documentación de arquitectura, motor de niveles, validador y gestor de interfaz. Tabla de casos de prueba y capturas del funcionamiento."
```

### Verificar y subir a GitHub

```bash
git status                 # debe decir "nothing to commit, working tree clean"
git log --oneline          # deben aparecer los 5 commits
git push -u origin main
```

### (Opcional) Marcar la entrega con una etiqueta

```bash
git tag -a fase-2 -m "Entrega Fase II - prototipo funcional"
git push origin fase-2
```

---

## D. Publicar el juego en línea (GitHub Pages)

1. En el repositorio: **Settings → Pages**.
2. *Source:* **Deploy from a branch** · *Branch:* `main` · carpeta `/ (root)` → **Save**.
3. Después de 1–2 minutos el juego queda en `https://<usuario>.github.io/<repositorio>/`.
4. Poner ese enlace en el README y en la entrega de Canvas.

---

## E. Problemas frecuentes

| Problema | Solución |
|---|---|
| `fatal: remote origin already exists` | `git remote set-url origin https://github.com/<usuario>/<repositorio>.git` |
| `! [rejected] main -> main (fetch first)` (el repo de GitHub ya tenía un README) | `git pull --rebase origin main`. Si hay conflicto en `README.md`, dejar la versión nueva, luego `git add README.md` y `git rebase --continue`. Después, `git push -u origin main` |
| `error: src refspec main does not match any` | Falta al menos un commit, o la rama se llama `master`: `git branch -M main` |
| Pide usuario y contraseña | GitHub ya no acepta la contraseña: usar un **Personal Access Token** (*Settings → Developer settings → Tokens*) o iniciar sesión con GitHub Desktop o VS Code |

## F. Trabajo en equipo (para que se vea el aporte de cada integrante)

Cada integrante puede hacer sus propios commits desde su computador:

```bash
git pull                    # traer siempre lo último antes de empezar
# ...editar archivos...
git add <archivos>
git commit -m "tipo: descripción del cambio"
git push
```

Prefijos recomendados para los mensajes: `feat:` (función nueva), `fix:` (corrección), `docs:` (documentación), `style:` (estilos), `test:` (pruebas).
