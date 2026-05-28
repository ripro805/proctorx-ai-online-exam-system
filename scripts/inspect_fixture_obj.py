import json
from pathlib import Path
P = Path(__file__).resolve().parents[1] / 'data.cleaned.json'
print('Opening', P)
with P.open(encoding='utf-8') as f:
    data = json.load(f)
for obj in data:
    if obj.get('model')=='exams.question' and obj.get('pk')==1:
        print('Found question pk=1')
        print(json.dumps(obj, indent=2, ensure_ascii=False))
        break
else:
    print('Not found')
