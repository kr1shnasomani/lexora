# Layer 5: Complete Deep-Dive (Full Production System)

## Overview: What Layer 5 Actually Does

**Layer 5 has 3 core functions:**
1. **Audit Logging** - Record everything for legal compliance
2. **Feedback Collection** - Capture human corrections
3. **Active Learning** - Retrain model to improve over time

---

# Part 1: Audit Logging (Complete Explanation)

## What Are Audit Logs?

**Definition:** Immutable record of every decision made by the system, with enough detail to reproduce the exact same result 6 months later.

### **Why Audit Logs Exist:**

1. **Legal Compliance** - Insurance is regulated. Must prove decisions are fair and defensible.
2. **Fraud Defense** - If accused of fraud, need evidence of detection process
3. **Debugging** - When system makes wrong decision, trace back to find root cause
4. **Transparency** - Claimants have right to know why claim was denied
5. **Reproducibility** - Re-run old claim with old rules to verify consistency

---

## What Goes in Audit Logs? (Complete List)

### **For EVERY Layer Execution:**

```json
{
  "claim_id": "UUID of claim",
  "stage": "Which layer (layer1, fraud_tier1, policy, decision)",
  "event_type": "started | completed | failed",
  "created_at": "Exact timestamp",
  "duration_ms": "How long it took",
  
  "payload": {
    // Layer-specific details below
  }
}
```

---

### **Layer 1 (Perception) Audit:**

