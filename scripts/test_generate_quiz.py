import json
from ai_tutor.services.ai_router import generate_quiz

if __name__ == '__main__':
    print('Calling generate_quiz...')
    res = generate_quiz('Algorithms', 'Medium', 2, {'student_name':'Test Student'})
    print('Result keys:', list(res.keys()))
    print(json.dumps(res, indent=2)[:4000])
