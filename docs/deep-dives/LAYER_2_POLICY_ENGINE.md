# Layer 2: Policy Governance Engine (Complete Guide)

## Table of Contents
1. [Overview](#overview)
2. [What is Policy Governance](#what-is-policy-governance)
3. [Policy Rules Structure](#policy-rules-structure)
4. [Rule Loading & Version Control](#rule-loading--version-control)
5. [Validation Rules Execution](#validation-rules-execution)
6. [Coverage Determination](#coverage-determination)
7. [Benefit Calculation](#benefit-calculation)
8. [Edge Cases & Ambiguities](#edge-cases--ambiguities)
9. [Complete Implementation](#complete-implementation)
10. [Testing Strategy](#testing-strategy)

---

## Overview

### What Layer 2 Does

**Input:** Structured claim data from Layer 1 (extraction results)

**Output:** Policy decision (approved/rejected/ambiguous) + benefit amount + calculation trail

**Core Function:** Apply deterministic insurance policy rules to determine:
1. Is this claim covered under the policy?
2. How much will the insurer pay?
3. Why was this decision made?

---

### Why Layer 2 Exists

**Problem:** Insurance policies have complex rules:
- Coverage limits (annual, per-incident)
- Copays (patient pays X%, insurer pays rest)
- Waiting periods (coverage starts N days after policy begins)
- Exclusions (certain procedures not covered)
- Network requirements (must use approved providers)

**Solution:** Codify these rules in a structured format and apply them consistently.

---

### Critical Design Principle

**DETERMINISM:** Layer 2 must be a pure function.

```
Same input + Same rule version = ALWAYS same output
```

**Why:** Legal defensibility. If challenged in court, must prove decision was consistent with written policy.

**No randomness allowed:** No AI models, no probabilistic decisions.

---

## What is Policy Governance?

### Insurance Policy Structure

A typical insurance policy contains:

**1. Coverage Categories**
```
Health Insurance Policy might have:
- Medical Coverage (doctor visits, hospital stays)
- Dental Coverage (cleanings, fillings, extractions)
- Vision Coverage (eye exams, glasses)
- Mental Health Coverage (therapy sessions)
```

**2. Financial Terms per Category**
```
Medical Coverage:
- Annual Limit: $50,000
- Per-Incident Limit: $10,000
- Copay: 20% (patient pays 20%, insurer pays 80%)
- Deductible: $500 (patient pays first $500 of year)
- Out-of-Pocket Maximum: $5,000
```

**3. Eligibility Rules**
```
- Waiting Period: 30 days from policy start
- Network Requirement: Must use approved providers
- Prior Authorization: Some procedures require pre-approval
```

**4. Exclusions**
```
Not Covered:
- Cosmetic procedures
- Experimental treatments
- Pre-existing conditions (for first 12 months)
```

---

## Policy Rules Structure

### How Rules Are Stored

**Database Table:** `policy_rules` (optional for hackathon - can hardcode)

**Format:** JSONB structure

```json
{
  "policy_type": "health",
  "version": "v1.3",
  "effective_from": "2025-01-01",
  "effective_to": null,
  
  "validation_rules": [
    {
      "rule_id": "VR-001",
      "description": "Incident must be within policy period",
      "check": "incident_date >= policy_start AND incident_date <= policy_end",
      "error_message": "Incident occurred outside policy coverage period"
    },
    {
      "rule_id": "VR-002",
      "description": "Claimed amount must be positive",
      "check": "claimed_amount > 0",
      "error_message": "Invalid claim amount"
    }
  ],
  
  "coverage_categories": {
    "medical": {
      "covered": true,
      "incident_types_included": ["illness", "accident"],
      "annual_limit": 50000.00,
      "per_incident_limit": 10000.00,
      "copay_percentage": 20,
      "copay_fixed": null,
      "waiting_period_days": 30,
      "network_required": false,
      "prior_auth_required_for": ["surgery", "mri", "ct_scan"],
      "exclusions": ["cosmetic", "experimental", "alternative_medicine"]
    },
    
    "dental": {
      "covered": true,
      "incident_types_included": ["dental_issue"],
      "annual_limit": 2000.00,
      "per_incident_limit": 500.00,
      "copay_percentage": 30,
      "waiting_period_days": 90,
      "exclusions": ["orthodontics_adult", "cosmetic_whitening"]
    },
    
    "vision": {
      "covered": false
    }
  },
  
  "deductible": {
    "annual_deductible": 500.00,
    "applies_to_categories": ["medical", "dental"]
  }
}
```

---

### For Hackathon: Simplified Hardcoded Rules

Instead of database, define in Python:

```python
# backend/policy_rules.py

POLICY_RULES = {
    "health": {
        "version": "v1.0",
        "annual_limit": 50000.00,
        "copay_percentage": 20,
        "waiting_period_days": 30,
        "exclusions": ["cosmetic", "experimental"],
        "policy_start": "2024-01-01",
        "policy_end": "2024-12-31"
    }
}
```

---

## Rule Loading & Version Control

### Why Version Control Matters

**Scenario:** Policy rules change on June 1, 2024.

```
Claim A: Incident on May 15, submitted June 5
→ Use rules version from May 15

Claim B: Incident on June 10, submitted June 15
→ Use rules version from June 10
```

**Critical:** Use rules from incident date, NOT submission date.

---

### Rule Loading Algorithm

```python
def load_policy_rules(policy_id: str, incident_date: str, supabase):
    """
    Load policy rules effective on the incident date
    
    Args:
        policy_id: UUID of policy
        incident_date: Date when incident occurred (YYYY-MM-DD)
        supabase: Supabase client
    
    Returns:
        Policy rules as dict
    """
    
    # Step 1: Get policy metadata
    policy = supabase.table('policies')\
        .select('policy_type, rules_version, policy_start_date, policy_end_date')\
        .eq('id', policy_id)\
        .single()\
        .execute()
    
    if not policy.data:
        raise ValueError(f"Policy {policy_id} not found")
    
    policy_type = policy.data['policy_type']
    
    # Step 2: For hackathon - just use hardcoded rules
    if policy_type in POLICY_RULES:
        return POLICY_RULES[policy_type]
    
    # Step 3: For production - query policy_rules table
    rules = supabase.table('policy_rules')\
        .select('rules_definition')\
        .eq('policy_type', policy_type)\
        .lte('effective_from', incident_date)\
        .or_('effective_to.is.null,effective_to.gt.' + incident_date)\
        .single()\
        .execute()
    
    if not rules.data:
        raise ValueError(f"No rules found for {policy_type} on {incident_date}")
    
    return rules.data['rules_definition']
```

---

## Validation Rules Execution

### What are Validation Rules?

**Purpose:** Basic eligibility checks before calculating benefits.

**Examples:**
- Is incident within policy period?
- Is claimed amount valid?
- Is claimant covered under policy?

---

### Validation Algorithm

```python
def execute_validation_rules(claim_data: dict, policy: dict) -> dict:
    """
    Execute all validation rules
    
    Returns:
        {
            "passed": True/False,
            "failed_rule": "rule_id or None",
            "error_message": "string or None"
        }
    """
    
    # Rule 1: Incident date within policy period
    incident_date = datetime.fromisoformat(claim_data['incident_date'])
    policy_start = datetime.fromisoformat(policy['policy_start'])
    policy_end = datetime.fromisoformat(policy['policy_end'])
    
    if incident_date < policy_start:
        return {
            "passed": False,
            "failed_rule": "VR-001",
            "error_message": f"Incident date {claim_data['incident_date']} is before policy start {policy['policy_start']}"
        }
    
    if incident_date > policy_end:
        return {
            "passed": False,
            "failed_rule": "VR-001",
            "error_message": f"Incident date {claim_data['incident_date']} is after policy end {policy['policy_end']}"
        }
    
    # Rule 2: Claimed amount must be positive
    if claim_data['claimed_amount'] <= 0:
        return {
            "passed": False,
            "failed_rule": "VR-002",
            "error_message": f"Invalid claimed amount: {claim_data['claimed_amount']}"
        }
    
    # All validations passed
    return {
        "passed": True,
        "failed_rule": None,
        "error_message": None
    }
```

---

### Validation Examples

**Example 1: Valid Claim**
```python
claim = {
    "incident_date": "2024-06-15",
    "claimed_amount": 1500.00
}

policy = {
    "policy_start": "2024-01-01",
    "policy_end": "2024-12-31"
}

result = execute_validation_rules(claim, policy)
# Returns: {"passed": True, "failed_rule": None, "error_message": None}
```

**Example 2: Incident Before Policy Start**
```python
claim = {
    "incident_date": "2023-12-15",  # Before policy starts!
    "claimed_amount": 1500.00
}

result = execute_validation_rules(claim, policy)
# Returns: {
#   "passed": False, 
#   "failed_rule": "VR-001",
#   "error_message": "Incident date 2023-12-15 is before policy start 2024-01-01"
# }
```

---

## Coverage Determination

### What is Coverage Determination?

**Question:** Is this type of incident covered under the policy?

**Process:**
1. Map incident type to coverage category
2. Check if category is covered
3. Check waiting period
4. Check exclusions

---

### Incident Type Mapping

```python
INCIDENT_TYPE_MAPPING = {
    "accident": "medical",
    "illness": "medical",
    "dental_issue": "dental",
    "eye_exam": "vision",
    "therapy_session": "mental_health"
}

def get_coverage_category(incident_type: str) -> str:
    """Map incident type to coverage category"""
    
    if incident_type not in INCIDENT_TYPE_MAPPING:
        raise ValueError(f"Unknown incident type: {incident_type}")
    
    return INCIDENT_TYPE_MAPPING[incident_type]
```

---

### Coverage Check Algorithm

```python
def check_coverage(claim_data: dict, policy_rules: dict) -> dict:
    """
    Determine if incident is covered
    
    Returns:
        {
            "covered": True/False,
            "category": "medical|dental|vision",
            "reason": "string"
        }
    """
    
    # Step 1: Map to category
    incident_type = claim_data['incident_type']
    
    try:
        category = get_coverage_category(incident_type)
    except ValueError as e:
        return {
            "covered": False,
            "category": None,
            "reason": str(e)
        }
    
    # Step 2: Check if category is covered
    category_rules = policy_rules['coverage_categories'].get(category)
    
    if not category_rules:
        return {
            "covered": False,
            "category": category,
            "reason": f"Category '{category}' not found in policy"
        }
    
    if not category_rules.get('covered', False):
        return {
            "covered": False,
            "category": category,
            "reason": f"Category '{category}' is not covered under this policy"
        }
    
    # Step 3: Check waiting period
    incident_date = datetime.fromisoformat(claim_data['incident_date'])
    policy_start = datetime.fromisoformat(policy_rules['policy_start'])
    days_since_start = (incident_date - policy_start).days
    
    waiting_period = category_rules.get('waiting_period_days', 0)
    
    if days_since_start < waiting_period:
        return {
            "covered": False,
            "category": category,
            "reason": f"Waiting period not met. Required: {waiting_period} days, Elapsed: {days_since_start} days"
        }
    
    # Step 4: Check exclusions
    description = claim_data['incident_description'].lower()
    exclusions = category_rules.get('exclusions', [])
    
    for exclusion in exclusions:
        if exclusion.lower() in description:
            return {
                "covered": False,
                "category": category,
                "reason": f"Excluded procedure: {exclusion}"
            }
    
    # All checks passed
    return {
        "covered": True,
        "category": category,
        "reason": "Coverage confirmed"
    }
```

---

### Coverage Examples

**Example 1: Valid Medical Claim**
```python
claim = {
    "incident_type": "illness",
    "incident_date": "2024-03-15",  # 74 days after policy start
    "incident_description": "Flu symptoms requiring doctor visit"
}

policy = {
    "policy_start": "2024-01-01",
    "coverage_categories": {
        "medical": {
            "covered": True,
            "waiting_period_days": 30,
            "exclusions": ["cosmetic", "experimental"]
        }
    }
}

result = check_coverage(claim, policy)
# Returns: {
#   "covered": True,
#   "category": "medical",
#   "reason": "Coverage confirmed"
# }
```

**Example 2: Waiting Period Not Met**
```python
claim = {
    "incident_type": "illness",
    "incident_date": "2024-01-15",  # Only 14 days after policy start
    "incident_description": "Flu symptoms"
}

result = check_coverage(claim, policy)
# Returns: {
#   "covered": False,
#   "category": "medical",
#   "reason": "Waiting period not met. Required: 30 days, Elapsed: 14 days"
# }
```

**Example 3: Excluded Procedure**
```python
claim = {
    "incident_type": "illness",
    "incident_date": "2024-03-15",
    "incident_description": "Cosmetic surgery for scar removal"
}

result = check_coverage(claim, policy)
# Returns: {
#   "covered": False,
#   "category": "medical",
#   "reason": "Excluded procedure: cosmetic"
# }
```

---

## Benefit Calculation

### What is Benefit Calculation?

**Question:** How much will the insurer pay?

**Formula:**
```
Insurer Benefit = Claimed Amount - Copay - Deductible
                  (capped by per-incident limit)
                  (capped by annual limit remaining)
```

---

### Calculation Algorithm (Step-by-Step)

```python
def calculate_benefit(claim_data: dict, policy_rules: dict, category_rules: dict, supabase) -> dict:
    """
    Calculate insurer benefit amount with complete trail
    
    Returns:
        {
            "benefit_amount": float,
            "calculation_trail": [step1, step2, ...],
            "annual_limit_remaining": float
        }
    """
    
    claimed_amount = claim_data['claimed_amount']
    calculation_trail = []
    
    # Step 1: Start with claimed amount
    benefit = claimed_amount
    calculation_trail.append({
        "step": 1,
        "description": "Base claimed amount",
        "calculation": f"${claimed_amount:.2f}",
        "value": benefit
    })
    
    # Step 2: Apply copay
    copay_pct = category_rules.get('copay_percentage', 0)
    
    if copay_pct > 0:
        copay_multiplier = 1 - (copay_pct / 100)
        benefit = claimed_amount * copay_multiplier
        
        calculation_trail.append({
            "step": 2,
            "description": f"Apply {copay_pct}% copay",
            "calculation": f"${claimed_amount:.2f} × {copay_multiplier} = ${benefit:.2f}",
            "value": benefit
        })
    
    # Step 3: Apply per-incident limit
    per_incident_limit = category_rules.get('per_incident_limit')
    
    if per_incident_limit:
        if benefit > per_incident_limit:
            benefit = per_incident_limit
            calculation_trail.append({
                "step": 3,
                "description": "Apply per-incident limit",
                "calculation": f"min(${benefit:.2f}, ${per_incident_limit:.2f}) = ${benefit:.2f}",
                "value": benefit
            })
    
    # Step 4: Check annual limit
    annual_limit = category_rules.get('annual_limit', float('inf'))
    
    # Query how much has been used this year
    incident_year = claim_data['incident_date'][:4]
    
    used_this_year = supabase.table('claims')\
        .select('approved_amount', count='exact')\
        .eq('policy_id', claim_data['policy_id'])\
        .gte('incident_date', f'{incident_year}-01-01')\
        .lt('incident_date', f'{incident_year}-12-31')\
        .in_('status', ['approved', 'finalized'])\
        .execute()
    
    total_used = sum(row['approved_amount'] for row in used_this_year.data if row['approved_amount'])
    remaining = annual_limit - total_used
    
    calculation_trail.append({
        "step": 4,
        "description": "Check annual limit",
        "calculation": f"Limit: ${annual_limit:.2f}, Used: ${total_used:.2f}, Remaining: ${remaining:.2f}",
        "value": remaining
    })
    
    if remaining <= 0:
        # Annual limit exhausted
        return {
            "benefit_amount": 0,
            "calculation_trail": calculation_trail,
            "annual_limit_remaining": 0,
            "rejection_reason": f"Annual limit of ${annual_limit:.2f} exhausted. Already used: ${total_used:.2f}"
        }
    
    if benefit > remaining:
        benefit = remaining
        calculation_trail.append({
            "step": 5,
            "description": "Adjust for remaining annual limit",
            "calculation": f"min(${benefit:.2f}, ${remaining:.2f}) = ${benefit:.2f}",
            "value": benefit
        })
    
    # Step 5: Final benefit
    benefit = round(benefit, 2)
    calculation_trail.append({
        "step": len(calculation_trail) + 1,
        "description": "Final approved benefit",
        "calculation": f"${benefit:.2f}",
        "value": benefit
    })
    
    return {
        "benefit_amount": benefit,
        "calculation_trail": calculation_trail,
        "annual_limit_remaining": remaining - benefit
    }
```

---

### Calculation Examples

**Example 1: Simple Copay**
```python
claim = {
    "policy_id": "UUID",
    "claimed_amount": 1500.00,
    "incident_date": "2024-06-15"
}

category_rules = {
    "copay_percentage": 20,
    "annual_limit": 50000.00
}

# Assume $0 used this year
result = calculate_benefit(claim, {}, category_rules, supabase)

# Returns:
{
  "benefit_amount": 1200.00,  # 1500 × 0.80
  "calculation_trail": [
    {"step": 1, "description": "Base claimed amount", "value": 1500.00},
    {"step": 2, "description": "Apply 20% copay", "calculation": "$1500.00 × 0.8 = $1200.00", "value": 1200.00},
    {"step": 4, "description": "Check annual limit", "value": 50000.00},
    {"step": 5, "description": "Final approved benefit", "value": 1200.00}
  ],
  "annual_limit_remaining": 48800.00
}
```

**Example 2: Per-Incident Limit Applied**
```python
claim = {
    "claimed_amount": 15000.00,
    "incident_date": "2024-06-15"
}

category_rules = {
    "copay_percentage": 20,
    "per_incident_limit": 10000.00,
    "annual_limit": 50000.00
}

# After copay: 15000 × 0.8 = 12000
# But per-incident limit = 10000
# So benefit = 10000

result = calculate_benefit(claim, {}, category_rules, supabase)
# Returns: {"benefit_amount": 10000.00, ...}
```

**Example 3: Annual Limit Nearly Exhausted**
```python
claim = {
    "claimed_amount": 5000.00,
    "incident_date": "2024-11-15"
}

category_rules = {
    "copay_percentage": 20,
    "annual_limit": 50000.00
}

# Assume $48,000 already used this year
# Remaining = 50000 - 48000 = 2000

# After copay: 5000 × 0.8 = 4000
# But only 2000 remaining
# So benefit = 2000

result = calculate_benefit(claim, {}, category_rules, supabase)
# Returns: {
#   "benefit_amount": 2000.00,
#   "annual_limit_remaining": 0.00
# }
```

**Example 4: Annual Limit Completely Exhausted**
```python
# Assume $50,000 already used
result = calculate_benefit(claim, {}, category_rules, supabase)

# Returns: {
#   "benefit_amount": 0,
#   "rejection_reason": "Annual limit of $50,000.00 exhausted. Already used: $50,000.00",
#   "annual_limit_remaining": 0.00
# }
```

---

## Edge Cases & Ambiguities

### Ambiguous Case 1: Network Requirement

**Scenario:** Policy requires in-network provider, but provider not in database.

```python
def check_network_requirement(claim_data: dict, category_rules: dict, supabase) -> dict:
    """Check if provider is in network"""
    
    if not category_rules.get('network_required', False):
        return {"check": "passed", "ambiguous": False}
    
    provider_name = claim_data.get('provider_name')
    
    if not provider_name:
        # Provider name not extracted
        return {
            "check": "failed",
            "ambiguous": True,
            "reason": "Network requirement exists but provider name not provided"
        }
    
    # Query provider database
    provider = supabase.table('providers')\
        .select('in_network')\
        .eq('name', provider_name)\
        .single()\
        .execute()
    
    if not provider.data:
        # Provider not in database
        return {
            "check": "failed",
            "ambiguous": True,
            "reason": f"Provider '{provider_name}' not found in network database"
        }
    
    if not provider.data['in_network']:
        return {
            "check": "failed",
            "ambiguous": False,
            "reason": f"Provider '{provider_name}' is out-of-network"
        }
    
    return {"check": "passed", "ambiguous": False}
```

**Decision:** If ambiguous → Route to manual review

---

### Ambiguous Case 2: Prior Authorization

**Scenario:** Procedure requires prior auth, but we can't verify if obtained.

```python
def check_prior_authorization(claim_data: dict, category_rules: dict, supabase) -> dict:
    """Check if prior authorization was obtained"""
    
    prior_auth_required = category_rules.get('prior_auth_required_for', [])
    
    # Check if this procedure requires prior auth
    description = claim_data['incident_description'].lower()
    requires_auth = any(proc.lower() in description for proc in prior_auth_required)
    
    if not requires_auth:
        return {"check": "passed", "ambiguous": False}
    
    # Check if we have auth record
    auth = supabase.table('prior_authorizations')\
        .select('approved')\
        .eq('claim_id', claim_data['id'])\
        .single()\
        .execute()
    
    if not auth.data:
        # No auth record found
        return {
            "check": "failed",
            "ambiguous": True,
            "reason": "Prior authorization required but not found in system"
        }
    
    if auth.data['approved']:
        return {"check": "passed", "ambiguous": False}
    else:
        return {
            "check": "failed",
            "ambiguous": False,
            "reason": "Prior authorization was denied"
        }
```

---

### Handling Ambiguous Cases

```python
def evaluate_policy(claim_data: dict, supabase) -> dict:
    """
    Complete policy evaluation
    """
    
    # Load rules
    policy_rules = load_policy_rules(claim_data['policy_id'], claim_data['incident_date'], supabase)
    
    # Validation
    validation = execute_validation_rules(claim_data, policy_rules)
    if not validation['passed']:
        return {
            "decision": "rejected",
            "reason": validation['error_message'],
            "benefit_amount": None
        }
    
    # Coverage check
    coverage = check_coverage(claim_data, policy_rules)
    if not coverage['covered']:
        return {
            "decision": "rejected",
            "reason": coverage['reason'],
            "benefit_amount": None
        }
    
    category_rules = policy_rules['coverage_categories'][coverage['category']]
    
    # Network check
    network_check = check_network_requirement(claim_data, category_rules, supabase)
    if network_check['ambiguous']:
        return {
            "decision": "ambiguous",
            "reason": network_check['reason'],
            "benefit_amount": None
        }
    
    # Prior auth check
    auth_check = check_prior_authorization(claim_data, category_rules, supabase)
    if auth_check['ambiguous']:
        return {
            "decision": "ambiguous",
            "reason": auth_check['reason'],
            "benefit_amount": None
        }
    
    # Calculate benefit
    calculation = calculate_benefit(claim_data, policy_rules, category_rules, supabase)
    
    if 'rejection_reason' in calculation:
        return {
            "decision": "rejected",
            "reason": calculation['rejection_reason'],
            "benefit_amount": None,
            "calculation_trail": calculation['calculation_trail']
        }
    
    return {
        "decision": "approved",
        "reason": "All policy checks passed",
        "benefit_amount": calculation['benefit_amount'],
        "calculation_trail": calculation['calculation_trail'],
        "annual_limit_remaining": calculation['annual_limit_remaining']
    }
```

---

## Complete Implementation

### Full Policy Engine Module

```python
# backend/policy_engine.py

from datetime import datetime
from typing import Dict, Any
from supabase import Client

# Hardcoded rules for hackathon
POLICY_RULES = {
    "health": {
        "version": "v1.0",
        "policy_start": "2024-01-01",
        "policy_end": "2024-12-31",
        "coverage_categories": {
            "medical": {
                "covered": True,
                "incident_types": ["accident", "illness"],
                "annual_limit": 50000.00,
                "per_incident_limit": 10000.00,
                "copay_percentage": 20,
                "waiting_period_days": 30,
                "exclusions": ["cosmetic", "experimental"]
            }
        }
    }
}

INCIDENT_TYPE_MAPPING = {
    "accident": "medical",
    "illness": "medical",
    "dental_issue": "dental",
    "theft": "property",
    "damage": "property"
}

class PolicyEngine:
    def __init__(self, supabase: Client):
        self.supabase = supabase
    
    def evaluate(self, claim_data: Dict[str, Any]) -> Dict[str, Any]:
        """Main entry point for policy evaluation"""
        
        try:
            # Get policy rules
            policy_rules = self._load_rules(claim_data)
            
            # Validate
            validation = self._validate(claim_data, policy_rules)
            if not validation['passed']:
                return self._reject(validation['error_message'])
            
            # Check coverage
            coverage = self._check_coverage(claim_data, policy_rules)
            if not coverage['covered']:
                return self._reject(coverage['reason'])
            
            # Calculate benefit
            category_rules = policy_rules['coverage_categories'][coverage['category']]
            calculation = self._calculate_benefit(claim_data, category_rules)
            
            if 'rejection_reason' in calculation:
                return self._reject(calculation['rejection_reason'], calculation['calculation_trail'])
            
            return {
                "decision": "approved",
                "benefit_amount": calculation['benefit_amount'],
                "calculation_trail": calculation['calculation_trail'],
                "policy_version": policy_rules['version'],
                "coverage_category": coverage['category'],
                "annual_limit_remaining": calculation['annual_limit_remaining']
            }
            
        except Exception as e:
            return {
                "decision": "error",
                "reason": str(e),
                "benefit_amount": None
            }
    
    def _load_rules(self, claim_data: Dict[str, Any]) -> Dict[str, Any]:
        """Load policy rules"""
        # For hackathon: hardcoded
        return POLICY_RULES["health"]
    
    def _validate(self, claim_data: Dict[str, Any], policy_rules: Dict[str, Any]) -> Dict[str, Any]:
        """Execute validation rules"""
        
        incident_date = datetime.fromisoformat(claim_data['incident_date'])
        policy_start = datetime.fromisoformat(policy_rules['policy_start'])
        policy_end = datetime.fromisoformat(policy_rules['policy_end'])
        
        if incident_date < policy_start:
            return {
                "passed": False,
                "error_message": f"Incident before policy start ({claim_data['incident_date']} < {policy_rules['policy_start']})"
            }
        
        if incident_date > policy_end:
            return {
                "passed": False,
                "error_message": f"Incident after policy end ({claim_data['incident_date']} > {policy_rules['policy_end']})"
            }
        
        if claim_data['claimed_amount'] <= 0:
            return {
                "passed": False,
                "error_message": f"Invalid amount: ${claim_data['claimed_amount']}"
            }
        
        return {"passed": True}
    
    def _check_coverage(self, claim_data: Dict[str, Any], policy_rules: Dict[str, Any]) -> Dict[str, Any]:
        """Check if incident is covered"""
        
        incident_type = claim_data['incident_type']
        
        # Map to category
        if incident_type not in INCIDENT_TYPE_MAPPING:
            return {
                "covered": False,
                "reason": f"Unknown incident type: {incident_type}"
            }
        
        category = INCIDENT_TYPE_MAPPING[incident_type]
        category_rules = policy_rules['coverage_categories'].get(category)
        
        if not category_rules or not category_rules.get('covered'):
            return {
                "covered": False,
                "category": category,
                "reason": f"Category '{category}' not covered"
            }
        
        # Check waiting period
        incident_date = datetime.fromisoformat(claim_data['incident_date'])
        policy_start = datetime.fromisoformat(policy_rules['policy_start'])
        days_elapsed = (incident_date - policy_start).days
        
        waiting_period = category_rules.get('waiting_period_days', 0)
        if days_elapsed < waiting_period:
            return {
                "covered": False,
                "category": category,
                "reason": f"Waiting period not met: {days_elapsed}/{waiting_period} days"
            }
        
        # Check exclusions
        description = claim_data.get('incident_description', '').lower()
        for exclusion in category_rules.get('exclusions', []):
            if exclusion.lower() in description:
                return {
                    "covered": False,
                    "category": category,
                    "reason": f"Excluded: {exclusion}"
                }
        
        return {
            "covered": True,
            "category": category
        }
    
    def _calculate_benefit(self, claim_data: Dict[str, Any], category_rules: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate benefit amount"""
        
        claimed_amount = claim_data['claimed_amount']
        trail = []
        
        # Step 1: Base amount
        benefit = claimed_amount
        trail.append(f"Claimed amount: ${claimed_amount:.2f}")
        
        # Step 2: Apply copay
        copay_pct = category_rules.get('copay_percentage', 0)
        if copay_pct > 0:
            multiplier = 1 - (copay_pct / 100)
            benefit = claimed_amount * multiplier
            trail.append(f"Applied {copay_pct}% copay: ${claimed_amount:.2f} × {multiplier} = ${benefit:.2f}")
        
        # Step 3: Per-incident limit
        per_limit = category_rules.get('per_incident_limit')
        if per_limit and benefit > per_limit:
            benefit = per_limit
            trail.append(f"Applied per-incident limit: ${per_limit:.2f}")
        
        # Step 4: Annual limit
        annual_limit = category_rules.get('annual_limit', float('inf'))
        
        # Query used amount (simplified for hackathon)
        # In production, query actual approved claims
        used_this_year = 0  # Assume $0 used
        
        remaining = annual_limit - used_this_year
        trail.append(f"Annual limit check: ${annual_limit:.2f} - ${used_this_year:.2f} = ${remaining:.2f} remaining")
        
        if remaining <= 0:
            return {
                "rejection_reason": "Annual limit exhausted",
                "calculation_trail": trail
            }
        
        if benefit > remaining:
            benefit = remaining
            trail.append(f"Adjusted for remaining limit: ${benefit:.2f}")
        
        trail.append(f"Final benefit: ${benefit:.2f}")
        
        return {
            "benefit_amount": round(benefit, 2),
            "calculation_trail": trail,
            "annual_limit_remaining": remaining - benefit
        }
    
    def _reject(self, reason: str, trail: list = None) -> Dict[str, Any]:
        """Helper to format rejection"""
        return {
            "decision": "rejected",
            "reason": reason,
            "benefit_amount": None,
            "calculation_trail": trail or []
        }
```

---

### FastAPI Endpoint

```python
# backend/main.py

from fastapi import FastAPI
from policy_engine import PolicyEngine

app = FastAPI()

@app.post("/api/v1/claims/{claim_id}/policy-check")
async def check_policy(claim_id: str):
    """Evaluate claim against policy rules"""
    
    # Get claim from database
    result = supabase.table('claims')\
        .select('*')\
        .eq('id', claim_id)\
        .single()\
        .execute()
    
    claim_data = result.data
    
    # Run policy engine
    engine = PolicyEngine(supabase)
    policy_result = engine.evaluate(claim_data)
    
    # Update claim
    supabase.table('claims')\
        .update({
            'policy_decision': policy_result,
            'approved_amount': policy_result.get('benefit_amount')
        })\
        .eq('id', claim_id)\
        .execute()
    
    return policy_result
```

---

## Testing Strategy

### Unit Tests

```python
# tests/test_policy_engine.py

def test_validation_valid_claim():
    claim = {
        "incident_date": "2024-06-15",
        "claimed_amount": 1500.00
    }
    policy = {
        "policy_start": "2024-01-01",
        "policy_end": "2024-12-31"
    }
    
    engine = PolicyEngine(None)
    result = engine._validate(claim, policy)
    
    assert result['passed'] == True

def test_validation_before_policy_start():
    claim = {
        "incident_date": "2023-12-15",
        "claimed_amount": 1500.00
    }
    
    result = engine._validate(claim, policy)
    
    assert result['passed'] == False
    assert "before policy start" in result['error_message']

def test_copay_calculation():
    claim = {"claimed_amount": 1000.00}
    category = {"copay_percentage": 20}
    
    result = engine._calculate_benefit(claim, category)
    
    assert result['benefit_amount'] == 800.00

def test_annual_limit_exhausted():
    # Test when annual limit is fully used
    claim = {"claimed_amount": 1000.00}
    category = {"annual_limit": 50000.00}
    
    # Mock database to return $50,000 used
    result = engine._calculate_benefit(claim, category)
    
    assert 'rejection_reason' in result
    assert "exhausted" in result['rejection_reason']

def test_exclusion_check():
    claim = {
        "incident_type": "illness",
        "incident_description": "Cosmetic surgery for acne scars"
    }
    policy = {
        "coverage_categories": {
            "medical": {
                "covered": True,
                "exclusions": ["cosmetic"]
            }
        }
    }
    
    result = engine._check_coverage(claim, policy)
    
    assert result['covered'] == False
    assert "cosmetic" in result['reason'].lower()
```

---

### Integration Tests

```python
def test_end_to_end_approved():
    """Test complete policy evaluation for approved claim"""
    
    claim = {
        "policy_id": "test-uuid",
        "incident_date": "2024-06-15",
        "incident_type": "illness",
        "incident_description": "Flu symptoms",
        "claimed_amount": 1500.00
    }
    
    engine = PolicyEngine(supabase)
    result = engine.evaluate(claim)
    
    assert result['decision'] == 'approved'
    assert result['benefit_amount'] == 1200.00  # After 20% copay
    assert len(result['calculation_trail']) > 0

def test_end_to_end_rejected():
    """Test complete evaluation for rejected claim"""
    
    claim = {
        "incident_date": "2023-12-15",  # Before policy
        "claimed_amount": 1500.00
    }
    
    result = engine.evaluate(claim)
    
    assert result['decision'] == 'rejected'
    assert 'before policy' in result['reason'].lower()
```

---

## Summary

### Layer 2 Responsibilities

1. ✅ **Validate** claim meets basic eligibility
2. ✅ **Determine** if incident type is covered
3. ✅ **Check** waiting periods and exclusions
4. ✅ **Calculate** exact benefit amount with copays/limits
5. ✅ **Document** every calculation step for transparency
6. ✅ **Handle** ambiguous cases (route to review)

### Key Outputs

```python
{
  "decision": "approved | rejected | ambiguous",
  "benefit_amount": 1200.00,
  "calculation_trail": ["step 1", "step 2", ...],
  "policy_version": "v1.0",
  "coverage_category": "medical",
  "annual_limit_remaining": 48800.00,
  "reason": "All checks passed" or "Specific rejection reason"
}
```

### Implementation Time

- **Hackathon (simplified):** 3-4 hours
- **Production (full):** 12-15 hours

---

**Layer 2 is complete!** 🎯
