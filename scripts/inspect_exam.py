import json
from pathlib import Path
P = Path(__file__).resolve().parents[1] / 'data.cleaned.json'
with P.open(encoding='utf-8') as f:
    data = json.load(f)
for obj in data:
    if obj.get('model')=='exams.exam' and obj.get('pk')==3:
        print(json.dumps(obj, indent=2, ensure_ascii=False))
        break
else:
    print('exam 3 not found')
