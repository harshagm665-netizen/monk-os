import ast, re

f = 'routers/rag.py'
src = open(f, 'r', encoding='utf-8').read()

# Map every non-ASCII character we know is in log strings / comments / docstrings
char_map = {
    '\u2014': '-',   # em-dash
    '\u2013': '-',   # en-dash
    '\u2190': '<-',  # left arrow
    '\u2192': '->',  # right arrow
    '\u2193': 'v',   # down arrow
    '\u2191': '^',   # up arrow
    '\u2713': 'OK',  # check mark (used in _log strings)
    '\u2714': 'OK',
    '\u2717': 'FAIL', # cross
    '\u2718': 'FAIL',
    '\u26a0': '!',   # warning sign
    '\u25ba': '>',
    '\u2500': '-',   # box drawing
    '\u2502': '|',
    '\u251c': '+',
    '\u2510': '+',
    '\u250c': '+',
    '\u2514': '+',
    '\u2518': '+',
    '\u2524': '+',
    '\u2019': "'",   # right single quote (in docstrings like "session's")
    '\u2018': "'",   # left single quote
    '\u201c': '"',   # left double quote
    '\u201d': '"',   # right double quote
    '\u2022': '*',   # bullet
    '\u00e2': '',    # corrupted UTF-8 start byte artifact
    '\u0080': '',
    '\u009c': '',
}

fixed = src
for old, new in char_map.items():
    fixed = fixed.replace(old, new)

# Final safety: replace any remaining non-ASCII with '?'
fixed = re.sub(r'[^\x00-\x7F]', '?', fixed)

open(f, 'w', encoding='utf-8').write(fixed)

try:
    ast.parse(fixed)
    print('SYNTAX_OK - server ready to start')
except SyntaxError as e:
    lines = fixed.splitlines()
    print(f'ERROR at line {e.lineno}: {e.msg}')
    for i in range(max(0, e.lineno-2), min(len(lines), e.lineno+2)):
        marker = '>>>' if i == e.lineno-1 else '   '
        print(f'{i+1:4} {marker} {lines[i][:100]}')
