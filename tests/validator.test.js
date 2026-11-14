/* =========================================================================
 * LINUX RESCUE - Pruebas automáticas del validador y de los datos
 * Ejecutar con:  node tests/validator.test.js
 * ========================================================================= */
const { LEVELS, GLOSSARY, CYCLES } = require('../js/levels.js');
const V = require('../js/validator.js');

let pass = 0, fail = 0;
const rows = [];

function check(id, desc, input, cond, detail) {
  const ok = !!cond;
  ok ? pass++ : fail++;
  rows.push({ id, desc, input, ok, detail });
}

/* 1. Estructura de los datos */
check('D-01', 'Hay 9 niveles (3 por ciclo)', '-', LEVELS.length === 9);
['bronce', 'plata', 'oro'].forEach((c, i) => {
  const lv = LEVELS.filter(l => l.cycle === c);
  check('D-0' + (i + 2), 'Ciclo ' + c + ': 2 niveles + 1 jefe', '-', lv.length === 3 && lv.filter(l => l.boss).length === 1);
});
check('D-05', 'Bronce usa arrastrar y soltar; Plata y Oro escribir', '-', CYCLES.bronce.mode === 'drag' && CYCLES.plata.mode === 'type' && CYCLES.oro.mode === 'type');
LEVELS.forEach(l => l.steps.forEach((s, si) => {
  const okData = s.accepted.length && s.hints.length && s.explanation && s.explanation.breakdown.length;
  check('D-L' + l.id + '.' + (si + 1), 'Paso completo (soluciones, pistas, explicación)', l.code + ' paso ' + (si + 1), okData);
  if (CYCLES[l.cycle].mode === 'drag') {
    /* La solución oficial debe poder armarse con las piezas disponibles */
    const bag = s.pieces.slice();
    const buildable = V.tokenize(s.accepted[0]).every(t => {
      const i = bag.indexOf(t); if (i === -1) return false; bag.splice(i, 1); return true;
    });
    check('D-P' + l.id + '.' + (si + 1), 'La solución se puede armar con las piezas', s.accepted[0], buildable);
  }
}));

/* 2. Todas las soluciones aceptadas validan como correctas */
LEVELS.forEach(l => l.steps.forEach((s, si) => {
  s.accepted.forEach(a => {
    const r = V.validate(a, s, GLOSSARY);
    check('A-L' + l.id + '.' + (si + 1), 'Solución aceptada (' + l.code + ')', a, r.ok, r.type);
  });
  (s.nearMiss || []).forEach(nm => {
    const r = V.validate(nm.cmd, s, GLOSSARY);
    check('N-L' + l.id + '.' + (si + 1), 'Respuesta casi correcta da mensaje específico', nm.cmd, !r.ok && (r.type === 'near' || r.type === 'danger'), r.type);
  });
}));

/* 3. Normalización */
const L1 = LEVELS[0].steps[0], L4 = LEVELS[3].steps[0], B2 = LEVELS[5].steps[1], B3 = LEVELS[5].steps[2], L8 = LEVELS[7].steps[0], F3 = LEVELS[8].steps[2];
check('V-01', 'Ignora espacios extra', '  cd   documentos&&ls ', V.validate('  cd   documentos&&ls ', L1, GLOSSARY).ok);
check('V-02', 'Acepta "/" final en carpetas', 'cd documentos/ && ls', V.validate('cd documentos/ && ls', L1, GLOSSARY).ok);
check('V-03', 'Banderas combinadas en otro orden', 'du -hs *', V.validate('du -hs *', B2, GLOSSARY).ok);
check('V-04', 'Banderas -fr == -rf', 'rm -fr temporales', V.validate('rm -fr temporales', B3, GLOSSARY).ok);
check('V-05', 'Ignora comillas en el patrón', 'grep "ERROR" sistema.log', V.validate('grep "ERROR" sistema.log', L8, GLOSSARY).ok);
check('V-06', 'Acepta ./ antes del archivo', 'rm ./minero.sh', V.validate('rm ./minero.sh', F3, GLOSSARY).ok);

/* 4. Diagnóstico de errores */
let r = V.validate('lss documentos && ls', L1, GLOSSARY);
check('E-01', 'Comando inexistente → orden no encontrada + sugerencia', 'lss documentos && ls', r.type === 'notfound' && /ls/.test(r.message), r.message);
r = V.validate('rm -rf /', L1, GLOSSARY);
check('E-02', 'Comando peligroso bloqueado', 'rm -rf /', r.type === 'danger' && r.costsLife);
r = V.validate(':(){ :|:& };:', L1, GLOSSARY);
check('E-03', 'Fork bomb bloqueada', ':(){ :|:& };:', r.type === 'danger');
r = V.validate('df -k', L4, GLOSSARY);
check('E-04', 'Comando correcto con opción equivocada', 'df -k', r.type === 'args', r.message);
r = V.validate('cat sistema.log | grep WARNING', L8, GLOSSARY);
check('E-05', 'Patrón equivocado en grep', 'cat sistema.log | grep WARNING', r.type === 'args');
r = V.validate('mkdir documentos', L1, GLOSSARY);
check('E-06', 'Comando real que no resuelve la falla', 'mkdir documentos', r.type === 'wrong');
r = V.validate('', L1, GLOSSARY);
check('E-07', 'Entrada vacía no quita vidas', '(vacío)', r.type === 'empty' && !r.costsLife);
r = V.validate('ls documentos', L1, GLOSSARY);
check('E-08', 'Casi correcto no quita vida (salvo si es riesgoso)', 'ls documentos', r.type === 'near' && !r.costsLife);
r = V.validate('kill 1', LEVELS[4].steps[1], GLOSSARY);
check('E-09', 'kill 1 (init) quita vida y advierte', 'kill 1', r.type === 'near' && r.costsLife);
r = V.validate('cd documentos', LEVELS[1].steps[0], GLOSSARY);
check('E-10', 'Comando incompleto en PC-02', 'cd documentos', !r.ok);

/* 5. Explicación token por token */
const ex = V.explainTokens('du -sh * | sort -h', GLOSSARY);
check('X-01', 'Explica comando, banderas, comodín y tubería', 'du -sh * | sort -h', ex.length === 6 && ex[0].kind === 'cmd' && ex[3].kind === 'op');

/* Reporte */
const w = (s, n) => String(s).padEnd(n).slice(0, n);
console.log('\nLINUX RESCUE - Pruebas del validador\n' + '='.repeat(100));
rows.forEach(x => console.log((x.ok ? '✅' : '❌') + ' ' + w(x.id, 8) + w(x.desc, 52) + w(x.input, 38)));
console.log('='.repeat(100));
console.log('Total: ' + (pass + fail) + '   Aprobadas: ' + pass + '   Fallidas: ' + fail + '\n');
process.exit(fail ? 1 : 0);
