import uuid
import random
import string

def generate_room_code(length: int = 6) -> str:
    """Short uppercase alphanumeric room code, e.g. 'X4KR2A'"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

def generate_uuid() -> str:
    return str(uuid.uuid4())
