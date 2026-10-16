#!/bin/bash
cd /home/user/firstword
set -a; . ./.env; set +a
python3 -c "
import json
print(json.dumps({'model':'openai/gpt-oss-120b','messages':[{'role':'user','content':'ভাত দাও। '*900+'\nএকটি বাক্যে উত্তর দাও।'}],'max_tokens':20}))" > /tmp/big.json
while true; do
  out=$(curl -s -m 60 https://api.groq.com/openai/v1/chat/completions -H "Authorization: Bearer $GROQ_API_KEY" -H 'Content-Type: application/json' -d @/tmp/big.json)
  if echo "$out" | grep -q '"choices"'; then break; fi
  echo "$(date -u +%H:%M:%S) still limited: $(echo "$out" | head -c 160)"
  sleep 90
done
echo "$(date -u +%H:%M:%S) budget ok, starting full after-eval"
LABEL=after npx tsx scripts/roleplay-eval.ts --restaurant
echo "eval exit $?"
