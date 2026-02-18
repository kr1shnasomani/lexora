# LEXORA: Complete Implementation Plan

## Table of Contents
1. [Project Overview](#project-overview)
2. [Development Environment Setup](#development-environment-setup)
3. [Phase 1: Foundation Setup](#phase-1-foundation-setup)
4. [Phase 2: Layer 1 - Perception Engine](#phase-2-layer-1---perception-engine)
5. [Phase 3: Layer 2 - Policy Engine](#phase-3-layer-2---policy-engine)
6. [Phase 4: Layer 3 - Fraud Detection](#phase-4-layer-3---fraud-detection)
7. [Phase 5: Layer 4 - Decision Engine](#phase-5-layer-4---decision-engine)
8. [Phase 6: Layer 5 - Audit & Learning](#phase-6-layer-5---audit--learning)
9. [Phase 7: Frontend Implementation](#phase-7-frontend-implementation)
10. [Phase 8: Integration & Testing](#phase-8-integration--testing)
11. [Phase 9: Demo Preparation](#phase-9-demo-preparation)

---

## Project Overview

### Tech Stack Summary
```
Frontend: Next.js + TypeScript + TailwindCSS + Shadcn/ui
Backend: FastAPI + Python 3.11
Workflow: n8n (Layer 1 orchestration)
AI/ML: Gemma 3, Gemini 2.5 Flash Lite, Groq Whisper, Cohere, Jina AI
Databases: PostgreSQL, Qdrant, Neo4j, Redis
Deployment: Docker + Docker Compose
```

### Project Structure
```
lexora/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── schemas.py
│   │   │   ├── policy_models.py
│   │   │   ├── fraud_models.py
│   │   │   └── decision_models.py
│   │   ├── layers/
│   │   │   ├── __init__.py
│   │   │   ├── layer1_perception/
│   │   │   ├── layer2_policy/
│   │   │   ├── layer3_fraud/
│   │   │   ├── layer4_decision/
│   │   │   └── layer5_audit/
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── routes.py
│   │   │   └── dependencies.py
│   │   └── utils/
│   │       ├── __init__.py
│   │       └── helpers.py
│   ├── tests/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/
│   │   │   ├── claims/
│   │   │   └── review/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── ClaimUpload.tsx
│   │   │   ├── ClaimDashboard.tsx
│   │   │   ├── FraudNetwork.tsx
│   │   │   └── ReviewInterface.tsx
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   └── utils.ts
│   │   └── types/
│   │       └── index.ts
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── next.config.js
├── n8n/
│   ├── workflows/
│   │   ├── claim_processing.json
│   │   └── file_router.json
│   └── credentials/
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Development Environment Setup

### Prerequisites
```bash
# Required installations
- Docker Desktop (or Docker + Docker Compose)
- Node.js 18+ and npm
- Python 3.11+
- Git
- VS Code (recommended)
```

### Initial Setup Steps

#### Step 1: Clone and Setup Repository
```bash
# Create project directory
mkdir lexora
cd lexora

# Initialize git
git init

# Create folder structure
mkdir -p backend/app/{models,layers,api,utils}
mkdir -p backend/tests
mkdir -p frontend/src/{app,components,lib,types}
mkdir -p n8n/{workflows,credentials}
```

#### Step 2: Environment Variables
```bash
# Create .env file in root
cat > .env << EOF
# API Keys
GEMINI_API_KEY=your_gemini_key_here
GROQ_API_KEY=your_groq_key_here
COHERE_API_KEY=your_cohere_key_here
JINA_API_KEY=your_jina_key_here

# Database URLs
DATABASE_URL=postgresql://admin:changeme@localhost:5432/lexora
REDIS_URL=redis://localhost:6379/0
QDRANT_HOST=localhost
QDRANT_PORT=6333
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=changeme

# n8n
N8N_WEBHOOK_URL=http://localhost:5678

# App Settings
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
EOF
```

#### Step 3: Docker Compose Setup
```yaml
# docker-compose.yml
version: '3.8'

services:
  # PostgreSQL
  postgres:
    image: postgres:15-alpine
    container_name: lexora-postgres
    environment:
      POSTGRES_DB: lexora
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: changeme
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis
  redis:
    image: redis:7-alpine
    container_name: lexora-redis
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Qdrant
  qdrant:
    image: qdrant/qdrant:latest
    container_name: lexora-qdrant
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_data:/qdrant/storage
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:6333/health"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Neo4j
  neo4j:
    image: neo4j:5-community
    container_name: lexora-neo4j
    environment:
      NEO4J_AUTH: neo4j/changeme
      NEO4J_PLUGINS: '["apoc"]'
      NEO4J_dbms_security_procedures_unrestricted: apoc.*
    ports:
      - "7474:7474"  # HTTP
      - "7687:7687"  # Bolt
    volumes:
      - neo4j_data:/data
    healthcheck:
      test: ["CMD", "cypher-shell", "-u", "neo4j", "-p", "changeme", "RETURN 1"]
      interval: 10s
      timeout: 5s
      retries: 5

  # n8n
  n8n:
    image: n8nio/n8n:latest
    container_name: lexora-n8n
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=changeme
      - WEBHOOK_URL=http://localhost:5678/
    ports:
      - "5678:5678"
    volumes:
      - n8n_data:/home/node/.n8n
      - ./n8n/workflows:/home/node/workflows
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
  qdrant_data:
  neo4j_data:
  n8n_data:
```

#### Step 4: Start Infrastructure
```bash
# Start all databases and n8n
docker-compose up -d

# Verify all services are running
docker-compose ps

# Check logs if any issues
docker-compose logs -f
```

---

## Phase 1: Foundation Setup

**Duration:** 2-3 hours  
**Goal:** Setup backend, frontend, and database schemas

### Task 1.1: Backend Foundation

#### Create Backend Structure
```bash
cd backend

# Create requirements.txt
cat > requirements.txt << EOF
# Core Framework
fastapi==0.109.0
uvicorn[standard]==0.27.0
python-multipart==0.0.6

# Database
sqlalchemy==2.0.25
psycopg2-binary==2.9.9
alembic==1.13.1

# Redis & Celery
redis==5.0.1
celery==5.3.6

# AI/ML
google-generativeai==0.3.2
cohere==4.37
jina==3.23.0

# Vector & Graph DB
qdrant-client==1.7.3
neo4j==5.16.0

# Validation & Utils
pydantic==2.6.0
pydantic-settings==2.1.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-dotenv==1.0.0
requests==2.31.0
pillow==10.2.0

# Testing
pytest==7.4.3
pytest-asyncio==0.21.1
httpx==0.25.2
EOF

# Install dependencies
pip install -r requirements.txt
```

#### Create Config File
```python
# backend/app/config.py

from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # API Keys
    GEMINI_API_KEY: str
    GROQ_API_KEY: str
    COHERE_API_KEY: str
    JINA_API_KEY: str
    
    # Database URLs
    DATABASE_URL: str
    REDIS_URL: str
    QDRANT_HOST: str
    QDRANT_PORT: int
    NEO4J_URI: str
    NEO4J_USER: str
    NEO4J_PASSWORD: str
    
    # n8n
    N8N_WEBHOOK_URL: str
    
    # App Settings
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    class Config:
        env_file = "../.env"
        case_sensitive = True

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
```

#### Create Database Connection
```python
# backend/app/database.py

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# PostgreSQL
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Redis
import redis
redis_client = redis.from_url(settings.REDIS_URL)

# Qdrant
from qdrant_client import QdrantClient
qdrant_client = QdrantClient(
    host=settings.QDRANT_HOST,
    port=settings.QDRANT_PORT
)

# Neo4j
from neo4j import GraphDatabase
neo4j_driver = GraphDatabase.driver(
    settings.NEO4J_URI,
    auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
)
```

#### Create Main FastAPI App
```python
# backend/app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

app = FastAPI(
    title="Lexora API",
    description="Neuro-Symbolic Claims Intelligence Platform",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Lexora API is running"}

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

#### Test Backend
```bash
# Run backend
cd backend
python -m app.main

# Test in browser: http://localhost:8000
# Should see: {"message": "Lexora API is running"}
```

### Task 1.2: Frontend Foundation

#### Initialize Next.js Project
```bash
cd frontend

# Create Next.js app with TypeScript
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir

# Install dependencies
npm install @radix-ui/react-icons lucide-react
npm install @tanstack/react-query axios
npm install recharts react-flow-renderer
npm install class-variance-authority clsx tailwind-merge

# Install Shadcn UI
npx shadcn-ui@latest init

# Add Shadcn components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add table
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add form
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add select
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add toast
```

#### Create API Client
```typescript
// frontend/src/lib/api.ts

import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface ClaimSubmission {
  files: File[];
  policyNumber?: string;
}

export interface ClaimDecision {
  decision: 'auto_approve' | 'auto_reject' | 'manual_review' | 'fraud_investigation';
  expected_loss: number;
  benefit_amount?: number;
  rationale: string;
  confidence_level: string;
  next_steps: string[];
}

// API functions
export const claimsApi = {
  // Submit claim
  submitClaim: async (data: ClaimSubmission): Promise<ClaimDecision> => {
    const formData = new FormData();
    data.files.forEach(file => formData.append('files', file));
    if (data.policyNumber) {
      formData.append('policy_number', data.policyNumber);
    }
    
    const response = await api.post('/api/v1/claims/process', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  
  // Get claim details
  getClaim: async (claimId: string) => {
    const response = await api.get(`/api/v1/claims/${claimId}`);
    return response.data;
  },
  
  // Get all claims
  getAllClaims: async () => {
    const response = await api.get('/api/v1/claims');
    return response.data;
  },
};
```

#### Create Basic Layout
```typescript
// frontend/src/app/layout.tsx

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Lexora - Claims Intelligence Platform',
  description: 'AI-powered insurance claims processing',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          {children}
        </div>
      </body>
    </html>
  );
}
```

#### Test Frontend
```bash
# Run frontend
npm run dev

# Open browser: http://localhost:3000
```

### Task 1.3: Database Schema Setup

#### Create PostgreSQL Tables
```sql
-- backend/migrations/001_initial_schema.sql

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- Policies table
CREATE TABLE policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_number VARCHAR(100) UNIQUE NOT NULL,
    policy_holder_name VARCHAR(255) NOT NULL,
    policy_type VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL,
    rules_version VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_policies_number ON policies(policy_number);

-- Policy rules table
CREATE TABLE policy_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR(50) UNIQUE NOT NULL,
    policy_type VARCHAR(100) NOT NULL,
    rules_json JSONB NOT NULL,
    approved_by UUID REFERENCES users(id),
    effective_from DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Claims table
CREATE TABLE claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_number VARCHAR(100) UNIQUE NOT NULL,
    policy_id UUID REFERENCES policies(id),
    claimant_name VARCHAR(255) NOT NULL,
    incident_date DATE NOT NULL,
    incident_type VARCHAR(100),
    incident_description TEXT,
    claimed_amount DECIMAL(12, 2) NOT NULL,
    approved_amount DECIMAL(12, 2),
    status VARCHAR(50) NOT NULL,
    decision VARCHAR(50),
    extraction_confidence FLOAT,
    fraud_score FLOAT,
    expected_loss DECIMAL(12, 2),
    decision_rationale TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_claims_number ON claims(claim_number);
CREATE INDEX idx_claims_policy ON claims(policy_id);
CREATE INDEX idx_claims_status ON claims(status);

-- Claim documents table
CREATE TABLE claim_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_claim_docs_claim ON claim_documents(claim_id);

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID REFERENCES claims(id),
    layer_1_output JSONB,
    layer_2_output JSONB,
    layer_3_output JSONB,
    layer_4_output JSONB,
    processing_time_ms INTEGER,
    model_versions JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_claim ON audit_logs(claim_id);

-- Feedback table
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID REFERENCES claims(id),
    reviewed_by UUID REFERENCES users(id),
    system_decision VARCHAR(50) NOT NULL,
    human_decision VARCHAR(50) NOT NULL,
    disagreement BOOLEAN GENERATED ALWAYS AS (system_decision != human_decision) STORED,
    feedback_notes TEXT,
    used_for_training BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_feedback_claim ON feedback(claim_id);
CREATE INDEX idx_feedback_disagreement ON feedback(disagreement) WHERE disagreement = TRUE;
```

#### Run Database Migration
```bash
# Connect to PostgreSQL and run migration
docker exec -i lexora-postgres psql -U admin -d lexora < backend/migrations/001_initial_schema.sql
```

#### Initialize Qdrant Collections
```python
# backend/scripts/init_qdrant.py

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

client = QdrantClient(host="localhost", port=6333)

# Create collections
collections = [
    {
        "name": "claim_images",
        "size": 512,  # Jina CLIP dimension
        "distance": Distance.COSINE
    },
    {
        "name": "claim_texts",
        "size": 1024,  # Cohere embed-english-v3.0
        "distance": Distance.COSINE
    }
]

for collection in collections:
    try:
        client.create_collection(
            collection_name=collection["name"],
            vectors_config=VectorParams(
                size=collection["size"],
                distance=collection["distance"]
            )
        )
        print(f"Created collection: {collection['name']}")
    except Exception as e:
        print(f"Collection {collection['name']} already exists or error: {e}")
```

```bash
# Run initialization
python backend/scripts/init_qdrant.py
```

#### Initialize Neo4j Constraints
```cypher
// Run in Neo4j Browser: http://localhost:7474

// Create constraints
CREATE CONSTRAINT claim_id IF NOT EXISTS FOR (c:Claim) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT person_id IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT provider_id IF NOT EXISTS FOR (p:Provider) REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT contact_value IF NOT EXISTS FOR (c:Contact) REQUIRE c.value IS UNIQUE;
CREATE CONSTRAINT financial_id IF NOT EXISTS FOR (f:Financial) REQUIRE f.identifier IS UNIQUE;

// Create indexes
CREATE INDEX claim_date IF NOT EXISTS FOR (c:Claim) ON (c.date);
CREATE INDEX person_name IF NOT EXISTS FOR (p:Person) ON (p.name);
```

---

## Phase 2: Layer 1 - Perception Engine

**Duration:** 4-6 hours  
**Goal:** Build n8n workflow and data extraction pipeline

### Task 2.1: n8n Workflow Setup

#### Access n8n
```bash
# n8n should be running at: http://localhost:5678
# Login: admin / changeme
```

#### Create Claim Processing Workflow

**Step 1: Create New Workflow**
1. Open n8n at http://localhost:5678
2. Click "New Workflow"
3. Name it "Claim Processing Pipeline"

**Step 2: Add Webhook Trigger**
1. Add node: "Webhook"
2. Configure:
   - HTTP Method: POST
   - Path: claim-upload
   - Response Mode: Last Node
3. Test URL will be: http://localhost:5678/webhook/claim-upload

**Step 3: Add File Router**
1. Add node: "Switch"
2. Connect from Webhook
3. Configure routes:
   ```
   Mode: Rules
   Route 1: {{ $json.body.file_type }} === 'pdf' → PDF Branch
   Route 2: {{ $json.body.file_type }} === 'image' → Image Branch
   Route 3: {{ $json.body.file_type }} === 'video' → Video Branch
   Route 4: {{ $json.body.file_type }} === 'audio' → Audio Branch
   ```

**Step 4: PDF Processing Branch**
```
Switch → Extract Text from PDF → HTTP Request (Gemma 3 Analysis)
```

1. **Extract Text from PDF Node:**
   - Node: "Execute Command"
   - Command: `pdftotext {{ $json.file_path }} -`
   - Or use: "PDF" node (built-in)

2. **Gemma 3 Analysis Node:**
   - Node: "HTTP Request"
   - Method: POST
   - URL: Google AI Studio Gemma endpoint
   - Body:
   ```json
   {
     "contents": [{
       "parts": [{
         "text": "Analyze this insurance claim text and extract: policy_number, claimant_name, incident_date, incident_description, claimed_amount, provider_name. Return as JSON.\n\nText: {{ $json.extracted_text }}"
       }]
     }]
   }
   ```

**Step 5: Image Processing Branch**
```
Switch → HTTP Request (Gemma 3 Image Analysis)
```

1. **Gemma 3 Image Analysis:**
   - Node: "HTTP Request"
   - Method: POST
   - URL: Gemma 3 API endpoint
   - Body: Send image + prompt for analysis

**Step 6: Video Processing Branch**
```
Switch → HTTP Request (Gemini 2.5 Flash Lite)
```

1. **Gemini Video Analysis:**
   - Node: "HTTP Request"
   - Method: POST
   - URL: https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent
   - Headers: `x-goog-api-key: {{ $env.GEMINI_API_KEY }}`
   - Body:
   ```json
   {
     "contents": [{
       "parts": [
         {"text": "Analyze this insurance claim video. Extract incident details, damage assessment, and generate a structured summary."},
         {"file_data": {"mime_type": "video/mp4", "file_uri": "{{ $json.file_uri }}"}}
       ]
     }]
   }
   ```

**Step 7: Audio Processing Branch**
```
Switch → Groq Whisper → Gemma 3 Analysis
```

1. **Groq Whisper Node:**
   - Node: "HTTP Request"
   - Method: POST
   - URL: https://api.groq.com/openai/v1/audio/transcriptions
   - Headers: `Authorization: Bearer {{ $env.GROQ_API_KEY }}`
   - Body: audio file + model: whisper-large-v3-turbo

2. **Gemma 3 Analysis:**
   - Same as PDF analysis but on transcribed text

**Step 8: Merge and Structure Output**
1. Add "Merge" node to combine all branches
2. Add "Set" node to structure final output:
```json
{
  "policy_number": "{{ $json.analysis.policy_number }}",
  "claimant_name": "{{ $json.analysis.claimant_name }}",
  "incident": {
    "date": "{{ $json.analysis.incident_date }}",
    "type": "{{ $json.analysis.incident_type }}",
    "description": "{{ $json.analysis.incident_description }}"
  },
  "financial": {
    "claimed_amount": "{{ $json.analysis.claimed_amount }}",
    "provider_name": "{{ $json.analysis.provider_name }}"
  },
  "confidence": "{{ $json.analysis.confidence }}",
  "source_file_type": "{{ $json.file_type }}"
}
```

**Step 9: Send to FastAPI**
1. Add final "HTTP Request" node
2. Method: POST
3. URL: http://host.docker.internal:8000/api/v1/claims/from-n8n
4. Body: Structured output from previous step

**Step 10: Save Workflow**
- Click Save
- Export workflow as JSON to `n8n/workflows/claim_processing.json`

### Task 2.2: Backend Layer 1 Integration

#### Create Pydantic Schemas
```python
# backend/app/models/schemas.py

from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import date, datetime
from enum import Enum

class IncidentType(str, Enum):
    ACCIDENT = "accident"
    ILLNESS = "illness"
    THEFT = "theft"
    DAMAGE = "damage"
    OTHER = "other"

class ClaimantInfo(BaseModel):
    name: str = Field(..., min_length=1)
    date_of_birth: Optional[date] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None

class IncidentInfo(BaseModel):
    date: date
    type: IncidentType
    location: Optional[str] = None
    description: str = Field(..., min_length=10)
    
    @validator('date')
    def date_not_future(cls, v):
        if v > date.today():
            raise ValueError('Incident date cannot be in the future')
        return v

class FinancialInfo(BaseModel):
    claimed_amount: float = Field(..., gt=0)
    provider_name: Optional[str] = None
    invoice_number: Optional[str] = None

class FieldConfidence(BaseModel):
    field_name: str
    value: any
    confidence: float = Field(..., ge=0.0, le=1.0)

class ExtractionMetadata(BaseModel):
    model_used: str
    extraction_timestamp: datetime
    overall_confidence: float = Field(..., ge=0.0, le=1.0)
    field_confidences: List[FieldConfidence]
    warnings: List[str] = []
    source_file_type: str

class ClaimExtraction(BaseModel):
    policy_number: str
    claimant: ClaimantInfo
    incident: IncidentInfo
    financial: FinancialInfo
    extraction_metadata: ExtractionMetadata
    
    @property
    def is_high_confidence(self) -> bool:
        return self.extraction_metadata.overall_confidence >= 0.85
    
    @property
    def needs_review(self) -> bool:
        return not self.is_high_confidence or len(self.extraction_metadata.warnings) > 0
```

#### Create Layer 1 API Endpoint
```python
# backend/app/api/routes.py

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.models.schemas import ClaimExtraction
from app.database import get_db
import uuid

router = APIRouter(prefix="/api/v1")

@router.post("/claims/from-n8n")
async def receive_from_n8n(
    data: dict,
    db: Session = Depends(get_db)
):
    """
    Receive processed claim data from n8n workflow
    """
    try:
        # Validate and structure data
        extraction = ClaimExtraction(**data)
        
        # Store in database
        claim_id = str(uuid.uuid4())
        
        # Insert into claims table
        # (Actual SQL implementation here)
        
        return {
            "claim_id": claim_id,
            "status": "received",
            "needs_review": extraction.needs_review
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
```

#### Add Routes to Main App
```python
# backend/app/main.py

from app.api.routes import router

app.include_router(router)
```

### Task 2.3: Test Layer 1

#### Test Workflow
```bash
# Upload test file via n8n webhook
curl -X POST http://localhost:5678/webhook/claim-upload \
  -H "Content-Type: application/json" \
  -d '{
    "file_type": "pdf",
    "file_path": "/path/to/test.pdf"
  }'
```

#### Verify Data Flow
1. Check n8n execution log
2. Verify FastAPI received data
3. Check PostgreSQL for claim record

---

## Phase 3: Layer 2 - Policy Engine

**Duration:** 3-4 hours  
**Goal:** Implement policy rules execution

### Task 3.1: Create Policy Models

```python
# backend/app/models/policy_models.py

from pydantic import BaseModel
from typing import Dict, List, Optional
from datetime import date
from enum import Enum

class PolicyDecision(str, Enum):
    APPROVED = "approved"
    REJECTED = "rejected"
    AMBIGUOUS = "ambiguous"

class CoverageCategory(BaseModel):
    covered: bool
    annual_limit: Optional[float] = None
    copay_percentage: float = 0
    waiting_period_days: int = 0
    exclusions: List[str] = []

class PolicyRules(BaseModel):
    version: str
    policy_type: str
    effective_from: date
    coverage_categories: Dict[str, CoverageCategory]
    validation_rules: List[str]

class PolicyDecisionOutput(BaseModel):
    decision: PolicyDecision
    benefit_amount: Optional[float] = None
    rejection_reason: Optional[str] = None
    rules_applied: List[str] = []
    calculation_trail: List[str] = []
    policy_version: str
```

### Task 3.2: Implement Policy Engine

```python
# backend/app/layers/layer2_policy/engine.py

from typing import Tuple
from datetime import date
from app.models.schemas import ClaimExtraction
from app.models.policy_models import (
    PolicyRules, PolicyDecisionOutput, 
    PolicyDecision, CoverageCategory
)

class PolicyEngine:
    """Layer 2: Policy Governance Engine"""
    
    def __init__(self, db):
        self.db = db
    
    async def evaluate_claim(
        self,
        claim: ClaimExtraction,
        policy_number: str,
        claim_date: date
    ) -> PolicyDecisionOutput:
        """Evaluate claim against policy rules"""
        
        # Load policy rules
        policy_rules = await self._load_policy_rules(policy_number, claim_date)
        
        output = PolicyDecisionOutput(
            decision=PolicyDecision.AMBIGUOUS,
            policy_version=policy_rules.version,
            rules_applied=[],
            calculation_trail=[]
        )
        
        # Step 1: Validation rules
        validation_passed, errors = self._run_validation(claim, policy_rules, output)
        if not validation_passed:
            output.decision = PolicyDecision.REJECTED
            output.rejection_reason = "; ".join(errors)
            return output
        
        # Step 2: Check coverage
        category_covered, reason = self._check_coverage(claim, policy_rules, output)
        if not category_covered:
            output.decision = PolicyDecision.REJECTED
            output.rejection_reason = reason
            return output
        
        # Step 3: Check exclusions
        is_excluded, exclusion_reason = self._check_exclusions(claim, policy_rules, output)
        if is_excluded:
            output.decision = PolicyDecision.REJECTED
            output.rejection_reason = exclusion_reason
            return output
        
        # Step 4: Calculate benefit
        benefit = self._calculate_benefit(claim, policy_rules, output)
        output.benefit_amount = benefit
        output.decision = PolicyDecision.APPROVED
        
        return output
    
    async def _load_policy_rules(self, policy_number: str, effective_date: date) -> PolicyRules:
        """Load policy rules from database"""
        # Query database for policy rules
        # For now, return mock data
        return PolicyRules(
            version="v1.0",
            policy_type="health",
            effective_from=date(2024, 1, 1),
            coverage_categories={
                "medical": CoverageCategory(
                    covered=True,
                    annual_limit=50000,
                    copay_percentage=20,
                    exclusions=["cosmetic"]
                )
            },
            validation_rules=[]
        )
    
    def _run_validation(
        self, 
        claim: ClaimExtraction, 
        policy: PolicyRules,
        output: PolicyDecisionOutput
    ) -> Tuple[bool, List[str]]:
        """Run validation rules"""
        errors = []
        
        # Claimed amount > 0
        if claim.financial.claimed_amount <= 0:
            errors.append("Claimed amount must be greater than zero")
        output.rules_applied.append("amount_validation")
        
        # Incident date not in future
        if claim.incident.date > date.today():
            errors.append("Incident date cannot be in the future")
        output.rules_applied.append("incident_date_check")
        
        return len(errors) == 0, errors
    
    def _check_coverage(
        self,
        claim: ClaimExtraction,
        policy: PolicyRules,
        output: PolicyDecisionOutput
    ) -> Tuple[bool, Optional[str]]:
        """Check if incident type is covered"""
        
        # Map incident type to category
        category_map = {
            "accident": "accident_coverage",
            "illness": "medical",
            "theft": "theft_coverage"
        }
        
        category = category_map.get(claim.incident.type.value)
        if not category or category not in policy.coverage_categories:
            return False, f"Incident type not covered"
        
        category_rules = policy.coverage_categories[category]
        if not category_rules.covered:
            return False, f"Category not covered"
        
        output.rules_applied.append(f"coverage_check:{category}")
        return True, None
    
    def _check_exclusions(
        self,
        claim: ClaimExtraction,
        policy: PolicyRules,
        output: PolicyDecisionOutput
    ) -> Tuple[bool, Optional[str]]:
        """Check exclusions"""
        
        category = "medical"  # Simplified
        category_rules = policy.coverage_categories.get(category)
        if not category_rules:
            return False, None
        
        description_lower = claim.incident.description.lower()
        for exclusion in category_rules.exclusions:
            if exclusion.lower() in description_lower:
                output.rules_applied.append(f"exclusion_check:{exclusion}")
                return True, f"Excluded: {exclusion}"
        
        output.rules_applied.append("exclusion_check:passed")
        return False, None
    
    def _calculate_benefit(
        self,
        claim: ClaimExtraction,
        policy: PolicyRules,
        output: PolicyDecisionOutput
    ) -> float:
        """Calculate benefit amount"""
        
        claimed_amount = claim.financial.claimed_amount
        category_rules = policy.coverage_categories["medical"]
        
        # Apply copay
        copay_percentage = category_rules.copay_percentage / 100
        amount_after_copay = claimed_amount * (1 - copay_percentage)
        
        output.calculation_trail.append(
            f"Applied {category_rules.copay_percentage}% copay: "
            f"${claimed_amount} × {1-copay_percentage} = ${amount_after_copay}"
        )
        
        # Apply annual limit
        if category_rules.annual_limit:
            benefit = min(amount_after_copay, category_rules.annual_limit)
            output.calculation_trail.append(
                f"Applied annual limit: min(${amount_after_copay}, ${category_rules.annual_limit})"
            )
        else:
            benefit = amount_after_copay
        
        benefit = round(benefit, 2)
        output.calculation_trail.append(f"Final benefit: ${benefit}")
        output.rules_applied.append("benefit_calculation")
        
        return benefit
```

### Task 3.3: Add Policy Endpoint

```python
# backend/app/api/routes.py

from app.layers.layer2_policy.engine import PolicyEngine

@router.post("/claims/{claim_id}/evaluate-policy")
async def evaluate_policy(
    claim_id: str,
    db: Session = Depends(get_db)
):
    """Evaluate claim against policy rules"""
    
    # Load claim from database
    # claim = ...
    
    policy_engine = PolicyEngine(db)
    result = await policy_engine.evaluate_claim(
        claim=claim,
        policy_number=claim.policy_number,
        claim_date=claim.incident.date
    )
    
    return result
```

### Task 3.4: Test Policy Engine

```python
# backend/tests/test_policy_engine.py

import pytest
from app.layers.layer2_policy.engine import PolicyEngine

@pytest.mark.asyncio
async def test_policy_evaluation():
    # Create test claim
    # Run evaluation
    # Assert results
    pass
```

---

## Phase 4: Layer 3 - Fraud Detection

**Duration:** 6-8 hours  
**Goal:** Implement three-tier fraud detection

### Task 4.1: Create Fraud Models

```python
# backend/app/models/fraud_models.py

from pydantic import BaseModel, Field
from typing import List, Dict
from enum import Enum

class FraudFlag(BaseModel):
    flag_type: str
    severity: str  # 'high', 'medium', 'low'
    description: str
    evidence: Dict

class Tier1Output(BaseModel):
    passed: bool
    flags: List[FraudFlag] = []
    score: float = Field(..., ge=0.0, le=1.0)

class Tier2Output(BaseModel):
    duplicates_found: List[Dict] = []
    max_image_similarity: float = 0.0
    max_text_similarity: float = 0.0
    score: float = Field(..., ge=0.0, le=1.0)

class Tier3Output(BaseModel):
    network_size: int = 0
    risk_signals: List[Dict] = []
    graph_patterns: List[str] = []
    score: float = Field(..., ge=0.0, le=1.0)

class FraudAnalysisOutput(BaseModel):
    tier1: Tier1Output
    tier2: Tier2Output
    tier3: Tier3Output
    combined_score: float = Field(..., ge=0.0, le=1.0)
    risk_level: str  # 'low', 'medium', 'high'
    recommendation: str
```

### Task 4.2: Implement Tier 1 (Rule-Based)

```python
# backend/app/layers/layer3_fraud/tier1_rules.py

from datetime import timedelta
from app.models.fraud_models import Tier1Output, FraudFlag

class Tier1Engine:
    """Tier 1: Rule-based fraud detection"""
    
    def __init__(self, db):
        self.db = db
    
    async def analyze(self, claim, policy_id: str) -> Tier1Output:
        """Run all Tier 1 checks"""
        
        flags = []
        
        # Check 1: Duplicate invoice
        if claim.financial.invoice_number:
            dup_flag = await self._check_duplicate_invoice(
                claim.financial.invoice_number
            )
            if dup_flag:
                flags.append(dup_flag)
        
        # Check 2: Velocity anomaly
        velocity_flag = await self._check_velocity(
            claim.claimant.name,
            claim.incident.date
        )
        if velocity_flag:
            flags.append(velocity_flag)
        
        # Check 3: Amount anomaly
        amount_flag = await self._check_amount_anomaly(
            claim.financial.claimed_amount,
            claim.incident.type.value
        )
        if amount_flag:
            flags.append(amount_flag)
        
        # Calculate score
        score = self._calculate_score(flags)
        
        return Tier1Output(
            passed=len(flags) == 0,
            flags=flags,
            score=score
        )
    
    async def _check_duplicate_invoice(self, invoice_number: str):
        """Check for duplicate invoice"""
        # Query database
        # If exists, return flag
        return None
    
    async def _check_velocity(self, claimant_id: str, claim_date):
        """Check velocity"""
        # Query recent claims
        # If >5 in 7 days, return flag
        return None
    
    async def _check_amount_anomaly(self, amount: float, incident_type: str):
        """Check if amount is statistical outlier"""
        # Get statistics
        # If > mean + 3*stddev, return flag
        return None
    
    def _calculate_score(self, flags: List[FraudFlag]) -> float:
        """Calculate fraud score from flags"""
        if not flags:
            return 0.0
        
        severity_weights = {'high': 0.8, 'medium': 0.5, 'low': 0.2}
        total = sum(severity_weights.get(f.severity, 0.5) for f in flags)
        max_possible = len(flags) * 0.8
        
        return min(total / max_possible, 1.0) if max_possible > 0 else 0.0
```

### Task 4.3: Implement Tier 2 (Vector Similarity)

```python
# backend/app/layers/layer3_fraud/tier2_vectors.py

from typing import List, Dict
import cohere
import requests
from app.models.fraud_models import Tier2Output
from app.config import settings
from app.database import qdrant_client

class Tier2Engine:
    """Tier 2: Vector similarity detection"""
    
    def __init__(self):
        self.cohere_client = cohere.Client(settings.COHERE_API_KEY)
        self.jina_api_key = settings.JINA_API_KEY
    
    async def analyze(self, claim, claim_images: List[bytes]) -> Tier2Output:
        """Analyze for vector similarity"""
        
        duplicates = []
        max_image_sim = 0.0
        max_text_sim = 0.0
        
        # Check image similarity
        if claim_images:
            image_results = await self._check_image_similarity(claim_images)
            duplicates.extend(image_results)
            if image_results:
                max_image_sim = max(r['similarity'] for r in image_results)
        
        # Check text similarity
        text_results = await self._check_text_similarity(
            claim.incident.description
        )
        duplicates.extend(text_results)
        if text_results:
            max_text_sim = max(r['similarity'] for r in text_results)
        
        # Calculate score
        score = self._calculate_score(max_image_sim, max_text_sim)
        
        # Store embeddings
        await self._store_embeddings(claim, claim_images)
        
        return Tier2Output(
            duplicates_found=duplicates,
            max_image_similarity=max_image_sim,
            max_text_similarity=max_text_sim,
            score=score
        )
    
    async def _check_image_similarity(self, images: List[bytes]) -> List[Dict]:
        """Check image similarity using Jina AI"""
        
        results = []
        
        for image_bytes in images:
            # Generate embedding via Jina API
            embedding = await self._generate_jina_embedding(image_bytes)
            
            # Search in Qdrant
            search_results = qdrant_client.search(
                collection_name="claim_images",
                query_vector=embedding,
                limit=5,
                score_threshold=0.90
            )
            
            for hit in search_results:
                if hit.score > 0.95:
                    results.append({
                        'type': 'image',
                        'similarity': hit.score,
                        'original_claim_id': hit.payload['claim_id']
                    })
        
        return results
    
    async def _check_text_similarity(self, description: str) -> List[Dict]:
        """Check text similarity using Cohere"""
        
        # Generate embedding
        embedding = await self._generate_cohere_embedding(description)
        
        # Search in Qdrant
        search_results = qdrant_client.search(
            collection_name="claim_texts",
            query_vector=embedding,
            limit=5,
            score_threshold=0.85
        )
        
        results = []
        for hit in search_results:
            if hit.score > 0.90:
                results.append({
                    'type': 'text',
                    'similarity': hit.score,
                    'original_claim_id': hit.payload['claim_id']
                })
        
        return results
    
    async def _generate_jina_embedding(self, image_bytes: bytes) -> List[float]:
        """Generate image embedding via Jina AI"""
        
        import base64
        image_b64 = base64.b64encode(image_bytes).decode()
        
        response = requests.post(
            'https://api.jina.ai/v1/embeddings',
            headers={
                'Authorization': f'Bearer {self.jina_api_key}',
                'Content-Type': 'application/json'
            },
            json={
                'input': [{'image': image_b64}],
                'model': 'jina-clip-v1'
            }
        )
        
        return response.json()['data'][0]['embedding']
    
    async def _generate_cohere_embedding(self, text: str) -> List[float]:
        """Generate text embedding via Cohere"""
        
        response = self.cohere_client.embed(
            texts=[text],
            model='embed-english-v3.0',
            input_type='search_query'
        )
        
        return response.embeddings[0]
    
    async def _store_embeddings(self, claim, images: List[bytes]):
        """Store embeddings for future comparisons"""
        
        from qdrant_client.models import PointStruct
        
        claim_id = claim.policy_number  # Temp ID
        
        # Store image embeddings
        for idx, image_bytes in enumerate(images):
            embedding = await self._generate_jina_embedding(image_bytes)
            
            qdrant_client.upsert(
                collection_name="claim_images",
                points=[
                    PointStruct(
                        id=hash(f"{claim_id}_{idx}") % (10 ** 8),
                        vector=embedding,
                        payload={"claim_id": claim_id}
                    )
                ]
            )
        
        # Store text embedding
        text_embedding = await self._generate_cohere_embedding(
            claim.incident.description
        )
        
        qdrant_client.upsert(
            collection_name="claim_texts",
            points=[
                PointStruct(
                    id=hash(claim_id) % (10 ** 8),
                    vector=text_embedding,
                    payload={"claim_id": claim_id}
                )
            ]
        )
    
    def _calculate_score(self, max_image_sim: float, max_text_sim: float) -> float:
        """Calculate tier 2 score"""
        return (0.6 * max_image_sim) + (0.4 * max_text_sim)
```

### Task 4.4: Implement Tier 3 (Graph Analytics)

```python
# backend/app/layers/layer3_fraud/tier3_graph.py

from app.models.fraud_models import Tier3Output
from app.database import neo4j_driver

class Tier3Engine:
    """Tier 3: Graph-based network fraud detection"""
    
    def __init__(self):
        self.driver = neo4j_driver
    
    async def analyze(self, claim) -> Tier3Output:
        """Analyze for network fraud patterns"""
        
        # Add claim to graph
        await self._add_to_graph(claim)
        
        # Run detection queries
        risk_signals = []
        
        # Query 1: Provider velocity
        provider_risk = await self._check_provider_velocity(
            claim.financial.provider_name
        )
        if provider_risk:
            risk_signals.append(provider_risk)
        
        # Query 2: Shared contacts
        contact_risk = await self._check_shared_contacts(
            claim.claimant.contact_phone
        )
        if contact_risk:
            risk_signals.append(contact_risk)
        
        # Get network size
        network_size = await self._get_network_size(claim.claimant.name)
        
        # Calculate score
        score = self._calculate_score(risk_signals, network_size)
        
        patterns = [s['pattern'] for s in risk_signals]
        
        return Tier3Output(
            network_size=network_size,
            risk_signals=risk_signals,
            graph_patterns=patterns,
            score=score
        )
    
    async def _add_to_graph(self, claim):
        """Add claim to Neo4j graph"""
        
        with self.driver.session() as session:
            query = """
            MERGE (claim:Claim {id: $claim_id})
            SET claim.amount = $amount,
                claim.date = date($date)
            
            MERGE (person:Person {name: $person_name})
            MERGE (person)-[:FILED]->(claim)
            
            WITH claim
            FOREACH (provider IN CASE WHEN $provider_name IS NOT NULL 
                    THEN [$provider_name] ELSE [] END |
                MERGE (p:Provider {name: provider})
                MERGE (claim)-[:TREATED_BY]->(p)
            )
            
            WITH claim
            FOREACH (phone IN CASE WHEN $phone IS NOT NULL 
                    THEN [$phone] ELSE [] END |
                MERGE (c:Contact {value: phone, type: 'phone'})
                MERGE (person)-[:HAS_CONTACT]->(c)
            )
            """
            
            session.run(
                query,
                claim_id=claim.policy_number,
                amount=float(claim.financial.claimed_amount),
                date=str(claim.incident.date),
                person_name=claim.claimant.name,
                provider_name=claim.financial.provider_name,
                phone=claim.claimant.contact_phone
            )
    
    async def _check_provider_velocity(self, provider_name: str):
        """Check for high-velocity provider"""
        
        if not provider_name:
            return None
        
        with self.driver.session() as session:
            query = """
            MATCH (provider:Provider {name: $provider_name})<-[:TREATED_BY]-(claim:Claim)
            WHERE claim.date > date() - duration('P7D')
            RETURN count(claim) as claim_count
            """
            
            result = session.run(query, provider_name=provider_name)
            record = result.single()
            
            if record and record['claim_count'] > 10:
                return {
                    'pattern': 'high_velocity_provider',
                    'severity': 'high',
                    'description': f"Provider linked to {record['claim_count']} claims in 7 days",
                    'risk_score': 0.8
                }
        
        return None
    
    async def _check_shared_contacts(self, phone: str):
        """Check for shared contacts"""
        
        if not phone:
            return None
        
        with self.driver.session() as session:
            query = """
            MATCH (person:Person)-[:HAS_CONTACT]->(contact:Contact {value: $phone})
            RETURN count(DISTINCT person) as person_count
            """
            
            result = session.run(query, phone=phone)
            record = result.single()
            
            if record and record['person_count'] > 3:
                return {
                    'pattern': 'shared_contact',
                    'severity': 'medium',
                    'description': f"Phone shared by {record['person_count']} claimants",
                    'risk_score': 0.7
                }
        
        return None
    
    async def _get_network_size(self, person_name: str) -> int:
        """Get network size"""
        
        with self.driver.session() as session:
            query = """
            MATCH (person:Person {name: $person_name})-[:HAS_CONTACT|FILED*1..2]-(connected)
            RETURN count(DISTINCT connected) as network_size
            """
            
            result = session.run(query, person_name=person_name)
            record = result.single()
            
            return record['network_size'] if record else 0
    
    def _calculate_score(self, risk_signals: List[Dict], network_size: int) -> float:
        """Calculate tier 3 score"""
        
        if not risk_signals:
            return 0.3 if network_size > 10 else 0.0
        
        total_risk = sum(s['risk_score'] for s in risk_signals)
        score = min(total_risk / len(risk_signals), 1.0)
        
        if network_size > 10:
            score = min(score * 1.2, 1.0)
        
        return score
```

### Task 4.5: Implement Fusion Engine

```python
# backend/app/layers/layer3_fraud/fusion.py

from app.models.fraud_models import FraudAnalysisOutput

class FusionEngine:
    """Combine fraud signals from all tiers"""
    
    def fuse(self, tier1, tier2, tier3) -> FraudAnalysisOutput:
        """Fuse all tier scores"""
        
        # Weighted combination
        combined_score = (
            0.3 * tier1.score +
            0.3 * tier2.score +
            0.4 * tier3.score
        )
        
        # Determine risk level
        if combined_score < 0.3:
            risk_level = "low"
            recommendation = "proceed"
        elif combined_score < 0.7:
            risk_level = "medium"
            recommendation = "review"
        else:
            risk_level = "high"
            recommendation = "investigate"
        
        return FraudAnalysisOutput(
            tier1=tier1,
            tier2=tier2,
            tier3=tier3,
            combined_score=combined_score,
            risk_level=risk_level,
            recommendation=recommendation
        )
```

### Task 4.6: Main Fraud Engine

```python
# backend/app/layers/layer3_fraud/engine.py

from app.layers.layer3_fraud.tier1_rules import Tier1Engine
from app.layers.layer3_fraud.tier2_vectors import Tier2Engine
from app.layers.layer3_fraud.tier3_graph import Tier3Engine
from app.layers.layer3_fraud.fusion import FusionEngine

class FraudEngine:
    """Complete fraud detection pipeline"""
    
    def __init__(self, db):
        self.tier1 = Tier1Engine(db)
        self.tier2 = Tier2Engine()
        self.tier3 = Tier3Engine()
        self.fusion = FusionEngine()
    
    async def analyze(self, claim, claim_images, policy_id):
        """Run complete fraud analysis"""
        
        import asyncio
        
        # Run all tiers in parallel
        tier1_result, tier2_result, tier3_result = await asyncio.gather(
            self.tier1.analyze(claim, policy_id),
            self.tier2.analyze(claim, claim_images),
            self.tier3.analyze(claim)
        )
        
        # Fuse results
        final_analysis = self.fusion.fuse(tier1_result, tier2_result, tier3_result)
        
        return final_analysis
```

---

## Phase 5: Layer 4 - Decision Engine

**Duration:** 2-3 hours  
**Goal:** Implement economic decision routing

### Task 5.1: Create Decision Models

```python
# backend/app/models/decision_models.py

from pydantic import BaseModel
from typing import List, Optional
from enum import Enum

class DecisionType(str, Enum):
    AUTO_APPROVE = "auto_approve"
    AUTO_REJECT = "auto_reject"
    MANUAL_REVIEW = "manual_review"
    FRAUD_INVESTIGATION = "fraud_investigation"

class DecisionOutput(BaseModel):
    decision: DecisionType
    expected_loss: float
    investigation_cost: float = 150.0
    benefit_amount: Optional[float] = None
    rationale: str
    confidence_level: str
    next_steps: List[str] = []
```

### Task 5.2: Implement Decision Engine

```python
# backend/app/layers/layer4_decision/engine.py

from app.models.decision_models import DecisionOutput, DecisionType

class DecisionEngine:
    """Layer 4: Economic decision routing"""
    
    INVESTIGATION_COST = 150.0
    
    async def make_decision(self, extraction, policy_decision, fraud_analysis):
        """Make final routing decision"""
        
        # Step 1: Check data quality
        if extraction.extraction_metadata.overall_confidence < 0.85:
            return DecisionOutput(
                decision=DecisionType.MANUAL_REVIEW,
                expected_loss=0.0,
                rationale="Low extraction confidence",
                confidence_level="low",
                next_steps=["Human verification required"]
            )
        
        # Step 2: Check policy
        if policy_decision.decision == "rejected":
            return DecisionOutput(
                decision=DecisionType.AUTO_REJECT,
                expected_loss=0.0,
                rationale=f"Policy violation: {policy_decision.rejection_reason}",
                confidence_level="high",
                next_steps=["Send rejection notice"]
            )
        
        # Step 3: Check fraud
        fraud_score = fraud_analysis.combined_score
        
        if fraud_score > 0.7:
            expected_loss = fraud_score * extraction.financial.claimed_amount
            return DecisionOutput(
                decision=DecisionType.FRAUD_INVESTIGATION,
                expected_loss=expected_loss,
                rationale=f"High fraud score ({fraud_score:.2f})",
                confidence_level="high",
                next_steps=["Escalate to SIU"]
            )
        
        # Step 4: Economic decision
        expected_loss = fraud_score * extraction.financial.claimed_amount
        
        if expected_loss > self.INVESTIGATION_COST:
            return DecisionOutput(
                decision=DecisionType.MANUAL_REVIEW,
                expected_loss=expected_loss,
                benefit_amount=policy_decision.benefit_amount,
                rationale=f"Expected loss (${expected_loss:.2f}) exceeds investigation cost",
                confidence_level="medium",
                next_steps=["Underwriter review"]
            )
        
        # Step 5: Low risk - auto-approve
        if fraud_score < 0.2 and extraction.extraction_metadata.overall_confidence > 0.9:
            return DecisionOutput(
                decision=DecisionType.AUTO_APPROVE,
                expected_loss=expected_loss,
                benefit_amount=policy_decision.benefit_amount,
                rationale=f"Low fraud risk, high confidence",
                confidence_level="high",
                next_steps=["Process payment"]
            )
        
        # Default: manual review
        return DecisionOutput(
            decision=DecisionType.MANUAL_REVIEW,
            expected_loss=expected_loss,
            benefit_amount=policy_decision.benefit_amount,
            rationale="Moderate confidence or fraud indicators",
            confidence_level="medium",
            next_steps=["Manual review recommended"]
        )
```

---

## Phase 6: Layer 5 - Audit & Learning

**Duration:** 2-3 hours  
**Goal:** Implement audit logging and feedback collection

### Task 6.1: Create Audit Logger

```python
# backend/app/layers/layer5_audit/logger.py

from sqlalchemy.orm import Session
from datetime import datetime
import json

class AuditLogger:
    """Layer 5: Complete audit trail logging"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def log_claim_processing(
        self,
        claim_id: str,
        extraction,
        policy_decision,
        fraud_analysis,
        final_decision,
        processing_time_ms: int
    ):
        """Log complete processing trail"""
        
        audit_record = {
            'claim_id': claim_id,
            'layer_1_output': {
                'confidence': extraction.extraction_metadata.overall_confidence,
                'warnings': extraction.extraction_metadata.warnings,
                'model': extraction.extraction_metadata.model_used
            },
            'layer_2_output': {
                'policy_version': policy_decision.policy_version,
                'decision': policy_decision.decision.value,
                'benefit_amount': policy_decision.benefit_amount,
                'rules_applied': policy_decision.rules_applied
            },
            'layer_3_output': {
                'tier1_score': fraud_analysis.tier1.score,
                'tier2_score': fraud_analysis.tier2.score,
                'tier3_score': fraud_analysis.tier3.score,
                'combined_score': fraud_analysis.combined_score,
                'risk_level': fraud_analysis.risk_level
            },
            'layer_4_output': {
                'decision': final_decision.decision.value,
                'expected_loss': final_decision.expected_loss,
                'rationale': final_decision.rationale
            },
            'processing_time_ms': processing_time_ms,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Insert into audit_logs table
        # SQL: INSERT INTO audit_logs ...
        
        print(f"Audit log created for claim {claim_id}")
```

### Task 6.2: Create Feedback Collector

```python
# backend/app/layers/layer5_audit/feedback.py

class FeedbackCollector:
    """Collect underwriter feedback for active learning"""
    
    def __init__(self, db):
        self.db = db
    
    async def record_feedback(
        self,
        claim_id: str,
        reviewed_by_user_id: str,
        system_decision: str,
        human_decision: str,
        feedback_notes: str = None
    ):
        """Record human review feedback"""
        
        feedback_record = {
            'claim_id': claim_id,
            'reviewed_by': reviewed_by_user_id,
            'system_decision': system_decision,
            'human_decision': human_decision,
            'disagreement': system_decision != human_decision,
            'feedback_notes': feedback_notes
        }
        
        # Insert into feedback table
        # SQL: INSERT INTO feedback ...
        
        print(f"Feedback recorded for claim {claim_id}")
```

### Task 6.3: Create Retraining Script

```python
# backend/scripts/retrain_model.py

from sklearn.linear_model import LogisticRegression
import pandas as pd
from app.database import SessionLocal

def retrain_fraud_model():
    """Retrain fraud fusion weights"""
    
    db = SessionLocal()
    
    # Load feedback data
    # SQL: SELECT * FROM feedback WHERE disagreement = TRUE
    feedback_data = []  # Load from DB
    
    if len(feedback_data) < 100:
        print("Not enough feedback data for retraining")
        return
    
    # Prepare training data
    df = pd.DataFrame(feedback_data)
    X = df[['tier1_score', 'tier2_score', 'tier3_score']]
    y = df['human_decision_binary']  # 0 = approve, 1 = reject
    
    # Train model
    model = LogisticRegression()
    model.fit(X, y)
    
    # Extract new weights
    new_weights = model.coef_[0]
    
    # Save to config
    print(f"New weights: {new_weights}")
    print("Retraining complete!")
    
    db.close()

if __name__ == "__main__":
    retrain_fraud_model()
```

---

## Phase 7: Frontend Implementation

**Duration:** 8-10 hours  
**Goal:** Build complete Next.js frontend

### Task 7.1: Create Type Definitions

```typescript
// frontend/src/types/index.ts

export interface Claim {
  id: string;
  claim_number: string;
  claimant_name: string;
  policy_number: string;
  incident_date: string;
  claimed_amount: number;
  approved_amount?: number;
  status: 'submitted' | 'processing' | 'approved' | 'rejected' | 'under_review';
  decision?: 'auto_approve' | 'auto_reject' | 'manual_review' | 'fraud_investigation';
  fraud_score?: number;
  confidence?: number;
  created_at: string;
}

export interface ClaimDecision {
  decision: string;
  expected_loss: number;
  benefit_amount?: number;
  rationale: string;
  confidence_level: string;
  next_steps: string[];
}

export interface FraudAnalysis {
  tier1_score: number;
  tier2_score: number;
  tier3_score: number;
  combined_score: number;
  risk_level: string;
}
```

### Task 7.2: Create Upload Component

```typescript
// frontend/src/components/ClaimUpload.tsx

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, Image, Video, Music } from 'lucide-react';
import { claimsApi } from '@/lib/api';

export default function ClaimUpload() {
  const [files, setFiles] = useState<File[]>([]);
  const [policyNumber, setPolicyNumber] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      alert('Please upload at least one file');
      return;
    }

    setProcessing(true);
    try {
      const decision = await claimsApi.submitClaim({
        files,
        policyNumber: policyNumber || undefined
      });
      setResult(decision);
    } catch (error) {
      console.error('Error processing claim:', error);
      alert('Error processing claim');
    } finally {
      setProcessing(false);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="w-4 h-4" />;
    if (type.includes('image')) return <Image className="w-4 h-4" />;
    if (type.includes('video')) return <Video className="w-4 h-4" />;
    if (type.includes('audio')) return <Music className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Submit Insurance Claim</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="policy-number">Policy Number (Optional)</Label>
            <Input
              id="policy-number"
              placeholder="P-2024-001"
              value={policyNumber}
              onChange={(e) => setPolicyNumber(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="file-upload">Upload Documents</Label>
            <Input
              id="file-upload"
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.mp4,.mp3,.wav"
              onChange={handleFileChange}
            />
            <p className="text-sm text-gray-500 mt-1">
              Supported: PDF, Images, Videos, Audio
            </p>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Files:</Label>
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  {getFileIcon(file.type)}
                  <span>{file.name}</span>
                  <span className="text-gray-500">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              ))}
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={processing || files.length === 0}
            className="w-full"
          >
            {processing ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Processing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Submit Claim
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Decision</Label>
              <div className={`text-lg font-semibold ${
                result.decision === 'auto_approve' ? 'text-green-600' :
                result.decision === 'auto_reject' ? 'text-red-600' :
                result.decision === 'fraud_investigation' ? 'text-red-700' :
                'text-yellow-600'
              }`}>
                {result.decision.replace('_', ' ').toUpperCase()}
              </div>
            </div>

            <div>
              <Label>Rationale</Label>
              <p className="text-sm">{result.rationale}</p>
            </div>

            {result.benefit_amount && (
              <div>
                <Label>Benefit Amount</Label>
                <p className="text-xl font-bold">${result.benefit_amount.toFixed(2)}</p>
              </div>
            )}

            <div>
              <Label>Next Steps</Label>
              <ul className="list-disc list-inside text-sm space-y-1">
                {result.next_steps.map((step: string, idx: number) => (
                  <li key={idx}>{step}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

### Task 7.3: Create Dashboard Component

```typescript
// frontend/src/components/ClaimDashboard.tsx

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { claimsApi } from '@/lib/api';
import { Claim } from '@/types';

export default function ClaimDashboard() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClaims();
  }, []);

  const loadClaims = async () => {
    try {
      const data = await claimsApi.getAllClaims();
      setClaims(data);
    } catch (error) {
      console.error('Error loading claims:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'approved': 'bg-green-500',
      'rejected': 'bg-red-500',
      'processing': 'bg-blue-500',
      'under_review': 'bg-yellow-500',
      'submitted': 'bg-gray-500',
    };
    return <Badge className={colors[status] || 'bg-gray-500'}>{status}</Badge>;
  };

  if (loading) {
    return <div className="text-center py-8">Loading claims...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Claims</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Claim #</TableHead>
              <TableHead>Claimant</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fraud Score</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {claims.map((claim) => (
              <TableRow key={claim.id}>
                <TableCell className="font-medium">{claim.claim_number}</TableCell>
                <TableCell>{claim.claimant_name}</TableCell>
                <TableCell>${claim.claimed_amount.toLocaleString()}</TableCell>
                <TableCell>{getStatusBadge(claim.status)}</TableCell>
                <TableCell>
                  {claim.fraud_score !== undefined ? (
                    <span className={
                      claim.fraud_score > 0.7 ? 'text-red-600' :
                      claim.fraud_score > 0.3 ? 'text-yellow-600' :
                      'text-green-600'
                    }>
                      {(claim.fraud_score * 100).toFixed(0)}%
                    </span>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  {new Date(claim.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
```

### Task 7.4: Create Main Page

```typescript
// frontend/src/app/page.tsx

import ClaimUpload from '@/components/ClaimUpload';
import ClaimDashboard from '@/components/ClaimDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Home() {
  return (
    <main className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Lexora</h1>
        <p className="text-gray-600">AI-Powered Claims Intelligence Platform</p>
      </div>

      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upload">Submit Claim</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <ClaimUpload />
        </TabsContent>

        <TabsContent value="dashboard">
          <ClaimDashboard />
        </TabsContent>
      </Tabs>
    </main>
  );
}
```

### Task 7.5: Create Fraud Network Visualization

```typescript
// frontend/src/components/FraudNetwork.tsx

'use client';

import { useEffect, useState } from 'react';
import ReactFlow, { Node, Edge } from 'react-flow-renderer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function FraudNetwork({ claimId }: { claimId: string }) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  useEffect(() => {
    // Fetch fraud network data from API
    // Transform into React Flow format
    
    // Example mock data
    setNodes([
      { id: '1', data: { label: 'Claim #1234' }, position: { x: 250, y: 0 } },
      { id: '2', data: { label: 'Provider A' }, position: { x: 100, y: 100 } },
      { id: '3', data: { label: 'Claimant B' }, position: { x: 400, y: 100 } },
    ]);

    setEdges([
      { id: 'e1-2', source: '1', target: '2', label: 'treated_by' },
      { id: 'e1-3', source: '1', target: '3', label: 'filed_by' },
    ]);
  }, [claimId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fraud Network Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: 400 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
          />
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Phase 8: Integration & Testing

**Duration:** 4-6 hours  
**Goal:** Connect all components and test end-to-end

### Task 8.1: Complete Backend Integration

```python
# backend/app/api/routes.py - Complete implementation

from fastapi import APIRouter, UploadFile, File, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
import time
import uuid

from app.database import get_db
from app.models.schemas import ClaimExtraction
from app.layers.layer2_policy.engine import PolicyEngine
from app.layers.layer3_fraud.engine import FraudEngine
from app.layers.layer4_decision.engine import DecisionEngine
from app.layers.layer5_audit.logger import AuditLogger

router = APIRouter(prefix="/api/v1")

@router.post("/claims/process")
async def process_claim(
    files: List[UploadFile] = File(...),
    policy_number: str = None,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db)
):
    """
    Complete claim processing pipeline
    Orchestrates all 5 layers
    """
    
    start_time = time.time()
    claim_id = str(uuid.uuid4())
    
    try:
        # Step 1: Send files to n8n for Layer 1 processing
        # (In real implementation, upload to n8n webhook)
        # For now, mock the extraction result
        
        extraction = ClaimExtraction(
            policy_number=policy_number or "MOCK-001",
            claimant={"name": "Test User"},
            incident={
                "date": "2024-02-01",
                "type": "accident",
                "description": "Test incident"
            },
            financial={"claimed_amount": 1500.0},
            extraction_metadata={
                "model_used": "gemma-3",
                "extraction_timestamp": "2024-02-01T12:00:00",
                "overall_confidence": 0.92,
                "field_confidences": [],
                "warnings": [],
                "source_file_type": "pdf"
            }
        )
        
        # Step 2: Layer 2 - Policy evaluation
        policy_engine = PolicyEngine(db)
        policy_decision = await policy_engine.evaluate_claim(
            claim=extraction,
            policy_number=extraction.policy_number,
            claim_date=extraction.incident.date
        )
        
        # Step 3: Layer 3 - Fraud detection
        fraud_engine = FraudEngine(db)
        fraud_analysis = await fraud_engine.analyze(
            claim=extraction,
            claim_images=[],  # Extract from files
            policy_id=extraction.policy_number
        )
        
        # Step 4: Layer 4 - Final decision
        decision_engine = DecisionEngine()
        final_decision = await decision_engine.make_decision(
            extraction=extraction,
            policy_decision=policy_decision,
            fraud_analysis=fraud_analysis
        )
        
        # Step 5: Layer 5 - Audit logging (background)
        processing_time = int((time.time() - start_time) * 1000)
        
        background_tasks.add_task(
            log_audit_trail,
            claim_id,
            extraction,
            policy_decision,
            fraud_analysis,
            final_decision,
            processing_time
        )
        
        return final_decision
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def log_audit_trail(claim_id, extraction, policy_decision, fraud_analysis, final_decision, processing_time):
    """Background task for audit logging"""
    db = SessionLocal()
    audit_logger = AuditLogger(db)
    await audit_logger.log_claim_processing(
        claim_id=claim_id,
        extraction=extraction,
        policy_decision=policy_decision,
        fraud_analysis=fraud_analysis,
        final_decision=final_decision,
        processing_time_ms=processing_time
    )
    db.close()
```

### Task 8.2: Create Test Data

```python
# backend/scripts/seed_test_data.py

from app.database import SessionLocal
import uuid

def seed_test_data():
    """Seed database with test data"""
    
    db = SessionLocal()
    
    # Create test policies
    test_policies = [
        {
            'id': str(uuid.uuid4()),
            'policy_number': 'P-2024-001',
            'policy_holder_name': 'John Doe',
            'policy_type': 'health',
            'start_date': '2024-01-01',
            'end_date': '2024-12-31',
            'status': 'active',
            'rules_version': 'v1.0'
        }
    ]
    
    # Insert policies
    # SQL: INSERT INTO policies ...
    
    # Create test claims
    test_claims = [
        {
            'id': str(uuid.uuid4()),
            'claim_number': 'CLM-001',
            'claimant_name': 'Alice Smith',
            'incident_date': '2024-02-01',
            'claimed_amount': 1500.00,
            'status': 'approved',
            'fraud_score': 0.05
        },
        {
            'id': str(uuid.uuid4()),
            'claim_number': 'CLM-002',
            'claimant_name': 'Bob Johnson',
            'incident_date': '2024-02-02',
            'claimed_amount': 3200.00,
            'status': 'under_review',
            'fraud_score': 0.45
        }
    ]
    
    # Insert claims
    # SQL: INSERT INTO claims ...
    
    print("Test data seeded successfully")
    db.close()

if __name__ == "__main__":
    seed_test_data()
```

### Task 8.3: End-to-End Testing

```bash
# Run end-to-end test

# 1. Start all services
docker-compose up -d

# 2. Start backend
cd backend
python -m app.main

# 3. Start frontend (new terminal)
cd frontend
npm run dev

# 4. Test workflow:
# - Upload a test PDF through frontend
# - Verify n8n processes it
# - Check PostgreSQL for claim record
# - Verify Qdrant has embeddings
# - Check Neo4j for graph nodes
# - Verify final decision appears in UI
```

---

## Phase 9: Demo Preparation

**Duration:** 2-3 hours  
**Goal:** Polish UI and prepare demonstration

### Task 9.1: Create Demo Script

```markdown
# Demo Script

## Introduction (30 seconds)
"Lexora is an AI-powered insurance claims platform that processes claims 
in seconds while detecting fraud and maintaining full explainability."

## Live Demo (3 minutes)

### 1. Submit Claim (30 seconds)
- Show multi-file upload (PDF + Image)
- Enter policy number
- Click submit

### 2. Processing Visualization (1 minute)
- Show Layer 1: Document extraction
- Show Layer 2: Policy evaluation
- Show Layer 3: Fraud detection (3 tiers)
- Show Layer 4: Decision routing

### 3. Results (30 seconds)
- Display decision (Auto-Approve / Review / Investigate)
- Show fraud score
- Show benefit amount
- Display rationale

### 4. Fraud Network (1 minute)
- Show graph visualization
- Highlight detected fraud ring
- Explain network patterns

## Key Differentiators
1. Multi-modal processing (PDFs, videos, images, audio)
2. Three-tier fraud detection (catches organized fraud)
3. Economic optimization (smart routing)
4. Complete explainability (audit trail)
5. Active learning (improves over time)
```

### Task 9.2: Create Sample Claims

```bash
# Prepare 5 demo claims:

# Claim 1: Clean claim (Auto-Approve)
- Medical bill PDF
- Low fraud score
- High confidence

# Claim 2: Policy violation (Auto-Reject)
- Claim outside coverage
- Clear rejection reason

# Claim 3: Moderate fraud (Manual Review)
- Similar to previous claim
- Medium fraud score

# Claim 4: High fraud (Investigation)
- Duplicate invoice
- High fraud score
- Network connections

# Claim 5: Low confidence (Manual Review)
- Poor quality scan
- Low extraction confidence
```

### Task 9.3: Polish UI

```typescript
// Add loading states
// Add animations
// Add tooltips
// Improve error handling
// Add success messages
```

### Task 9.4: Create Presentation

```markdown
# Pitch Deck Outline

## Slide 1: Problem
- Claims processing is slow (38 days average)
- Fraud costs $45B/year
- Current solutions lack explainability

## Slide 2: Solution
- 5-layer neuro-symbolic architecture
- Multi-modal AI processing
- Three-tier fraud detection
- Economic optimization

## Slide 3: Live Demo
[Run actual demo]

## Slide 4: Technology
- Next.js frontend
- FastAPI backend
- n8n orchestration
- Multi-database architecture

## Slide 5: Key Innovations
- Only solution combining AI + deterministic rules
- Graph-based fraud detection (high barrier to entry)
- Active learning (continuous improvement)

## Slide 6: Business Impact
- 78% faster processing
- 72% cost reduction
- Catches organized fraud rings
- Full regulatory compliance

## Slide 7: Next Steps
- Pilot with insurance company
- Integrate with Guidewire
- Enterprise deployment
```

---

## Final Checklist

### Pre-Demo Testing
- [ ] All databases running
- [ ] n8n workflow tested
- [ ] Backend API endpoints work
- [ ] Frontend loads properly
- [ ] Sample claims prepared
- [ ] Demo script practiced

### Code Quality
- [ ] Code commented
- [ ] README.md complete
- [ ] Environment variables documented
- [ ] Docker setup verified

### Presentation
- [ ] Slides prepared
- [ ] Demo script ready
- [ ] Backup plan (video recording)
- [ ] Q&A preparation

---

## Quick Start Commands

```bash
# Start everything
docker-compose up -d

# Backend
cd backend
python -m app.main

# Frontend
cd frontend
npm run dev

# Access:
# - Frontend: http://localhost:3000
# - Backend: http://localhost:8000
# - n8n: http://localhost:5678
# - Neo4j: http://localhost:7474
# - Qdrant: http://localhost:6333/dashboard
```

---

## Troubleshooting

### Common Issues

**Issue: Database connection failed**
```bash
# Check if databases are running
docker-compose ps

# Restart databases
docker-compose restart postgres redis qdrant neo4j
```

**Issue: n8n workflow not executing**
```bash
# Check n8n logs
docker-compose logs n8n

# Verify webhook URL
curl http://localhost:5678/webhook/claim-upload
```

**Issue: Frontend can't connect to backend**
```bash
# Check CORS settings in backend
# Verify API_BASE_URL in frontend .env
```

---

## Success Criteria

Your implementation is complete when:

✅ Users can upload multi-modal files (PDF, video, image, audio)
✅ n8n successfully processes and extracts data
✅ All 5 layers execute sequentially
✅ Final decision appears in UI with explanation
✅ Fraud network visualizes properly
✅ Audit trail is logged to database
✅ Demo runs smoothly end-to-end

---

**This implementation plan provides everything needed to build Lexora from scratch. Follow each phase sequentially, test thoroughly, and prepare an impressive demo!**