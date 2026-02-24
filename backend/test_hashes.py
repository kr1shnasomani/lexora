import asyncio
from dotenv import load_dotenv
load_dotenv()
from engines.layer3.neo4j_client import Neo4jConnector
from database import get_supabase
import os

db = get_supabase()

hashes = [
    "b55e08095469e90d6bddb70ffee9e408",
    "51cf19255caf4486df0bb771c2edfbb1"
]

print("Checking Supabase for hashes:")
for h in hashes:
    res = db.table("claim_documents").select("claim_id, sha256, file_name").ilike("sha256", f"{h}%").execute()
    print(f"{h}:", res.data)

print("\nChecking exact match:")
for h in hashes:
    res = db.table("claim_documents").select("*").eq("sha256", h).execute()
    print(f"{h}:", res.data)
