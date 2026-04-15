import random
import string

def generate_mt5_compliant_password():
    while True:
        length = random.randint(8, 12)

        upper = random.choice(string.ascii_uppercase)
        lower = random.choice(string.ascii_lowercase)
        digit = random.choice(string.digits)
        special = random.choice("!@#$%^&*()-_+=<>?")

        # Combine all required + remaining
        remaining = random.choices(
            string.ascii_letters + string.digits + "!@#$%^&*()-_+=<>?", 
            k=length - 4
        )

        password_chars = [upper, lower, digit, special] + remaining
        random.shuffle(password_chars)
        password = ''.join(password_chars)

        # Final validation (redundant due to forced inclusion, but safe)
        if (5 <= len(password) <= 15 and
            any(c.islower() for c in password) and
            any(c.isupper() for c in password) and
            any(c.isdigit() for c in password) and
            any(c in "!@#$%^&*()-_+=<>?" for c in password)):
            return password
