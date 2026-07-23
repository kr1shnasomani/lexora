import networkx as nx
from config import get_settings
from engines.layer3.neo4j_client import Neo4jConnector
from fastapi import APIRouter

from database import get_supabase

router = APIRouter(prefix="/network", tags=["Network Graph"])

@router.get("/graph")
async def get_network_graph():
    """
    Returns a connected network graph with pre-computed X/Y layout coordinates 
    derived dynamically from Neo4j.
    """
    import os

    from dotenv import load_dotenv
    load_dotenv()
    
    cfg = {
        "neo4j_uri": os.environ.get("NEO4J_URI"),
        "neo4j_user": os.environ.get("NEO4J_USER"),
        "neo4j_password": os.environ.get("NEO4J_PASSWORD"),
        "neo4j_database": os.environ.get("NEO4J_DATABASE", ""),
        "neo4j_timeout_seconds": 5
    }
    
    neo = Neo4jConnector(cfg)
    if not neo.driver: return {"nodes": [], "edges": []}
    
    db_args = neo.db_args
    query = """
    MATCH (c:Claim)-[r:HAS_ENTITY]->(e:Entity)
    RETURN c.id as claim_id, e.id as entity_id, e.type as entity_type
    LIMIT 1000
    """
    
    try:
        with neo.driver.session(**db_args) as session:
            result = session.run(query)
            records = list(result)
    except Exception as e:
        print(f"Error fetching from Neo4j: {e}")
        return {"nodes": [], "edges": []}
    finally:
        neo.close()

    if not records:
        return {"nodes": [], "edges": []}

    G = nx.Graph()
    claims = set()
    entities = {}

    for rec in records:
        cid = rec["claim_id"]
        eid = rec["entity_id"]
        # In neo4j, entity type is usually part of the ID or its label
        # e.g., 'phone:919840011223'
        etype = "connected"
        if "provider:" in eid: etype = "provider"
        elif "ip:" in eid or "vendor" in eid: etype = "vendor"
        elif "phone:" in eid: etype = "connected"
        elif "doc:" in eid: etype = "doc"
        
        claims.add(cid)
        entities[eid] = etype
        
        G.add_edge(cid, eid)
        
    # Generate coordinates predictably so it stays consistent on refresh
    # The 'k' parameter controls the distance between nodes. Increasing from 0.5 to 1.2 spaces out clusters properly.
    pos = nx.spring_layout(G, k=1.2, iterations=150, seed=42)
    
    nodes = []
    edges = []
    # Fetch real fraud scores from Supabase
    claim_scores = {}
    claim_details = {}
    if claims:
        try:
            db = get_supabase()
            result = db.table("claims").select("id, fraud_score, claimant_name, claim_number").in_("id", list(claims)).execute()
            for row in result.data or []:
                raw_score = row.get("fraud_score")
                claim_scores[row["id"]] = int((raw_score or 0.0) * 100)
                name = row.get("claimant_name") or "Unknown"
                num = row.get("claim_number") or ""
                claim_details[row["id"]] = f"{name} ({num})" if num else name
        except Exception as e:
            print(f"Error fetching Supabase fraud scores: {e}")
            
    # Fetch real document filenames from Supabase using graph hashes, supporting reuse
    doc_filenames = {}
    doc_hashes = [eid.replace("doc:", "") for eid, etype in entities.items() if etype == "doc"]
    
    if doc_hashes:
        try:
            db = get_supabase()
            # Batch in sets of 50 to prevent PostgREST URL length errors
            chunk_size = 50
            for i in range(0, len(doc_hashes), chunk_size):
                chunk = doc_hashes[i:i + chunk_size]
                or_filter = ",".join([f"sha256.ilike.{h}%" for h in chunk])
                if or_filter:
                    result = db.table("claim_documents").select("sha256, file_name").or_(or_filter).execute()
                    for row in result.data or []:
                        sha_prefix = str(row["sha256"])[:32]
                        doc_filenames[sha_prefix] = row["file_name"]
        except Exception as e:
            print(f"Error fetching Supabase document filenames: {e}")
            
    # Calculate inherited risk scores for entities from connected claims
    entity_risks = {}
    for edge in G.edges():
        c_id = edge[0] if edge[0] in claims else edge[1]
        e_id = edge[1] if edge[0] in claims else edge[0]
        
        if c_id in claims and e_id not in claims:
            risk = claim_scores.get(c_id, 0)
            if e_id not in entity_risks or risk > entity_risks.get(e_id, 0):
                entity_risks[e_id] = risk

    for node_id, coords in pos.items():
        x = ((coords[0] + 1) / 2) * 80 + 10
        y = ((coords[1] + 1) / 2) * 80 + 10
        
        if node_id in claims:
            c_label = claim_details.get(node_id, f"Claim: {node_id[:6]}")
            nodes.append({
                "id": node_id,
                "label": c_label[:15] + "..." if len(c_label) > 15 else c_label,
                "full_label": claim_details.get(node_id, f"Claim: {node_id}"),
                "type": "target",
                "x": x,
                "y": y,
                "risk": claim_scores.get(node_id, 0)
            })
        else:
            is_doc = entities.get(node_id) == "doc"
            
            label_parts = node_id.split(":", 1)
            full_label = label_parts[1] if len(label_parts) > 1 else node_id

            if is_doc:
                raw_hash = full_label # doc:hash -> hash
                full_label = doc_filenames.get(raw_hash, raw_hash)
            
            nodes.append({
                "id": node_id,
                "label": full_label[:15] + "..." if len(full_label) > 15 else full_label,
                "full_label": full_label,
                "type": "doc" if is_doc else entities.get(node_id, "connected"),
                "x": x,
                "y": y,
                "risk": entity_risks.get(node_id, 50)
            })
            
    for edge in G.edges():
        edges.append({
            "from_node": edge[0],
            "to_node": edge[1],
            "label": "connected"
        })
        
    return {"nodes": nodes, "edges": edges}
