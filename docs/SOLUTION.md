<p align="center">
  <img src="../lexora-logo.png" alt="Lexora Logo" width="100" />
</p>

# LEXORA: Neuro-Symbolic Claims Intelligence Platform

## Solution Overview

**Problem:** Insurance claims processing is slow, expensive, and vulnerable to fraud. Current solutions either can't handle unstructured data (rule engines) or lack auditability (pure AI).

**Solution:** A five-layer neuro-symbolic architecture that uses AI for perception, deterministic code for decisions, and graph analytics for fraud detection. Achieves high straight-through processing with complete explainability.

**Core Innovation:** We separate perception (what happened) from reasoning (what to do) - AI excels at the former, deterministic code ensures correctness of the latter.

---

## System Architecture

```mermaid
graph TB
    A[Claim Submission<br/>PDFs, Videos, Images, Audio] --> B[Layer 1: Perception Engine<br/>Multi-Modal AI Extraction]
    
    B --> C[Layer 2: Policy Engine<br/>Deterministic Rules]
    
    C --> D[Layer 3: Fraud Intelligence<br/>Three-Tier Detection]
    
    D --> E[Layer 4: Decision Engine<br/>Economic Optimization]
    
    E --> F{Decision}
    
    F -->|Straight-Through| G[Auto-Approve]
    F -->|Straight-Through| H[Auto-Reject]
    F -->|Review Needed| I[Manual Review]
    F -->|High Risk| J[Fraud Investigation]
    
    E --> K[Layer 5: Audit & Learning<br/>Complete Trail + Feedback]
    
    K -.Improves Over Time.-> B
    K -.Improves Over Time.-> D
    
    style B fill:#e3f2fd
    style C fill:#fff3e0
    style D fill:#fce4ec
    style E fill:#f3e5f5
    style K fill:#e8f5e9
    style G fill:#4caf50
    style H fill:#f44336
    style I fill:#ff9800
    style J fill:#ff5722
```

---

## Layer 1: Perception Engine

**Purpose:** Convert messy real-world documents into validated structured data.

**How It Works:**

```mermaid
flowchart TD
    A[Document Upload] --> B{Document Type?}
    
    B -->|PDF| C[n8n Extract Text]
    B -->|Image/Photo| D[Direct Processing]
    B -->|Video| E[Gemini 2.5 Flash Lite<br/>Video Analysis]
    B -->|Audio| F[Groq Whisper Large v3<br/>Transcription]
    
    C --> G[Gemma 3<br/>Analyze Text]
    F --> G
    
    D --> H[Gemma 3<br/>Image Analysis]
    E --> I[Structured Output]
    G --> I
    H --> I
    
    I --> J[Schema Validation<br/>Pydantic]
    
    J --> K{All Fields Valid?}
    
    K -->|Yes| L[Calculate Confidence<br/>Per Field]
    K -->|No| M[Identify Missing<br/>or Invalid Fields]
    
    L --> N{Overall Confidence<br/>High?}
    
    N -->|Yes| O[✅ Validated Claim Object]
    N -->|No| P[⚠️ Flag for Human Review]
    
    M --> P
    
    style O fill:#4caf50,color:#fff
    style P fill:#ff9800,color:#fff
```

**Key Design Principles:**

- **Multi-Modal Processing:** Handles PDFs (text extraction), images (visual analysis), videos (Gemini 2.5 Flash Lite), and audio (Groq Whisper transcription)
- **Intelligent Analysis:** Gemma 3 analyzes extracted content to generate structured data
- **Schema Validation:** Strict type checking prevents invalid data from entering the system
- **Confidence Thresholding:** High-confidence extractions proceed automatically, low-confidence gets human review
- **n8n Integration:** Automated workflow orchestration for file routing and processing

**Output:** Clean structured data with field-level confidence metadata


**Why This Works:**
- AI handles what it's good at: understanding unstructured multi-modal data (PDFs, videos, images, audio)
- n8n orchestrates complex file processing workflows efficiently
- Strict schemas prevent garbage-in-garbage-out
- Confidence scoring enables smart routing (high confidence → automation, low → human review)
- No AI decision-making yet - just data extraction and analysis

