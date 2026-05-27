from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    name = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'name', 'password')
        extra_kwargs = {
            'username': {'required': False, 'allow_blank': True},
        }

    def create(self, validated_data):
        password = validated_data.pop('password')
        name = validated_data.pop('name', '').strip()
        if not validated_data.get('username'):
            validated_data.pop('username', None)
        if name:
            validated_data['full_name'] = name
        user = User.objects.create_user(password=password, **validated_data)
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='full_name', read_only=True)

    class Meta:
        model = User
        fields = (
            'id',
            'email',
            'username',
            'name',
            'phone_number',
            'role',
            'institution',
            'student_id',
            'preferences',
            'date_joined',
        )


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    name = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ('email', 'username', 'name', 'phone_number', 'institution', 'student_id', 'preferences', 'password')

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        name = validated_data.pop('name', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if name is not None:
            instance.full_name = name
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class UserRoleUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('role',)


class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return attrs

    def save(self, **kwargs):
        email = self.validated_data['email']
        password = self.validated_data['password']
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            raise serializers.ValidationError({'email': 'No account found with this email.'})
        user.set_password(password)
        user.save(update_fields=['password'])
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['email'] = user.email
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['role'] = self.user.role
        data['email'] = self.user.email
        data['user_id'] = self.user.id
        data['name'] = self.user.full_name or self.user.username
        return data
