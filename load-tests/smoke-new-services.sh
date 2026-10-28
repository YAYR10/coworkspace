#!/usr/bin/env bash
# Prueba de integración de punta a punta (stack completo con docker compose):
# membresía -> credencial QR -> validación en la puerta -> comunidad -> ETL de analítica.
set -euo pipefail
API="${BASE_URL:-http://localhost:3000}/api"
j() { curl -fsS -H 'Content-Type: application/json' "$@"; }

ADMIN=$(j -X POST "$API/auth/login" -d '{"email":"admin@coworkspace.co","password":"Admin12345!"}' | jq -r .accessToken)
EMAIL="smoke$(date +%s)@test.co"
TOKEN=$(j -X POST "$API/auth/register" -d "{\"name\":\"Smoke Test\",\"email\":\"$EMAIL\",\"password\":\"Password123!\"}" | jq -r .accessToken)
LOC=$(j -X POST "$API/locations" -H "Authorization: Bearer $ADMIN" -d '{"name":"Sede smoke","city":"Montería","address":"Calle 1 # 2-3"}' | jq -r .id)

echo "1) Sin membresía no hay credencial (403)"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/access/credentials" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}')
[ "$code" = "403" ] || { echo "esperaba 403 y llegó $code"; exit 1; }

echo "2) Suscripción al plan Puesto flexible"
PLAN=$(j "$API/plans" | jq -r '.[] | select(.code=="FLEX_DESK") | .id')
j -X POST "$API/subscriptions" -H "Authorization: Bearer $TOKEN" -d "{\"planId\":\"$PLAN\"}" > /dev/null

echo "3) Credencial QR y validación en la puerta"
QR=$(j -X POST "$API/access/credentials" -H "Authorization: Bearer $TOKEN" -d '{"kind":"QR"}' | jq -r .token)
j -X POST "$API/access/validate" -H "Authorization: Bearer $ADMIN" -d "{\"token\":\"$QR\",\"locationId\":\"$LOC\"}" | tee /dev/stderr | jq -e '.granted == true' > /dev/null
j -X POST "$API/access/validate" -H "Authorization: Bearer $ADMIN" -d "{\"token\":\"${QR}x\",\"locationId\":\"$LOC\"}" | jq -e '.granted == false' > /dev/null
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/access/validate" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "{\"token\":\"$QR\",\"locationId\":\"$LOC\"}")
[ "$code" = "403" ] || { echo "un miembro no debe poder validar ($code)"; exit 1; }

echo "4) Comunidad: perfil, directorio y evento"
j -X PUT "$API/community/profile/me" -H "Authorization: Bearer $TOKEN" -d '{"displayName":"Smoke Test","skills":["QA"]}' > /dev/null
j "$API/community/members?q=Smoke" -H "Authorization: Bearer $TOKEN" | jq -e 'length >= 1' > /dev/null
EV=$(j -X POST "$API/community/events" -H "Authorization: Bearer $ADMIN" -d "{\"locationId\":\"$LOC\",\"title\":\"Networking smoke\",\"scheduledAt\":\"$(date -u -d '+3 days' +%Y-%m-%dT18:00:00Z)\",\"capacity\":5}" | jq -r .id)
j -X POST "$API/community/events/$EV/attend" -H "Authorization: Bearer $TOKEN" > /dev/null
j "$API/community/events?locationId=$LOC" | jq -e '.[0].attendeeCount == 1' > /dev/null

echo "5) Analítica: ETL y tablero"
j -X POST "$API/analytics/etl" -H "Authorization: Bearer $ADMIN" | jq -e '.status == "OK"' > /dev/null
j "$API/analytics/summary" -H "Authorization: Bearer $ADMIN" | tee /dev/stderr | jq -e '.activeMembers >= 1' > /dev/null

echo "6) Pasarela de pagos"
j "$API/payments/status" | jq -e '.provider == "simulado"' > /dev/null
echo "Todo OK"
