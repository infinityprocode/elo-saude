#!/usr/bin/env bash
# Deploy do Elo Saúde no KVM4 (elosaude.infinityprocode.com.br -> 127.0.0.1:4430).
# Envia o código (sem node_modules/.next/.env), instala, builda numa pasta nova e troca, reinicia e confere.
# O .env.local de produção fica só no servidor (/opt/elo-saude/shared/.env.local) e nunca vai para o git.
set -euo pipefail
HOST=${HOST:-infinity-kvm4-boston.tail9d84d0.ts.net}
APP=/opt/elo-saude
cd "$(dirname "$0")/.."
REL=$(date +%Y%m%d-%H%M%S)
rsync -a --delete --exclude node_modules --exclude .next --exclude '.env*' --exclude .git ./ "$HOST:$APP/releases/$REL/"
ssh "$HOST" bash -s "$REL" <<'REMOTO'
set -euo pipefail
REL=$1; APP=/opt/elo-saude; export PATH=/opt/node22/bin:$PATH
cd $APP/releases/$REL
ln -sf $APP/shared/.env.local .env.local
npm ci --no-audit --no-fund --loglevel=error
nice -n 10 npm run build > $APP/build-$REL.log 2>&1 || { tail -30 $APP/build-$REL.log; echo "ERRO no build: nada foi trocado"; exit 1; }
chown -R elosaude:elosaude $APP/releases/$REL
ln -sfn $APP/releases/$REL $APP/current
systemctl restart elo-saude
for i in $(seq 1 30); do c=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4430/ || true); [ "$c" = 200 ] && break; sleep 1; done
echo "local: $c"; [ "$c" = 200 ] || { journalctl -u elo-saude -n 30 --no-pager; exit 1; }
ls -1dt $APP/releases/* | tail -n +4 | xargs -r rm -rf
REMOTO
echo "público: $(curl -s -o /dev/null -w '%{http_code}' https://elosaude.infinityprocode.com.br/)"