```json
{
  "stage": "layer1",
  "event_type": "completed",
  "payload": {
    // What models were used
    "models_used": {
      "pdf": "gemma-3-12b-it",
      "image": "gemma-3-12b-it", 
      "video": "gemini-2.5-flash-lite",
      "audio": "whisper-large-v3-turbo"
    },
    
    // Exact prompts sent to AI
    "prompts": {
      "pdf_extraction": "You are an insurance claim extractor. Extract these fields: policy_number, claimant_name...",
      "image_analysis": "Analyze this insurance claim image..."
    },
    
    // Raw AI responses (before cleaning)
    "raw_responses": {
      "pdf": "```json\n{\"policy_number\":\"P-001\"...}\n```",
      "image": "{\"policy_number\":\"P-001\",..."
    },
    
    // Extracted structured data
    "extracted_fields": {
      "policy_number": "P-001",
      "claimant_name": "John Doe",
      "incident_date": "2024-02-19",
      "claimed_amount": 1500.00
    },
    
    // Confidence per field
    "field_confidences": {
      "policy_number": 0.95,
      "claimant_name": 0.98,
      "incident_date": 0.90,
      "claimed_amount": 0.92
    },
    
    // Overall confidence calculation
    "confidence_calculation": {
      "critical_fields": ["policy_number", "claimant_name", "incident_date", "claimed_amount"],
      "critical_avg": 0.9375,
      "non_critical_avg": 0.85,
      "weights": [0.7, 0.3],
      "overall": 0.912
    },
    
    // Warnings and issues
    "warnings": [
      "Missing: provider_name",
      "Low confidence on invoice_number (0.65)"
    ],
    
    // Files processed
    "files": [
      {
        "file_id": "UUID",
        "file_name": "claim.pdf",
        "file_hash": "sha256...",
        "size_bytes": 245680,
        "contributed_fields": ["policy_number", "claimed_amount"]
      }
    ]
  },
  "duration_ms": 2340
}
```

**Why this matters:** If AI misreads amount as $1500 instead of $15000, audit log shows exact AI output for debugging.

---

### **Layer 2 (Policy) Audit:**

```json
{
  "stage": "policy",
  "event_type": "completed",
  "payload": {
    // Which policy and rule version
    "policy_id": "UUID",
    "policy_number": "POL-2025-001",
    "rules_version": "v1.3",
    "effective_date": "2025-01-01",
    
    // Validation checks
    "validations_run": [
      {
        "rule": "incident_date >= policy_start",
        "result": "passed",
        "values": {
          "incident_date": "2024-02-19",
          "policy_start": "2024-01-01"
        }
      },
      {
        "rule": "claimed_amount > 0",
        "result": "passed",
        "values": {"claimed_amount": 1500.00}
      }
    ],
    
    // Coverage determination
    "coverage_check": {
      "incident_type": "illness",
      "mapped_to_category": "medical_coverage",
      "category_covered": true,
      "waiting_period_check": {
        "days_required": 30,
        "days_elapsed": 49,
        "result": "passed"
      }
    },
    
    // Exclusion checks
    "exclusions_checked": ["cosmetic", "experimental"],
    "exclusion_found": null,
    
    // Benefit calculation step-by-step
    "calculation_trail": [
      {
        "step": 1,
        "description": "Base claimed amount",
        "value": 1500.00
      },
      {
        "step": 2,
        "description": "Apply 20% copay (patient pays 20%)",
        "calculation": "1500.00 × (1 - 0.20)",
        "value": 1200.00
      },
      {
        "step": 3,
        "description": "Check per-incident limit",
        "limit": 5000.00,
        "calculation": "min(1200.00, 5000.00)",
        "value": 1200.00
      },
      {
        "step": 4,
        "description": "Check annual limit remaining",
        "annual_limit": 50000.00,
        "used_this_year": 12000.00,
        "remaining": 38000.00,
        "calculation": "min(1200.00, 38000.00)",
        "value": 1200.00
      },
      {
        "step": 5,
        "description": "Final approved benefit",
        "value": 1200.00
      }
    ],
    
    // Final decision
    "decision": "approved",
    "benefit_amount": 1200.00,
    "rejection_reason": null,
    
    // Annual limit update
    "annual_limit_impact": {
      "before": 38000.00,
      "after": 36800.00
    }
  },
  "duration_ms": 12
}
```

**Why this matters:** If claimant disputes denial, audit shows exact rule that rejected claim.

---

### **Layer 3 (Fraud) Audit:**

```json
{
  "stage": "fraud",
  "event_type": "completed",
  "payload": {
    // Tier 1: Rule-based checks
    "tier1": {
      "checks_run": [
        {
          "check": "duplicate_invoice",
          "query": "SELECT id FROM claims WHERE invoice_number = 'INV-123' AND id != current_claim",
          "result": {
            "found": true,
            "original_claim_id": "UUID",
            "original_claim_number": "CLM-001",
            "original_date": "2024-02-15"
          },
          "flag": {
            "type": "duplicate_invoice",
            "severity": "high",
            "score": 0.8
          }
        },
        {
          "check": "velocity_anomaly",
          "query": "SELECT COUNT(*) FROM claims WHERE claimant_name = 'John Doe' AND created_at > NOW() - INTERVAL '7 days'",
          "result": {
            "claim_count": 3,
            "threshold": 5
          },
          "flag": null
        },
        {
          "check": "amount_anomaly",
          "query": "SELECT AVG(claimed_amount), STDDEV(claimed_amount) FROM claims WHERE incident_type = 'illness'",
          "result": {
            "mean": 850.00,
            "stddev": 320.00,
            "z_score": 2.03,
            "threshold_z": 3.0
          },
          "flag": null
        }
      ],
      "flags_found": 1,
      "score": 0.8
    },
    
    // Tier 2: Vector similarity
    "tier2": {
      "image_embeddings": [
        {
          "document_id": "UUID",
          "model": "jina-clip-v1",
          "vector_dimension": 512,
          "generation_time_ms": 450,
          "search_results": [
            {
              "match_claim_id": "UUID-old",
              "similarity": 0.97,
              "threshold": 0.95,
              "flagged": true
            }
          ]
        }
      ],
      "text_embeddings": [
        {
          "text": "incident_description",
          "model": "embed-english-v3.0",
          "vector_dimension": 1024,
          "generation_time_ms": 320,
          "search_results": [
            {
              "match_claim_id": "UUID-old",
              "similarity": 0.82,
              "threshold": 0.90,
              "flagged": false
            }
          ]
        }
      ],
      "max_image_similarity": 0.97,
      "max_text_similarity": 0.82,
      "score": 0.664  // (0.6 × 0.97) + (0.4 × 0.82)
    },
    
    // Tier 3: Graph analytics
    "tier3": {
      "graph_queries": [
        {
          "pattern": "high_velocity_provider",
          "cypher": "MATCH (p:Provider)<-[:TREATED_BY]-(c:Claim) WHERE c.date > date() - duration('P7D') WITH p, count(c) as cnt WHERE cnt > 10 RETURN p.name, cnt",
          "results": [],
          "flagged": false
        },
        {
          "pattern": "shared_contact",
          "cypher": "MATCH (person:Person)-[:HAS_CONTACT]->(c:Contact) WITH c, count(DISTINCT person) as cnt WHERE cnt > 3 RETURN c.value, cnt",
          "results": [
            {
              "contact": "+91-XXX-XXX-5678",
              "person_count": 4
            }
          ],
          "flagged": true,
          "risk_score": 0.7
        }
      ],
      "network_size": 6,
      "score": 0.7
    },
    
    // Fusion
    "fusion": {
      "weights_used": [0.3, 0.3, 0.4],
      "weights_version": "v2",
      "calculation": "(0.3 × 0.8) + (0.3 × 0.664) + (0.4 × 0.7)",
      "combined_score": 0.7192,
      "risk_level": "high"
    },
    
    // Final output
    "fraud_score": 0.7192,
    "recommendation": "investigate"
  },
  "duration_ms": 1580
}
```

**Why this matters:** If fraud investigation clears claimant, audit shows which signal triggered investigation (can refine that check).

---

### **Layer 4 (Decision) Audit:**

```json
{
  "stage": "decision",
  "event_type": "completed",
  "payload": {
    // Inputs to decision
    "inputs": {
      "extraction_confidence": 0.912,
      "fraud_score": 0.7192,
      "policy_decision": "approved",
      "policy_benefit": 1200.00
    },
    
    // Thresholds at decision time
    "thresholds_used": {
      "confidence_min": 0.85,
      "fraud_high": 0.7,
      "fraud_low": 0.3,
      "investigation_cost": 150.00
    },
    
    // Decision tree execution
    "decision_flow": [
      {
        "step": 1,
        "check": "extraction_confidence >= 0.85",
        "result": true,
        "action": "proceed"
      },
      {
        "step": 2,
        "check": "policy_decision == rejected",
        "result": false,
        "action": "proceed"
      },
      {
        "step": 3,
        "check": "fraud_score > 0.7",
        "result": true,
        "action": "route to fraud_investigation"
      }
    ],
    
    // Economic calculation
    "economic_analysis": {
      "expected_loss": 861.0,  // 0.7192 × 1200
      "investigation_cost": 150.00,
      "cost_benefit": "expected_loss > investigation_cost",
      "recommendation": "investigate"
    },
    
    // Final decision
    "final_decision": "fraud_investigation",
    "decision_rationale": "High fraud score (0.72) detected due to duplicate invoice and shared contact pattern. Expected loss ($861) exceeds investigation cost ($150).",
    "confidence_level": "high",
    "approved_amount": null
  },
  "duration_ms": 5
}
```

**Why this matters:** Shows exact logic path that led to decision. Reproducible 100%.

---

## Audit Log Storage

### **Database Table:**

```sql
CREATE TABLE audit_events (
  id UUID PRIMARY KEY,
  claim_id UUID REFERENCES claims(id),
  stage TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,  -- All the details above
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **Key Rules:**

1. **Append-Only** - Never UPDATE or DELETE audit logs
2. **Complete** - Must log EVERYTHING (inputs, outputs, intermediate steps)
3. **Immutable** - Once written, cannot be changed
4. **Timestamped** - UTC timestamps with millisecond precision
5. **Versioned** - Log which version of model/rules was used

---

# Part 2: Feedback Collection (Complete Explanation)

## What is Feedback?

**Definition:** Human corrections when the system makes a wrong decision.

---

## Who Provides Feedback?

1. **Underwriters** - Review flagged claims, override AI decisions
2. **SIU Investigators** - Confirm or refute fraud allegations
3. **Quality Auditors** - Random sample reviews for quality control
4. **Appeals Team** - Handle customer disputes

---

## When is Feedback Collected?

### **Scenario 1: Manual Review Queue**

```
AI says: "manual_review" (fraud score 0.55)
Human reviews claim
Human says: "auto_approve" (claim is legitimate)
→ Disagreement detected → Feedback collected
```

### **Scenario 2: Fraud Investigation**

```
AI says: "fraud_investigation" (duplicate invoice found)
SIU investigates
SIU says: "auto_approve" (duplicate was legitimate re-issue)
→ Disagreement detected → Feedback collected
```

### **Scenario 3: Random Audit**

```
AI says: "auto_approve"
Claim was auto-processed
Auditor randomly reviews
Auditor says: "Should have been fraud_investigation" (missed pattern)
→ Disagreement detected → Feedback collected
```

### **Scenario 4: Customer Appeal**

```
AI says: "auto_reject" (policy exclusion)
Customer appeals
Appeals team says: "auto_approve" (rule was misinterpreted)
→ Disagreement detected → Feedback collected
```

---

## What Data Goes in Feedback?

### **Feedback Table Schema:**

```sql
CREATE TABLE feedback (
  id UUID PRIMARY KEY,
  claim_id UUID REFERENCES claims(id),
  
  -- Who reviewed it
  reviewed_by UUID REFERENCES users(id),
  reviewer_role TEXT,  -- 'underwriter', 'siu', 'auditor', 'appeals'
  
  -- What system said vs what human said
  system_decision claim_final_decision,
  human_decision claim_final_decision,
  
  -- Disagreement flag (computed)
  disagreement BOOLEAN GENERATED ALWAYS AS (system_decision != human_decision) STORED,
  
  -- Why did human disagree?
  feedback_category TEXT,
  feedback_notes TEXT,
  
  -- What layer was wrong?
  layer_at_fault TEXT,  -- 'layer1', 'fraud_tier1', 'policy', 'decision'
  specific_issue TEXT,  -- 'extraction_error', 'false_positive', 'rule_misapplied'
  
  -- Tier scores at time of system decision
  tier1_score FLOAT,
  tier2_score FLOAT,
  tier3_score FLOAT,
  combined_fraud_score FLOAT,
  extraction_confidence FLOAT,
  
  -- Training metadata
  flagged_for_retraining BOOLEAN DEFAULT false,
  training_batch_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### **Example Feedback Records:**

#### **Example 1: False Positive (System too aggressive)**

```json
{
  "claim_id": "UUID",
  "reviewed_by": "underwriter-UUID",
  "reviewer_role": "underwriter",
  
  "system_decision": "fraud_investigation",
  "human_decision": "auto_approve",
  "disagreement": true,
  
  "feedback_category": "false_positive_fraud",
  "feedback_notes": "Duplicate invoice was a legitimate re-issue after original was lost. Invoice number reused intentionally.",
  
  "layer_at_fault": "fraud_tier1",
  "specific_issue": "duplicate_invoice_check_too_strict",
  
  "tier1_score": 0.8,
  "tier2_score": 0.2,
  "tier3_score": 0.3,
  "combined_fraud_score": 0.46,
  
  "flagged_for_retraining": true
}
```

**What this teaches:** Tier 1 duplicate invoice check needs context. Not all duplicates are fraud.

---

#### **Example 2: False Negative (System missed fraud)**

```json
{
  "claim_id": "UUID",
  "reviewed_by": "siu-UUID",
  "reviewer_role": "siu",
  
  "system_decision": "auto_approve",
  "human_decision": "fraud_investigation",
  "disagreement": true,
  
  "feedback_category": "fraud_missed",
  "feedback_notes": "Image showed same damage as 3 prior claims. Vector similarity should have caught this but threshold was too high.",
  
  "layer_at_fault": "fraud_tier2",
  "specific_issue": "similarity_threshold_too_high",
  
  "tier1_score": 0.1,
  "tier2_score": 0.88,  // Similarity was 0.88, but threshold is 0.90
  "tier3_score": 0.2,
  "combined_fraud_score": 0.348,  // Below 0.7 threshold
  
  "flagged_for_retraining": true
}
```

**What this teaches:** Tier 2 threshold (0.90) is too high. Lower to 0.85 to catch more duplicates.

---

#### **Example 3: Extraction Error**

```json
{
  "claim_id": "UUID",
  "reviewed_by": "underwriter-UUID",
  "reviewer_role": "underwriter",
  
  "system_decision": "auto_approve",
  "human_decision": "auto_reject",
  "disagreement": true,
  
  "feedback_category": "extraction_error",
  "feedback_notes": "AI misread $15,000 as $1,500. OCR error on scanned invoice.",
  
  "layer_at_fault": "layer1",
  "specific_issue": "amount_extraction_error",
  
  "extraction_confidence": 0.92,  // Confidence was high but wrong!
  
  "flagged_for_retraining": false  // Can't retrain external model
}
```

**What this teaches:** High confidence doesn't always mean correct. Need better OCR or human verification for high-value claims.

---

## Feedback Collection UI

### **Manual Review Interface:**

```typescript
// Frontend component for underwriters

function ReviewClaim({ claim }) {
  const [decision, setDecision] = useState('');
  const [notes, setNotes] = useState('');
  
  const submitReview = async () => {
    await fetch(`/api/v1/claims/${claim.id}/feedback`, {
      method: 'POST',
      body: JSON.stringify({
        reviewed_by: currentUser.id,
        reviewer_role: currentUser.role,
        system_decision: claim.final_decision,
        human_decision: decision,
        feedback_notes: notes,
        
        // Include tier scores for training
        tier1_score: claim.fraud_analysis.tier1.score,
        tier2_score: claim.fraud_analysis.tier2.score,
        tier3_score: claim.fraud_analysis.tier3.score,
        combined_fraud_score: claim.fraud_score,
        extraction_confidence: claim.overall_confidence
      })
    });
  };
  
  return (
    <div>
      <h2>System Recommendation: {claim.final_decision}</h2>
      <p>Fraud Score: {claim.fraud_score}</p>
      
      <label>Your Decision:</label>
      <select onChange={(e) => setDecision(e.target.value)}>
        <option value="auto_approve">Approve</option>
        <option value="auto_reject">Reject</option>
        <option value="fraud_investigation">Investigate Further</option>
      </select>
      
      {decision !== claim.final_decision && (
        <textarea 
          placeholder="Why do you disagree with the system?"
          onChange={(e) => setNotes(e.target.value)}
        />
      )}
      
      <button onClick={submitReview}>Submit Review</button>
    </div>
  );
}
```

---

# Part 3: Training Dataset Construction

## Goal

Transform feedback into machine learning training data.

---

## What Goes in Training Dataset?

### **Features (X):** The 3 tier scores

```
X = [
  [tier1_score, tier2_score, tier3_score],  // Row 1
  [tier1_score, tier2_score, tier3_score],  // Row 2
  ...
]
```

### **Labels (y):** Whether claim was actually fraud

```
y = [
  1,  // Fraud (human said reject or investigate)
  0,  // Legitimate (human said approve)
  ...
]
```

---

## SQL Query to Build Dataset

```sql
CREATE OR REPLACE FUNCTION get_training_data()
RETURNS TABLE(
  tier1_score FLOAT,
  tier2_score FLOAT,
  tier3_score FLOAT,
  label INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.tier1_score,
    f.tier2_score,
    f.tier3_score,
    CASE 
      WHEN f.human_decision IN ('auto_reject', 'fraud_investigation') 
      THEN 1  -- Fraud
      ELSE 0  -- Legitimate
    END as label
  FROM feedback f
  WHERE f.disagreement = true  -- Only disagreements (where system was wrong)
    AND f.flagged_for_retraining = true
    AND f.created_at > NOW() - INTERVAL '3 months'  -- Recent data only
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql;
```

---

## Example Training Dataset

| tier1_score | tier2_score | tier3_score | label | Notes |
|-------------|-------------|-------------|-------|-------|
| 0.8 | 0.2 | 0.3 | 0 | Duplicate invoice was legit (false positive) |
| 0.1 | 0.9 | 0.2 | 1 | Missed duplicate image (false negative) |
| 0.3 | 0.88 | 0.5 | 1 | Similarity 0.88 missed (threshold too high) |
| 0.2 | 0.1 | 0.7 | 1 | Graph caught fraud ring correctly |
| 0.6 | 0.5 | 0.6 | 0 | System flagged but was legitimate |

**Pattern emerges:** 
- Tier 2 (vector similarity) is very reliable when >0.85
- Tier 1 has false positives on duplicate invoices
- Tier 3 (graph) is good for organized fraud

---

# Part 4: Model Retraining Process (Complete Algorithm)

## What Model Are We Training?

**NOT training:** GPT, Gemini, Whisper (those are external APIs)

**TRAINING:** Logistic Regression to find optimal fusion weights

---

## Current Fraud Score Formula

```python
# Current (hardcoded)
fraud_score = (0.3 × tier1) + (0.3 × tier2) + (0.4 × tier3)
```

**Goal:** Find better weights that reduce false positives/negatives.

---

## Retraining Algorithm (Step-by-Step)

### **Step 1: Load Training Data**

```python
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

# Query database
result = supabase.rpc('get_training_data').execute()

if len(result.data) < 100:
    raise ValueError("Need at least 100 feedback samples to retrain")

# Convert to numpy arrays
X = []
y = []

for row in result.data:
    X.append([row['tier1_score'], row['tier2_score'], row['tier3_score']])
    y.append(row['label'])

X = np.array(X)
y = np.array(y)

print(f"Training samples: {len(y)}")
print(f"Fraud cases: {sum(y)}")
print(f"Legitimate cases: {len(y) - sum(y)}")
```

**Output:**
```
Training samples: 247
Fraud cases: 89
Legitimate cases: 158
```

---

### **Step 2: Split Data**

```python
# 80% train, 20% validation
X_train, X_val, y_train, y_val = train_test_split(
    X, y, 
    test_size=0.2, 
    random_state=42,
    stratify=y  # Ensure balanced split
)

print(f"Training set: {len(X_train)} samples")
print(f"Validation set: {len(X_val)} samples")
```

**Output:**
```
Training set: 197 samples
Validation set: 50 samples
```

---

### **Step 3: Train Logistic Regression**

```python
# Create model
model = LogisticRegression(
    penalty='l2',  # Regularization
    C=1.0,         # Regularization strength
    random_state=42
)

# Train
model.fit(X_train, y_train)

print("Training complete!")
```

**What happens internally:**

Logistic Regression learns a function:
```
P(fraud) = sigmoid(w1×tier1 + w2×tier2 + w3×tier3 + bias)
```

It finds weights (w1, w2, w3) that maximize correct classifications.

---

### **Step 4: Extract New Weights**

```python
# Get learned weights
raw_weights = model.coef_[0]  # e.g., [0.42, 0.89, 0.65]
bias = model.intercept_[0]

print(f"Raw weights: {raw_weights}")
print(f"Bias: {bias}")

# Normalize to sum to 1.0 (for interpretability)
total = sum(abs(w) for w in raw_weights)
normalized_weights = [abs(w) / total for w in raw_weights]

print(f"Old weights: [0.3, 0.3, 0.4]")
print(f"New weights: {normalized_weights}")
```

**Output:**
```
Raw weights: [0.42, 0.89, 0.65]
Bias: -0.23
Old weights: [0.3, 0.3, 0.4]
New weights: [0.214, 0.454, 0.332]
```

**Interpretation:**
- Tier 2 weight increased (0.3 → 0.454) - Model learned vector similarity is reliable
- Tier 1 weight decreased (0.3 → 0.214) - Model learned rule checks have false positives
- Tier 3 weight decreased (0.4 → 0.332) - Slightly less emphasis on graph

---

### **Step 5: Validate New Weights**

```python
# Test on validation set
y_pred_old = []
y_pred_new = []

old_weights = [0.3, 0.3, 0.4]
new_weights = normalized_weights

for i in range(len(X_val)):
    tier1, tier2, tier3 = X_val[i]
    
    # Old formula
    old_score = (old_weights[0] * tier1) + (old_weights[1] * tier2) + (old_weights[2] * tier3)
    y_pred_old.append(1 if old_score > 0.7 else 0)
    
    # New formula
    new_score = (new_weights[0] * tier1) + (new_weights[1] * tier2) + (new_weights[2] * tier3)
    y_pred_new.append(1 if new_score > 0.7 else 0)

# Compare performance
from sklearn.metrics import accuracy_score, precision_score, recall_score

print("OLD WEIGHTS:")
print(f"Accuracy: {accuracy_score(y_val, y_pred_old):.3f}")
print(f"Precision: {precision_score(y_val, y_pred_old):.3f}")
print(f"Recall: {recall_score(y_val, y_pred_old):.3f}")

print("\nNEW WEIGHTS:")
print(f"Accuracy: {accuracy_score(y_val, y_pred_new):.3f}")
print(f"Precision: {precision_score(y_val, y_pred_new):.3f}")
print(f"Recall: {recall_score(y_val, y_pred_new):.3f}")
```

**Output:**
```
OLD WEIGHTS:
Accuracy: 0.720
Precision: 0.667  (2/3 of flagged claims are actually fraud)
Recall: 0.611     (Catches 61% of fraud cases)

NEW WEIGHTS:
Accuracy: 0.840
Precision: 0.826  (Improved! Fewer false positives)
Recall: 0.722     (Improved! Catches more fraud)
```

**Decision:** New weights are better! Deploy them.

---

# Part 5: A/B Testing (Complete Explanation)

## What is A/B Testing?

**Definition:** Deploy new weights to 50% of claims, keep old weights for other 50%, compare results.

**Why:** Validate that new weights actually work better in production before full deployment.

---

## A/B Test Setup

### **Step 1: Assign Claims to Buckets**

```python
import hashlib

def get_ab_bucket(claim_id):
    """Deterministically assign claim to A or B bucket"""
    
    # Hash claim ID
    hash_val = int(hashlib.md5(claim_id.encode()).hexdigest(), 16)
    
    # Modulo 2 gives 0 or 1
    bucket = hash_val % 2
    
    return 'A' if bucket == 0 else 'B'

# Example
claim_id = "9f1c3d4b-2e0b-4b0c-a43f-63bdb6f0a9f1"
bucket = get_ab_bucket(claim_id)  # Returns 'A' or 'B'
```

**Properties:**
- 50/50 split
- Deterministic (same claim ID always gets same bucket)
- Random distribution

---

### **Step 2: Use Different Weights Per Bucket**

```python
def calculate_fraud_score(tier1, tier2, tier3, claim_id):
    """Calculate fraud score using A/B test weights"""
    
    bucket = get_ab_bucket(claim_id)
    
    if bucket == 'A':
        # Control group: Old weights
        weights = [0.3, 0.3, 0.4]
        weights_version = 'v1'
    else:
        # Treatment group: New weights
        weights = [0.214, 0.454, 0.332]
        weights_version = 'v2'
    
    score = (weights[0] * tier1) + (weights[1] * tier2) + (weights[2] * tier3)
    
    # Log which version was used
    audit_log(claim_id, 'fraud_fusion', {
        'ab_bucket': bucket,
        'weights_version': weights_version,
        'weights_used': weights,
        'tier_scores': [tier1, tier2, tier3],
        'combined_score': score
    })
    
    return score
```

---

### **Step 3: Track Metrics**

```sql
-- Create A/B test tracking table
CREATE TABLE ab_test_metrics (
  id UUID PRIMARY KEY,
  test_name VARCHAR(100),  -- 'fraud_weights_v2'
  start_date DATE,
  end_date DATE,
  
  -- Metrics by bucket
  bucket_a_claims INTEGER,
  bucket_b_claims INTEGER,
  
  bucket_a_false_positives INTEGER,
  bucket_b_false_positives INTEGER,
  
  bucket_a_false_negatives INTEGER,
  bucket_b_false_negatives INTEGER,
  
  bucket_a_precision FLOAT,
  bucket_b_precision FLOAT,
  
  bucket_a_recall FLOAT,
  bucket_b_recall FLOAT,
  
  winner VARCHAR(10),  -- 'A' or 'B'
  deployed BOOLEAN
);
```

---

### **Step 4: Monitor Results Daily**

```python
def calculate_ab_metrics():
    """Calculate daily A/B test metrics"""
    
    # Get all claims processed today with feedback
    query = """
    SELECT 
        ab_bucket,
        COUNT(*) as total_claims,
        SUM(CASE WHEN disagreement = true AND feedback_category = 'false_positive_fraud' THEN 1 ELSE 0 END) as false_positives,
        SUM(CASE WHEN disagreement = true AND feedback_category = 'fraud_missed' THEN 1 ELSE 0 END) as false_negatives
    FROM claims c
    LEFT JOIN feedback f ON c.id = f.claim_id
    WHERE c.created_at > NOW() - INTERVAL '1 day'
    GROUP BY ab_bucket
    """
    
    results = supabase.rpc('execute_query', {'query': query}).execute()
    
    bucket_a = next(r for r in results.data if r['ab_bucket'] == 'A')
    bucket_b = next(r for r in results.data if r['ab_bucket'] == 'B')
    
    print(f"Bucket A (old weights):")
    print(f"  Claims: {bucket_a['total_claims']}")
    print(f"  False positives: {bucket_a['false_positives']}")
    print(f"  False negatives: {bucket_a['false_negatives']}")
    
    print(f"\nBucket B (new weights):")
    print(f"  Claims: {bucket_b['total_claims']}")
    print(f"  False positives: {bucket_b['false_positives']}")
    print(f"  False negatives: {bucket_b['false_negatives']}")
```

**Output (Day 7):**
```
Bucket A (old weights):
  Claims: 523
  False positives: 42
  False negatives: 31

Bucket B (new weights):
  Claims: 518
  False positives: 28  ← 33% reduction!
  False negatives: 25  ← 19% reduction!
```

---

### **Step 5: Statistical Significance Test**

```python
from scipy.stats import chi2_contingency

def test_significance(bucket_a_fp, bucket_a_total, bucket_b_fp, bucket_b_total):
    """Test if difference is statistically significant"""
    
    # Create contingency table
    observed = [
        [bucket_a_fp, bucket_a_total - bucket_a_fp],  # Bucket A: FP, Not FP
        [bucket_b_fp, bucket_b_total - bucket_b_fp]   # Bucket B: FP, Not FP
    ]
    
    # Chi-square test
    chi2, p_value, dof, expected = chi2_contingency(observed)
    
    print(f"Chi-square statistic: {chi2:.3f}")
    print(f"P-value: {p_value:.4f}")
    
    if p_value < 0.05:
        print("Result is statistically significant!")
        return True
    else:
        print("Not significant. Need more data.")
        return False

# Test after 1 week
is_significant = test_significance(
    bucket_a_fp=42,
    bucket_a_total=523,
    bucket_b_fp=28,
    bucket_b_total=518
)
```

**Output:**
```
Chi-square statistic: 4.832
P-value: 0.0279
Result is statistically significant!
```

**Decision:** New weights (Bucket B) are significantly better. Deploy to 100%.

---

### **Step 6: Gradual Rollout**

```python
# Don't switch 100% immediately. Gradual rollout:

# Week 1: 50/50 split
# Week 2: 25/75 split (25% old, 75% new)
# Week 3: 10/90 split
# Week 4: 0/100 split (100% new)

def get_weights_with_gradual_rollout(claim_id, rollout_percentage=50):
    """
    rollout_percentage: % of claims using NEW weights
    """
    
    hash_val = int(hashlib.md5(claim_id.encode()).hexdigest(), 16)
    bucket = hash_val % 100  # 0-99
    
    if bucket < rollout_percentage:
        return [0.214, 0.454, 0.332], 'v2'  # New
    else:
        return [0.3, 0.3, 0.4], 'v1'  # Old
```

---

## A/B Test Duration

**Minimum:** 1 week (need enough claims for significance)
**Typical:** 2 weeks
**Maximum:** 1 month (don't delay good improvements)

---

# Part 6: Weight Update & Deployment

## How Weights Actually Change in Production

### **Step 1: Store New Weights in Database**

```sql
-- Update configuration table
UPDATE configuration
SET config_value = '[0.214, 0.454, 0.332]',
    version = version + 1,
    updated_by = 'system-retraining-job',
    updated_at = NOW()
WHERE config_key = 'fraud.fusion.weights';

-- Log the change
INSERT INTO configuration_history (
  config_key,
  old_value,
  new_value,
  reason,
  changed_by
) VALUES (
  'fraud.fusion.weights',
  '[0.3, 0.3, 0.4]',
  '[0.214, 0.454, 0.332]',
  'Retraining after 247 feedback samples. Precision improved from 0.667 to 0.826.',
  'automated-retraining'
);
```

---

### **Step 2: Application Reads New Weights**

```python
# backend/fraud_tier1.py

def get_fusion_weights(supabase):
    """Load current fusion weights from database"""
    
    result = supabase.table('configuration')\
        .select('config_value, version')\
        .eq('config_key', 'fraud.fusion.weights')\
        .single()\
        .execute()
    
    weights = result.data['config_value']  # [0.214, 0.454, 0.332]
    version = result.data['version']       # 2
    
    return weights, version

# Use in fraud calculation
def run_tier1_fraud_checks(claim_data, supabase):
    ...
    tier1_score = 0.8
    tier2_score = 0.2
    tier3_score = 0.3
    
    # Load current weights
    weights, version = get_fusion_weights(supabase)
    
    # Calculate score
    combined_score = (weights[0] * tier1_score) + \
                     (weights[1] * tier2_score) + \
                     (weights[2] * tier3_score)
    
    return {
        'combined_score': combined_score,
        'fusion_weights_used': weights,
        'fusion_weights_version': version
    }
```

---

### **Step 3: No Code Deployment Needed!**

**Old approach:**
```
Change weights in code → Test → Deploy → Restart servers
```

**New approach:**
```
Update database row → System automatically picks up new weights
```

**Benefits:**
- Zero downtime
- Instant rollback (just update DB again)
- No code changes needed
- Can A/B test easily

---

# Part 7: Complete Retraining Pipeline

## Monthly Automated Retraining Job

```python
# backend/retraining_job.py

import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def monthly_retraining_job():
    """
    Run this as a cron job on the 1st of each month
    """
    
    logger.info("Starting monthly retraining job...")
    
    # Step 1: Check if enough feedback
    feedback_count = supabase.table('feedback')\
        .select('id', count='exact')\
        .eq('disagreement', True)\
        .eq('flagged_for_retraining', True)\
        .execute()
    
    if feedback_count.count < 100:
        logger.warning(f"Only {feedback_count.count} feedback samples. Need 100+. Skipping retraining.")
        return
    
    logger.info(f"Found {feedback_count.count} feedback samples. Proceeding...")
    
    # Step 2: Load training data
    training_data = supabase.rpc('get_training_data').execute()
    
    X = []
    y = []
    for row in training_data.data:
        X.append([row['tier1_score'], row['tier2_score'], row['tier3_score']])
        y.append(row['label'])
    
    logger.info(f"Training dataset: {len(y)} samples ({sum(y)} fraud, {len(y)-sum(y)} legit)")
    
    # Step 3: Train model
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import train_test_split
    
    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = LogisticRegression()
    model.fit(X_train, y_train)
    
    logger.info("Model training complete.")
    
    # Step 4: Extract weights
    raw_weights = model.coef_[0]
    total = sum(abs(w) for w in raw_weights)
    new_weights = [abs(w) / total for w in raw_weights]
    
    logger.info(f"New weights: {new_weights}")
    
    # Step 5: Validate
    from sklearn.metrics import precision_score, recall_score
    
    # Old weights performance
    old_weights = [0.3, 0.3, 0.4]
    y_pred_old = []
    y_pred_new = []
    
    for i in range(len(X_val)):
        old_score = sum(old_weights[j] * X_val[i][j] for j in range(3))
        new_score = sum(new_weights[j] * X_val[i][j] for j in range(3))
        
        y_pred_old.append(1 if old_score > 0.7 else 0)
        y_pred_new.append(1 if new_score > 0.7 else 0)
    
    old_precision = precision_score(y_val, y_pred_old)
    new_precision = precision_score(y_val, y_pred_new)
    
    logger.info(f"Old precision: {old_precision:.3f}")
    logger.info(f"New precision: {new_precision:.3f}")
    
    # Step 6: Decide whether to deploy
    if new_precision > old_precision + 0.02:  # At least 2% improvement
        logger.info("New weights are better! Starting A/B test...")
        
        # Store in AB test table
        supabase.table('ab_test').insert({
            'test_name': f'fraud_weights_retrain_{datetime.now().strftime("%Y%m")}',
            'start_date': datetime.now().date(),
            'new_weights': new_weights,
            'old_weights': old_weights,
            'status': 'running'
        }).execute()
        
        logger.info("A/B test started. Will monitor for 2 weeks.")
    else:
        logger.info("New weights not significantly better. Keeping current weights.")
    
    logger.info("Retraining job complete.")

# Run monthly
if __name__ == '__main__':
    monthly_retraining_job()
```

---

## Cron Schedule

```bash
# crontab entry
# Run at 2 AM on the 1st of every month
0 2 1 * * python /app/backend/retraining_job.py >> /var/log/retraining.log 2>&1
```

---

# Part 8: Complete Layer 5 Implementation

## File Structure

```
backend/
├── audit_logger.py          # Audit logging utilities
├── feedback_collector.py    # Feedback collection APIs
├── retraining.py            # Retraining algorithms
├── ab_testing.py            # A/B test management
└── layer5_orchestrator.py   # Coordinates everything
```

---

## Summary: What Layer 5 Does

### **1. Audit Logging**
- Logs every layer execution
- Stores inputs, outputs, intermediate steps
- Records model versions, rule versions, thresholds used
- Enables reproducibility and transparency

### **2. Feedback Collection**
- Captures when humans disagree with AI
- Stores tier scores at decision time
- Categorizes type of error
- Flags claims for retraining

### **3. Active Learning**
- Queries feedback table for training data
- Trains Logistic Regression on disagreements
- Extracts new fusion weights
- Validates on held-out set

### **4. A/B Testing**
- Splits traffic 50/50
- Compares old vs new weights
- Measures statistical significance
- Gradual rollout if successful

### **5. Deployment**
- Updates weights in database
- No code changes needed
- Instant rollback capability
- Zero downtime

---

## Time Estimate (Full Implementation)

- Audit logging: 3 hours
- Feedback collection: 2 hours
- Retraining pipeline: 4 hours
- A/B testing: 3 hours
- Frontend for feedback: 2 hours

**Total: ~14 hours**

---

## For Hackathon (Minimal Version)

**Build (4 hours):**
- Audit logging (log to database)
- Basic feedback API
- View audit trail in frontend

**Mock (in slides):**
- Retraining algorithm explanation
- A/B testing methodology
- Show graph of "accuracy improving over time"

**Demo script:**
1. Submit claim
2. Show audit trail (complete processing log)
3. "In production, when underwriters correct decisions, system learns and improves weights monthly"

---

**This is the complete Layer 5 system!** 🎓