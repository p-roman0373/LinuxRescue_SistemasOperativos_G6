/* =========================================================================
 * LINUX RESCUE - Validador de comandos
 * -------------------------------------------------------------------------
 * Compara lo que escribe (o arma) el jugador con las soluciones aceptadas
 * de cada paso. NUNCA ejecuta comandos reales: solo analiza texto.
 *
 * Etapas de validación (en este orden):
 *   1. Normalización   -> espacios, comillas, banderas combinadas, "./", "/"
 *   2. Comando peligroso -> rm -rf /, fork bomb, mkfs, dd...
 *   3. Solución aceptada -> acierto
 *   4. Casi correcto (nearMiss) -> mensaje específico del nivel
 *   5. Diagnóstico genérico -> orden no encontrada, argumentos, orden, etc.
 * ========================================================================= */
(function (root) {
  'use strict';

  const OPERATORS = ['&&', '||', '|', ';'];

  const DANGER_PATTERNS = [
    { re: /\brm\s+(-\S+\s+)*(\/|\/\*)(\s|$)/, why: 'borraría la raíz «/», es decir, TODO el sistema operativo' },
    { re: /:\(\)\s*\{.*\};?\s*:/, why: 'es una "fork bomb": crea procesos sin fin hasta congelar el equipo' },
    { re: /\bmkfs(\.\w+)?\b/, why: 'formatearía una partición y borraría todos sus datos' },
    { re: /\bdd\s+.*of=\/dev\//, why: 'escribiría directamente sobre el disco y destruiría su contenido' },
    { re: /\bchmod\s+(-R\s+)?777\s+\/(\s|$)/, why: 'daría todos los permisos a cualquiera sobre todo el sistema' }
  ];

  /** Separa el texto en tokens, aislando operadores (&&, ||, |, ;). */
  function tokenize(cmd) {
    let s = String(cmd || '')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .trim();
    s = s.replace(/\s*(&&|\|\||\||;)\s*/g, ' $1 ');
    s = s.replace(/["']/g, '');
    s = s.replace(/\s+/g, ' ').trim();
    s = s.replace(/\s*;$/, '').trim();
    return s ? s.split(' ') : [];
  }

  /**
   * Normaliza un comando para poder compararlo:
   *  - un espacio entre tokens y alrededor de operadores
   *  - quita comillas ("ERROR" == ERROR)
   *  - ordena banderas cortas combinadas (-hs == -sh, -fr == -rf)
   *  - quita "/" final en rutas (documentos/ == documentos) y "./" inicial
   */
  function normalize(cmd) {
    const tokens = tokenize(cmd);
    let first = true;
    return tokens.map(function (t) {
      if (OPERATORS.indexOf(t) !== -1) { first = true; return t; }
      if (first) { first = false; return t; }
      let r = t;
      if (/^-[a-z]{2,}$/.test(r)) r = '-' + r.slice(1).split('').sort().join('');
      if (r.length > 1 && /\/$/.test(r)) r = r.replace(/\/+$/, '');
      if (r.indexOf('./') === 0 && r.length > 2) r = r.slice(2);
      return r;
    }).join(' ');
  }

  /** Divide en segmentos (comandos simples) separados por operadores. */
  function segments(normalized) {
    const out = [[]];
    normalized.split(' ').forEach(function (t) {
      if (!t) return;
      if (OPERATORS.indexOf(t) !== -1) out.push([]);
      else out[out.length - 1].push(t);
    });
    return out.filter(function (s) { return s.length; });
  }

  function commandsOf(normalized) {
    return segments(normalized).map(function (s) { return s[0]; });
  }

  function operatorsOf(normalized) {
    return normalized.split(' ').filter(function (t) { return OPERATORS.indexOf(t) !== -1; });
  }

  /** Distancia de Levenshtein para sugerir "¿Quisiste decir...?" */
  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const d = [];
    for (let i = 0; i <= m; i++) { d[i] = [i]; }
    for (let j = 0; j <= n; j++) { d[0][j] = j; }
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      }
    }
    return d[m][n];
  }

  function suggest(word, glossary) {
    let best = null, bestD = Infinity;
    Object.keys(glossary.commands).forEach(function (c) {
      const dist = levenshtein(word.toLowerCase(), c);
      if (dist < bestD) { bestD = dist; best = c; }
    });
    return bestD <= 2 ? best : null;
  }

  function isKnown(cmd, glossary) {
    return Object.prototype.hasOwnProperty.call(glossary.commands, cmd) || glossary.extras.indexOf(cmd) !== -1;
  }

  /**
   * Explica token por token lo que hace un comando (se usa cuando el
   * jugador falla, para mostrarle qué hace realmente lo que escribió).
   */
  function explainTokens(cmd, glossary) {
    const tokens = tokenize(cmd);
    const result = [];
    let current = null;
    let expectCommand = true;
    tokens.forEach(function (t) {
      if (OPERATORS.indexOf(t) !== -1) {
        result.push({ token: t, kind: 'op', meaning: glossary.operators[t] });
        expectCommand = true;
        return;
      }
      if (expectCommand) {
        expectCommand = false;
        current = glossary.commands[t] || null;
        if (current) result.push({ token: t, kind: 'cmd', meaning: current.desc });
        else if (glossary.extras.indexOf(t) !== -1) result.push({ token: t, kind: 'cmd', meaning: 'comando real de Linux, pero no forma parte de este reto.' });
        else result.push({ token: t, kind: 'unknown', meaning: 'no es un comando conocido: la shell respondería «orden no encontrada».' });
        return;
      }
      const flags = (current && current.flags) || {};
      const args = (current && current.args) || {};
      if (flags[t]) { result.push({ token: t, kind: 'flag', meaning: flags[t] }); return; }
      if (args[t]) { result.push({ token: t, kind: 'arg', meaning: args[t] }); return; }
      if (/^-[a-zA-Z]{2,}$/.test(t)) {
        const parts = t.slice(1).split('').map(function (ch) {
          const m = flags['-' + ch];
          return '-' + ch + ': ' + (m || 'opción no reconocida aquí');
        });
        result.push({ token: t, kind: 'flag', meaning: 'banderas combinadas → ' + parts.join(' · ') });
        return;
      }
      if (t.charAt(0) === '-') { result.push({ token: t, kind: 'flag', meaning: 'opción que no se usa en este reto.' }); return; }
      if (t === '*') { result.push({ token: t, kind: 'arg', meaning: 'comodín: la shell lo reemplaza por todos los archivos del directorio.' }); return; }
      if (/^\d+$/.test(t)) { result.push({ token: t, kind: 'arg', meaning: 'número: normalmente un PID (identificador de proceso) o permisos en octal.' }); return; }
      result.push({ token: t, kind: 'arg', meaning: 'argumento: nombre de archivo, carpeta o patrón de texto.' });
    });
    return result;
  }

  function sameArray(a, b) {
    return a.length === b.length && a.every(function (v, i) { return v === b[i]; });
  }

  /**
   * Valida la entrada del jugador contra un paso del nivel.
   * Devuelve: { ok, type, message, terminal, costsLife, breakdown }
   */
  function validate(input, step, glossary) {
    const n = normalize(input);
    const breakdown = explainTokens(input, glossary);

    if (!n) {
      return { ok: false, type: 'empty', costsLife: false, message: 'Arma o escribe un comando antes de ejecutar.', terminal: '', breakdown: [] };
    }

    for (let i = 0; i < DANGER_PATTERNS.length; i++) {
      if (DANGER_PATTERNS[i].re.test(n) || DANGER_PATTERNS[i].re.test(String(input))) {
        return {
          ok: false, type: 'danger', costsLife: true, breakdown: breakdown,
          terminal: '⛔ COMANDO BLOQUEADO POR LINUX RESCUE',
          message: '¡ALTO! Ese comando ' + DANGER_PATTERNS[i].why + '. Aquí no pasa nada porque la terminal es simulada, pero en un equipo real sería catastrófico.'
        };
      }
    }

    const accepted = step.accepted.map(normalize);
    if (accepted.indexOf(n) !== -1) {
      return { ok: true, type: 'ok', costsLife: false, message: '¡Correcto!', terminal: '', breakdown: breakdown };
    }

    const near = (step.nearMiss || []).filter(function (nm) { return normalize(nm.cmd) === n; })[0];
    if (near) {
      return { ok: false, type: 'near', costsLife: !!near.costsLife, message: near.msg, terminal: near.costsLife ? '✖ ' + near.msg : '… ' + near.msg, breakdown: breakdown };
    }

    const cmds = commandsOf(n);
    const expected = commandsOf(accepted[0]);

    const unknown = cmds.filter(function (c) { return !isKnown(c, glossary); });
    if (unknown.length) {
      const s = suggest(unknown[0], glossary);
      return {
        ok: false, type: 'notfound', costsLife: true, breakdown: breakdown,
        terminal: 'bash: ' + unknown[0] + ': orden no encontrada',
        message: '«' + unknown[0] + '» no es un comando de Linux.' + (s ? ' ¿Quisiste decir «' + s + '»?' : ' Revisa cómo está escrito.')
      };
    }

    if (sameArray(cmds, expected)) {
      const opsUser = operatorsOf(n), opsExp = operatorsOf(accepted[0]);
      const msg = sameArray(opsUser, opsExp)
        ? 'Vas por buen camino: los comandos son los correctos, pero algún argumento u opción no es el esperado. Revisa nombres de archivos, mayúsculas y opciones.'
        : 'Los comandos son correctos, pero revisa el operador que los une (&&, | o ;).';
      return { ok: false, type: 'args', costsLife: true, breakdown: breakdown, terminal: cmds[0] + ': la falla sigue sin resolverse', message: msg };
    }

    const allExpected = cmds.every(function (c) { return expected.indexOf(c) !== -1; });
    if (allExpected && cmds.length < expected.length) {
      return { ok: false, type: 'incomplete', costsLife: true, breakdown: breakdown, terminal: 'La falla se resolvió solo en parte', message: 'Vas bien, pero la misión necesita más de un comando. Vuelve a leerla: ¿qué falta hacer?' };
    }
    if (allExpected && cmds.length === expected.length) {
      return { ok: false, type: 'order', costsLife: true, breakdown: breakdown, terminal: 'El resultado no es el esperado', message: 'Tienes los comandos correctos, pero en otro orden. Piensa qué debe pasar primero.' };
    }

    const info = glossary.commands[cmds[0]];
    return {
      ok: false, type: 'wrong', costsLife: true, breakdown: breakdown,
      terminal: cmds[0] + ': la falla sigue sin resolverse',
      message: '«' + cmds[0] + '» existe, pero no resuelve esta falla.' + (info ? ' Recuerda: ' + info.desc : '')
    };
  }

  const Validator = { normalize: normalize, tokenize: tokenize, segments: segments, commandsOf: commandsOf, explainTokens: explainTokens, validate: validate, levenshtein: levenshtein };

  root.Validator = Validator;
  if (typeof module !== 'undefined' && module.exports) module.exports = Validator;
})(typeof window !== 'undefined' ? window : globalThis);
