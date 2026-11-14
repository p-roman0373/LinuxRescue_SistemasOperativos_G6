/* =========================================================================
 * LINUX RESCUE - Motor del juego y gestor de interfaz dinámica
 * -------------------------------------------------------------------------
 * Responsabilidades:
 *   - Flujo de pantallas: inicio → pasillo → nivel → resultados
 *   - Estado de la partida: vidas, pistas, puntaje, estrellas, medallas
 *   - Modo guiado (arrastrar y soltar) y modo experto (escribir)
 *   - Transición visual entre épocas (CRT → moderno → gamer)
 *   - Panel de explicación tras cada intento
 *   - Persistencia del progreso en localStorage
 * Depende de: levels.js (CYCLES, GLOSSARY, LEVELS) y validator.js (Validator)
 * ========================================================================= */
(function () {
  'use strict';

  const SAVE_KEY = 'linuxRescue.save.v1';
  const MAX_LIVES = 3;
  const SCORE = { base: 100, boss: 150, hint: 25, error: 20, min: 20 };

  /* ---------------------------- Estado global ---------------------------- */
  const state = {
    player: { name: '', character: 'nino' },
    progress: { unlocked: 0, best: {}, stars: {}, medals: {} },
    era: null,          // época visual activa: 'bronce' | 'plata' | 'oro'
    current: null       // partida del nivel en curso
  };

  /* ------------------------------ Utilidades ----------------------------- */
  const $ = (sel) => document.querySelector(sel);
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  /* Sonido: si audio.js no cargó, el juego funciona en silencio */
  function sfx(name) { if (window.Sound) window.Sound.play(name); }
  function bgm(name) { if (window.Sound) window.Sound.music(name); }

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 2400);
  }

  /* ----------------------------- Persistencia ---------------------------- */
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (data.player) state.player = Object.assign(state.player, data.player);
      if (data.progress) state.progress = Object.assign(state.progress, data.progress);
      return true;
    } catch (e) { return false; }
  }
  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ player: state.player, progress: state.progress }));
    } catch (e) { /* almacenamiento no disponible: el juego sigue en memoria */ }
  }
  function resetProgress() {
    state.progress = { unlocked: 0, best: {}, stars: {}, medals: {} };
    state.era = null;
    save();
  }
  function totalScore() {
    return Object.values(state.progress.best).reduce((a, b) => a + b, 0);
  }

  /* --------------------------- Personajes pixel -------------------------- */
  const SPRITES = {
    nino: {
      palette: { h: '#6b3e1f', s: '#f4c79f', e: '#1b1b2f', m: '#c0392b', c: '#2ecc71', p: '#3b6fd8', b: '#2b2b2b' },
      grid: ['...hhhh...', '..hhhhhh..', '..hssssh..', '..sesses..', '..ssssss..', '...smms...',
        '..cccccc..', '.sccccccs.', '.sccccccs.', '..cccccc..', '..pppppp..', '..pp..pp..', '..pp..pp..', '.bbb..bbb.']
    },
    nina: {
      palette: { h: '#8e4a1c', s: '#f4c79f', e: '#1b1b2f', m: '#e84393', c: '#ff6fb5', p: '#f4c79f', b: '#6c3483' },
      grid: ['...hhhh...', '..hhhhhh..', '.hhsssshh.', '.hsessesh.', '.hssssssh.', '.hhsmmshh.',
        '..cccccc..', '.sccccccs.', '.sccccccs.', '.cccccccc.', '..pp..pp..', '..pp..pp..', '..pp..pp..', '.bbb..bbb.']
    }
  };
  function spriteSVG(key, px) {
    const sp = SPRITES[key] || SPRITES.nino;
    const w = sp.grid[0].length, h = sp.grid.length;
    let rects = '';
    sp.grid.forEach((row, y) => row.split('').forEach((ch, x) => {
      if (ch !== '.') rects += '<rect x="' + x + '" y="' + y + '" width="1.02" height="1.02" fill="' + sp.palette[ch] + '"/>';
    }));
    return '<svg class="sprite" viewBox="0 0 ' + w + ' ' + h + '" width="' + w * px + '" height="' + h * px + '" shape-rendering="crispEdges" aria-hidden="true">' + rects + '</svg>';
  }

  /* ------------------------------- Pantallas ----------------------------- */
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
    document.body.dataset.screen = id;
    if (id !== 'screen-level') { document.body.dataset.era = ''; bgm('menu'); }
    window.scrollTo(0, 0);
  }

  /* ---------------------------- Pantalla inicio -------------------------- */
  function renderStart() {
    $('#player-name').value = state.player.name || '';
    document.querySelectorAll('.char-option').forEach((btn) => {
      const key = btn.dataset.char;
      btn.querySelector('.char-sprite').innerHTML = spriteSVG(key, 7);
      btn.classList.toggle('selected', key === state.player.character);
    });
    $('#btn-continue').hidden = !(state.progress.unlocked > 0 && state.player.name);
    $('#start-logo-pc').innerHTML = pcIcon('bronce');
  }

  function startGame(isNew) {
    const name = $('#player-name').value.trim();
    if (!name) { toast('Escribe el nombre de tu técnico'); $('#player-name').focus(); return; }
    state.player.name = name.slice(0, 16);
    if (isNew && state.progress.unlocked > 0) {
      openModal(
        '<h2>¿Nueva partida?</h2><p>Se borrará el progreso guardado (niveles, puntaje y medallas).</p>',
        [{ label: 'Sí, empezar de cero', cls: 'btn-danger', fn: () => { resetProgress(); closeModal(); save(); renderMap(); showScreen('screen-map'); } },
          { label: 'Cancelar', cls: 'btn-ghost', fn: closeModal }]
      );
      return;
    }
    if (isNew) resetProgress();
    save();
    renderMap();
    showScreen('screen-map');
  }

  /* ------------------------------ Íconos de PC --------------------------- */
  function pcIcon(cycle) {
    return '<div class="pc-icon pc-' + cycle + '"><div class="pc-screen"><i></i><i></i><i></i></div><div class="pc-base"></div></div>';
  }

  /* ---------------------------- Pasillo (mapa) --------------------------- */
  function renderMap() {
    $('#map-player').innerHTML = spriteSVG(state.player.character, 3) + '<span>' + esc(state.player.name) + '</span>';
    $('#map-score').textContent = totalScore();
    $('#map-medals').innerHTML = ['bronce', 'plata', 'oro']
      .map((c) => '<span class="medal ' + (state.progress.medals[c] ? 'won' : '') + '" title="' + CYCLES[c].name + '">' + CYCLES[c].medal + '</span>').join('');

    const corridor = $('#corridor');
    corridor.innerHTML = '';
    let lastCycle = null;
    LEVELS.forEach((lvl, i) => {
      if (lvl.cycle !== lastCycle) {
        lastCycle = lvl.cycle;
        const zone = el('div', 'zone-label zone-' + lvl.cycle, CYCLES[lvl.cycle].medal + ' ' + CYCLES[lvl.cycle].name + '<small>' + CYCLES[lvl.cycle].era + '</small>');
        corridor.appendChild(zone);
      }
      const locked = i > state.progress.unlocked;
      const done = state.progress.best[lvl.id] !== undefined;
      const stars = state.progress.stars[lvl.id] || 0;
      const b = el('button', 'pc-slot pc-slot-' + lvl.cycle + (locked ? ' locked' : '') + (done ? ' done' : '') + (lvl.boss ? ' boss' : ''));
      b.type = 'button';
      b.dataset.index = i;
      b.innerHTML = pcIcon(lvl.cycle) +
        '<span class="slot-code">' + (lvl.boss ? '☠ JEFE' : lvl.code) + '</span>' +
        '<span class="slot-title">' + esc(lvl.title.replace(/^Jefe (Bronce|Plata|final): /i, '')) + '</span>' +
        '<span class="slot-stars">' + (locked ? '🔒' : done ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '¡Averiado!') + '</span>';
      b.disabled = locked;
      b.addEventListener('click', () => walkTo(i));
      corridor.appendChild(b);
    });

    const walker = $('#walker');
    walker.innerHTML = spriteSVG(state.player.character, 4);
    requestAnimationFrame(() => placeWalker(Math.min(state.progress.unlocked, LEVELS.length - 1), false));
  }

  function placeWalker(index, animate) {
    const slot = document.querySelector('.pc-slot[data-index="' + index + '"]');
    const walker = $('#walker');
    if (!slot) return;
    walker.style.transition = animate ? 'left .8s steps(8)' : 'none';
    walker.style.left = (slot.offsetLeft + slot.offsetWidth / 2 - walker.offsetWidth / 2) + 'px';
  }

  function walkTo(index) {
    const walker = $('#walker');
    walker.classList.add('walking');
    sfx('walk');
    placeWalker(index, true);
    const slot = document.querySelector('.pc-slot[data-index="' + index + '"]');
    if (slot) slot.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    setTimeout(() => { walker.classList.remove('walking'); startLevel(index); }, 850);
  }

  /* --------------------- Transición visual entre épocas ------------------ */
  const ERA_TEXT = {
    bronce: ['Encendiendo monitor de tubos (CRT)...', 'Calentando el fósforo verde...', 'Cargando modo guiado'],
    plata: ['Retirando el monitor CRT...', 'Instalando pantalla LCD moderna...', 'Activando modo experto: ¡a escribir!'],
    oro: ['Desarmando el equipo de oficina...', 'Instalando tarjeta gráfica RGB...', 'Modo experto con menos ayudas']
  };
  function playTransition(toCycle, done) {
    const ov = $('#overlay-transition');
    const from = state.era;
    $('#tr-from').innerHTML = from ? pcIcon(from) + '<span>' + CYCLES[from].era + '</span>' : '<div class="pc-off">⏻</div><span>Apagado</span>';
    $('#tr-to').innerHTML = pcIcon(toCycle) + '<span>' + CYCLES[toCycle].era + '</span>';
    $('#tr-title').textContent = from ? '¡ACTUALIZACIÓN DE HARDWARE!' : 'ARRANCANDO SISTEMA';
    const lines = $('#tr-lines');
    lines.innerHTML = '';
    ov.dataset.to = toCycle;
    ov.classList.remove('run');
    void ov.offsetWidth; // reinicia la animación CSS
    ov.classList.add('show', 'run');
    bgm(null);
    sfx('boot');
    ERA_TEXT[toCycle].forEach((t, i) => setTimeout(() => lines.appendChild(el('div', 'tr-line', '&gt; ' + t)), 350 + i * 650));
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      ov.classList.remove('show', 'run');
      ov.onclick = null;
      state.era = toCycle;
      done();
    };
    ov.onclick = finish;
    setTimeout(finish, 2700);
  }

  /* ------------------------------ Nivel: inicio -------------------------- */
  function startLevel(index) {
    const lvl = LEVELS[index];
    const go = () => beginLevel(index);
    if (state.era !== lvl.cycle) playTransition(lvl.cycle, go);
    else go();
  }

  function beginLevel(index) {
    const lvl = LEVELS[index];
    state.current = {
      index: index, step: 0, lives: MAX_LIVES, stepScores: [],
      hintsUsed: 0, errors: 0, totalHints: 0, totalErrors: 0,
      drag: null, history: [], histPos: 0, solved: false
    };
    document.body.dataset.era = lvl.cycle;
    showScreen('screen-level');
    bgm(lvl.cycle);
    $('#lvl-avatar').innerHTML = spriteSVG(state.player.character, 3);
    $('#lvl-player').textContent = state.player.name;
    $('#lvl-cycle').textContent = CYCLES[lvl.cycle].medal + ' ' + CYCLES[lvl.cycle].name;
    $('#lvl-mode').textContent = CYCLES[lvl.cycle].modeLabel;
    $('#lvl-title').textContent = (lvl.boss ? '☠ ' : lvl.code + ' · ') + lvl.title;
    $('#fault-desc').textContent = lvl.fault;
    $('#term-title').textContent = lvl.cycle === 'bronce' ? 'TERMINAL-80  ·  ' + lvl.code : 'tecnico@rescue: ~  —  ' + lvl.code;
    loadStep();
  }

  function currentLevel() { return LEVELS[state.current.index]; }
  function currentStep() { return currentLevel().steps[state.current.step]; }
  function isDrag() { return CYCLES[currentLevel().cycle].mode === 'drag'; }

  function loadStep() {
    const cur = state.current, lvl = currentLevel(), step = currentStep();
    cur.hintsUsed = 0;
    cur.errors = 0;
    cur.solved = false;

    $('#step-indicator').hidden = lvl.steps.length < 2;
    $('#step-indicator').innerHTML = lvl.steps.map((s, i) =>
      '<i class="' + (i < cur.step ? 'done' : i === cur.step ? 'now' : '') + '"></i>').join('') +
      '<span>Falla ' + (cur.step + 1) + ' de ' + lvl.steps.length + '</span>';
    $('#mission-text').textContent = step.instruction;

    const out = $('#term-output');
    out.innerHTML = '';
    if (cur.step === 0) printLine('# FALLA DETECTADA: ' + lvl.fault, 'warn');
    (step.preOutput || []).forEach((l) => printLine(l, 'dim'));
    printLine('# MISIÓN: ' + step.instruction, 'info');

    const drag = isDrag();
    $('#drag-area').hidden = !drag;
    $('#type-row').hidden = drag;
    $('#btn-clear').hidden = !drag;
    $('#btn-run').hidden = false;
    $('#btn-next').hidden = true;
    $('#btn-retry').hidden = true;
    setControlsEnabled(true);

    if (drag) {
      cur.drag = { bank: shuffle(step.pieces.map((t, i) => ({ id: 'p' + cur.step + '_' + i, text: t }))), line: [] };
      renderDrag();
    } else {
      const input = $('#cmd-input');
      input.value = '';
      setTimeout(() => input.focus(), 50);
    }
    renderExplainPlaceholder();
    updateHUD();
  }

  function setControlsEnabled(on) {
    ['#btn-run', '#btn-clear', '#btn-hint', '#cmd-input'].forEach((s) => { $(s).disabled = !on; });
    $('#drag-area').classList.toggle('disabled', !on);
    if (on) updateHintButton();
  }

  /* --------------------------------- HUD --------------------------------- */
  function updateHUD() {
    const cur = state.current;
    $('#lvl-lives').innerHTML = Array.from({ length: MAX_LIVES }, (_, i) =>
      '<span class="heart ' + (i < cur.lives ? '' : 'lost') + '">♥</span>').join('');
    $('#lvl-score').textContent = cur.stepScores.reduce((a, b) => a + b, 0);
    $('#lvl-total').textContent = totalScore();
    updateHintButton();
  }

  function hintsAllowed() { return CYCLES[currentLevel().cycle].hints; }
  function updateHintButton() {
    if (!state.current) return;
    const left = Math.max(0, Math.min(hintsAllowed(), currentStep().hints.length) - state.current.hintsUsed);
    $('#hints-left').textContent = left;
    $('#btn-hint').disabled = left === 0 || state.current.solved || state.current.lives <= 0;
  }

  /* ------------------------------ Terminal ------------------------------- */
  function promptText() {
    return 'tecnico@rescue:~$';
  }
  function printLine(text, cls) {
    const out = $('#term-output');
    const line = el('div', 'line ' + (cls || ''));
    line.textContent = text;
    out.appendChild(line);
    const term = $('#terminal');
    term.scrollTop = term.scrollHeight;
  }
  function printCommand(cmd) {
    const out = $('#term-output');
    const line = el('div', 'line cmd');
    line.innerHTML = '<span class="prompt">' + esc(promptText()) + '</span> ' + esc(cmd);
    out.appendChild(line);
  }

  /* --------------------------- Arrastrar y soltar ------------------------ */
  function pieceButton(p, from) {
    const b = el('button', 'piece' + (/^(&&|\||;|\|\|)$/.test(p.text) ? ' op' : ''), esc(p.text));
    b.type = 'button';
    b.draggable = true;
    b.dataset.id = p.id;
    b.dataset.from = from;
    b.title = from === 'bank' ? 'Arrastra a la línea de comandos o haz clic' : 'Haz clic para devolver';
    b.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', p.id);
      e.dataTransfer.effectAllowed = 'move';
      b.classList.add('dragging');
    });
    b.addEventListener('dragend', () => b.classList.remove('dragging'));
    b.addEventListener('click', () => {
      if (state.current.solved) return;
      movePiece(p.id, from === 'bank' ? 'line' : 'bank');
    });
    return b;
  }

  function renderDrag() {
    const d = state.current.drag;
    const zone = $('#drop-zone'), bank = $('#piece-bank');
    zone.innerHTML = '';
    bank.innerHTML = '';
    if (!d.line.length) zone.appendChild(el('span', 'drop-hint', 'Suelta aquí las piezas para armar el comando…'));
    d.line.forEach((p) => zone.appendChild(pieceButton(p, 'line')));
    d.bank.forEach((p) => bank.appendChild(pieceButton(p, 'bank')));
    $('#cmd-preview').textContent = d.line.map((p) => p.text).join(' ');
  }

  function movePiece(id, to, index) {
    const d = state.current.drag;
    let piece = null;
    ['bank', 'line'].forEach((k) => {
      const i = d[k].findIndex((p) => p.id === id);
      if (i !== -1) piece = d[k].splice(i, 1)[0];
    });
    if (!piece) return;
    const target = d[to];
    if (index === undefined || index < 0 || index > target.length) target.push(piece);
    else target.splice(index, 0, piece);
    sfx('pick');
    renderDrag();
  }

  function dropIndex(zone, clientX, clientY) {
    const kids = Array.from(zone.querySelectorAll('.piece'));
    for (let i = 0; i < kids.length; i++) {
      const r = kids[i].getBoundingClientRect();
      const sameRow = clientY >= r.top && clientY <= r.bottom;
      if ((sameRow && clientX < r.left + r.width / 2) || clientY < r.top) return i;
    }
    return kids.length;
  }

  function setupDropTargets() {
    const zone = $('#drop-zone'), bank = $('#piece-bank');
    [zone, bank].forEach((target) => {
      target.addEventListener('dragover', (e) => { e.preventDefault(); target.classList.add('over'); });
      target.addEventListener('dragleave', () => target.classList.remove('over'));
      target.addEventListener('drop', (e) => {
        e.preventDefault();
        target.classList.remove('over');
        if (!state.current || state.current.solved) return;
        const id = e.dataTransfer.getData('text/plain');
        if (target === zone) movePiece(id, 'line', dropIndex(zone, e.clientX, e.clientY));
        else movePiece(id, 'bank');
      });
    });
  }

  /* ------------------------------ Ejecución ------------------------------ */
  function currentInput() {
    return isDrag() ? state.current.drag.line.map((p) => p.text).join(' ') : $('#cmd-input').value;
  }

  function run() {
    const cur = state.current;
    if (!cur || cur.solved || cur.lives <= 0) return;
    const raw = currentInput();
    const cmd = raw.trim();

    if (!isDrag()) {
      if (cmd) { cur.history.push(cmd); cur.histPos = cur.history.length; }
      if (cmd === 'clear') { $('#term-output').innerHTML = ''; $('#cmd-input').value = ''; return; }
      if (cmd === 'help') {
        printCommand(cmd);
        printLine('# MISIÓN: ' + currentStep().instruction, 'info');
        printLine('# Usa el botón 💡 Pista si te atascas. Escribe "clear" para limpiar.', 'dim');
        $('#cmd-input').value = '';
        return;
      }
    }

    const res = Validator.validate(cmd, currentStep(), GLOSSARY);
    if (res.type === 'empty') { toast(res.message); return; }

    printCommand(cmd);

    if (res.ok) {
      cur.solved = true;
      const base = currentLevel().boss ? SCORE.boss : SCORE.base;
      const pts = Math.max(SCORE.min, base - SCORE.hint * cur.hintsUsed - SCORE.error * cur.errors);
      cur.stepScores.push(pts);
      sfx('success');
      currentStep().output.forEach((l) => printLine(l, /^✔/.test(l) ? 'ok' : 'out'));
      flashMonitor('success');
      setControlsEnabled(false);
      renderExplainSuccess(cmd, pts);
      $('#btn-run').hidden = true;
      $('#btn-clear').hidden = true;
      const last = cur.step === currentLevel().steps.length - 1;
      $('#btn-next').textContent = last ? 'Continuar ▶' : 'Siguiente falla ▶';
      $('#btn-next').hidden = false;
      $('#btn-next').focus();
      updateHUD();
      return;
    }

    printLine(res.terminal || res.message, res.type === 'near' && !res.costsLife ? 'warn' : 'err');
    sfx(res.type === 'danger' ? 'danger' : res.costsLife ? 'error' : 'near');
    if (res.costsLife) {
      cur.lives -= 1;
      cur.errors += 1;
      cur.totalErrors += 1;
      flashMonitor('error');
    }
    updateHUD();
    if (cur.lives <= 0) { gameOverLevel(cmd, res); return; }
    renderExplainError(cmd, res);
    if (!isDrag()) $('#cmd-input').select();
  }

  function useHint() {
    const cur = state.current;
    const step = currentStep();
    const allowed = Math.min(hintsAllowed(), step.hints.length);
    if (cur.hintsUsed >= allowed || cur.solved) return;
    printLine('# 💡 Pista ' + (cur.hintsUsed + 1) + ': ' + step.hints[cur.hintsUsed], 'hint');
    cur.hintsUsed += 1;
    cur.totalHints += 1;
    sfx('hint');
    toast('Pista usada: −' + SCORE.hint + ' puntos en este paso');
    updateHintButton();
  }

  function flashMonitor(kind) {
    const m = $('#monitor');
    m.classList.remove('fx-success', 'fx-error');
    void m.offsetWidth;
    m.classList.add('fx-' + kind);
  }

  function nextStep() {
    const cur = state.current;
    if (cur.step < currentLevel().steps.length - 1) {
      cur.step += 1;
      loadStep();
    } else {
      completeLevel();
    }
  }

  function gameOverLevel(cmd, res) {
    const cur = state.current;
    cur.solved = true;
    printLine('KERNEL PANIC: el técnico se quedó sin vidas.', 'err');
    setTimeout(() => sfx('gameover'), 450);
    $('#cmd-input').value = '';
    setControlsEnabled(false);
    $('#btn-run').hidden = true;
    $('#btn-clear').hidden = true;
    $('#btn-retry').hidden = false;
    renderExplainGameOver(cmd, res);
  }

  /* ----------------------------- Fin de nivel ---------------------------- */
  function computeStars(errors, hints) {
    const p = errors + hints;
    return p === 0 ? 3 : p <= 2 ? 2 : 1;
  }

  function completeLevel() {
    const cur = state.current, lvl = currentLevel(), cyc = CYCLES[lvl.cycle];
    const score = cur.stepScores.reduce((a, b) => a + b, 0);
    const stars = computeStars(cur.totalErrors, cur.totalHints);
    const prev = state.progress.best[lvl.id];
    if (prev === undefined || score > prev) state.progress.best[lvl.id] = score;
    state.progress.stars[lvl.id] = Math.max(stars, state.progress.stars[lvl.id] || 0);
    state.progress.unlocked = Math.max(state.progress.unlocked, Math.min(cur.index + 1, LEVELS.length));
    if (lvl.boss) state.progress.medals[lvl.cycle] = true;
    save();
    $('#lvl-total').textContent = totalScore();

    const isLast = cur.index === LEVELS.length - 1;
    sfx(lvl.boss ? 'medal' : 'level');
    const starsHtml = '<div class="big-stars">' + '★'.repeat(stars) + '<span>' + '☆'.repeat(3 - stars) + '</span></div>';
    const summary = '<p class="result-line">Puntaje: <b>' + score + '</b> · Errores: ' + cur.totalErrors + ' · Pistas: ' + cur.totalHints + '</p>';

    if (isLast) {
      const medals = ['bronce', 'plata', 'oro'].map((c) => '<span class="medal won">' + CYCLES[c].medal + '</span>').join('');
      openModal(
        '<div class="final">' + spriteSVG(state.player.character, 8) + '<h2>¡TODOS LOS COMPUTADORES RESCATADOS!</h2>' +
        '<p>' + esc(state.player.name) + ', dominaste la terminal de Linux.</p>' + starsHtml + summary +
        '<div class="medal-row">' + medals + '</div><p class="result-line big">Puntaje total: <b>' + totalScore() + '</b></p></div>',
        [{ label: '📖 Ver glosario', cls: 'btn-ghost', fn: () => { closeModal(); openGlossary(); } },
          { label: 'Volver al pasillo', cls: 'btn-primary', fn: () => { closeModal(); renderMap(); showScreen('screen-map'); } }]
      );
      return;
    }

    const next = LEVELS[cur.index + 1];
    if (lvl.boss) {
      openModal(
        '<div class="medal-win"><div class="medal-big">' + cyc.medal + '</div><h2>¡' + cyc.name.toUpperCase() + ' COMPLETADO!</h2>' +
        '<p>Ganaste la medalla de ' + lvl.cycle + '.</p>' + starsHtml + summary +
        '<p class="upgrade">Próxima época: <b>' + CYCLES[next.cycle].era + '</b> — ' + CYCLES[next.cycle].modeLabel + '</p></div>',
        [{ label: 'Pasillo', cls: 'btn-ghost', fn: () => { closeModal(); renderMap(); showScreen('screen-map'); } },
          { label: '¡Mejorar el equipo! ▶', cls: 'btn-primary', fn: () => { closeModal(); startLevel(cur.index + 1); } }]
      );
    } else {
      openModal(
        '<h2>✔ ' + esc(lvl.code) + ' reparado</h2><p>' + esc(lvl.title) + '</p>' + starsHtml + summary,
        [{ label: 'Pasillo', cls: 'btn-ghost', fn: () => { closeModal(); renderMap(); showScreen('screen-map'); } },
          { label: 'Siguiente nivel ▶', cls: 'btn-primary', fn: () => { closeModal(); startLevel(cur.index + 1); } }]
      );
    }
  }

  /* ------------------------- Panel de explicación ------------------------ */
  function breakdownTable(rows) {
    return '<table class="breakdown"><tbody>' + rows.map((r) =>
      '<tr><td><code>' + esc(r[0]) + '</code></td><td>' + esc(r[1]) + '</td></tr>').join('') + '</tbody></table>';
  }
  function tokensTable(tokens) {
    return '<table class="breakdown user"><tbody>' + tokens.map((t) =>
      '<tr class="k-' + t.kind + '"><td><code>' + esc(t.token) + '</code></td><td>' + esc(t.meaning) + '</td></tr>').join('') + '</tbody></table>';
  }

  function renderExplainPlaceholder() {
    const step = currentStep();
    const drag = isDrag();
    $('#explain-panel').className = 'explain-panel';
    $('#explain-panel').innerHTML =
      '<h3>📘 Panel de explicación</h3>' +
      '<p class="muted">Cuando ejecutes un comando, aquí verás <b>por qué</b> funciona (o por qué no), desglosando cada parte.</p>' +
      '<div class="how"><b>Cómo jugar este nivel</b><p>' + (drag
        ? 'Arrastra las piezas a la línea de comandos (o haz clic en ellas) en el orden correcto y pulsa <kbd>▶ Ejecutar</kbd>. Sobran piezas: ¡no todas sirven!'
        : 'Escribe el comando completo en la terminal y presiona <kbd>Enter</kbd>. Usa <kbd>↑</kbd> para repetir el anterior, <code>help</code> para ver la misión y <code>clear</code> para limpiar.') +
      '</p></div><p class="muted small">Vidas: ' + MAX_LIVES + ' por nivel · Pistas por falla: ' + Math.min(hintsAllowed(), step.hints.length) + ' (cada una resta ' + SCORE.hint + ' pts).</p>';
  }

  function alternativesHtml(step) {
    if (!step.alternatives || !step.alternatives.length) return '';
    return '<h4>Otras formas válidas</h4><ul class="alts">' + step.alternatives.map((a) =>
      '<li><code>' + esc(a.cmd) + '</code> <span>— ' + esc(a.note) + '</span></li>').join('') + '</ul>';
  }

  function renderExplainSuccess(cmd, pts) {
    const step = currentStep();
    const ex = step.explanation;
    const official = Validator.normalize(cmd) === Validator.normalize(step.accepted[0]);
    const p = $('#explain-panel');
    p.className = 'explain-panel success';
    p.innerHTML =
      '<h3>✔ ¡Correcto! <span class="pts">+' + pts + ' pts</span></h3>' +
      '<p class="your">Tu comando: <code>' + esc(cmd) + '</code></p>' +
      (official ? '' : '<p class="muted small">Solución de referencia: <code>' + esc(step.accepted[0]) + '</code></p>') +
      '<h4>¿Por qué funciona?</h4><p>' + esc(ex.summary) + '</p>' +
      '<h4>Desglose del comando</h4>' + breakdownTable(ex.breakdown) +
      alternativesHtml(step) +
      '<div class="tip">💡 ' + esc(ex.tip) + '</div>';
  }

  function renderExplainError(cmd, res) {
    const p = $('#explain-panel');
    p.className = 'explain-panel ' + (res.costsLife ? 'error' : 'near');
    p.innerHTML =
      '<h3>' + (res.type === 'danger' ? '⛔ Comando peligroso' : res.costsLife ? '✖ Todavía no' : '… ¡Casi!') +
      (res.costsLife ? ' <span class="pts neg">−1 ♥</span>' : '') + '</h3>' +
      '<p class="diag">' + esc(res.message) + '</p>' +
      '<p class="your">Tu comando: <code>' + esc(cmd) + '</code></p>' +
      '<h4>Lo que hace realmente lo que escribiste</h4>' + tokensTable(res.breakdown) +
      '<p class="muted small">Te quedan ' + state.current.lives + ' vida(s). ' + (Number($('#hints-left').textContent) > 0 ? 'Si te atascas, usa una 💡 pista.' : '') + '</p>';
  }

  function renderExplainGameOver(cmd, res) {
    const step = currentStep();
    const ex = step.explanation;
    const p = $('#explain-panel');
    p.className = 'explain-panel error';
    p.innerHTML =
      '<h3>💀 Sin vidas</h3>' +
      '<p class="diag">' + esc(res.message) + '</p>' +
      '<h4>Lo que hace lo que escribiste</h4>' + tokensTable(res.breakdown) +
      '<h4>La solución era</h4><p class="solution"><code>' + esc(step.accepted[0]) + '</code></p>' +
      '<p>' + esc(ex.summary) + '</p>' + breakdownTable(ex.breakdown) + alternativesHtml(step) +
      '<div class="tip">💡 ' + esc(ex.tip) + '</div>';
  }

  /* -------------------------------- Modal -------------------------------- */
  function openModal(html, buttons) {
    $('#modal').classList.remove('wide');
    $('#modal-content').innerHTML = html;
    const bar = $('#modal-actions');
    bar.innerHTML = '';
    (buttons || [{ label: 'Cerrar', cls: 'btn-primary', fn: closeModal }]).forEach((b) => {
      const btn = el('button', 'btn ' + (b.cls || ''), b.label);
      btn.type = 'button';
      btn.addEventListener('click', b.fn);
      bar.appendChild(btn);
    });
    $('#modal').classList.add('show');
    const first = bar.querySelector('.btn-primary') || bar.querySelector('button');
    if (first) setTimeout(() => first.focus(), 30);
  }
  function closeModal() { $('#modal').classList.remove('show', 'wide'); }

  /* ------------------------------- Glosario ------------------------------ */
  function learnedCommands() {
    const learned = new Set();
    LEVELS.forEach((lvl) => {
      if (state.progress.best[lvl.id] === undefined) return;
      lvl.steps.forEach((s) => s.accepted.forEach((a) => Validator.commandsOf(Validator.normalize(a)).forEach((c) => learned.add(c))));
    });
    return learned;
  }
  function openGlossary() {
    const learned = learnedCommands();
    const cards = Object.keys(GLOSSARY.commands).map((k) => {
      const c = GLOSSARY.commands[k];
      const opts = Object.assign({}, c.flags || {}, c.args || {});
      const optsHtml = Object.keys(opts).length
        ? '<ul>' + Object.keys(opts).map((o) => '<li><code>' + esc(o) + '</code> ' + esc(opts[o]) + '</li>').join('') + '</ul>' : '';
      return '<div class="g-card ' + (learned.has(k) ? 'learned' : '') + '"><div class="g-head"><code class="g-cmd">' + k + '</code>' +
        (learned.has(k) ? '<span class="g-badge">✔ aprendido</span>' : '') + '</div><p>' + esc(c.desc) + '</p>' +
        '<p class="g-syn">Sintaxis: <code>' + esc(c.syntax) + '</code> · Ej: <code>' + esc(c.example) + '</code></p>' + optsHtml + '</div>';
    }).join('');
    const ops = Object.keys(GLOSSARY.operators).map((o) => '<li><code>' + esc(o) + '</code> ' + esc(GLOSSARY.operators[o]) + '</li>').join('');
    openModal('<h2>📖 Glosario de comandos</h2><p class="muted">' + learned.size + ' de ' + Object.keys(GLOSSARY.commands).length +
      ' comandos aprendidos en tus rescates.</p><div class="glossary">' + cards + '</div><h3>Operadores de la shell</h3><ul class="ops">' + ops + '</ul>');
    $('#modal').classList.add('wide');
  }

  /* ------------------------------- Eventos ------------------------------- */
  function bindEvents() {
    document.querySelectorAll('.char-option').forEach((btn) => btn.addEventListener('click', () => {
      state.player.character = btn.dataset.char;
      document.querySelectorAll('.char-option').forEach((b) => b.classList.toggle('selected', b === btn));
    }));
    $('#btn-new').addEventListener('click', () => startGame(true));
    $('#btn-continue').addEventListener('click', () => startGame(false));
    $('#player-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') startGame(state.progress.unlocked === 0); });
    document.querySelectorAll('[data-action="glossary"]').forEach((b) => b.addEventListener('click', openGlossary));
    $('#btn-map-home').addEventListener('click', () => { renderStart(); showScreen('screen-start'); });
    $('#btn-lvl-map').addEventListener('click', () => { renderMap(); showScreen('screen-map'); });

    $('#btn-run').addEventListener('click', run);
    $('#btn-hint').addEventListener('click', useHint);
    $('#btn-clear').addEventListener('click', () => {
      const d = state.current.drag;
      d.bank = d.bank.concat(d.line);
      d.line = [];
      renderDrag();
    });
    $('#btn-next').addEventListener('click', nextStep);
    $('#btn-retry').addEventListener('click', () => beginLevel(state.current.index));

    const input = $('#cmd-input');
    input.addEventListener('keydown', (e) => {
      const cur = state.current;
      if (e.key.length === 1 || e.key === 'Backspace') sfx('key');
      if (e.key === 'Enter') { e.preventDefault(); run(); }
      else if (e.key === 'ArrowUp' && cur.history.length) {
        e.preventDefault();
        cur.histPos = Math.max(0, cur.histPos - 1);
        input.value = cur.history[cur.histPos];
      } else if (e.key === 'ArrowDown' && cur.history.length) {
        e.preventDefault();
        cur.histPos = Math.min(cur.history.length, cur.histPos + 1);
        input.value = cur.history[cur.histPos] || '';
      }
    });
    $('#terminal').addEventListener('click', () => { if (!isDrag() && !input.disabled) input.focus(); });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && $('#modal').classList.contains('show')) closeModal();
      if (e.key === 'Enter' && document.body.dataset.screen === 'screen-level' && state.current && isDrag()
        && !$('#modal').classList.contains('show') && document.activeElement.tagName !== 'BUTTON') run();
    });
    window.addEventListener('resize', () => {
      if (document.body.dataset.screen === 'screen-map') placeWalker(Math.min(state.progress.unlocked, LEVELS.length - 1), false);
    });
    setupDropTargets();

    /* Clic sonoro en botones (Ejecutar y Pista ya tienen su propio sonido) */
    document.addEventListener('click', (e) => {
      const b = e.target.closest('.btn, .char-option, .pc-slot');
      if (b && !b.disabled && b.id !== 'btn-run' && b.id !== 'btn-hint') sfx('click');
    });

    /* Controles de sonido y música */
    const paintSound = () => {
      if (!window.Sound) { $('#sound-controls').hidden = true; return; }
      $('#btn-sfx').classList.toggle('off', !window.Sound.prefs.sfx);
      $('#btn-music').classList.toggle('off', !window.Sound.prefs.music);
      $('#btn-sfx').title = window.Sound.prefs.sfx ? 'Silenciar efectos' : 'Activar efectos';
      $('#btn-music').title = window.Sound.prefs.music ? 'Silenciar música' : 'Activar música';
    };
    $('#btn-sfx').addEventListener('click', () => { window.Sound.toggleSfx(); paintSound(); });
    $('#btn-music').addEventListener('click', () => { window.Sound.toggleMusic(); paintSound(); });
    paintSound();
  }

  /* -------------------------------- Inicio ------------------------------- */
  function init() {
    load();
    bindEvents();
    renderStart();
    showScreen('screen-start');
  }

  /* API mínima expuesta para pruebas y depuración desde la consola */
  window.LinuxRescue = { state: state, startLevel: startLevel, renderMap: renderMap, resetProgress: resetProgress };

  document.addEventListener('DOMContentLoaded', init);
})();
