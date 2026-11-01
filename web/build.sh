#!/bin/sh
set -e
cd "$(dirname "$0")"
mkdir -p dist/assets/tex
npx esbuild src/main.js --bundle --minify --format=iife --target=es2020 --outfile=dist/game.js --log-level=warning
cp src/index.html dist/index.html
cp public/assets/tex/*.jpg public/assets/tex/*.png dist/assets/tex/
rm -f dist/assets/Soldier.glb dist/assets/moonless_golf_1k.hdr; cp public/assets/soldier.json public/assets/night_env.png dist/assets/
# artifact page: same content without the document wrapper (the host adds it)
python3 - <<'PY'
s=open('dist/index.html').read()
import re
s=s.replace('<!doctype html>\n','').replace('<html lang="en">\n','').replace('<head>\n','').replace('</head>\n','').replace('<body>\n','').replace('</body>\n','').replace('</html>\n','')
s=re.sub(r'<meta charset="utf-8">\n','',s)
s=re.sub(r'<meta name="viewport"[^>]*>\n','',s)
open('dist/artifact.html','w').write(s)
PY
