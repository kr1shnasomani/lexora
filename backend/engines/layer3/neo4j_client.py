"""Layer 3 — Neo4j Client
Handles Claim and Entity nodes, relationship upserts, and multi-hop traversal.
"""
import time
from typing import Optional, Tuple, List, Dict, Any

try:
    from neo4j import GraphDatabase, Driver
    NEO4J_AVAILABLE = True
except ImportError:
    NEO4J_AVAILABLE = False


class Neo4jConnector:
    def __init__(self, cfg: dict):
        self.cfg = cfg
        self.driver: Optional['Driver'] = None
        
        uri = cfg.get("neo4j_uri")
        user = cfg.get("neo4j_user", "neo4j")
        password = cfg.get("neo4j_password")
        
        if NEO4J_AVAILABLE and uri and password:
            try:
                # max_connection_lifetime sets timeouts correctly
                self.driver = GraphDatabase.driver(
                    uri, 
                    auth=(user, password), 
                    connection_timeout=cfg.get("neo4j_timeout_seconds", 5),
                    max_transaction_retry_time=cfg.get("neo4j_timeout_seconds", 5)
                )
            except Exception:
                self.driver = None

    def close(self):
        if self.driver:
            self.driver.close()

    def upsert_claim_graph(self, claim_id: str, entities: List[dict]) -> Tuple[bool, Optional[str], int]:
        """
        Upsert a claim node and its connected entities.
        entities: list of {"type": "provider", "value": "john doe"}
        """
        start_ms = int(time.time() * 1000)
        if not self.driver:
            return False, "Neo4j not initialized", int(time.time()*1000) - start_ms
            
        db_name = self.cfg.get("neo4j_database", "neo4j")
        
        # Cypher: MERGE Claim, then UNWIND entities, MERGE entity, MERGE relationship
        query = """
        MERGE (c:Claim {id: $claim_id})
        WITH c
        UNWIND $entities AS ent
        MERGE (e:Entity {id: ent.type + ':' + ent.value})
        ON CREATE SET e.type = ent.type, e.value = ent.value
        MERGE (c)-[:HAS_ENTITY]->(e)
        """
        
        try:
            with self.driver.session(database=db_name) as session:
                session.run(query, claim_id=claim_id, entities=entities)
            elapsed = int(time.time() * 1000) - start_ms
            return True, None, elapsed
        except Exception as e:
            elapsed = int(time.time() * 1000) - start_ms
            return False, f"Neo4j Upsert Error: {str(e)}", elapsed

    def find_claim_neighborhood(self, claim_id: str, max_hops: int = 2) -> Tuple[dict, Optional[str], int]:
        """
        Find neighborhood for claim. Returns component size, top hub entities, and edges excerpt.
        We do a bounded variable length traversal.
        """
        start_ms = int(time.time() * 1000)
        if not self.driver:
            return {}, "Neo4j not initialized", int(time.time()*1000) - start_ms
            
        db_name = self.cfg.get("neo4j_database", "neo4j")
        
        # Convert graph hops to pattern lengths since Claim->Entity->Claim is 2 hops in cypher.
        # User defined max_hops = 2 usually means 2 claim-to-claim hops (4 relationship hops).
        cypher_hops = max_hops * 2 
        
        query = f"""
        MATCH path = (start:Claim {{id: $claim_id}})-[:HAS_ENTITY*1..{cypher_hops}]-(connected)
        WHERE (start)-[:HAS_ENTITY]-(connected) OR connected:Claim
        WITH nodes(path) AS ns, relationships(path) AS rels
        UNWIND ns AS n
        WITH COLLECT(DISTINCT n) AS unique_nodes, rels
        UNWIND rels AS r
        WITH unique_nodes, COLLECT(DISTINCT r) AS unique_rels
        RETURN unique_nodes, unique_rels
        """

        try:
            with self.driver.session(database=db_name) as session:
                result = session.run(query, claim_id=claim_id)
                record = result.single()
                
            nodes = record["unique_nodes"] if record else []
            rels = record["unique_rels"] if record else []
            
            claims_count = sum(1 for n in nodes if "Claim" in n.labels)
            
            # Find hubs
            entity_degrees = {}
            for r in rels:
                # rels connect Claim to Entity. The Entity node is usually the end or start.
                n1 = r.start_node
                n2 = r.end_node
                if "Entity" in n1.labels:
                    entity_degrees[n1["id"]] = entity_degrees.get(n1["id"], 0) + 1
                if "Entity" in n2.labels:
                    entity_degrees[n2["id"]] = entity_degrees.get(n2["id"], 0) + 1
            
            sorted_hubs = sorted(entity_degrees.items(), key=lambda x: x[1], reverse=True)
            top_hubs = [h[0] for h in sorted_hubs[:3]]
            
            # Format excerpt
            edges_excerpt = []
            for r in rels[:50]: # cap excerpt
                edges_excerpt.append({
                    "start": r.start_node["id"],
                    "end": r.end_node["id"]
                })
                
            elapsed = int(time.time() * 1000) - start_ms
            
            return {
                "component_size": claims_count,
                "hub_entities": top_hubs,
                "edges_excerpt": edges_excerpt,
                "nodes_count": len(nodes),
                "edges_count": len(rels),
                "hops_used": max_hops
            }, None, elapsed
            
        except Exception as e:
            elapsed = int(time.time() * 1000) - start_ms
            return {}, f"Neo4j Query Error: {str(e)}", elapsed