---

## Layer 2: Policy Governance Engine

**Purpose:** Apply insurance policy rules with zero ambiguity and complete auditability.

**Critical Design Decision:** Human-authored rules, NOT AI-generated code.

**Why NOT AI-Generated Code:**
- Insurance policies have legal nuances requiring human interpretation
- LLM-generated code creates legal liability if it misinterprets coverage
- Regulatory compliance requires human approval of adjudication logic

**How It Works:**

```mermaid
flowchart LR
    A[Insurance Policy PDF] --> B[Human Analyst<br/>Reads Policy]
    B --> C[Author Rules<br/>YAML Format]
    C --> D[Schema Validator<br/>Check Syntax]
    D --> E[Legal Team<br/>Approval]
    E --> F[Rule Registry<br/>Version Control]
    
    G[Validated Claim] --> H[Load Policy Rules<br/>Version at claim date]
    F --> H
    
    H --> I[Execute Rules<br/>Deterministic Python]
    
    I --> J{Result}
    
    J -->|Covered| K[Calculate Benefit<br/>Mathematical Formula]
    J -->|Excluded| L[Reject with Reason]
    J -->|Ambiguous| M[Flag for Underwriter]
    
    K --> N[Policy Decision<br/>+ Audit Trail]
    L --> N
    
    style E fill:#ffeb3b
    style N fill:#4caf50,color:#fff
    style L fill:#f44336,color:#fff
```

**Rule Structure:**

Policy rules are defined in structured format containing:
- Policy identification and version information
- Coverage categories with limits and conditions
- Copay percentages and waiting periods
- Exclusions for each category
- Validation rules for claim eligibility
- Legal approval metadata

Each rule set is version-controlled and tied to effective dates, ensuring claims are adjudicated using the correct policy version at the time of the incident.

**Rule Execution Logic:**

The system applies rules in a deterministic sequence:
1. Verify claim category is covered by the policy
2. Check temporal validity (claim date within policy period, waiting periods met)
3. Validate against annual or per-incident limits
4. Apply copay percentages and calculate benefit amounts
5. Check for exclusions that would disqualify the claim
6. Return decision with mathematical justification

Every calculation is reproducible using the same inputs and policy version.

**Why This Works:**
- Every decision is mathematically reproducible
- Human-approved rules = legal defensibility
- Version control = audit compliance
- No LLM hallucination risk in decision-making
- Clear separation: AI extracts data, Code applies rules

---

## Layer 3: Three-Tier Fraud Intelligence

**Purpose:** Detect fraud at multiple sophistication levels - from simple duplicates to organized crime rings.

**The Innovation:** Cascading detection that catches what single-claim analysis misses.

```mermaid
graph TB
    A["Validated Claim"] --> B["Tier 1: Rule-Based Sentinels<br/>Fast, Low-Cost Checks"]
    
    B --> C{Quick Flags?}
    C -->|Duplicate Invoice| D["Fraud Score: High"]
    C -->|Velocity Anomaly| D
    C -->|Policy Expired| D
    C -->|Clean| E["Tier 2: Vector Similarity<br/>Content Analysis"]
    
    E --> F{Similar Content?}
    F -->|Image Reuse Detected| G["Fraud Score: Medium-High"]
    F -->|Text Duplicate Detected| G
    F -->|Unique| H["Tier 3: Graph Analysis<br/>Network Detection"]
    
    H --> I{Network Patterns?}
    I -->|Fraud Ring Detected| J["Fraud Score: Medium"]
    I -->|High Velocity Provider| J
    I -->|Shared Accounts| J
    I -->|Clean Network| K["Fraud Score: Low"]
    
    D --> L["Risk Fusion Engine"]
    G --> L
    J --> L
    K --> L
    
    L --> M["Combined Fraud Score<br/>0.0 - 1.0"]
    
    style D fill:#f44336,color:#ffffff;
    style G fill:#ff9800,color:#ffffff;
    style J fill:#ffc107,color:#000000;
    style K fill:#4caf50,color:#ffffff;
```

