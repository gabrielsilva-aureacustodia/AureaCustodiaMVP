"""Auditoria de botões e campos (grep, só leitura) — adaptação para o Real Olímpico de
aprendizado_frontend/ferramentas/auditoria-botoes-campos.py (que supõe as classes da K2CON).

Primário = `btn-gold`; secundário = `btn-outline`; perigo = `btn-danger`/`perigo`. Campo = `<input>` que não é
hidden/checkbox/radio/file; "sem dica" = sem `inputMode` nem `autoComplete` nem `type=` de teclado (email/tel/number/
password/date). Uso: python -I auditoria-botoes-campos-ro.py <raiz-do-repo>
"""
import re
import sys
from pathlib import Path

RAIZ = Path(sys.argv[1])
AREAS = "account charts custody home market pagamento recibo reports sell shell svg tutorial".split()
arquivos = sorted((RAIZ / "src/app/(app)").glob("**/page.tsx"))
for a in AREAS:
    arquivos += sorted((RAIZ / "src/components" / a).glob("*.tsx"))

INPUT = re.compile(r"<input\b(.*?)/>", re.S)
TECLADO = re.compile(r"type=\"(email|tel|number|password|date|search|url)\"")
IGNORA = re.compile(r"type=\"(hidden|checkbox|radio|file)\"")

total_prim, telas_multi, campos_sem, campos_tot, divs_click, sem_tipo_btn = 0, 0, 0, 0, 0, 0
linhas = []
for p in arquivos:
    s = p.read_text(encoding="utf-8")
    rel = p.relative_to(RAIZ).as_posix()
    prim = len(re.findall(r"btn-gold", s))
    sec = len(re.findall(r"btn-outline", s))
    perigo = len(re.findall(r"btn-danger|perigo", s))
    sem = []
    n_inp = 0
    for m in INPUT.finditer(s):
        attrs = m.group(1)
        if IGNORA.search(attrs):
            continue
        n_inp += 1
        if "inputMode" not in attrs and "autoComplete" not in attrs and not TECLADO.search(attrs):
            idm = re.search(r"id=\"([^\"]+)\"", attrs)
            sem.append(idm.group(1) if idm else "?")
    # clique em elemento que não é botão nem link (div/span com onClick)
    dc = len(re.findall(r"<(div|span|li|tr)\b[^>]*onClick=", s))
    btn_sem_type = len(re.findall(r"<button\b(?![^>]*type=)", s))
    total_prim += prim
    campos_tot += n_inp
    campos_sem += len(sem)
    divs_click += dc
    sem_tipo_btn += btn_sem_type
    if prim > 1:
        telas_multi += 1
    if prim > 1 or sem or dc or btn_sem_type:
        linhas.append(f"{rel}\n   primários(btn-gold)={prim} secundários={sec} perigo={perigo} campos={n_inp} "
                      f"sem_dica={len(sem)} {sem[:6]} clique_em_div/span={dc} button_sem_type={btn_sem_type}")

print("\n".join(linhas))
print(f"\nRESUMO: arquivos={len(arquivos)} com>1 primário={telas_multi} primários={total_prim} "
      f"campos={campos_tot} campos_sem_dica={campos_sem} clique_em_div/span={divs_click} button_sem_type={sem_tipo_btn}")
