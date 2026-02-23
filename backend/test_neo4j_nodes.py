from engines.layer3.neo4j_client import Neo4jConnector
from config import get_settings

cfg = {
    "neo4j_uri": get_settings().neo4j_uri,
    "neo4j_user": get_settings().neo4j_user,
    "neo4j_password": get_settings().neo4j_password,
    "neo4j_database": get_settings().neo4j_database,
    "neo4j_timeout_seconds": 5
}
neo = Neo4jConnector(cfg)
with neo.driver.session(**neo.db_args) as session:
    res = session.run("MATCH (c:Claim) RETURN count(c) as cnt")
    print("Total Claims in Neo4j:", res.single()["cnt"])
    res2 = session.run("MATCH (e:Entity) RETURN count(e) as cnt")
    print("Total Entities in Neo4j:", res2.single()["cnt"])
neo.close()
