# Layer 4: Decision Engine (Complete Guide)

## Table of Contents
1. [Overview](#overview)
2. [Decision Tree Logic](#decision-tree-logic)
3. [Economic Optimization](#economic-optimization)
4. [Confidence Assessment](#confidence-assessment)
5. [Routing Decisions](#routing-decisions)
6. [Rationale Generation](#rationale-generation)
7. [Complete Implementation](#complete-implementation)
8. [Testing Strategy](#testing-strategy)

---

## Overview

### What Layer 4 Does

**Input:** Results from Layers 1, 2, and 3

**Output:** Final routing decision + rationale + next steps

**Core Function:** Make economically optimal decision on how to handle the claim

---

### Four Possible Decisions

**1. AUTO_APPROVE** ✅
- Pay claim automatically
- Low fraud risk + high confidence + policy approved

**2. AUTO_REJECT** ❌
- Deny claim automatically
- Clear policy violation

**3. MANUAL_REVIEW** 📋
- Route to human underwriter
- Medium risk OR low confidence OR ambiguous policy

**4. FRAUD_INVESTIGATION** 🚨
- Escalate to Special Investigation Unit (SIU)
- High fraud score detected

---

### Critical Design Principles

**1. Conservative by Default**
- When uncertain → Manual review
- Never auto-approve questionable claims

**2. Economic Optimization**
- Only review when expected loss > investigation cost
- Small expected losses get auto-approved (acceptable risk)

**3. Explainability**
- Every decision includes clear rationale
- Humans must understand WHY decision was made

**4. Configurable Thresholds**
- All decision boundaries in database
- Can adjust without code changes

---

## Decision Tree Logic

### Complete Decision Flow

```
START

┌─────────────────────────────────────┐
│ Gate 1: Data Quality Check          │
└─────────────────────────────────────┘
    ↓
IF extraction_confidence < min_threshold (0.85):
    → MANUAL_REVIEW
    Reason: "Low extraction confidence"
    STOP
    
    ↓
┌─────────────────────────────────────┐
│ Gate 2: Policy Violation Check      │
└─────────────────────────────────────┘
    ↓
IF policy_decision == "rejected":
    → AUTO_REJECT
    Reason: Copy from policy rejection reason
    STOP

IF policy_decision == "ambiguous":
    → MANUAL_REVIEW
    Reason: "Policy coverage unclear"
    STOP
    
    ↓
┌─────────────────────────────────────┐
│ Gate 3: Severe Fraud Check          │
└─────────────────────────────────────┘
    ↓
IF fraud_score > high_threshold (0.7):
    → FRAUD_INVESTIGATION
    Reason: "High fraud risk detected"
    STOP
    
    ↓
┌─────────────────────────────────────┐
│ Gate 4: Economic Decision           │
└─────────────────────────────────────┘
    ↓
expected_loss = fraud_score × claimed_amount
investigation_cost = $150 (configurable)

IF expected_loss > investigation_cost:
    → MANUAL_REVIEW
    Reason: "Expected loss exceeds investigation cost"
    STOP
    
    ↓
┌─────────────────────────────────────┐
│ Gate 5: Auto-Approve Check          │
└─────────────────────────────────────┘
    ↓
IF fraud_score < low_threshold (0.2) AND extraction_confidence > 0.9:
    → AUTO_APPROVE
    Reason: "Low fraud risk, high confidence"
    STOP
    
    ↓
┌─────────────────────────────────────┐
│ Default: Manual Review              │
└─────────────────────────────────────┘
    ↓
→ MANUAL_REVIEW
Reason: "Moderate risk/confidence - requires review"
STOP
```

---

### Decision Gates Explained

#### Gate 1: Data Quality

**Purpose:** Ensure extracted data is reliable enough to make automated decisions.

**Logic:**
```python
if extraction_confidence < config.get('extraction.min_confidence', 0.85):
    return {
        "decision": "manual_review",
        "reason": f"Low extraction confidence: {extraction_confidence:.2f}",
        "confidence_level": "low"
    }
```

**Why 0.85?** 
- Below 85% confidence, too much uncertainty
- Risk of misread amounts, dates, names
- Human verification needed

**Example:**
```
Claim: Extraction confidence = 0.78
Decision: MANUAL_REVIEW
Reason: "Low extraction confidence: 0.78. Please verify extracted data."
```

---

#### Gate 2: Policy Violation

**Purpose:** Auto-reject claims that clearly violate policy.

**Logic:**
```python
if policy_decision['decision'] == 'rejected':
    return {
        "decision": "auto_reject",
        "reason": policy_decision['reason'],
        "confidence_level": "high"
    }

if policy_decision['decision'] == 'ambiguous':
    return {
        "decision": "manual_review",
        "reason": policy_decision['reason'],
        "confidence_level": "medium"
    }
```

**Example:**
```
Policy Decision: "rejected"
Policy Reason: "Incident occurred before policy start date"
Final Decision: AUTO_REJECT
Rationale: "Policy violation: Incident occurred before policy start date"
```

---

#### Gate 3: Severe Fraud

**Purpose:** Catch obvious fraud for investigation.

**Logic:**
```python
fraud_high_threshold = config.get('fraud.high_threshold', 0.7)

if fraud_score > fraud_high_threshold:
    return {
        "decision": "fraud_investigation",
        "reason": f"High fraud risk: {fraud_score:.2f}",
        "confidence_level": "high"
    }
```

**Why 0.7?**
- 70% fraud probability = strong evidence
- Examples: Duplicate invoice + shared bank account
- Warrants SIU investigation

**Example:**
```
Fraud Score: 0.82
Fraud Flags: Duplicate invoice, velocity anomaly
Decision: FRAUD_INVESTIGATION
Reason: "High fraud risk (0.82) - duplicate invoice detected"
```

---

#### Gate 4: Economic Decision

**Purpose:** Only review claims where investigation cost is justified.

**Core Formula:**
```
Expected Loss = fraud_score × claimed_amount

If expected_loss > investigation_cost:
    Worth investigating
Else:
    Accept the small risk
```

**Logic:**
```python
expected_loss = fraud_score * claimed_amount
investigation_cost = config.get('decision.investigation_cost', 150.0)

if expected_loss > investigation_cost:
    return {
        "decision": "manual_review",
        "reason": f"Expected loss (${expected_loss:.2f}) exceeds investigation cost (${investigation_cost:.2f})",
        "expected_loss": expected_loss,
        "investigation_cost": investigation_cost
    }
```

**Example Scenarios:**

**Scenario 1: High Value Claim**
```
Fraud Score: 0.30 (moderate)
Claimed Amount: $10,000
Expected Loss: 0.30 × $10,000 = $3,000
Investigation Cost: $150

Decision: MANUAL_REVIEW
Reason: "Expected loss ($3,000) exceeds cost ($150)"
```

**Scenario 2: Low Value Claim**
```
Fraud Score: 0.30 (same)
Claimed Amount: $200
Expected Loss: 0.30 × $200 = $60
Investigation Cost: $150

Decision: AUTO_APPROVE (if other gates pass)
Reason: "Expected loss ($60) is acceptable risk"
```

**Scenario 3: Borderline Case**
```
Fraud Score: 0.45
Claimed Amount: $500
Expected Loss: 0.45 × $500 = $225
Investigation Cost: $150

Decision: MANUAL_REVIEW
Reason: "Expected loss ($225) exceeds cost ($150)"
```

---

#### Gate 5: Auto-Approve

**Purpose:** Auto-approve clean claims.

**Conditions (ALL must be true):**
1. Fraud score < low threshold (default 0.2)
2. Extraction confidence > high confidence (default 0.9)
3. Policy approved
4. Expected loss < investigation cost

**Logic:**
```python
fraud_low_threshold = config.get('fraud.low_threshold', 0.2)
high_confidence_threshold = config.get('decision.high_confidence', 0.9)

if (fraud_score < fraud_low_threshold and 
    extraction_confidence > high_confidence_threshold):
    return {
        "decision": "auto_approve",
        "reason": f"Low fraud risk ({fraud_score:.2f}), high confidence ({extraction_confidence:.2f})",
        "confidence_level": "high"
    }
```

**Example:**
```
Fraud Score: 0.15
Extraction Confidence: 0.95
Policy: Approved ($1,200 benefit)
Expected Loss: 0.15 × $1,500 = $225

Decision: AUTO_APPROVE
Reason: "Low fraud risk (0.15), high confidence (0.95)"
Approved Amount: $1,200
```

---

## Economic Optimization

### Why Economic Optimization Matters

**Traditional Approach:**
```
All claims with fraud_score > 0.5 → Manual review
```

**Problems:**
- Reviews low-value claims unnecessarily
- Wastes investigator time on $50 claims
- Doesn't prioritize high-risk high-value claims

**Economic Approach:**
```
Review claims where: (fraud_score × amount) > investigation_cost
```

**Benefits:**
- Focuses resources on high-impact claims
- Auto-approves low-risk or low-value claims
- Maximizes return on investigation investment

---

### Expected Loss Calculation

**Formula:**
```
Expected Loss = P(fraud) × Loss if fraud

Where:
- P(fraud) = fraud_score (0.0 to 1.0)
- Loss if fraud = claimed_amount
```

**Interpretation:**

If fraud_score = 0.3:
- 30% chance claim is fraudulent
- 70% chance claim is legitimate

If we auto-approve:
- Expected loss = 0.3 × claimed_amount

**Examples:**

```
Claim 1:
fraud_score = 0.3
claimed_amount = $1,000
expected_loss = 0.3 × $1,000 = $300

Claim 2:
fraud_score = 0.1
claimed_amount = $5,000
expected_loss = 0.1 × $5,000 = $500

Even though Claim 2 has lower fraud score,
its expected loss is higher due to amount.
```

---

### Investigation Cost

**What is Investigation Cost?**
- Cost to have human review claim
- Includes: Staff time, overhead, tools

**Typical Values:**
```
Basic Review: $50 - $100
Thorough Investigation: $150 - $300
SIU Investigation: $500+
```

**For Hackathon:** Use $150 (middle ground)

**Configuration:**
```sql
INSERT INTO configuration (config_key, config_value, description)
VALUES ('decision.investigation_cost', '150.0', 'Cost of manual claim review in USD');
```

---

### Economic Decision Matrix

| Fraud Score | Amount | Expected Loss | Cost | Decision |
|-------------|--------|---------------|------|----------|
| 0.10 | $500 | $50 | $150 | AUTO_APPROVE |
| 0.30 | $1,000 | $300 | $150 | MANUAL_REVIEW |
| 0.50 | $200 | $100 | $150 | AUTO_APPROVE |
| 0.80 | $5,000 | $4,000 | $150 | FRAUD_INVESTIGATION |
| 0.15 | $10,000 | $1,500 | $150 | MANUAL_REVIEW |

**Key Insight:** Decision depends on BOTH score AND amount.

---

## Confidence Assessment

### What is Confidence Level?

**Definition:** How certain we are about the routing decision.

**Levels:**
- **HIGH:** Clear-cut decision, strong evidence
- **MEDIUM:** Reasonable decision, some uncertainty
- **LOW:** Forced decision due to missing data

---

### Confidence Calculation

```python
def assess_confidence(decision: str, fraud_score: float, 
                     extraction_confidence: float, 
                     policy_decision: dict) -> str:
    """
    Assess confidence level in decision
    
    Returns: 'high' | 'medium' | 'low'
    """
    
    if decision == 'auto_approve':
        # High confidence if fraud very low and extraction very high
        if fraud_score < 0.15 and extraction_confidence > 0.95:
            return 'high'
        else:
            return 'medium'
    
    elif decision == 'auto_reject':
        # High confidence for clear policy violations
        if policy_decision['decision'] == 'rejected':
            return 'high'
        else:
            return 'medium'
    
    elif decision == 'fraud_investigation':
        # High confidence if fraud score very high
        if fraud_score > 0.85:
            return 'high'
        else:
            return 'medium'
    
    elif decision == 'manual_review':
        # Low confidence (that's why it needs review!)
        if extraction_confidence < 0.85:
            return 'low'
        else:
            return 'medium'
    
    else:
        return 'low'
```

---

### Confidence Examples

**High Confidence AUTO_APPROVE:**
```
Extraction Confidence: 0.96
Fraud Score: 0.08
Policy: Approved
Decision: AUTO_APPROVE
Confidence: HIGH
Rationale: "Clean claim - low fraud (0.08), high confidence (0.96)"
```

**Medium Confidence MANUAL_REVIEW:**
```
Extraction Confidence: 0.88
Fraud Score: 0.45
Expected Loss: $450 > $150 cost
Decision: MANUAL_REVIEW
Confidence: MEDIUM
Rationale: "Moderate fraud risk (0.45) warrants human review"
```

**Low Confidence MANUAL_REVIEW:**
```
Extraction Confidence: 0.72
Fraud Score: 0.25
Decision: MANUAL_REVIEW
Confidence: LOW
Rationale: "Low extraction confidence (0.72) - verify data accuracy"
```

---

## Routing Decisions

### Auto-Approve Flow

**Destination:** Payment processing system

**Next Steps:**
```python
next_steps = [
    f"Process payment of ${approved_amount:.2f}",
    "Send approval notification to claimant",
    f"Update policy annual limit (${annual_limit_remaining:.2f} remaining)",
    "Archive claim documents",
    "Close claim as approved"
]
```

**Timeline:** Instant (no human intervention)

**Communication to Claimant:**
```
Subject: Claim Approved - Payment Processing

Dear [Claimant],

Good news! Your claim [CLAIM_NUMBER] has been approved.

Approved Amount: $[AMOUNT]
Payment Method: [METHOD]
Expected Payment Date: [DATE]

Thank you for your patience.
```

---

### Auto-Reject Flow

**Destination:** Rejection notice to claimant

**Next Steps:**
```python
next_steps = [
    "Send rejection notice with detailed reason",
    "Include appeal instructions and 30-day deadline",
    "Archive claim documents",
    "Log rejection in policy history",
    "Close claim as rejected"
]
```

**Communication to Claimant:**
```
Subject: Claim Denied - [CLAIM_NUMBER]

Dear [Claimant],

After careful review, your claim has been denied for the following reason:

[REJECTION_REASON]

You have the right to appeal this decision within 30 days.
To appeal, please submit:
- Written appeal letter
- Additional supporting documentation
- Appeal form (attached)

Contact our appeals department: appeals@insurer.com
```

---

### Manual Review Flow

**Destination:** Underwriter review queue

**Next Steps:**
```python
next_steps = [
    "Assign to underwriter review queue",
    "Priority: [HIGH/MEDIUM/LOW based on expected loss]",
    "Review focus: [Specific concerns]",
    "SLA: Review within 2 business days",
    "Notify claimant of review status"
]
```

**Specific Concerns (varies by reason):**

**If low extraction confidence:**
```
Review focus: 
- Verify claimed amount ($[AMOUNT]) is correct
- Confirm incident date
- Validate policy number
```

**If moderate fraud score:**
```
Review focus:
- Investigate fraud indicators: [List flags]
- Verify provider authenticity
- Check for duplicate submissions
```

**If expected loss > cost:**
```
Review focus:
- Cost-benefit analysis of approval
- Verify high-value claim legitimacy
- Request additional documentation if needed
```

---

### Fraud Investigation Flow

**Destination:** Special Investigation Unit (SIU) queue

**Next Steps:**
```python
next_steps = [
    "Escalate to Special Investigation Unit",
    "Freeze payment pending investigation",
    f"Flag related claims: {related_claim_ids}",
    "Collect additional evidence: [List required evidence]",
    "Estimated investigation time: 5-10 business days",
    "Notify claimant of investigation"
]
```

**Investigation Checklist:**

**If duplicate invoice:**
```
Evidence to collect:
- Contact provider to verify invoice authenticity
- Check if invoice was legitimately re-issued
- Interview claimant about duplicate
- Review provider history for patterns
```

**If fraud ring detected:**
```
Evidence to collect:
- Analyze all claims in network
- Interview all connected claimants
- Verify provider license and legitimacy
- Contact law enforcement if criminal activity suspected
```

---

## Rationale Generation

### What is a Rationale?

**Definition:** Human-readable explanation of why the decision was made.

**Purpose:**
- Legal compliance (must justify denials)
- Transparency (claimants deserve to know why)
- Debugging (helps improve system)
- Auditing (regulators can review)

---

### Rationale Template Structure

```python
def generate_rationale(decision: str, fraud_score: float, 
                      extraction_confidence: float,
                      policy_decision: dict,
                      expected_loss: float,
                      investigation_cost: float) -> str:
    """
    Generate human-readable decision rationale
    
    Returns: Formatted explanation string
    """
    
    if decision == 'auto_approve':
        return f"""
Decision: AUTO_APPROVE

Reason: This claim meets all criteria for automatic approval.
- Extraction Confidence: {extraction_confidence:.0%} (high quality data)
- Fraud Risk: {fraud_score:.0%} (low risk)
- Policy Check: Approved (benefit: ${policy_decision['benefit_amount']:.2f})
- Economic Analysis: Expected loss (${expected_loss:.2f}) is acceptable risk

Action: Payment of ${policy_decision['benefit_amount']:.2f} will be processed immediately.
        """.strip()
    
    elif decision == 'auto_reject':
        return f"""
Decision: AUTO_REJECT

Reason: This claim violates policy terms.
- Policy Violation: {policy_decision['reason']}

Action: Claim denied. Claimant notified with appeal instructions.
        """.strip()
    
    elif decision == 'manual_review':
        reasons = []
        
        if extraction_confidence < 0.85:
            reasons.append(f"Low extraction confidence ({extraction_confidence:.0%}) - data verification needed")
        
        if expected_loss > investigation_cost:
            reasons.append(f"Expected loss (${expected_loss:.2f}) exceeds investigation cost (${investigation_cost:.2f})")
        
        if 0.3 <= fraud_score < 0.7:
            reasons.append(f"Moderate fraud risk ({fraud_score:.0%}) requires human judgment")
        
        return f"""
Decision: MANUAL_REVIEW

Reasons:
{chr(10).join(f"- {r}" for r in reasons)}

Action: Routed to underwriter queue for human review. Estimated resolution: 2 business days.
        """.strip()
    
    elif decision == 'fraud_investigation':
        return f"""
Decision: FRAUD_INVESTIGATION

Reason: High fraud risk detected ({fraud_score:.0%}).

Fraud Indicators:
{chr(10).join(f"- {flag['description']}" for flag in fraud_flags)}

Action: Escalated to Special Investigation Unit. Payment frozen pending investigation.
        """.strip()
```

---

### Rationale Examples

**Example 1: Clean Approval**
```
Decision: AUTO_APPROVE

Reason: This claim meets all criteria for automatic approval.
- Extraction Confidence: 95% (high quality data)
- Fraud Risk: 12% (low risk)
- Policy Check: Approved (benefit: $1,200.00)
- Economic Analysis: Expected loss ($180.00) is acceptable risk

Action: Payment of $1,200.00 will be processed immediately.
```

**Example 2: Clear Rejection**
```
Decision: AUTO_REJECT

Reason: This claim violates policy terms.
- Policy Violation: Incident occurred before policy start date (2023-12-15 < 2024-01-01)

Action: Claim denied. Claimant notified with appeal instructions.
```

**Example 3: Economic Review**
```
Decision: MANUAL_REVIEW

Reasons:
- Expected loss ($3,450.00) exceeds investigation cost ($150.00)
- Moderate fraud risk (35%) requires human judgment

Action: Routed to underwriter queue for human review. Estimated resolution: 2 business days.
```

**Example 4: Fraud Investigation**
```
Decision: FRAUD_INVESTIGATION

Reason: High fraud risk detected (82%).

Fraud Indicators:
- Duplicate invoice: Invoice INV-12345 was submitted in claim CLM-001 on 2024-02-10
- Velocity anomaly: Claimant submitted 7 claims in 7 days
- Shared bank account detected in network analysis

Action: Escalated to Special Investigation Unit. Payment frozen pending investigation.
```

---

## Complete Implementation

### Decision Engine Class

```python
# backend/decision_engine.py

from typing import Dict, Any
from supabase import Client

class DecisionEngine:
    def __init__(self, supabase: Client):
        self.supabase = supabase
        self._load_config()
    
    def _load_config(self):
        """Load decision thresholds from database"""
        
        # Query configuration table
        configs = self.supabase.table('configuration')\
            .select('config_key, config_value')\
            .in_('config_key', [
                'extraction.min_confidence',
                'fraud.high_threshold',
                'fraud.low_threshold',
                'decision.investigation_cost',
                'decision.high_confidence'
            ])\
            .execute()
        
        # Parse into dict
        self.thresholds = {
            row['config_key']: float(row['config_value'])
            for row in configs.data
        } if configs.data else {}
        
        # Set defaults if missing
        self.thresholds.setdefault('extraction.min_confidence', 0.85)
        self.thresholds.setdefault('fraud.high_threshold', 0.7)
        self.thresholds.setdefault('fraud.low_threshold', 0.2)
        self.thresholds.setdefault('decision.investigation_cost', 150.0)
        self.thresholds.setdefault('decision.high_confidence', 0.9)
    
    def decide(self, claim_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Make final routing decision
        
        Args:
            claim_data: Complete claim with all layer results
        
        Returns:
            Decision dict with decision, rationale, next steps
        """
        
        extraction_confidence = claim_data.get('overall_confidence', 0.0)
        fraud_score = claim_data.get('fraud_score', 0.0)
        policy_decision = claim_data.get('policy_decision', {})
        claimed_amount = claim_data.get('claimed_amount', 0.0)
        
        # Gate 1: Data Quality
        if extraction_confidence < self.thresholds['extraction.min_confidence']:
            return self._make_decision(
                'manual_review',
                f"Low extraction confidence: {extraction_confidence:.2f}",
                'low',
                claim_data
            )
        
        # Gate 2: Policy Violation
        if policy_decision.get('decision') == 'rejected':
            return self._make_decision(
                'auto_reject',
                policy_decision.get('reason', 'Policy violation'),
                'high',
                claim_data
            )
        
        if policy_decision.get('decision') == 'ambiguous':
            return self._make_decision(
                'manual_review',
                policy_decision.get('reason', 'Policy coverage unclear'),
                'medium',
                claim_data
            )
        
        # Gate 3: Severe Fraud
        if fraud_score > self.thresholds['fraud.high_threshold']:
            return self._make_decision(
                'fraud_investigation',
                f"High fraud risk: {fraud_score:.2f}",
                'high',
                claim_data
            )
        
        # Gate 4: Economic Decision
        expected_loss = fraud_score * claimed_amount
        investigation_cost = self.thresholds['decision.investigation_cost']
        
        if expected_loss > investigation_cost:
            return self._make_decision(
                'manual_review',
                f"Expected loss (${expected_loss:.2f}) exceeds investigation cost (${investigation_cost:.2f})",
                'medium',
                claim_data,
                expected_loss=expected_loss
            )
        
        # Gate 5: Auto-Approve
        if (fraud_score < self.thresholds['fraud.low_threshold'] and 
            extraction_confidence > self.thresholds['decision.high_confidence']):
            return self._make_decision(
                'auto_approve',
                f"Low fraud risk ({fraud_score:.2f}), high confidence ({extraction_confidence:.2f})",
                'high',
                claim_data
            )
        
        # Default: Manual Review
        return self._make_decision(
            'manual_review',
            "Moderate risk/confidence requires review",
            'medium',
            claim_data
        )
    
    def _make_decision(self, decision: str, reason: str, 
                      confidence_level: str, claim_data: Dict[str, Any],
                      expected_loss: float = None) -> Dict[str, Any]:
        """Helper to format decision output"""
        
        policy_decision = claim_data.get('policy_decision', {})
        
        return {
            "decision": decision,
            "decision_rationale": reason,
            "confidence_level": confidence_level,
            "approved_amount": policy_decision.get('benefit_amount') if decision == 'auto_approve' else None,
            "expected_loss": expected_loss,
            "investigation_cost": self.thresholds['decision.investigation_cost'],
            "next_steps": self._generate_next_steps(decision, claim_data),
            "thresholds_used": self.thresholds
        }
    
    def _generate_next_steps(self, decision: str, claim_data: Dict[str, Any]) -> list:
        """Generate actionable next steps"""
        
        if decision == 'auto_approve':
            benefit = claim_data.get('policy_decision', {}).get('benefit_amount', 0)
            return [
                f"Process payment of ${benefit:.2f}",
                "Send approval notification",
                "Update policy annual limit",
                "Close claim"
            ]
        
        elif decision == 'auto_reject':
            return [
                "Send rejection notice",
                "Include appeal instructions",
                "Archive documents",
                "Close claim"
            ]
        
        elif decision == 'manual_review':
            return [
                "Assign to underwriter queue",
                "Review within 2 business days",
                "Verify extracted data",
                "Make final determination"
            ]
        
        elif decision == 'fraud_investigation':
            return [
                "Escalate to SIU",
                "Freeze payment",
                "Collect evidence",
                "Investigation: 5-10 days"
            ]
        
        return []
```

---

### FastAPI Endpoint

```python
# backend/main.py

@app.post("/api/v1/claims/{claim_id}/final-decision")
async def make_decision(claim_id: str):
    """Make final routing decision"""
    
    # Get claim with all layer results
    result = supabase.table('claims')\
        .select('*')\
        .eq('id', claim_id)\
        .single()\
        .execute()
    
    claim_data = result.data
    
    # Run decision engine
    engine = DecisionEngine(supabase)
    decision_result = engine.decide(claim_data)
    
    # Update claim
    supabase.table('claims')\
        .update({
            'final_decision': decision_result['decision'],
            'decision_rationale': decision_result['decision_rationale'],
            'approved_amount': decision_result['approved_amount'],
            'status': 'finalized'
        })\
        .eq('id', claim_id)\
        .execute()
    
    return decision_result
```

---

## Testing Strategy

### Unit Tests

```python
def test_low_confidence_routes_to_review():
    claim = {
        "overall_confidence": 0.75,  # Below 0.85 threshold
        "fraud_score": 0.1,
        "policy_decision": {"decision": "approved"}
    }
    
    engine = DecisionEngine(supabase)
    result = engine.decide(claim)
    
    assert result['decision'] == 'manual_review'
    assert 'low.*confidence' in result['decision_rationale'].lower()

def test_policy_violation_auto_rejects():
    claim = {
        "overall_confidence": 0.95,
        "fraud_score": 0.1,
        "policy_decision": {
            "decision": "rejected",
            "reason": "Incident before policy start"
        }
    }
    
    result = engine.decide(claim)
    
    assert result['decision'] == 'auto_reject'
    assert 'before policy start' in result['decision_rationale'].lower()

def test_high_fraud_triggers_investigation():
    claim = {
        "overall_confidence": 0.95,
        "fraud_score": 0.85,  # Above 0.7 threshold
        "policy_decision": {"decision": "approved"}
    }
    
    result = engine.decide(claim)
    
    assert result['decision'] == 'fraud_investigation'

def test_economic_decision_high_value():
    claim = {
        "overall_confidence": 0.95,
        "fraud_score": 0.3,
        "claimed_amount": 10000,  # Expected loss = $3,000
        "policy_decision": {"decision": "approved"}
    }
    
    result = engine.decide(claim)
    
    # Expected loss ($3,000) > Cost ($150)
    assert result['decision'] == 'manual_review'
    assert result['expected_loss'] == 3000.0

def test_economic_decision_low_value():
    claim = {
        "overall_confidence": 0.95,
        "fraud_score": 0.3,
        "claimed_amount": 200,  # Expected loss = $60
        "policy_decision": {"decision": "approved"}
    }
    
    result = engine.decide(claim)
    
    # Expected loss ($60) < Cost ($150) AND fraud < 0.2
    # BUT fraud (0.3) is NOT < 0.2, so default to review
    assert result['decision'] == 'manual_review'

def test_clean_claim_auto_approves():
    claim = {
        "overall_confidence": 0.96,
        "fraud_score": 0.08,  # Below 0.2 threshold
        "claimed_amount": 1500,
        "policy_decision": {
            "decision": "approved",
            "benefit_amount": 1200.00
        }
    }
    
    result = engine.decide(claim)
    
    assert result['decision'] == 'auto_approve'
    assert result['approved_amount'] == 1200.00
```

---

### Integration Tests

```python
def test_end_to_end_clean_claim():
    """Test complete flow for clean claim"""
    
    # Create claim
    claim_id = create_test_claim({
        "claimant_name": "Test User",
        "claimed_amount": 1000.00,
        "incident_date": "2024-06-15"
    })
    
    # Layer 1: Extract (mock high confidence)
    update_claim(claim_id, {"overall_confidence": 0.95})
    
    # Layer 2: Policy (mock approval)
    policy_engine = PolicyEngine(supabase)
    policy_result = policy_engine.evaluate(get_claim(claim_id))
    update_claim(claim_id, {"policy_decision": policy_result})
    
    # Layer 3: Fraud (mock low score)
    fraud_detector = FraudDetector(supabase)
    fraud_result = fraud_detector.analyze(claim_id)
    update_claim(claim_id, {"fraud_score": fraud_result['fraud_score']})
    
    # Layer 4: Decision
    engine = DecisionEngine(supabase)
    claim = get_claim(claim_id)
    decision_result = engine.decide(claim)
    
    # Verify
    assert decision_result['decision'] == 'auto_approve'
    assert decision_result['confidence_level'] == 'high'

def test_end_to_end_fraud_claim():
    """Test complete flow for fraudulent claim"""
    
    # Create claim with duplicate invoice
    claim_id = create_test_claim({
        "invoice_number": "INV-DUPLICATE"  # Already exists
    })
    
    # Run layers
    # ... (similar to above)
    
    decision_result = engine.decide(get_claim(claim_id))
    
    assert decision_result['decision'] in ['fraud_investigation', 'manual_review']
```

---

## Summary

### Layer 4 Outputs

```python
{
  "decision": "auto_approve | auto_reject | manual_review | fraud_investigation",
  "decision_rationale": "Clear explanation of why this decision was made",
  "confidence_level": "high | medium | low",
  "approved_amount": 1200.00,  # or None
  "expected_loss": 180.00,
  "investigation_cost": 150.00,
  "next_steps": [
    "Process payment of $1,200.00",
    "Send approval notification",
    "..."
  ],
  "thresholds_used": {
    "extraction.min_confidence": 0.85,
    "fraud.high_threshold": 0.7,
    "fraud.low_threshold": 0.2,
    "investigation_cost": 150.00
  }
}
```

### Decision Distribution (Typical)

```
AUTO_APPROVE:         60% (clean claims)
AUTO_REJECT:          15% (policy violations)
MANUAL_REVIEW:        20% (uncertain cases)
FRAUD_INVESTIGATION:   5% (high fraud risk)
```

### Implementation Time

**Hackathon:** 2-3 hours
**Production:** 6-8 hours (with extensive testing)

---

**Layer 4 is complete!** ⚖️
