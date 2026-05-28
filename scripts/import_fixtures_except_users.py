import os, json, sys
from pathlib import Path
# add project root to sys.path so Django settings module can be imported
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault('DJANGO_SETTINGS_MODULE','proctor_ai.settings')
import django
django.setup()
from django.core import serializers
p=Path('data.cleaned.json')
print('Loading', p.resolve())
data=json.load(p.open(encoding='utf-8'))
print('Total objects in fixture:', len(data))
filtered=[o for o in data if o['model'] not in ('auth.user','auth.group')]
print('Objects to import (excluding users/groups):', len(filtered))
count=0
for i in range(0,len(filtered),100):
    batch=filtered[i:i+100]
    s=json.dumps(batch)
    try:
        for obj in serializers.deserialize('json', s, ignorenonexistent=True):
            try:
                obj.save()
                count+=1
            except Exception as e:
                print('Save error for', getattr(obj,'object',None), e)
    except Exception as e:
        print('Deserialize error', e)
print('Imported objects:', count)
