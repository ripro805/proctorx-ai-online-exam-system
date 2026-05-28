import os, json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault('DJANGO_SETTINGS_MODULE','proctor_ai.settings')
import django
django.setup()
from django.core import serializers
from django.apps import apps
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import transaction

ROOT = Path(__file__).resolve().parents[1]
P = ROOT / 'data.cleaned.json'
print('Loading', P)
with P.open(encoding='utf-8') as f:
    data = json.load(f)
print('Total objects in fixture:', len(data))

# build maps of users and groups present in DB
User = get_user_model()
user_map = {u.email: u.pk for u in User.objects.all()}
group_map = {g.name: g.pk for g in Group.objects.all()}
print('Existing users in DB:', len(user_map), 'groups:', len(group_map))

# build maps from fixture original PKs to emails/names for users/groups
old_user_pk_to_email = {}
old_group_pk_to_name = {}
for obj in data:
    if obj['model'].endswith('.user') or obj['model'].endswith('.customuser'):
        pk = obj.get('pk')
        email = obj.get('fields', {}).get('email') or obj.get('fields', {}).get('username')
        if pk and email:
            old_user_pk_to_email[pk] = email
    if obj['model'] == 'auth.group' or obj['model'].endswith('.group'):
        pk = obj.get('pk')
        name = obj.get('fields', {}).get('name')
        if pk and name:
            old_group_pk_to_name[pk] = name
print('Fixture users (pk->email):', len(old_user_pk_to_email), 'groups (pk->name):', len(old_group_pk_to_name))

# pick a fallback existing user pk (admin if present) to attach unresolved FKs to
fallback_user_pk = None
if 'admin@proctorxai.com' in user_map:
    fallback_user_pk = user_map['admin@proctorxai.com']
elif user_map:
    fallback_user_pk = next(iter(user_map.values()))
print('Fallback user pk:', fallback_user_pk)

# models to import in order
models_order = [
    'exams.exam',
    'exams.question',
    'exams.choice',
    'exams.examenrollment',
    'exams.examprogress',
    'exams.studentanswer',
    'proctoring.proctorlog',
    'results.result'
]

# helper to find objects by model
by_model = {}
for obj in data:
    by_model.setdefault(obj['model'], []).append(obj)

for model_label in models_order:
    objs = by_model.get(model_label, [])
    if not objs:
        print('No objects for', model_label)
        continue
    print('\nImporting', model_label, 'count=', len(objs))
    batch = []
    imported = 0
    errors = 0
    for obj in objs:
        fields = obj.get('fields', {})
        # map FK/M2M referencing users/groups by email/name
        for fname, fval in list(fields.items()):
            # handle lists containing strings or ints
            if isinstance(fval, list) and fval and all(isinstance(x, (str, int)) for x in fval):
                new = []
                for v in fval:
                    if isinstance(v, int):
                        # map old fixture user PK -> email -> current PK
                        if v in old_user_pk_to_email:
                            email = old_user_pk_to_email[v]
                            if email in user_map:
                                new.append(user_map[email]); continue
                        if v in old_group_pk_to_name:
                            gname = old_group_pk_to_name[v]
                            if gname in group_map:
                                new.append(group_map[gname]); continue
                        # unresolved numeric reference -> use fallback user/group if available
                        if fallback_user_pk is not None:
                            new.append(fallback_user_pk)
                        else:
                            new.append(v)
                    else:
                        # string value
                        if v in user_map:
                            new.append(user_map[v])
                        elif v in group_map:
                            new.append(group_map[v])
                        elif v.isdigit():
                            iv = int(v)
                            if iv in old_user_pk_to_email:
                                email = old_user_pk_to_email[iv]
                                if email in user_map:
                                    new.append(user_map[email]); continue
                            if iv in old_group_pk_to_name:
                                gname = old_group_pk_to_name[iv]
                                if gname in group_map:
                                    new.append(group_map[gname]); continue
                            new.append(v)
                        else:
                            new.append(v)
                fields[fname] = new
            elif isinstance(fval, int):
                if fval in old_user_pk_to_email:
                    email = old_user_pk_to_email[fval]
                    if email in user_map:
                        fields[fname] = user_map[email]
                elif fval in old_group_pk_to_name:
                    gname = old_group_pk_to_name[fval]
                    if gname in group_map:
                        fields[fname] = group_map[gname]
                else:
                    if fallback_user_pk is not None:
                        fields[fname] = fallback_user_pk
            elif isinstance(fval, str):
                if fval in user_map:
                    fields[fname] = user_map[fval]
                elif fval in group_map:
                    fields[fname] = group_map[fval]
        batch.append({'model': obj['model'], 'pk': obj.get('pk'), 'fields': fields})
        if len(batch) >= 50:
            s = json.dumps(batch)
            try:
                with transaction.atomic():
                    for des in serializers.deserialize('json', s, ignorenonexistent=True):
                        try:
                            des.save()
                            imported += 1
                        except Exception as e:
                            errors += 1
                print('Imported so far for', model_label, imported, 'errors', errors)
            except Exception as e:
                print('Batch deserialize error', e)
                errors += len(batch)
            batch = []
    # final batch
    if batch:
        s = json.dumps(batch)
        try:
            with transaction.atomic():
                for des in serializers.deserialize('json', s, ignorenonexistent=True):
                    try:
                        des.save()
                        imported += 1
                    except Exception as e:
                        errors += 1
            print('Final imported for', model_label, imported, 'errors', errors)
        except Exception as e:
            print('Final batch error', e)
    print('Done', model_label, 'imported', imported, 'errors', errors)

print('\nFinished subset import')
