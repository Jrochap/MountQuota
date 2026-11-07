#!/usr/bin/env python3
"""MOUNT QUOTA balance simulator.

Plays the real game logic (src/data.js + src/sim.js) headless with a greedy player
and prints pacing numbers. No install needed on macOS: it uses the built-in
JavaScriptCore via `osascript -l JavaScript`. Uses Node instead if available
(or with --node).

  python3 tools/balance.py                 # fresh-run pacing
  python3 tools/balance.py mountains       # every mountain's first run
  python3 tools/balance.py chain --runs 12 # prestige curve
  python3 tools/balance.py oldunits        # do old units still matter?
  python3 tools/balance.py gary --trials 20
  python3 tools/balance.py heirs --trials 15
  python3 tools/balance.py all
"""
import argparse, json, os, re, shutil, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
SCENARIOS = ['fresh', 'mountains', 'chain', 'oldunits', 'gary', 'heirs', 'all']


def strip_module(code):
    """Turn an ES module into plain script text so files can be concatenated."""
    code = re.sub(r'import\s*(\*\s*as\s*\w+|\{[^}]*\}|\w+)\s*from\s*[\'"][^\'"]+[\'"];', '', code)
    code = re.sub(r'^export \{[^}]*\};\s*$', '', code, flags=re.M)
    return re.sub(r'^export ', '', code, flags=re.M)


def bundle(args):
    parts = [f'const ARGS = {json.dumps(args)};']
    for name in ('data.js', 'sim.js'):
        with open(os.path.join(SRC, name)) as f:
            parts.append(f'// ── {name}\n' + strip_module(f.read()))
    with open(os.path.join(ROOT, 'tools', 'scenarios.js')) as f:
        parts.append(f.read())
    return '\n'.join(parts)


def runner(force_node):
    node = shutil.which('node')
    if force_node or (node and sys.platform != 'darwin'):
        if not node:
            sys.exit('Node.js not found.')
        return [node]
    if sys.platform == 'darwin' and shutil.which('osascript'):
        return ['osascript', '-l', 'JavaScript']
    if node:
        return [node]
    sys.exit('Need macOS (osascript) or Node.js to run the simulator.')


def main():
    p = argparse.ArgumentParser(description='Headless balance simulator for MOUNT QUOTA.')
    p.add_argument('scenario', nargs='?', default='fresh', choices=SCENARIOS)
    p.add_argument('--trials', type=int, default=5, help='repetitions per measurement (heir traits add noise)')
    p.add_argument('--runs', type=int, default=12, help='runs in the prestige chain')
    p.add_argument('--node', action='store_true', help='force Node.js instead of JavaScriptCore')
    a = p.parse_args()

    code = bundle({'scenario': a.scenario, 'trials': a.trials, 'runs': a.runs})
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as f:
        f.write(code)
        path = f.name
    try:
        r = subprocess.run(runner(a.node) + [path], capture_output=True, text=True)
        # osascript prints console.log to stderr and the script's return value to stdout
        text = (r.stderr + r.stdout).strip()
        print(text)
        if r.returncode != 0:
            sys.exit(r.returncode)
    finally:
        os.unlink(path)


if __name__ == '__main__':
    main()
