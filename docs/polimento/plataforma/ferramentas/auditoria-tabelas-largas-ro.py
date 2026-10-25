"""Tabelas largas e células com muitas ações (grep, só leitura) — adaptação para o Real Olímpico de
aprendizado_frontend/ferramentas/auditoria-tabelas-largas.py (que supõe o componente <Tabela> da K2CON).

Aqui as tabelas são `<table>` cruas. Conta colunas pelos `<th` dentro de `<thead>`, ações por `<td>` (`<button`,
`<a `, `<Link`), e diz se a 1.ª coluna é `th scope="row"` e se a tabela está num contêiner com 1.ª coluna fixa
(classe `tabela-fixa`). Lista toda tabela (colunas>=5 marcadas com *). Uso: python -I auditoria-tabelas-largas-ro.py <raiz>
"""
import re
import sys
from pathlib import Path

RAIZ = Path(sys.argv[1])
AREAS = "account charts custody home market pagamento recibo reports sell shell svg tutorial".split()
arquivos = sorted((RAIZ / "src/app/(app)").glob("**/*.tsx"))
for a in AREAS:
    arquivos += sorted((RAIZ / "src/components" / a).glob("*.tsx"))

tot, largas, fixas, th_row = 0, 0, 0, 0
for p in arquivos:
    s = p.read_text(encoding="utf-8")
    for m in re.finditer(r"<table\b", s):
        fim = s.find("</table>", m.start())
        bloco = s[m.start():fim if fim > 0 else m.start() + 6000]
        antes = s[max(0, m.start() - 400):m.start()]
        thead = re.search(r"<thead>(.*?)</thead>", bloco, re.S)
        cols = len(re.findall(r"<th\b", thead.group(1))) if thead else 0
        tds = re.findall(r"<td\b.*?</td>", bloco, re.S)
        acoes = max((len(re.findall(r"<button|<a |<Link", c)) for c in tds), default=0)
        row = 'scope="row"' in bloco
        fixa = "tabela-fixa" in antes or "tabela-fixa" in bloco[:200]
        tot += 1
        largas += cols >= 5
        fixas += fixa
        th_row += row
        marca = "*" if cols >= 5 else " "
        print(f"{marca} {p.relative_to(RAIZ).as_posix():58} colunas={cols:2} ações_máx_célula={acoes} th_row={'sim' if row else 'não'} 1ª_fixa={'sim' if fixa else 'não'}")
print(f"\nRESUMO: tabelas={tot} com_5+_colunas={largas} com_th_scope_row={th_row} com_1ª_coluna_fixa={fixas}")
