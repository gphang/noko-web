import bcrypt

def get_password_hash(password: str) -> str:
    """Generates a password hash using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

# Choose a simple password to generate a hash for
new_password = "test"
hashed_password = get_password_hash(new_password)

print(f"Password: {new_password}")
print(f"New Hashed Password: {hashed_password}")