### Tier 1: Rule-Based Sentinels

**Fast, cheap, high-precision checks:**

```mermaid
flowchart TD
    A[New Claim] --> B{Duplicate Check}
    B -->|Invoice ID exists| C[🚨 Flag: Duplicate]
    B -->|Unique| D{Velocity Check}
    
    D -->|Same claimant<br/>>5 claims in 7 days| E[🚨 Flag: Velocity]
    D -->|Normal rate| F{Policy Check}
    
    F -->|Claim date > policy expiry| G[🚨 Flag: Expired]
    F -->|Valid| H{Amount Check}
    
    H -->|Amount >3 std dev| I[⚠️ Flag: Anomaly]
    H -->|Normal| J[✅ Pass Tier 1]
    
    style C fill:#f44336,color:#fff
    style E fill:#f44336,color:#fff
    style G fill:#f44336,color:#fff
    style I fill:#ff9800,color:#fff
    style J fill:#4caf50,color:#fff
```

**Why This Matters:** Provides fast initial screening with high precision and minimal computational cost.

---

### Tier 2: Vector Similarity Detection

**Purpose:** Detect reused images, duplicate narratives, template-based fraud.

```mermaid
flowchart LR
    A[Claim Images] --> B[Jina AI<br/>Image → Vector]
    C[Claim Text] --> D[Cohere<br/>Text → Vector]
    
    B --> E[Qdrant Vector DB<br/>Search Similar]
    D --> E
    
    E --> F{Cosine Similarity<br/>>0.95?}
    
    F -->|Yes| G[🚨 Match Found<br/>Show Original Claim]
    F -->|No| H[✅ Unique Content]
    
    G --> I[Fraud Score: 0.7]
    H --> J[Fraud Score: 0.1]
    
    style G fill:#ff9800,color:#fff
    style H fill:#4caf50,color:#fff
```

**What It Catches:**
- Same accident photo submitted by different claimants
- Same hospital bill with altered dates/names
- Copy-pasted incident descriptions
- Template-based fraud (fraudsters reusing forms)

**Technical Approach:**
- Image embeddings via Jina AI API encode visual content into vector representations
- Text embeddings via Cohere API convert narrative descriptions into semantic vectors
- Vector database enables fast similarity search across historical claims
- High similarity scores (above threshold) indicate potential content reuse

**What It Catches:**
- Reused accident photos across different claims
- Duplicate hospital bills with altered details
- Copy-pasted incident descriptions
- Template-based fraud patterns

---

### Tier 3: Graph Network Intelligence

**Purpose:** Detect organized fraud rings that span multiple claims and entities.

**The Problem with Traditional Systems:**
Single-claim analysis misses patterns like:
- Multiple claimants sharing phone numbers
- One provider linked to dozens of suspicious claims
- Circular payment patterns (money laundering)

**Our Solution:** Build a knowledge graph that reveals hidden connections.

```mermaid
graph TB
    subgraph "Example Fraud Ring"
        A[Claimant Alice] -->|Filed| B[Claim #101]
        C[Claimant Bob] -->|Filed| D[Claim #102]
        E[Claimant Carol] -->|Filed| F[Claim #103]
        
        B -->|Treated By| G[Dr. Smith]
        D -->|Treated By| G
        F -->|Treated By| G
        
        A -->|Phone| H[555-0101]
        C -->|Phone| H
        
        B -->|Invoice| I[INV-9876]
        F -->|Invoice| I
        
        A -->|Bank Account| J[ACCT-123]
        E -->|Bank Account| J
    end
    
    K[Graph Analytics] --> L{Risk Signals}
    
    G --> K
    H --> K
    I --> K
    J --> K
    
    L --> M[Dr. Smith:<br/>37 claims in 7 days]
    L --> N[Phone 555-0101:<br/>Shared by 3 claimants]
    L --> O[Invoice INV-9876:<br/>Used twice]
    L --> P[Account ACCT-123:<br/>2 claimants, 1 rejected]
    
    M --> Q[Combined Graph<br/>Fraud Score: 0.65]
    N --> Q
    O --> Q
    P --> Q
    
    style G fill:#f44336,color:#fff
    style H fill:#f44336,color:#fff
    style I fill:#ff9800,color:#fff
    style J fill:#ff9800,color:#fff
    style Q fill:#ff9800
```

