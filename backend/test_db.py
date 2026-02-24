import asyncio
from dotenv import load_dotenv
load_dotenv()
from engines.layer3.neo4j_client import Neo4jConnector
from database import get_supabase
import os

cfg = {
    "neo4j_uri": os.environ.get("NEO4J_URI"),
    "neo4j_user": os.environ.get("NEO4J_USER"),
    "neo4j_password": os.environ.get("NEO4J_PASSWORD"),
    "neo4j_database": os.environ.get("NEO4J_DATABASE", ""),
    "neo4j_timeout_seconds": 5
}

neo = Neo4jConnector(cfg)
db_args = neo.db_args
query = """
MATCH (c:Claim)-[r:HAS_ENTITY]->(e:Entity)
RETURN c.id as claim_id, e.id as entity_id, e.type as entity_type
LIMIT 5
"""

with neo.driver.session(**db_args) as session:
    result = session.run(query)
    records = list(result)

neo.close()

db = get_supabase()
claims = set([c["claim_id"] for c in records])

print("--- RAW NEO4J RECORDS ---")
for r in records[:2]:
    print(r)

print("\n--- TEST DOCS FETCH WITH FIX ---")
doc_filenames = {}
if claims:
    try:
        db = get_supabase()
        result = db.table("claim_documents").select("sha256, file_name").in_("claim_id", list(claims)).execute()
        for row in result.data or []:
            sha_prefix = str(row["sha256"])[:32]
            doc_filenames[sha_prefix] = row["file_name"]
        print("Success!", doc_filenames)
    except Exception as e:
        print(f"Error: {e}")

