"""
LINUX RESCUE - Prueba de extremo a extremo (E2E) en un navegador real.

Juega el juego completo de forma automática, verifica las mecánicas
(arrastrar y soltar, escritura, vidas, pistas, transiciones, medallas)
y guarda capturas de pantalla en la carpeta evidencias/.

Requisitos (opcional, solo para quien quiera repetir la prueba):
    pip install playwright && playwright install chromium
Ejecutar desde la raíz del repositorio:
    python tests/e2e_playwright.py
"""
import json
import pathlib
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
EVID = ROOT / "evidencias"
EVID.mkdir(exist_ok=True)
URL = (ROOT / "index.html").as_uri()

results = []


def check(case_id, desc, cond, detail=""):
    results.append((case_id, desc, bool(cond), detail))
    print(("PASS " if cond else "FAIL ") + case_id + "  " + desc + ("  -> " + str(detail) if detail else ""))


def shot(page, name, full=True):
    page.screenshot(path=str(EVID / name), full_page=full)


def main(chrome_path=None):
    with sync_playwright() as p:
        launch = {"headless": True}
        if chrome_path:
            launch["executable_path"] = chrome_path
        browser = p.chromium.launch(**launch)
        page = browser.new_page(viewport={"width": 1440, "height": 950})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" and "fonts" not in m.text else None)

        page.goto(URL)
        page.evaluate("localStorage.clear()")
        page.reload()
        page.wait_for_timeout(400)
        levels = page.evaluate("JSON.parse(JSON.stringify(LEVELS))")

        # ---------- Pantalla de inicio ----------
        check("UI-01", "Carga la pantalla de inicio", page.is_visible("#screen-start"))
        page.click("#btn-new")
        check("UI-02", "Exige nombre del técnico", page.is_visible("#screen-start") and "nombre" in page.inner_text("#toast").lower())
        page.fill("#player-name", "Paula")
        page.click('.char-option[data-char="nina"]')
        shot(page, "01_inicio_seleccion_personaje.png")
        page.click("#btn-new")
        page.wait_for_timeout(500)
        check("UI-03", "Muestra el pasillo con 9 computadores", page.locator(".pc-slot").count() == 9)
        check("UI-04", "Solo el primer computador está desbloqueado", page.locator(".pc-slot:not([disabled])").count() == 1)
        shot(page, "02_pasillo_computadores.png")

        # ---------- Nivel 1: modo guiado (CRT + arrastrar y soltar) ----------
        page.click('.pc-slot[data-index="0"]')
        page.wait_for_timeout(1700)
        check("UI-05", "Animación de arranque al entrar al ciclo Bronce", page.is_visible("#overlay-transition"))
        shot(page, "03_transicion_arranque_crt.png", full=False)
        page.wait_for_timeout(2300)
        check("UI-06", "Época Bronce aplicada (monitor CRT)", page.evaluate("document.body.dataset.era") == "bronce")
        check("UI-07", "Modo guiado: zona de arrastre visible e input oculto", page.is_visible("#drag-area") and not page.is_visible("#type-row"))

        # Arrastre real con el mouse (HTML5 drag & drop)
        page.drag_and_drop('#piece-bank .piece:text-is("cd")', "#drop-zone")
        page.drag_and_drop('#piece-bank .piece:text-is("documentos")', "#drop-zone")
        check("UI-08", "Arrastrar y soltar mueve piezas a la línea de comandos", page.inner_text("#cmd-preview") == "cd documentos")
        page.click('#drop-zone .piece:text-is("documentos")')
        check("UI-09", "Clic en una pieza la devuelve al banco", page.inner_text("#cmd-preview") == "cd")
        page.click("#btn-clear")

        # Intento incorrecto
        for t in ["mkdir", "documentos"]:
            page.click('#piece-bank .piece:text-is("%s")' % t)
        page.click("#btn-run")
        page.wait_for_timeout(300)
        check("UI-10", "Error resta una vida y explica el comando", page.locator(".heart.lost").count() == 1 and page.is_visible(".explain-panel.error"))
        shot(page, "05_bronce_error_explicacion.png")
        page.click("#btn-clear")

        page.click("#btn-hint")
        check("UI-11", "La pista se muestra en la terminal y descuenta el contador", "Pista 1" in page.inner_text("#term-output") and page.inner_text("#hints-left") == "1")

        for t in ["cd", "documentos", "&&", "ls"]:
            page.click('#piece-bank .piece:text-is("%s")' % t)
        shot(page, "04_bronce_arrastrar_piezas.png")
        page.click("#btn-run")
        page.wait_for_timeout(400)
        check("UI-12", "Acierto: panel con explicación y desglose", page.is_visible(".explain-panel.success") and page.locator(".breakdown tr").count() == 4)
        shot(page, "06_bronce_acierto_explicacion.png")
        page.click("#btn-next")
        page.wait_for_timeout(300)
        check("UI-13", "Modal de nivel completado con estrellas", page.is_visible("#modal.show") and "reparado" in page.inner_text("#modal-content"))
        page.click("#modal-actions .btn-primary")
        page.wait_for_timeout(300)

        def solve_current(level_idx, screenshot_prefix=None):
            lvl = levels[level_idx]
            for si, step in enumerate(lvl["steps"]):
                sol = step["accepted"][0]
                if lvl["cycle"] == "bronce":
                    for t in sol.split(" "):
                        page.click('#piece-bank .piece:text-is("%s")' % t)
                    page.click("#btn-run")
                else:
                    page.fill("#cmd-input", sol)
                    page.press("#cmd-input", "Enter")
                page.wait_for_timeout(250)
                assert page.is_visible(".explain-panel.success"), "No se resolvió %s paso %d" % (lvl["code"], si + 1)
                if screenshot_prefix and si == len(lvl["steps"]) - 1:
                    shot(page, screenshot_prefix)
                page.click("#btn-next")
                page.wait_for_timeout(250)

        # Nivel 2 y Jefe Bronce
        solve_current(1)
        page.click("#modal-actions .btn-primary")
        page.wait_for_timeout(300)
        check("UI-14", "Jefe con varias fallas consecutivas (indicador 1 de 3)", "Falla 1 de 3" in page.inner_text("#step-indicator"))
        solve_current(2, "07_jefe_bronce_completado.png")
        check("UI-15", "Al vencer al jefe se gana la medalla Bronce", "COMPLETADO" in page.inner_text("#modal-content"))
        shot(page, "08_medalla_bronce.png", full=False)
        page.click("#modal-actions .btn-primary")

        # ---------- Transición a Plata ----------
        page.wait_for_timeout(1300)
        check("UI-16", "Transición automática de época al subir de ciclo", page.is_visible("#overlay-transition") and "ACTUALIZACIÓN" in page.inner_text("#tr-title"))
        shot(page, "09_transicion_crt_a_moderno.png", full=False)
        page.wait_for_timeout(1700)
        check("UI-17", "Época Plata aplicada (terminal moderna)", page.evaluate("document.body.dataset.era") == "plata")
        check("UI-18", "Modo experto: input visible y arrastre desactivado", page.is_visible("#cmd-input") and not page.is_visible("#drag-area"))

        page.fill("#cmd-input", "dff -h")
        page.press("#cmd-input", "Enter")
        page.wait_for_timeout(250)
        check("UI-19", "Comando inexistente: 'orden no encontrada' + sugerencia", "orden no encontrada" in page.inner_text("#term-output") and "df" in page.inner_text(".diag"))
        shot(page, "10_plata_error_orden_no_encontrada.png")
        page.press("#cmd-input", "ArrowUp")
        check("UI-20", "Historial con flecha arriba", page.input_value("#cmd-input") == "dff -h")
        page.fill("#cmd-input", "df -h")
        page.press("#cmd-input", "Enter")
        page.wait_for_timeout(250)
        shot(page, "11_plata_acierto_df.png")
        page.click("#btn-next")
        page.wait_for_timeout(250)
        page.click("#modal-actions .btn-primary")
        page.wait_for_timeout(300)
        solve_current(4)
        page.click("#modal-actions .btn-primary")
        page.wait_for_timeout(300)
        solve_current(5, "12_jefe_plata_rm_r.png")
        page.click("#modal-actions .btn-primary")

        # ---------- Transición a Oro ----------
        page.wait_for_timeout(1300)
        shot(page, "13_transicion_moderno_a_gamer.png", full=False)
        page.wait_for_timeout(1700)
        check("UI-21", "Época Oro aplicada (PC gamer)", page.evaluate("document.body.dataset.era") == "oro")
        check("UI-22", "Ciclo Oro tiene solo 1 pista por falla", page.inner_text("#hints-left") == "1")
        page.fill("#cmd-input", "rm -rf /")
        page.press("#cmd-input", "Enter")
        page.wait_for_timeout(250)
        check("UI-23", "Comando peligroso bloqueado con advertencia", "BLOQUEADO" in page.inner_text("#term-output"))
        shot(page, "14_oro_comando_peligroso.png")
        page.fill("#cmd-input", "chmod +x iniciar.sh")
        page.press("#cmd-input", "Enter")
        page.wait_for_timeout(250)
        shot(page, "15_oro_acierto_chmod.png")
        page.click("#btn-next")
        page.wait_for_timeout(250)
        page.click("#modal-actions .btn-primary")
        page.wait_for_timeout(300)
        solve_current(7, "16_oro_tuberia_grep.png")
        page.click("#modal-actions .btn-primary")
        page.wait_for_timeout(300)
        solve_current(8)
        check("UI-24", "Pantalla final con las 3 medallas", "RESCATADOS" in page.inner_text("#modal-content") and page.locator("#modal .medal.won").count() == 3)
        shot(page, "17_final_juego_completado.png", full=False)

        # ---------- Glosario y progreso ----------
        page.click('#modal-actions button:has-text("glosario")')
        page.wait_for_timeout(300)
        check("UI-25", "Glosario marca los comandos aprendidos", page.locator(".g-card.learned").count() >= 10)
        shot(page, "18_glosario.png", full=False)
        page.keyboard.press("Escape")

        page.click("#btn-lvl-map")
        page.wait_for_timeout(400)
        check("UI-26", "Pasillo con los 9 computadores reparados", page.locator(".pc-slot.done").count() == 9)
        shot(page, "19_pasillo_completado.png")

        page.reload()
        page.wait_for_timeout(400)
        saved = page.evaluate("JSON.parse(localStorage.getItem('linuxRescue.save.v1'))")
        check("UI-27", "El progreso se guarda y se puede continuar", saved["progress"]["unlocked"] == 9 and page.is_visible("#btn-continue"))

        # ---------- Sin vidas ----------
        page.click("#btn-continue")
        page.wait_for_timeout(300)
        page.evaluate("LinuxRescue.startLevel(4)")
        page.wait_for_timeout(3200)
        for wrong in ["ls", "pwd", "cat"]:
            page.fill("#cmd-input", wrong)
            page.press("#cmd-input", "Enter")
            page.wait_for_timeout(200)
        check("UI-28", "Sin vidas: revela la solución y permite reintentar", page.is_visible("#btn-retry") and "la solución era" in page.inner_text("#explain-panel").lower())
        shot(page, "20_sin_vidas_solucion.png")
        page.click("#btn-retry")
        check("UI-29", "Reintentar restablece las 3 vidas", page.locator(".heart.lost").count() == 0)

        st = page.evaluate("({sfx: Sound.prefs.sfx, music: Sound.prefs.music})")
        page.click("#btn-music")
        off = page.evaluate("Sound.prefs.music")
        page.click("#btn-music")
        check("UI-31", "Sonido 8 bits activo y botón de música alterna", st["sfx"] and st["music"] and off is False and page.evaluate("Sound.prefs.music"))
        check("UI-30", "Sin errores de JavaScript en consola", not errors, errors)
        browser.close()

    passed = sum(1 for r in results if r[2])
    print("\nTotal: %d  Aprobadas: %d  Fallidas: %d" % (len(results), passed, len(results) - passed))
    (EVID / "resultado_pruebas_e2e.json").write_text(json.dumps(
        [{"id": r[0], "caso": r[1], "aprobado": r[2]} for r in results], ensure_ascii=False, indent=2), encoding="utf-8")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else None))