**Graph Structure:**

The knowledge graph models relationships between:
- **Claims:** Individual claim records
- **People:** Claimants and policyholders
- **Providers:** Medical facilities, repair shops, etc.
- **Contact Information:** Phone numbers, emails
- **Financial Data:** Bank accounts, invoice numbers
- **Devices:** IP addresses, device fingerprints

**Relationships tracked:**
- Who filed which claims
- Which provider treated which claims
- Shared contact information between claimants
- Shared financial accounts
- Document references across claims

**Detection Patterns:**

The graph analytics identifies suspicious patterns such as:
- **High-velocity providers:** Single provider linked to unusually high number of recent claims
- **Shared contact networks:** Multiple claimants using the same phone numbers or emails
- **Circular banking:** Multiple people sharing the same financial accounts
- **Invoice reuse:** Same invoice numbers appearing across different claims
- **Device clustering:** Multiple claims submitted from identical devices

**Risk Scoring Approach:**

Graph risk scores combine multiple factors:
- Network centrality (how connected is this entity?)
- Cluster density (how tightly grouped are related claims?)
- Velocity patterns (how quickly are claims appearing?)
- Historical rejection rates (past fraud history)

Risk levels are categorized as high, medium, or low based on combined score thresholds.

**Why This Is Powerful:**
- Single-claim analysis misses organized fraud entirely
- Graph-based detection reveals hidden connections across the network
- Enables proactive detection of fraud rings before they cause extensive damage

---

### Risk Fusion: Combining All Signals

```mermaid
flowchart TD
    A[Tier 1: Rule Flags] --> D[Risk Fusion]
    B[Tier 2: Vector Score] --> D
    C[Tier 3: Graph Score] --> D
    
    D --> E[Weighted Combination]
    
    E --> F[Final Fraud Score<br/>0.0 - 1.0]
    
    F --> G{Fraud Level}
    
    G -->|Score > 0.7| H[🚨 High Risk<br/>Likely Fraud]
    G -->|Score 0.3-0.7| I[⚠️ Medium Risk<br/>Investigate]
    G -->|Score < 0.3| J[✅ Low Risk<br/>Likely Legitimate]
    
    style H fill:#f44336,color:#fff
    style I fill:#ff9800,color:#fff
    style J fill:#4caf50,color:#fff
```

**Score Combination:**

The final fraud score combines signals from all three tiers with weighted importance:
- Tier 1 rule-based flags contribute to the score (high precision, limited scope)
- Tier 2 similarity detection provides content-based signals
- Tier 3 graph analysis receives highest weight (catches sophisticated organized fraud)

This multi-tier approach ensures both simple and complex fraud patterns are properly weighted in the final risk assessment.

---

## Layer 4: Economic Decision Engine

**Purpose:** Make financially optimal routing decisions, not arbitrary threshold-based ones.

**The Innovation:** Only involve humans when the expected loss justifies the investigation cost.

```mermaid
flowchart TD
    A[Inputs:<br/>Fraud Score<br/>Confidence Score<br/>Claim Amount] --> B[Calculate Expected Loss]
    
    B --> C[Expected Loss =<br/>Fraud Score × Claim Amount]
    
    C --> D{Decision Matrix}
    
    D -->|Low Confidence| E[❌ Data Quality Issue]
    D -->|Policy = REJECT| F[❌ Policy Violation]
    D -->|High Fraud| G[🚨 High Fraud Risk]
    D -->|Expected Loss > Threshold| H[⚠️ Investigation Justified]
    D -->|Low Fraud &<br/>High Confidence| I[✅ Low Risk]
    D -->|Other Cases| J[⚠️ Moderate Risk]
    
    E --> K[Manual Review]
    F --> L[Auto-Reject]
    G --> M[SIU Investigation]
    H --> K
    I --> N[Auto-Approve]
    J --> K
    
    style L fill:#f44336,color:#fff
    style M fill:#ff5722,color:#fff
    style K fill:#ff9800,color:#fff
    style N fill:#4caf50,color:#fff
```

