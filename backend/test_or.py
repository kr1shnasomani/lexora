import asyncio
from dotenv import load_dotenv
load_dotenv()
from database import get_supabase

db = get_supabase()

doc_hashes = [
    "b55e08095469e90d6bddb70ffee9e408",
    "51cf19255caf4486df0bb771c2edfbb1"
]

try:
    or_filter = ",".join([f"sha256.ilike.{h}%" for h in doc_hashes])
    print("Filter string:", or_filter)
    result = db.table("claim_documents").select("sha256, file_name").or_(or_filter).execute()
    print("Result:", result.data)
except Exception as e:
    print("Error:", e)

