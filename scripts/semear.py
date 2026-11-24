#!/usr/bin/env python3
"""Aplica as migrações e os dados de demonstração no Supabase do Elo Saúde.

Uso: SUPABASE_PAT=... ELO_SUPABASE_REF=... ELO_HMAC_KEY=... ELO_DEMO_<CONTA>_ID=... python3 scripts/semear.py
Os CPFs/CNS abaixo são FICTÍCIOS (sequências de teste); o banco recebe só o HMAC.
"""
import hashlib, hmac, json, os, sys, urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CHAVE = os.environ['ELO_HMAC_KEY'].encode()
FICTICIOS = {  # nenhum destes números pertence a alguém: são sequências de demonstração
    'livia': ('00000000191', '700000000000001'),
    'jose': ('00000000272', '700000000000002'),
    'camila': ('00000000353', '700000000000003'),
}
def h(valor: str) -> str:
    return hmac.new(CHAVE, ''.join(c for c in valor if c.isdigit()).encode(), hashlib.sha256).hexdigest()

def sql_seed() -> str:
    s = (RAIZ / 'supabase' / 'seed.sql').read_text()
    trocas = {f'{{{{{k}}}}}': os.environ[f'ELO_DEMO_{k.upper()}_ID'] for k in ('marina', 'jose', 'camila', 'paula', 'recepcao', 'fernando', 'ricardo')}
    for nome, (cpf, cns) in FICTICIOS.items():
        trocas[f'{{{{cpf_{nome}}}}}'] = h(cpf); trocas[f'{{{{cns_{nome}}}}}'] = h(cns); trocas[f'{{{{fim_{nome}}}}}'] = cpf[-2:]
    trocas['{{token_emergencia_livia}}'] = hashlib.sha256(CHAVE + b'emergencia-livia').hexdigest()[:36]
    for k, v in trocas.items():
        s = s.replace(k, v)
    if '{{' in s:
        sys.exit('marcador sem valor no seed: ' + s[s.index('{{'):s.index('{{') + 40])
    return s

def rodar(sql: str, rotulo: str):
    req = urllib.request.Request(f"https://api.supabase.com/v1/projects/{os.environ['ELO_SUPABASE_REF']}/database/query",
        data=json.dumps({'query': sql}).encode(), headers={'Authorization': f"Bearer {os.environ['SUPABASE_PAT']}", 'Content-Type': 'application/json'})
    try:
        print(rotulo, urllib.request.urlopen(req, timeout=120).read()[:200].decode())
    except urllib.error.HTTPError as e:
        sys.exit(f'{rotulo} FALHOU: {e.read()[:800].decode()}')

if __name__ == '__main__':
    for m in ('003_v2_cadastro_unico.sql', '004_demo_agenda.sql', '005_qr_compartilhamento.sql', '006_documentos_ia.sql', '007_suspender_medicamento.sql', '008_duas_etapas.sql'):
        rodar((RAIZ / 'supabase' / 'migrations' / m).read_text(), m)
    rodar(sql_seed(), 'seed')
    rodar("""select (select count(*) from pacientes) pacientes, (select count(*) from profissionais) profissionais,
      (select count(*) from atuacoes) atuacoes, (select count(*) from consentimentos) consentimentos,
      (select count(*) from atendimentos) atendimentos, (select count(*) from agenda) agenda, (select count(*) from acessos) acessos""", 'contagem')
