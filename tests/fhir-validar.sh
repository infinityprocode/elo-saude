#!/usr/bin/env bash
# Valida a exportação FHIR R4 do Elo no VALIDADOR OFICIAL DO HL7 (validator_cli, hapifhir/org.hl7.fhir.core).
# Uso: set -a; . <cofre>/elo-saude.env; set +a; bash tests/fhir-validar.sh
# Precisa de Java 17+ e do validator_cli.jar (VALIDADOR_DIR, padrão /root/.local/fhir-validador).
set -euo pipefail
cd "$(dirname "$0")/.."
V=${VALIDADOR_DIR:-/root/.local/fhir-validador}
OUT=$(mktemp -d)
NODE=${NODE:-/root/.local/node22/bin/node}
PATH="$(dirname "$NODE"):$PATH" npx tsx tests/fhir-gerar.ts "$OUT"
for f in "$OUT"/*.json; do
  echo "== $(basename "$f")"
  "$V/jre/bin/java" -jar "$V/validator_cli.jar" "$f" -version 4.0.1 -tx n/a 2>&1 | grep -E "^(Success|\*FAILURE\*)|errors?, [0-9]+ warnings?|^  (Error|Warning) @" | head -40
done
rm -rf "$OUT"
