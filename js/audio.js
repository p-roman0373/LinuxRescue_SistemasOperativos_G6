/* =========================================================================
 * LINUX RESCUE - Sonido y música 8 bits
 * -------------------------------------------------------------------------
 * Todo el audio se sintetiza en tiempo real con la Web Audio API
 * (osciladores de onda cuadrada, triangular y diente de sierra), igual que
 * las consolas de los años 80. No hay archivos de audio que descargar.
 *
 *   Sound.play('success')   -> efecto de sonido
 *   Sound.music('bronce')   -> cambia la música de fondo ('menu', 'bronce',
 *                              'plata', 'oro' o null para silencio)
 *   Sound.toggleSfx() / Sound.toggleMusic()
 *
 * Los navegadores solo permiten sonido después de una interacción del
 * usuario, por eso el audio arranca con el primer clic o tecla.
 * ========================================================================= */
(function () {
  'use strict';

  const PREFS_KEY = 'linuxRescue.audio.v1';
  const VOL = { master: 0.7, sfx: 0.32, music: 0.10 };
  const prefs = { sfx: true, music: true };
  try { Object.assign(prefs, JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')); } catch (e) { /* sin almacenamiento */ }

  let ctx = null, master = null, sfxBus = null, musicBus = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = VOL.master; master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = prefs.sfx ? VOL.sfx : 0; sfxBus.connect(master);
      musicBus = ctx.createGain(); musicBus.gain.value = prefs.music ? VOL.music : 0; musicBus.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* Convierte una nota MIDI (60 = Do central) en frecuencia */
  const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

  function tone(freq, start, dur, type, vol, bus, slideTo) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, start);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol === undefined ? 0.8 : vol, start + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g);
    g.connect(bus || sfxBus);
    o.start(start);
    o.stop(start + dur + 0.03);
  }

  function noise(start, dur, vol) {
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    g.gain.value = vol || 0.3;
    src.buffer = buf;
    src.connect(g);
    g.connect(sfxBus);
    src.start(start);
  }

  /* ------------------------- Efectos de sonido -------------------------- */
  const SFX = {
    click: (t) => tone(1046, t, 0.045, 'square', 0.35),
    pick: (t) => { tone(659, t, 0.05, 'square', 0.5); tone(988, t + 0.045, 0.06, 'square', 0.5); },
    key: (t) => tone(1500 + Math.random() * 400, t, 0.018, 'square', 0.12),
    step: (t) => tone(140, t, 0.035, 'square', 0.35),
    walk: (t) => { for (let i = 0; i < 6; i++) tone(i % 2 ? 160 : 130, t + i * 0.13, 0.035, 'square', 0.35); },
    success: (t) => [72, 76, 79, 84].forEach((m, i) => tone(hz(m), t + i * 0.075, i === 3 ? 0.3 : 0.12, 'square', 0.6)),
    error: (t) => { tone(220, t, 0.14, 'sawtooth', 0.55); tone(155, t + 0.14, 0.28, 'sawtooth', 0.55); },
    near: (t) => { tone(hz(74), t, 0.1, 'triangle', 0.7); tone(hz(72), t + 0.12, 0.16, 'triangle', 0.7); },
    hint: (t) => [88, 91, 96].forEach((m, i) => tone(hz(m), t + i * 0.06, 0.14, 'triangle', 0.5)),
    danger: (t) => { for (let i = 0; i < 4; i++) { tone(880, t + i * 0.2, 0.1, 'square', 0.55); tone(587, t + i * 0.2 + 0.1, 0.1, 'square', 0.55); } },
    level: (t) => {
      [[72, 0.1], [72, 0.1], [72, 0.1], [77, 0.35], [76, 0.12], [77, 0.12], [84, 0.5]].reduce((acc, n) => {
        tone(hz(n[0]), t + acc, n[1], 'square', 0.55); return acc + n[1] + 0.02;
      }, 0);
    },
    medal: (t) => {
      [[67, 0.12], [72, 0.12], [76, 0.12], [79, 0.3], [76, 0.12], [79, 0.6]].reduce((acc, n) => {
        tone(hz(n[0]), t + acc, n[1], 'square', 0.55);
        tone(hz(n[0] - 12), t + acc, n[1], 'triangle', 0.5);
        return acc + n[1] + 0.03;
      }, 0);
      [84, 88, 91, 96].forEach((m, i) => tone(hz(m), t + 1.55 + i * 0.07, 0.25, 'triangle', 0.4));
    },
    gameover: (t) => [67, 66, 65, 64, 60].forEach((m, i) => tone(hz(m), t + i * 0.22, i === 4 ? 0.7 : 0.2, 'square', 0.5)),
    boot: (t) => {
      tone(80, t, 0.9, 'sawtooth', 0.35, null, 1600);
      noise(t, 0.35, 0.18);
      [60, 64, 67, 72, 76].forEach((m, i) => tone(hz(m), t + 1.0 + i * 0.09, 0.15, 'square', 0.45));
    }
  };

  function play(name) {
    if (!prefs.sfx || !SFX[name] || !ensure()) return;
    try { SFX[name](ctx.currentTime + 0.01); } catch (e) { /* audio no disponible */ }
  }

  /* ------------------------------ Música ------------------------------- */
  /* Cada canción: 32 pasos de corchea. 0 = silencio. Números = notas MIDI. */
  const SONGS = {
    menu: {
      bpm: 116, lead: 'square', bass: 'triangle',
      melody: [72, 0, 76, 0, 79, 0, 76, 0, 77, 0, 74, 0, 71, 0, 74, 0, 72, 0, 76, 0, 79, 0, 84, 0, 83, 0, 79, 0, 74, 0, 0, 0],
      bassline: [48, 0, 60, 0, 48, 0, 60, 0, 53, 0, 65, 0, 55, 0, 67, 0, 48, 0, 60, 0, 48, 0, 60, 0, 55, 0, 67, 0, 55, 0, 67, 0]
    },
    bronce: {
      bpm: 100, lead: 'triangle', bass: 'square',
      melody: [69, 0, 72, 0, 76, 0, 72, 0, 74, 0, 72, 0, 71, 0, 67, 0, 69, 0, 72, 0, 76, 0, 79, 0, 77, 0, 76, 0, 74, 0, 0, 0],
      bassline: [45, 0, 0, 45, 52, 0, 45, 0, 41, 0, 0, 41, 48, 0, 41, 0, 43, 0, 0, 43, 50, 0, 43, 0, 45, 0, 0, 45, 52, 0, 45, 0]
    },
    plata: {
      bpm: 112, lead: 'triangle', bass: 'triangle',
      melody: [74, 0, 77, 81, 0, 79, 77, 0, 76, 0, 72, 0, 74, 0, 0, 0, 74, 0, 77, 81, 0, 84, 81, 0, 79, 0, 77, 0, 76, 0, 74, 0],
      bassline: [50, 0, 57, 0, 50, 0, 57, 0, 48, 0, 55, 0, 48, 0, 55, 0, 46, 0, 53, 0, 46, 0, 53, 0, 45, 0, 52, 0, 45, 0, 52, 0]
    },
    oro: {
      bpm: 148, lead: 'square', bass: 'sawtooth',
      melody: [76, 79, 83, 79, 76, 79, 83, 88, 86, 83, 79, 83, 81, 78, 74, 78, 76, 79, 83, 79, 76, 79, 83, 88, 91, 88, 86, 83, 81, 83, 79, 0],
      bassline: [40, 52, 40, 52, 40, 52, 40, 52, 36, 48, 36, 48, 38, 50, 38, 50, 40, 52, 40, 52, 40, 52, 40, 52, 36, 48, 36, 48, 38, 50, 38, 50]
    }
  };

  let track = null, step = 0, nextTime = 0, timer = null;

  function scheduler() {
    const song = SONGS[track];
    if (!song || !ctx) return;
    const stepDur = 60 / song.bpm / 2;
    while (nextTime < ctx.currentTime + 0.12) {
      const m = song.melody[step % 32];
      const b = song.bassline[step % 32];
      if (m) tone(hz(m), nextTime, stepDur * 0.9, song.lead, 0.5, musicBus);
      if (b) tone(hz(b), nextTime, stepDur * 0.95, song.bass, 0.7, musicBus);
      if (track === 'oro' && step % 2 === 0) tone(60, nextTime, 0.05, 'square', 0.4, musicBus, 30);
      nextTime += stepDur;
      step++;
    }
  }

  function startScheduler() {
    if (timer || !track || !prefs.music || !ctx) return;
    step = 0;
    nextTime = ctx.currentTime + 0.05;
    timer = setInterval(scheduler, 25);
  }
  function stopScheduler() { clearInterval(timer); timer = null; }

  function music(name) {
    if (name === track) return;
    track = name;
    stopScheduler();
    if (name && prefs.music && ctx && ctx.state !== 'closed') startScheduler();
  }

  /* -------------------------- Preferencias ----------------------------- */
  function savePrefs() { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) { /* nada */ } }

  function toggleSfx() {
    prefs.sfx = !prefs.sfx;
    if (ensure()) sfxBus.gain.value = prefs.sfx ? VOL.sfx : 0;
    savePrefs();
    if (prefs.sfx) play('click');
    return prefs.sfx;
  }
  function toggleMusic() {
    prefs.music = !prefs.music;
    if (ensure()) musicBus.gain.value = prefs.music ? VOL.music : 0;
    if (prefs.music) startScheduler(); else stopScheduler();
    savePrefs();
    return prefs.music;
  }

  /* El audio arranca con la primera interacción del usuario */
  function unlock() {
    if (!ensure()) return;
    startScheduler();
  }
  ['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, unlock, { passive: true }));

  window.Sound = { play: play, music: music, toggleSfx: toggleSfx, toggleMusic: toggleMusic, prefs: prefs };
})();
