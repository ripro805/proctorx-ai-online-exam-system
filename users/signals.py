from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from django.contrib.auth import get_user_model

from ai_tutor.models import AIConversation, AIStudyPlan

User = get_user_model()


@receiver(post_save, sender=User)
def create_user_defaults(sender, instance, created, **kwargs):
    """Initialize default data for new users: preferences, AI placeholders, and a welcome conversation."""
    if not created:
        return
    # Set default preferences if not set
    prefs = instance.preferences or {}
    prefs.setdefault('notifications', True)
    prefs.setdefault('study_planner', {})
    prefs.setdefault('ai_tutor', {})
    instance.preferences = prefs
    instance.save()

    if instance.role == 'student':
        # create a welcome AI conversation
        try:
            AIConversation.objects.create(student=instance, title='Welcome to ProctorX AI', subject='General')
        except Exception:
            # Do not fail user creation if AI models are not present
            pass
        # create an empty study plan placeholder
        try:
            AIStudyPlan.objects.create(student=instance, subject='')
        except Exception:
            pass
    elif instance.role == 'teacher':
        # teacher-specific initializations can be expanded later
        try:
            AIConversation.objects.create(student=instance, title='Teacher onboarding', subject='Teaching')
        except Exception:
            pass
*** End Patch