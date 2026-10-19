#!/bin/sh
# Starts the whole stack with docker compose and checks it answers through
# nginx: the SPA (including a deep link), the API and the API docs.
#
#   scripts/smoke.sh            build, start, check, stop
#   KEEP_UP=1 scripts/smoke.sh  leave the stack running afterwards
#   SKIP_UP=1 scripts/smoke.sh  only check a stack that is already running
set -eu

BASE_URL="${BASE_URL:-http://localhost:4200}"
export JWT_SECRET="${JWT_SECRET:-smoke-test-secret-$(date +%s)-padding-to-32-bytes}"

if [ -z "${SKIP_UP:-}" ]; then
  docker compose up -d --build
  [ -n "${KEEP_UP:-}" ] || trap 'docker compose down' EXIT
fi

echo "waiting for $BASE_URL/api/auth/providers"
i=0
until [ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/auth/providers")" = 200 ]; do
  i=$((i + 1))
  if [ "$i" -gt 90 ]; then
    echo "stack did not come up in time" >&2
    docker compose logs --tail 50 >&2 || true
    exit 1
  fi
  sleep 2
done

fail=0
check() {
  description="$1"; url="$2"; expected="$3"; contains="${4:-}"
  body=$(curl -s -w '\n%{http_code}' "$url")
  status=$(printf '%s' "$body" | tail -n 1)
  if [ "$status" != "$expected" ] || { [ -n "$contains" ] && ! printf '%s' "$body" | grep -q "$contains"; }; then
    echo "FAIL $description: $url -> $status" >&2
    fail=1
  else
    echo "ok   $description"
  fi
}

check "API through nginx" "$BASE_URL/api/auth/providers" 200 '"google"'
check "SPA index" "$BASE_URL/" 200 '<app-root'
check "SPA deep link" "$BASE_URL/profile" 200 '<app-root'
check "API docs" "$BASE_URL/v3/api-docs" 200 '"openapi"'
check "protected API needs a token" "$BASE_URL/api/me" 401
check "API docs know the public URL" "$BASE_URL/v3/api-docs" 200 "\"url\":\"$BASE_URL\""

# nginx drops server-level headers in a location that sets its own.
for page in / /profile; do
  headers=$(curl -s -o /dev/null -D - "$BASE_URL$page")
  if printf '%s' "$headers" | grep -qi '^x-frame-options: SAMEORIGIN' \
    && printf '%s' "$headers" | grep -qi '^x-content-type-options: nosniff' \
    && printf '%s' "$headers" | grep -qi "^content-security-policy: .*script-src 'self'"; then
    echo "ok   security headers on $page"
  else
    echo "FAIL security headers on $page" >&2
    fail=1
  fi
done

# A client cannot pick its own address with X-Forwarded-For to dodge the login limit.
email="smoke-$(date +%s)-$$@example.com"
last=""
for i in 1 2 3 4 5 6; do
  last=$(curl -s -o /dev/null -w '%{http_code}' -H "X-Forwarded-For: 203.0.113.$i" \
    -H 'Content-Type: application/json' -d "{\"email\":\"$email\",\"password\":\"not-the-password\"}" \
    "$BASE_URL/api/auth/login")
done
if [ "$last" = 429 ]; then
  echo "ok   login limit ignores a forged X-Forwarded-For"
else
  echo "FAIL login limit bypassed with a forged X-Forwarded-For: attempt 6 -> $last" >&2
  fail=1
fi

exit "$fail"
