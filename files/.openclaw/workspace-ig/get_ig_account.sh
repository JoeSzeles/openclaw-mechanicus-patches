#!/bin/bash
set -euo pipefail
BASE=&quot;https://demo-api.ig.com/gateway/deal&quot;
KEY=&quot;20849c0791ed15479752204f9632c949f742ddc5&quot;
USER=&quot;Hoerbinator2&quot;
PASS=&quot;Riacrepe88!&quot;

TMP=&quot;/tmp/ig$$&quot;
mkdir -p &quot;$TMP&quot;
COOKIES=&quot;$TMP/cookies.txt&quot;
HEADERS=&quot;$TMP/headers.txt&quot;

curl -s -c &quot;$COOKIES&quot; -D &quot;$HEADERS&quot; -H &quot;Content-Type: application/json&quot; -H &quot;X-IG-API-KEY: $KEY&quot; -H &quot;Version: 1&quot; -d &quot;{\&quot;identifier\&quot;:\&quot;$USER\&quot;,\&quot;password\&quot;:\&quot;$PASS\&quot;}&quot; &quot;$BASE/session&quot; &gt; &quot;$TMP/login.json&quot;

TOKEN=$(grep -i '^x-security-token:' &quot;$HEADERS&quot; | sed 's/.*: //' | tr -d '\r\n ')
CST=$(grep 'cst' &quot;$COOKIES&quot; | awk '{print $7}' | head -1 | tr -d '\r\n')

if [ -z &quot;$TOKEN&quot; ] || [ -z &quot;$CST&quot; ]; then
  echo &quot;Login failed&quot;
  exit 1
fi

echo &quot;Logged in. Fetching account/positions...&quot;

curl -s -b &quot;$COOKIES&quot; -H &quot;X-IG-API-KEY: $KEY&quot; -H &quot;X-SECURITY-TOKEN: $TOKEN&quot; -H &quot;CST: $CST&quot; -H &quot;Version: 3&quot; &quot;$BASE/accounts&quot;

curl -s -b &quot;$COOKIES&quot; -H &quot;X-IG-API-KEY: $KEY&quot; -H &quot;X-SECURITY-TOKEN: $TOKEN&quot; -H &quot;CST: $CST&quot; -H &quot;Version: 2&quot; &quot;$BASE/positions&quot;

rm -rf &quot;$TMP&quot;