**Economic Logic:**

The system calculates expected loss and compares it to investigation cost:

**Expected Loss** = `fraud_probability` × `claim_amount`

**Decision Rule:**
- If `expected_loss` > `investigation_cost`: Route to human review (economically justified)
- If `expected_loss < investigation_cost`: Auto-process (risk acceptable)

This ensures resources are allocated optimally - only involving human reviewers when the potential fraud loss justifies the cost of investigation.

**Complete Decision Logic:**

```mermaid
flowchart TD
    A[Start] --> B{Data Quality<br/>Sufficient?}
    
    B -->|No| C[❌ Manual Review<br/>Reason: Low extraction confidence]
    B -->|Yes| D{Policy Rules<br/>Result?}
    
    D -->|REJECT| E[❌ Auto-Reject<br/>Reason: Policy violation]
    D -->|APPROVE| F{Fraud Score?}
    
    F -->|High| G[🚨 SIU Investigation<br/>Reason: High fraud probability]
    F -->|Medium| H{Calculate<br/>Expected Loss}
    F -->|Low| I{Confidence?}
    
    H --> J{Expected Loss<br/>> Threshold?}
    J -->|Yes| K[⚠️ Manual Review<br/>Reason: Economic threshold]
    J -->|No| I
    
    I -->|High| L[✅ Auto-Approve<br/>Reason: Low risk, high confidence]
    I -->|Medium| M[⚠️ Manual Review<br/>Reason: Moderate confidence]
    
    style E fill:#f44336,color:#fff
    style G fill:#ff5722,color:#fff
    style C fill:#ff9800,color:#fff
    style K fill:#ff9800,color:#fff
    style M fill:#ff9800,color:#fff
    style L fill:#4caf50,color:#fff
```

---

## Layer 5: Audit & Active Learning

**Purpose:** Complete regulatory compliance + continuous system improvement.

```mermaid
flowchart TB
    A["Claim Decision Made"] --> B["Log Complete Audit Trail"]
    
    B --> C["Audit Trail Contains:
    - All extracted data + confidence
    - Policy rules applied + version
    - Fraud scores from all tiers
    - Economic calculation
    - Final decision + rationale
    - Model versions used
    - Timestamp"]
    
    C --> D{"Human Review Occurred?"}
    
    D -->|No| E["Store for Compliance"]
    D -->|Yes| F["Underwriter Decision"]
    
    F --> G{"Agrees with System?"}
    
    G -->|Yes| H["Log Confirmation"]
    G -->|No| I["Log Correction + Reason"]
    
    H --> J["Feedback Database"]
    I --> J
    
    J --> K{"Monthly Retraining Cycle?"}
    
    K --> L["Analyze Disagreements"]
    
    L --> M["Retrain Models:
    - Fraud detection weights (scikit-learn)
    - Confidence thresholds
    - Risk scoring parameters"]
    
    M --> N["A/B Test New Model vs Current"]
    
    N --> O{"New Model Performance?"}
    
    O -->|Lift > 2% AND FP Rate <= Target| P["Deploy New Model"]
    O -->|Otherwise| Q["Keep Current Model"]
    
    P --> R["System Improves"]
    Q --> S["Document Results"]

    style I fill:#ff9800
    style P fill:#4caf50,color:#ffffff
    style R fill:#4caf50,color:#ffffff
```

**Audit Trail Structure:**

Each claim decision includes comprehensive logging:
- Claim identification and processing timestamp
- Layer 1: All extracted data with field-level confidence scores
- Layer 2: Policy version applied, rules executed, coverage calculations
- Layer 3: Fraud analysis results from all three tiers, combined risk score
- Layer 4: Economic calculation, decision rationale, routing outcome
- Layer 5: Human feedback (if applicable)
- Model versions used throughout the process

