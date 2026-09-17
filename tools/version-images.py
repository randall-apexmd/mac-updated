"""Stamp every img/ reference with a hash of the file's contents.

vercel.json serves /img/* as immutable for a year, so a file edited under
the same name never reaches a browser that already cached it. With the
hash in the URL, any change to an image changes its URL. Re-run after
editing or replacing images:  python3 tools/version-images.py
"""
import glob, hashlib, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
REF = re.compile(r'((?:https://mac\.apexmd\.com/)?img/[A-Za-z0-9/_.-]+\.(?:webp|png|jpe?g|svg|gif))(\?v=[0-9a-f]+)?')
_cache = {}

def stamp(m):
    url, path = m.group(1), m.group(1).replace('https://mac.apexmd.com/', '')
    if not os.path.isfile(path):
        return m.group(0)
    if path not in _cache:
        _cache[path] = hashlib.sha1(open(path, 'rb').read()).hexdigest()[:8]
    return f'{url}?v={_cache[path]}'

changed = 0
for f in sorted(glob.glob('*.html')):
    s = open(f, encoding='utf-8').read()
    out = REF.sub(stamp, s)
    if out != s:
        open(f, 'w', encoding='utf-8').write(out)
        changed += 1
print(f'versioned image URLs in {changed} pages ({len(_cache)} distinct images)')
