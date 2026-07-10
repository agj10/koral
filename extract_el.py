import re
import sys

def parse_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find patterns like el('tag', { attributes }, 'Text Node') or el('tag', 'Text Node')
    # This regex is a heuristic
    matches = re.findall(r"el\(\s*'[^']+'\s*,\s*[^,]+,\s*'([^']+)'\s*\)", content)
    matches += re.findall(r"el\(\s*'[^']+'\s*,\s*'([^']+)'\s*\)", content)
    
    for m in matches:
        if m.startswith('bg-') or m.startswith('text-') or m.startswith('theme-') or ' ' not in m:
            continue
        if m in ['main-content']:
            continue
        print(f"{filename}: {m}")

for file in sys.argv[1:]:
    parse_file(file)