This complete trail enables regulatory compliance and performance analysis.

**Why This Matters:**
- **Compliance:** Every decision is reproducible and explainable
- **Learning:** System improves from real-world feedback
- **Trust:** Underwriters see the logic, not a black box
- **Accountability:** Complete chain of reasoning for every claim

---

## Why This Solution Works

### 1. Neuro-Symbolic Architecture

```mermaid
graph LR
    A[Traditional<br/>Rule Engines] -->|Problem| B[Can't handle<br/>unstructured data]
    C[Pure AI<br/>Solutions] -->|Problem| D[Hallucinations<br/>Black box]
    
    E[Lexora] -->|Solution| F[AI for Perception<br/>Code for Decisions]
    
    F --> G[Best of Both:<br/>• Handles messy data<br/>• Deterministic decisions<br/>• Fully explainable]
    
    style A fill:#ffcdd2
    style C fill:#ffcdd2
    style E fill:#c8e6c9
    style G fill:#c8e6c9
```

**What Makes It Unique:**
- **Layer 1 (AI):** Extracts data from chaos - what AI excels at
- **Layer 2 (Code):** Applies rules with certainty - what code excels at
- **Layer 3 (Hybrid):** Smart fraud detection using multiple techniques
- **Layer 4 (Logic):** Economic optimization - pure mathematics
- **Layer 5 (Learning):** Continuous improvement with human feedback

**No other solution combines these correctly.**

---

### 2. Three-Tier Fraud Detection

```mermaid
graph TB
    A[Single-Claim Analysis<br/>Traditional Systems] --> B[❌ Misses:<br/>• Organized fraud rings<br/>• Reused content<br/>• Network patterns]
    
    C[Three-Tier Cascade<br/>Lexora] --> D[✅ Catches:<br/>• Simple duplicates Tier 1<br/>• Content reuse Tier 2<br/>• Fraud networks Tier 3]
    
    style A fill:#ffcdd2
    style C fill:#c8e6c9
```

**Competitive Moat:** Graph-based fraud detection is sophisticated and data-intensive - high barrier to entry.

---

### 3. Economic Optimization

**Traditional Approach:** Fixed thresholds (e.g., "if fraud score exceeds X, review manually")

❌ Problem: Ignores the cost-benefit analysis

**Our Approach:** Expected value calculation - only route to human review when (`fraud_probability` × `claim_amount`) exceeds investigation cost

✅ Result: Fewer unnecessary reviews, optimized resource allocation, faster customer experience

---

### 4. Built-In Learning Loop

```mermaid
graph LR
    A[Static Systems] -->|Problem| B[Degrade over time<br/>as fraud evolves]
    
    C[Lexora] -->|Solution| D[Learns from<br/>every correction]
    
    D --> E[Accuracy improves<br/>over time]
    
    style A fill:#ffcdd2
    style C fill:#c8e6c9
    style E fill:#c8e6c9
```

---

## Technical Feasibility

### Technology Stack

| Layer | Technology | Maturity | Risk |
|-------|-----------|----------|------|
| File Processing | n8n | Production | ✅ Low |
| PDF Extraction | n8n built-in | Battle-tested | ✅ Low |
| Video Analysis | Gemini 2.5 Flash Lite | Production | ✅ Low |
| Audio Transcription | Groq Whisper Large v3 | Production | ✅ Low |
| Content Analysis | Gemma 3 | Production | ✅ Low |
| Text Embeddings | Cohere API | Production | ✅ Low |
| Image Embeddings | Jina AI API | Production | ✅ Low |
| Validation | Pydantic | Battle-tested | ✅ Low |
| Policy Engine | Python + YAML | Proven | ✅ Low |
| Vector Search | Qdrant | Production | ✅ Low |
| Graph DB | Neo4j | Industry standard | ⚠️ Medium |
| Backend | FastAPI + Celery | Proven | ✅ Low |
| Frontend | Next.js + TypeScript | Proven | ✅ Low |

