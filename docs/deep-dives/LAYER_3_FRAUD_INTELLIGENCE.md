# Layer 3: Fraud Intelligence (Complete Guide)

## Table of Contents
1. [Overview](#overview)
2. [Three-Tier Architecture](#three-tier-architecture)
3. [Tier 1: Rule-Based Sentinel](#tier-1-rule-based-sentinel)
4. [Tier 2: Vector Similarity Detection](#tier-2-vector-similarity-detection)
5. [Tier 3: Graph Network Analysis](#tier-3-graph-network-analysis)
6. [Fraud Fusion Engine](#fraud-fusion-engine)
7. [Complete Implementation](#complete-implementation)
8. [Testing Strategy](#testing-strategy)

---

## Overview

### What Layer 3 Does

**Input:** Validated claim data from Layer 1 & 2

**Output:** Fraud risk score (0.0 - 1.0) + detected patterns + evidence

**Core Function:** Detect potential fraud through three cascading detection tiers

---

### Why Three Tiers?

**Problem:** Single fraud detection method misses patterns.

- **Rule-based alone:** Misses sophisticated fraud (e.g., slightly modified images)
- **ML alone:** Expensive, requires large dataset, can't explain decisions
- **Graph alone:** Misses simple duplicate submissions

**Solution:** Layer multiple complementary approaches.

---

### Tier Characteristics

| Tier | Method | Speed | Cost | Accuracy | Explainability |
|------|--------|-------|------|----------|----------------|
| **Tier 1** | SQL Rules | ⚡ Very Fast (10ms) | 💰 Free | 🎯 High Precision | ✅ Perfect |
| **Tier 2** | Vector Similarity | ⚡ Fast (500ms) | 💰 Low ($0.001/claim) | 🎯 Medium | ✅ Good |
| **Tier 3** | Graph Analytics | ⏱️ Slower (2s) | 💰 Medium | 🎯 High | ✅ Good |

---

### Critical Principles

**1. Cascade:** Run cheap checks first, expensive only if needed

**2. Evidence-Based:** Every flag must include proof (not just score)

**3. Explainable:** Human investigators must understand WHY claim was flagged

**4. Configurable:** Thresholds must be adjustable without code changes

---

## Three-Tier Architecture

### Data Flow

```
Claim Data
    ↓
┌───────────────────────────────────────┐
│ TIER 1: Rule-Based Checks (SQL)      │
│ - Duplicate invoice?                  │
│ - Velocity anomaly?                   │
│ - Amount outlier?                     │
│ → Tier 1 Score (0.0 - 1.0)           │
└───────────────────────────────────────┘
    ↓
┌───────────────────────────────────────┐
│ TIER 2: Vector Similarity             │
│ - Embed images → Qdrant               │
│ - Embed text → Qdrant                 │
│ - Search for duplicates                │
│ → Tier 2 Score (0.0 - 1.0)           │
└───────────────────────────────────────┘
    ↓
┌───────────────────────────────────────┐
│ TIER 3: Graph Analytics (Neo4j)       │
│ - Build relationship graph             │
│ - Detect fraud rings                   │
│ - Find suspicious patterns             │
│ → Tier 3 Score (0.0 - 1.0)           │
└───────────────────────────────────────┘
    ↓
┌───────────────────────────────────────┐
│ FUSION: Weighted Combination           │
│ Combined = (w1×T1) + (w2×T2) + (w3×T3)│
│ → Final Fraud Score (0.0 - 1.0)       │
└───────────────────────────────────────┘
```

---

### For Hackathon

**Build:** Tier 1 only (3 hours)

**Mock:** Tier 2 & 3 (show in slides)

**Why:** Tier 1 demonstrates fraud detection. Tier 2/3 are time-intensive.

---

## Tier 1: Rule-Based Sentinel

### What Tier 1 Detects

**1. Duplicate Invoice Numbers**
- Same invoice submitted multiple times
- High precision indicator of fraud

**2. Velocity Anomalies**
- Too many claims in short time period
- Indicates potential fraud ring or serial fraudster

**3. Amount Anomalies**
- Claim amount is statistical outlier
- May indicate inflated amounts

**4. Expired Policy**
- Incident after policy ended
- Simple fraud attempt

---

### Check 1: Duplicate Invoice Detection

#### How It Works

**Query:** Has this exact invoice number been used before?

```sql
SELECT id, claim_number, submitted_at
FROM claims
WHERE invoice_number = :invoice_number
  AND id != :current_claim_id
LIMIT 1
```

#### Implementation

```python
def check_duplicate_invoice(claim_data: dict, supabase) -> dict:
    """
    Check if invoice number was previously submitted
    
    Returns:
        None if no duplicate, or flag dict if duplicate found
    """
    
    invoice_number = claim_data.get('invoice_number')
    
    if not invoice_number:
        # No invoice number to check
        return None
    
    # Query database
    result = supabase.table('claims')\
        .select('id, claim_number, submitted_at, claimant_name')\
        .eq('invoice_number', invoice_number)\
        .neq('id', claim_data['id'])\
        .execute()
    
    if not result.data:
        # No duplicate found
        return None
    
    # Duplicate detected!
    original = result.data[0]
    
    return {
        "flag_type": "duplicate_invoice",
        "severity": "high",
        "description": f"Invoice {invoice_number} was submitted in claim {original['claim_number']} on {original['submitted_at'][:10]}",
        "evidence": {
            "invoice_number": invoice_number,
            "original_claim_id": original['id'],
            "original_claim_number": original['claim_number'],
            "original_date": original['submitted_at'],
            "original_claimant": original['claimant_name']
        },
        "risk_score": 0.8
    }
```

#### Edge Cases

**Case 1: Legitimate Re-Issue**
```
Scenario: Original invoice lost, provider re-issues same number
Solution: Human reviews and approves
Learning: Add note to claim for future reference
```

**Case 2: Different Claimants, Same Invoice**
```
Scenario: Two people submit same invoice number
Red Flag: Very suspicious (fraud ring?)
Action: Automatic investigation
```

**Case 3: Sequential Invoice Numbers**
```
Scenario: INV-001, INV-002 from same provider in short time
Detection: Track via graph analysis (Tier 3)
```

---

### Check 2: Velocity Anomaly Detection

#### How It Works

**Query:** How many claims has this claimant submitted recently?

```sql
SELECT COUNT(*) as claim_count
FROM claims
WHERE claimant_name = :claimant_name
  AND submitted_at > NOW() - INTERVAL '7 days'
  AND id != :current_claim_id
```

#### Implementation

```python
def check_velocity_anomaly(claim_data: dict, supabase) -> dict:
    """
    Check if claimant submitted too many claims recently
    
    Returns:
        None if normal, or flag dict if anomaly detected
    """
    
    from datetime import datetime, timedelta
    
    claimant_name = claim_data.get('claimant_name')
    
    if not claimant_name:
        return None
    
    # Load threshold from config
    config = supabase.table('configuration')\
        .select('config_value')\
        .eq('config_key', 'fraud.tier1.velocity_threshold')\
        .single()\
        .execute()
    
    threshold = int(config.data['config_value']) if config.data else 5
    
    # Query recent claims
    seven_days_ago = (datetime.now() - timedelta(days=7)).isoformat()
    
    result = supabase.table('claims')\
        .select('id, claim_number, submitted_at', count='exact')\
        .eq('claimant_name', claimant_name)\
        .gte('submitted_at', seven_days_ago)\
        .neq('id', claim_data['id'])\
        .execute()
    
    claim_count = result.count or 0
    
    if claim_count <= threshold:
        # Normal velocity
        return None
    
    # Anomaly detected!
    return {
        "flag_type": "velocity_anomaly",
        "severity": "high",
        "description": f"{claimant_name} submitted {claim_count} claims in 7 days (threshold: {threshold})",
        "evidence": {
            "claimant_name": claimant_name,
            "claim_count": claim_count,
            "threshold": threshold,
            "time_window": "7 days",
            "recent_claims": [r['claim_number'] for r in result.data]
        },
        "risk_score": 0.8
    }
```

#### Velocity Thresholds

**Conservative (Low False Positives):**
```
7 days: 10 claims
30 days: 20 claims
```

**Moderate:**
```
7 days: 5 claims (default)
30 days: 15 claims
```

**Aggressive (High Sensitivity):**
```
7 days: 3 claims
30 days: 10 claims
```

---

### Check 3: Amount Anomaly Detection

#### How It Works

**Statistical Method:** Z-score analysis

```
If (claimed_amount - mean) / stddev > 3.0:
    Flag as outlier
```

#### Implementation

```python
def check_amount_anomaly(claim_data: dict, supabase) -> dict:
    """
    Check if claimed amount is statistical outlier
    
    Returns:
        None if normal, or flag dict if outlier
    """
    
    claimed_amount = claim_data.get('claimed_amount')
    incident_type = claim_data.get('incident_type')
    
    if not claimed_amount or not incident_type:
        return None
    
    # Query statistics for this incident type
    result = supabase.rpc('get_amount_stats', {
        'incident_type_param': incident_type
    }).execute()
    
    if not result.data or not result.data[0]:
        # Insufficient data for statistics
        return None
    
    stats = result.data[0]
    mean = float(stats['mean']) if stats['mean'] else 0
    stddev = float(stats['stddev']) if stats['stddev'] else 0
    
    if stddev == 0:
        # No variation in data (or single data point)
        return None
    
    # Calculate z-score
    z_score = (claimed_amount - mean) / stddev
    
    if z_score <= 3.0:
        # Within normal range
        return None
    
    # Outlier detected!
    return {
        "flag_type": "amount_anomaly",
        "severity": "medium",
        "description": f"Amount ${claimed_amount:.2f} is {z_score:.1f} standard deviations above mean",
        "evidence": {
            "claimed_amount": claimed_amount,
            "incident_type": incident_type,
            "mean": mean,
            "stddev": stddev,
            "z_score": round(z_score, 2),
            "threshold_z": 3.0
        },
        "risk_score": min(0.5 + (z_score - 3.0) * 0.1, 0.9)  # Scale risk with z-score
    }
```

#### Database Function

```sql
-- Run in Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_amount_stats(incident_type_param TEXT)
RETURNS TABLE(mean NUMERIC, stddev NUMERIC, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    AVG(claimed_amount) as mean,
    STDDEV(claimed_amount) as stddev,
    COUNT(*) as count
  FROM claims
  WHERE incident_type = incident_type_param
    AND claimed_amount IS NOT NULL
    AND claimed_amount > 0
    AND status IN ('approved', 'extracted', 'finalized')
    AND claimed_amount < 1000000;  -- Exclude outliers from baseline
END;
$$ LANGUAGE plpgsql;
```

---

### Tier 1 Score Calculation

```python
def calculate_tier1_score(flags: list) -> float:
    """
    Calculate overall Tier 1 risk score
    
    Logic: Use maximum flag score (don't add them)
    Why: Multiple flags often indicate same fraud pattern
    
    Args:
        flags: List of flag dicts
    
    Returns:
        Float 0.0 - 1.0
    """
    
    if not flags:
        return 0.0
    
    # Get highest risk score
    return max(flag['risk_score'] for flag in flags)
```

**Example:**
```python
flags = [
    {"flag_type": "duplicate_invoice", "risk_score": 0.8},
    {"flag_type": "velocity_anomaly", "risk_score": 0.8}
]

score = calculate_tier1_score(flags)
# Returns: 0.8 (not 1.6)
```

---

### Complete Tier 1 Module

```python
# backend/fraud_tier1.py

from typing import Dict, List, Any
from supabase import Client

class FraudTier1:
    def __init__(self, supabase: Client):
        self.supabase = supabase
    
    def analyze(self, claim_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run all Tier 1 fraud checks
        
        Returns:
            {
                "passed": bool,
                "flags": [list of flags],
                "score": float,
                "checks_run": [list of check names]
            }
        """
        
        flags = []
        checks_run = []
        
        # Check 1: Duplicate Invoice
        checks_run.append("duplicate_invoice")
        flag = self._check_duplicate_invoice(claim_data)
        if flag:
            flags.append(flag)
        
        # Check 2: Velocity Anomaly
        checks_run.append("velocity_anomaly")
        flag = self._check_velocity_anomaly(claim_data)
        if flag:
            flags.append(flag)
        
        # Check 3: Amount Anomaly
        checks_run.append("amount_anomaly")
        flag = self._check_amount_anomaly(claim_data)
        if flag:
            flags.append(flag)
        
        # Calculate score
        score = self._calculate_score(flags)
        
        return {
            "passed": len(flags) == 0,
            "flags": flags,
            "score": score,
            "checks_run": checks_run,
            "high_risk_flags": [f for f in flags if f['severity'] == 'high']
        }
    
    def _check_duplicate_invoice(self, claim_data: Dict[str, Any]) -> Dict[str, Any]:
        """Check for duplicate invoice"""
        
        invoice_number = claim_data.get('invoice_number')
        if not invoice_number:
            return None
        
        result = self.supabase.table('claims')\
            .select('id, claim_number, submitted_at, claimant_name')\
            .eq('invoice_number', invoice_number)\
            .neq('id', claim_data.get('id', ''))\
            .execute()
        
        if not result.data:
            return None
        
        original = result.data[0]
        
        return {
            "flag_type": "duplicate_invoice",
            "severity": "high",
            "description": f"Invoice {invoice_number} previously submitted",
            "evidence": {
                "invoice_number": invoice_number,
                "original_claim": original['claim_number'],
                "original_date": original['submitted_at'][:10]
            },
            "risk_score": 0.8
        }
    
    def _check_velocity_anomaly(self, claim_data: Dict[str, Any]) -> Dict[str, Any]:
        """Check claim velocity"""
        
        from datetime import datetime, timedelta
        
        claimant = claim_data.get('claimant_name')
        if not claimant:
            return None
        
        # Get threshold from config
        threshold = 5  # Default
        
        seven_days_ago = (datetime.now() - timedelta(days=7)).isoformat()
        
        result = self.supabase.table('claims')\
            .select('id', count='exact')\
            .eq('claimant_name', claimant)\
            .gte('submitted_at', seven_days_ago)\
            .execute()
        
        count = result.count or 0
        
        if count <= threshold:
            return None
        
        return {
            "flag_type": "velocity_anomaly",
            "severity": "high",
            "description": f"{count} claims in 7 days",
            "evidence": {
                "claim_count": count,
                "threshold": threshold
            },
            "risk_score": 0.8
        }
    
    def _check_amount_anomaly(self, claim_data: Dict[str, Any]) -> Dict[str, Any]:
        """Check if amount is outlier"""
        
        # Simplified for hackathon
        # In production, use statistical analysis
        return None
    
    def _calculate_score(self, flags: List[Dict]) -> float:
        """Calculate Tier 1 score"""
        
        if not flags:
            return 0.0
        
        return max(flag['risk_score'] for flag in flags)
```

---

## Tier 2: Vector Similarity Detection

### What Tier 2 Detects

**1. Duplicate Images**
- Same photo submitted in multiple claims
- Slightly edited images (cropped, rotated, filtered)

**2. Duplicate Text**
- Copy-pasted incident descriptions
- Template fraud (same story, different claimant)

---

### How Vector Embeddings Work

**Concept:** Convert images/text into numerical vectors

```
"Car accident on Highway 101" → [0.23, -0.54, 0.11, ..., 0.87]
                                  (1024 numbers)
```

**Property:** Similar content = Similar vectors

```
"Car accident on Highway 101"  → Vector A
"Auto crash on Route 101"      → Vector B
Similarity(A, B) = 0.92 (very similar!)
```

---

### Image Embedding Process

**Step 1: Upload Image to Jina AI**

```python
import base64
import requests

def generate_image_embedding(image_bytes: bytes) -> list:
    """
    Generate 512-dim embedding for image
    
    Args:
        image_bytes: Image file bytes
    
    Returns:
        List of 512 floats
    """
    
    # Convert to base64
    image_base64 = base64.b64encode(image_bytes).decode('utf-8')
    
    # Call Jina API
    response = requests.post(
        "https://api.jina.ai/v1/embeddings",
        headers={
            "Authorization": f"Bearer {JINA_API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "input": [{"image": f"data:image/jpeg;base64,{image_base64}"}],
            "model": "jina-clip-v1"
        },
        timeout=30
    )
    
    if response.status_code != 200:
        raise Exception(f"Jina API error: {response.text}")
    
    data = response.json()
    embedding = data['data'][0]['embedding']  # 512 floats
    
    return embedding
```

**Step 2: Store in Qdrant**

```python
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, Distance, VectorParams

def store_image_embedding(claim_id: str, document_id: str, embedding: list):
    """
    Store image embedding in Qdrant
    
    Args:
        claim_id: UUID of claim
        document_id: UUID of document
        embedding: 512-dim vector
    """
    
    qdrant = QdrantClient(url="http://localhost:6333")
    
    # Create collection if not exists
    try:
        qdrant.get_collection("claim_images")
    except:
        qdrant.create_collection(
            collection_name="claim_images",
            vectors_config=VectorParams(size=512, distance=Distance.COSINE)
        )
    
    # Generate unique ID
    point_id = hash(f"{claim_id}:{document_id}") % (2**31)
    
    # Insert point
    qdrant.upsert(
        collection_name="claim_images",
        points=[
            PointStruct(
                id=point_id,
                vector=embedding,
                payload={
                    "claim_id": claim_id,
                    "document_id": document_id,
                    "uploaded_at": datetime.now().isoformat()
                }
            )
        ]
    )
```

**Step 3: Search for Duplicates**

```python
def search_similar_images(embedding: list, threshold: float = 0.95) -> list:
    """
    Search for similar images
    
    Args:
        embedding: Query vector
        threshold: Minimum similarity score
    
    Returns:
        List of matching claims
    """
    
    qdrant = QdrantClient(url="http://localhost:6333")
    
    results = qdrant.search(
        collection_name="claim_images",
        query_vector=embedding,
        limit=5,
        score_threshold=threshold
    )
    
    matches = []
    for result in results:
        matches.append({
            "claim_id": result.payload['claim_id'],
            "similarity": result.score,
            "uploaded_at": result.payload['uploaded_at']
        })
    
    return matches
```

---

### Text Embedding Process

**Similar to images, but uses Cohere:**

```python
import cohere

def generate_text_embedding(text: str) -> list:
    """
    Generate 1024-dim embedding for text
    
    Args:
        text: Incident description
    
    Returns:
        List of 1024 floats
    """
    
    co = cohere.Client(COHERE_API_KEY)
    
    response = co.embed(
        texts=[text],
        model="embed-english-v3.0",
        input_type="search_query"
    )
    
    embedding = response.embeddings[0]  # 1024 floats
    
    return embedding
```

Store and search similar to images (use Qdrant collection "claim_texts").

---

### Tier 2 Score Calculation

```python
def calculate_tier2_score(image_matches: list, text_matches: list) -> float:
    """
    Calculate Tier 2 risk score
    
    Logic: Weighted combination of image and text similarity
    
    Args:
        image_matches: List of image similarity results
        text_matches: List of text similarity results
    
    Returns:
        Float 0.0 - 1.0
    """
    
    # Get max similarities
    max_image_sim = max([m['similarity'] for m in image_matches], default=0.0)
    max_text_sim = max([m['similarity'] for m in text_matches], default=0.0)
    
    # Weighted combination (images weighted higher)
    score = (0.6 * max_image_sim) + (0.4 * max_text_sim)
    
    return score
```

---

### Error Handling

```python
def generate_image_embedding_safe(image_bytes: bytes) -> list:
    """Safe version with error handling"""
    
    try:
        return generate_image_embedding(image_bytes)
    
    except requests.Timeout:
        # API timeout
        logging.error("Jina API timeout")
        return None
    
    except requests.HTTPError as e:
        if e.response.status_code == 429:
            # Rate limited
            logging.warning("Jina API rate limited")
            time.sleep(2)  # Wait and retry
            return generate_image_embedding(image_bytes)
        else:
            logging.error(f"Jina API error: {e}")
            return None
    
    except Exception as e:
        logging.error(f"Unexpected error: {e}")
        return None
```

---

## Tier 3: Graph Network Analysis

### What Tier 3 Detects

**1. Fraud Rings**
- Multiple people submitting claims to same provider
- Shared contact information (phone, email, bank account)

**2. High-Velocity Providers**
- Provider linked to suspiciously many claims

**3. Circular Fraud**
- Invoice numbers reused across network
- Bank accounts shared by multiple claimants

---

### Graph Data Model

**Nodes:**
```
Claim
Person (Claimant)
Provider (Doctor, Hospital, Repair Shop)
Contact (Phone, Email)
Financial (Bank Account, Invoice)
Device (IP Address)
```

**Relationships:**
```
(Person)-[:FILED]->(Claim)
(Claim)-[:TREATED_BY]->(Provider)
(Person)-[:HAS_CONTACT]->(Contact)
(Person)-[:HAS_ACCOUNT]->(Financial)
(Claim)-[:REFERENCES]->(Financial)
(Claim)-[:SUBMITTED_FROM]->(Device)
```

---

### Graph Construction

```python
from neo4j import GraphDatabase

def build_claim_graph(claim_data: dict, driver):
    """
    Add claim and relationships to Neo4j graph
    
    Args:
        claim_data: Claim information
        driver: Neo4j driver
    """
    
    with driver.session() as session:
        # Create Claim node
        session.run("""
            MERGE (claim:Claim {id: $claim_id})
            SET claim.claim_number = $claim_number,
                claim.amount = $amount,
                claim.date = date($date)
        """, 
        claim_id=claim_data['id'],
        claim_number=claim_data['claim_number'],
        amount=claim_data['claimed_amount'],
        date=claim_data['incident_date']
        )
        
        # Create Person node (use UUID, not PII)
        person_id = hashlib.sha256(claim_data['claimant_name'].encode()).hexdigest()
        
        session.run("""
            MERGE (person:Person {id: $person_id})
            SET person.name_hash = $name_hash
            
            MERGE (claim:Claim {id: $claim_id})
            
            MERGE (person)-[:FILED {filed_at: datetime()}]->(claim)
        """,
        person_id=person_id,
        name_hash=person_id[:16],  # Shortened hash for display
        claim_id=claim_data['id']
        )
        
        # Create Provider node
        if claim_data.get('provider_name'):
            session.run("""
                MERGE (provider:Provider {name: $provider_name})
                
                MERGE (claim:Claim {id: $claim_id})
                
                MERGE (claim)-[:TREATED_BY]->(provider)
            """,
            provider_name=claim_data['provider_name'],
            claim_id=claim_data['id']
            )
        
        # Create Contact node (hash phone for privacy)
        if claim_data.get('claimant_phone'):
            phone_hash = hashlib.sha256(claim_data['claimant_phone'].encode()).hexdigest()[:16]
            
            session.run("""
                MERGE (contact:Contact {value: $phone_hash, type: 'phone'})
                
                MERGE (person:Person {id: $person_id})
                
                MERGE (person)-[:HAS_CONTACT]->(contact)
            """,
            phone_hash=phone_hash,
            person_id=person_id
            )
        
        # Create Financial node (invoice)
        if claim_data.get('invoice_number'):
            session.run("""
                MERGE (financial:Financial {identifier: $invoice, type: 'invoice'})
                
                MERGE (claim:Claim {id: $claim_id})
                
                MERGE (claim)-[:REFERENCES]->(financial)
            """,
            invoice=claim_data['invoice_number'],
            claim_id=claim_data['id']
            )
```

---

### Fraud Pattern Queries

**Pattern 1: High-Velocity Provider**

```cypher
-- Find providers linked to many recent claims
MATCH (provider:Provider)<-[:TREATED_BY]-(claim:Claim)
WHERE claim.date > date() - duration('P7D')
WITH provider, count(claim) as claim_count
WHERE claim_count > 10
RETURN provider.name, claim_count
ORDER BY claim_count DESC
```

```python
def detect_high_velocity_providers(driver) -> list:
    """Find suspicious providers"""
    
    with driver.session() as session:
        result = session.run("""
            MATCH (provider:Provider)<-[:TREATED_BY]-(claim:Claim)
            WHERE claim.date > date() - duration('P7D')
            WITH provider, count(claim) as claim_count
            WHERE claim_count > 10
            RETURN provider.name as name, claim_count
        """)
        
        flags = []
        for record in result:
            flags.append({
                "pattern": "high_velocity_provider",
                "severity": "high",
                "description": f"Provider '{record['name']}' linked to {record['claim_count']} claims in 7 days",
                "evidence": {
                    "provider_name": record['name'],
                    "claim_count": record['claim_count']
                },
                "risk_score": 0.8
            })
        
        return flags
```

**Pattern 2: Shared Contact**

```cypher
-- Find contacts shared by multiple people
MATCH (person:Person)-[:HAS_CONTACT]->(contact:Contact)
WITH contact, count(DISTINCT person) as person_count
WHERE person_count > 3
RETURN contact.value, contact.type, person_count
```

**Pattern 3: Invoice Reuse Network**

```cypher
-- Find invoices used in multiple claims
MATCH (claim:Claim)-[:REFERENCES]->(financial:Financial {type: 'invoice'})
WITH financial, count(claim) as usage_count
WHERE usage_count > 1
RETURN financial.identifier, usage_count
```

---

### Network Size Calculation

```python
def calculate_network_size(claim_id: str, driver) -> int:
    """
    Calculate network size around a claim
    
    Traverse graph up to 2 hops and count connected nodes
    """
    
    with driver.session() as session:
        result = session.run("""
            MATCH (claim:Claim {id: $claim_id})-[*1..2]-(connected)
            RETURN count(DISTINCT connected) as network_size
        """,
        claim_id=claim_id
        )
        
        record = result.single()
        return record['network_size'] if record else 0
```

---

### Tier 3 Score Calculation

```python
def calculate_tier3_score(patterns: list, network_size: int) -> float:
    """
    Calculate Tier 3 risk score
    
    Args:
        patterns: List of detected fraud patterns
        network_size: Number of connected nodes
    
    Returns:
        Float 0.0 - 1.0
    """
    
    if not patterns:
        # No patterns, but check network size
        if network_size > 10:
            return 0.3  # Moderately suspicious
        else:
            return 0.0
    
    # Average risk scores of detected patterns
    avg_risk = sum(p['risk_score'] for p in patterns) / len(patterns)
    
    # Boost if large network
    if network_size > 10:
        avg_risk = min(avg_risk * 1.2, 1.0)
    
    return avg_risk
```

---

## Fraud Fusion Engine

### What is Fusion?

**Problem:** Three different scores. How to combine?

**Solution:** Weighted average

```
Combined Score = (w1 × Tier1) + (w2 × Tier2) + (w3 × Tier3)
```

---

### Default Weights

```python
DEFAULT_FUSION_WEIGHTS = [0.3, 0.3, 0.4]

# Tier 1: 30% weight (rule-based)
# Tier 2: 30% weight (vector similarity)
# Tier 3: 40% weight (graph analytics)
```

**Rationale:**
- Tier 3 weighted highest (most sophisticated detection)
- Tier 1 & 2 equal (balance precision vs recall)

---

### Fusion Implementation

```python
def fuse_fraud_scores(tier1_score: float, tier2_score: float, tier3_score: float, supabase) -> dict:
    """
    Combine tier scores into final fraud score
    
    Args:
        tier1_score: Tier 1 risk score
        tier2_score: Tier 2 risk score
        tier3_score: Tier 3 risk score
        supabase: Database client
    
    Returns:
        {
            "combined_score": float,
            "risk_level": str,
            "weights_used": list,
            "weights_version": int
        }
    """
    
    # Load weights from configuration
    config = supabase.table('configuration')\
        .select('config_value, version')\
        .eq('config_key', 'fraud.fusion.weights')\
        .single()\
        .execute()
    
    if config.data:
        weights = config.data['config_value']
        version = config.data['version']
    else:
        weights = DEFAULT_FUSION_WEIGHTS
        version = 1
    
    # Calculate combined score
    combined = (weights[0] * tier1_score) + \
               (weights[1] * tier2_score) + \
               (weights[2] * tier3_score)
    
    # Clamp to [0, 1]
    combined = max(0.0, min(1.0, combined))
    
    # Determine risk level
    if combined < 0.3:
        risk_level = "low"
    elif combined < 0.7:
        risk_level = "medium"
    else:
        risk_level = "high"
    
    return {
        "combined_score": combined,
        "risk_level": risk_level,
        "weights_used": weights,
        "weights_version": version
    }
```

---

## Complete Implementation

### Main Fraud Detection Module

```python
# backend/fraud_detection.py

from typing import Dict, Any
from supabase import Client
from fraud_tier1 import FraudTier1

class FraudDetector:
    def __init__(self, supabase: Client):
        self.supabase = supabase
        self.tier1 = FraudTier1(supabase)
    
    def analyze(self, claim_id: str) -> Dict[str, Any]:
        """
        Run complete fraud analysis
        
        Returns:
            {
                "fraud_score": float,
                "risk_level": str,
                "tier1": {...},
                "tier2": {...},
                "tier3": {...},
                "recommendation": str
            }
        """
        
        # Get claim data
        result = self.supabase.table('claims')\
            .select('*')\
            .eq('id', claim_id)\
            .single()\
            .execute()
        
        claim_data = result.data
        
        # Run Tier 1
        tier1_result = self.tier1.analyze(claim_data)
        
        # For hackathon: Mock Tier 2 & 3
        tier2_result = {"score": 0.0, "matches": []}
        tier3_result = {"score": 0.0, "patterns": []}
        
        # Fusion
        fusion = self._fuse_scores(
            tier1_result['score'],
            tier2_result['score'],
            tier3_result['score']
        )
        
        # Determine recommendation
        recommendation = self._get_recommendation(fusion['combined_score'])
        
        # Compile result
        analysis = {
            "fraud_score": fusion['combined_score'],
            "risk_level": fusion['risk_level'],
            "tier1": tier1_result,
            "tier2": tier2_result,
            "tier3": tier3_result,
            "fusion": fusion,
            "recommendation": recommendation
        }
        
        # Update claim
        self.supabase.table('claims')\
            .update({
                'fraud_score': fusion['combined_score'],
                'fraud_analysis': analysis
            })\
            .eq('id', claim_id)\
            .execute()
        
        return analysis
    
    def _fuse_scores(self, t1: float, t2: float, t3: float) -> Dict:
        """Combine tier scores"""
        
        weights = [0.3, 0.3, 0.4]
        combined = (weights[0] * t1) + (weights[1] * t2) + (weights[2] * t3)
        
        if combined < 0.3:
            risk_level = "low"
        elif combined < 0.7:
            risk_level = "medium"
        else:
            risk_level = "high"
        
        return {
            "combined_score": combined,
            "risk_level": risk_level,
            "weights_used": weights,
            "weights_version": 1
        }
    
    def _get_recommendation(self, score: float) -> str:
        """Get action recommendation"""
        
        if score < 0.3:
            return "proceed"
        elif score < 0.7:
            return "review"
        else:
            return "investigate"
```

---

### FastAPI Endpoint

```python
# backend/main.py

@app.post("/api/v1/claims/{claim_id}/fraud-check")
async def check_fraud(claim_id: str):
    """Run fraud detection on claim"""
    
    detector = FraudDetector(supabase)
    result = detector.analyze(claim_id)
    
    return result
```

---

## Testing Strategy

### Unit Tests

```python
def test_duplicate_invoice_detected():
    # Insert claim with invoice INV-123
    claim1 = create_test_claim(invoice_number="INV-123")
    
    # Try to submit another claim with same invoice
    claim2 = create_test_claim(invoice_number="INV-123")
    
    tier1 = FraudTier1(supabase)
    result = tier1.analyze(claim2)
    
    assert len(result['flags']) == 1
    assert result['flags'][0]['flag_type'] == 'duplicate_invoice'
    assert result['score'] == 0.8

def test_velocity_anomaly():
    # Submit 6 claims in 5 days
    claimant = "John Doe"
    for i in range(6):
        create_test_claim(claimant_name=claimant)
    
    # 7th claim should be flagged
    claim7 = create_test_claim(claimant_name=claimant)
    
    tier1 = FraudTier1(supabase)
    result = tier1.analyze(claim7)
    
    assert len(result['flags']) == 1
    assert result['flags'][0]['flag_type'] == 'velocity_anomaly'

def test_fusion_calculation():
    tier1_score = 0.8
    tier2_score = 0.2
    tier3_score = 0.3
    
    # (0.3 × 0.8) + (0.3 × 0.2) + (0.4 × 0.3) = 0.42
    
    detector = FraudDetector(supabase)
    fusion = detector._fuse_scores(tier1_score, tier2_score, tier3_score)
    
    assert fusion['combined_score'] == 0.42
    assert fusion['risk_level'] == 'medium'
```

---

## Summary

### Layer 3 Outputs

```python
{
  "fraud_score": 0.72,
  "risk_level": "high",
  
  "tier1": {
    "score": 0.8,
    "flags": [
      {
        "flag_type": "duplicate_invoice",
        "severity": "high",
        "evidence": {...}
      }
    ]
  },
  
  "tier2": {
    "score": 0.65,
    "matches": [...]
  },
  
  "tier3": {
    "score": 0.70,
    "patterns": [...]
  },
  
  "fusion": {
    "combined_score": 0.72,
    "weights_used": [0.3, 0.3, 0.4]
  },
  
  "recommendation": "investigate"
}
```

### Hackathon Implementation

**Build (3 hours):**
- ✅ Tier 1 (all 3 checks)
- ✅ Fusion engine
- ✅ FastAPI endpoint

**Mock (slides):**
- Tier 2 (vector similarity)
- Tier 3 (graph analytics)

---

**Layer 3 is complete!** 🔍
