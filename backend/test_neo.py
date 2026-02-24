import os
from dotenv import load_dotenv
load_dotenv("../.env")
print("URI:", os.environ.get("NEO4J_URI"))