**Overall Risk: LOW** - No experimental technologies, everything is production-proven.

---

### Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant API as API Gateway
    participant L1 as Layer 1 Perception
    participant L2 as Layer 2 Policy
    participant L3 as Layer 3 Fraud
    participant L4 as Layer 4 Decision
    participant L5 as Layer 5 Audit
    participant DB as Database
    
    U->>API: Upload claim documents
    API->>L1: Extract data
    L1->>L1: n8n workflow routing
    L1->>L1: Gemma 3 / Gemini analysis
    L1->>L1: Pydantic validation
    L1->>API: ClaimObject + confidence
    
    API->>L2: Validate policy
    L2->>DB: Load policy rules (version)
    DB->>L2: PolicyRules v2.3
    L2->>L2: Execute deterministic rules
    L2->>API: Policy decision + calculation
    
    API->>L3: Analyze fraud
    L3->>L3: Tier 1 - Rule checks
    L3->>DB: Tier 2 - Vector search (Cohere/Jina)
    DB->>L3: Similarity scores
    L3->>DB: Tier 3 - Graph query
    DB->>L3: Network risk
    L3->>API: Combined fraud score
    
    API->>L4: Make decision
    L4->>L4: Calculate expected loss
    L4->>L4: Apply decision logic
    L4->>API: Final decision + rationale
    
    API->>L5: Log audit trail
    L5->>DB: Store complete trail
    
    API->>U: Return decision with explanation
```

---

## The Complete Picture

```mermaid
graph TB
    subgraph "INPUT"
        A[Multi-Modal Documents<br/>PDFs, Videos, Images, Audio]
    end
    
    subgraph "LAYER 1: PERCEPTION"
        B[n8n Workflow Orchestration]
        C[Gemma 3 / Gemini Analysis]
        D[Schema Validation<br/>Pydantic]
    end
    
    subgraph "LAYER 2: GOVERNANCE"
        E[Policy Rules<br/>Human-Authored]
        F[Deterministic Engine<br/>Python]
    end
    
    subgraph "LAYER 3: INTELLIGENCE"
        G[Tier 1: Rules<br/>Fast Checks]
        H[Tier 2: Vectors<br/>Cohere + Jina]
        I[Tier 3: Graph<br/>Neo4j Networks]
    end
    
    subgraph "LAYER 4: OPTIMIZATION"
        J[Economic Model<br/>Expected Loss]
        K[Decision Router<br/>Smart Routing]
    end
    
    subgraph "LAYER 5: LEARNING"
        L[Audit Trail<br/>Complete Log]
        M[Feedback Loop<br/>scikit-learn]
    end
    
    subgraph "OUTPUT"
        N[Auto-Approve]
        O[Auto-Reject]
        P[Manual Review]
        Q[Fraud Investigation]
    end
    
    A --> B --> C --> D
    D --> E --> F
    F --> G --> H --> I
    I --> J --> K
    K --> N
    K --> O
    K --> P
    K --> Q
    K --> L --> M
    M -.Improves.-> C
    M -.Improves.-> I
    
    style N fill:#4caf50,color:#fff
    style O fill:#f44336,color:#fff
    style P fill:#ff9800,color:#fff
    style Q fill:#ff5722,color:#fff
```

---

## Summary

**Lexora solves intelligent claims processing through:**

1. **Neuro-Symbolic Architecture** - AI for perception, code for decisions
2. **Three-Tier Fraud Detection** - Catches simple duplicates to organized crime rings
3. **Economic Optimization** - Smart routing based on cost-benefit analysis
4. **Active Learning** - Improves continuously from human feedback
5. **Complete Auditability** - Every decision is explainable and reproducible

**What Makes It Win:**
- Most sophisticated fraud detection (three-tier cascade)
- Only true neuro-symbolic solution (best of AI + code)
- Production-ready technology stack  
- Clear competitive moat (graph intelligence)
- Enables significant automation while maintaining full explainability