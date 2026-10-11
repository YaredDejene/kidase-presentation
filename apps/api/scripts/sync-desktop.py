#!/usr/bin/env python3
"""Dump the desktop app's SQLite database as a .kidase backup, for `pnpm --filter api sync-desktop`."""
import datetime, json, os, sqlite3, sys

DB = os.path.expanduser('~/Library/Application Support/com.yared.kidase-presentation/kidase.db')
TABLES = ['templates', 'presentations', 'slides', 'variables', 'gitsawes', 'verses', 'rule_definitions', 'app_settings']

out = sys.argv[1]
con = sqlite3.connect(DB)
con.row_factory = sqlite3.Row
data = {t: [dict(r) for r in con.execute(f'select * from {t}')] for t in TABLES}
with open(out, 'w') as f:
    json.dump({'version': 1, 'createdAt': datetime.datetime.now().isoformat(), 'data': data}, f, ensure_ascii=False)
print('dumped ' + ', '.join(f'{len(rows)} {t}' for t, rows in data.items()))
