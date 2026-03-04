import asyncio
from dotenv import load_dotenv  # type: ignore[import]
load_dotenv()
from database import get_supabase  # type: ignore[import]

db = get_supabase()

res = db.table("claims").select("id, fraud_score, status").execute()
print("All Claims:")
for r in res.data:
    print(r)
