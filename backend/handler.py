from mangum import Mangum
from src.api import app  # ← Import your app from src/api.py

handler = Mangum(app)
