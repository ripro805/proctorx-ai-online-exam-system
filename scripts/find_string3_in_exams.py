import json
from pathlib import Path
P = Path(__file__).resolve().parents[1] / 'data.cleaned.json'
with P.open(encoding='utf-8') as f:
    data = json.load(f)
for obj in data:
    if obj.get('model')=='exams.exam':
        for k,v in obj.get('fields', {}).items():
            if v=='3' or v==3:
                print('Found exam pk', obj.get('pk'), 'field', k, 'value', v)
                break
