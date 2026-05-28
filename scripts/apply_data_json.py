import os, json, sys
from pathlib import Path
# ensure project root on path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault('DJANGO_SETTINGS_MODULE','proctor_ai.settings')
import django
django.setup()
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.apps import apps
from django.core import serializers
from django.contrib.contenttypes.models import ContentType
from django.db import transaction

p = Path('data.cleaned.json')
print('Loading fixture:', p.resolve(), flush=True)
with p.open(encoding='utf-8') as f:
    data = json.load(f)
print('Total objects:', len(data), flush=True)

User = get_user_model()
# First, create/update users and groups
user_map = {}  # email -> pk
created_users = 0
created_groups = 0
for obj in data:
    model = obj.get('model')
    if model.endswith('.user') or model.endswith('.customuser') or model.endswith('.customuser'):
        fields = obj.get('fields', {})
        email = fields.get('email') or fields.get('username')
        if not email:
            continue
        defaults = {}
        # copy known fields
        for key in ('first_name','last_name','is_active','is_staff','is_superuser'):
            if key in fields:
                defaults[key] = fields[key]
        # password may be hashed already
        if 'password' in fields:
            defaults['password'] = fields['password']
        user, created = User.objects.update_or_create(email=email, defaults=defaults)
        if created:
            created_users += 1
        user_map[email] = user.pk

    if model == 'auth.group' or model.endswith('.group'):
        name = obj.get('fields', {}).get('name')
        if not name:
            continue
        group, created = Group.objects.get_or_create(name=name)
        if created:
            created_groups += 1
        # set permissions if present
        perms = obj.get('fields', {}).get('permissions') or []
        for perm in perms:
            try:
                # perm expected as [codename, app_label, model]
                codename, app_label, model_name = perm
                ct = ContentType.objects.get(app_label=app_label, model=model_name)
                permission = Permission.objects.get(codename=codename, content_type=ct)
                group.permissions.add(permission)
            except Exception:
                pass

print(f'Users created/updated: {len(user_map)}, groups created/updated: {created_groups}', flush=True)

# Now process remaining objects, converting FK/M2M fields referencing users/groups by natural key (emails/names) into PKs
other_objs = [o for o in data if not (o.get('model', '').endswith('.user') or o.get('model')=='auth.group' or o.get('model','').endswith('.group'))]
print('Other objects to process:', len(other_objs), flush=True)
import_count = 0
errors = 0
batch = []
processed = 0
for obj in other_objs:
    model_label = obj['model']
    app_label, model_name = model_label.split('.')
    try:
        model_cls = apps.get_model(app_label, model_name)
    except LookupError:
        # skip unknown models
        continue
    fields = obj.get('fields', {})
    for fname, fval in list(fields.items()):
        try:
            field = model_cls._meta.get_field(fname)
        except Exception:
            continue
        # if relational to User or Group
        if field.is_relation:
            remote = field.remote_field.model
            # handle ManyToMany (list expected)
            if field.many_to_many:
                new_list = []
                if isinstance(fval, list):
                    for v in fval:
                        if isinstance(v, str):
                            # try map user email
                            if v in user_map:
                                new_list.append(user_map[v])
                            else:
                                # try group name
                                try:
                                    g = Group.objects.get(name=v)
                                    new_list.append(g.pk)
                                except Exception:
                                    pass
                        else:
                            new_list.append(v)
                fields[fname] = new_list
            else:
                # ForeignKey or OneToOne
                if isinstance(fval, list) and len(fval)>0 and isinstance(fval[0], str):
                    v = fval[0]
                    if v in user_map:
                        fields[fname] = user_map[v]
                    else:
                        try:
                            g = Group.objects.get(name=v)
                            fields[fname] = g.pk
                        except Exception:
                            # leave as-is
                            pass
    # prepare object for deserialize
    batch.append({'model': obj['model'], 'pk': obj.get('pk'), 'fields': fields})
    if len(batch) >= 50:
        s = json.dumps(batch)
        try:
            with transaction.atomic():
                for des in serializers.deserialize('json', s, ignorenonexistent=True):
                    try:
                        des.save()
                        import_count += 1
                    except Exception:
                        errors += 1
            processed += len(batch)
            if processed % 500 == 0:
                print('Processed:', processed, 'Imported:', import_count, 'Errors:', errors, flush=True)
            batch = []
        except Exception:
            errors += 1
# final batch
if batch:
    s = json.dumps(batch)
    try:
        with transaction.atomic():
            for des in serializers.deserialize('json', s, ignorenonexistent=True):
                try:
                    des.save()
                    import_count += 1
                except Exception:
                    errors += 1
        processed += len(batch)
        print('Processed final batch:', processed, 'Imported:', import_count, 'Errors:', errors, flush=True)
    except Exception:
        errors += 1

print('Imported objects:', import_count, 'errors:', errors, flush=True)
print('Done.', flush=True)
