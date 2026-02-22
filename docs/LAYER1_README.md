# Layer 1: Perception & AI Extraction Engine

## Overview
The **Layer 1 Perception Engine** is the initial intake phase of the Lexora pipeline. It is responsible for bridging chaotic, format-less real-world submissions (PDFs, images, unstructured text) and converting them into strict, structured data that the rest of the backend engines can analyze deterministically. 

It handles multi-modal AI extraction, utilizing an n8n orchestration workflow that interacts with powerful LLMs (like GPT-4V or Gemini) to identify entities, invoices, and contextual scenarios.

---

## 📥 Inputs & Orchestration

The perception engine operates asynchronously. The primary entry point for the backend is the endpoint: `POST /api/webhooks/n8n-extraction`.

### n8n Workflow Responsibilities
1. Receive raw documents (e.g., FIRs, receipts, hospital discharge summaries) from users.
2. OCR and extract textual context using multi-modal AI models.
3. Quantify an `extraction_confidence` score based on the legibility and consistency of the document.
4. Flag missing or suspect data points generating `extraction_warnings`.
5. Post the synthesized JSON payload directly to the Lexora Backend via the webhook.

---

## 📤 Output & Database Changes

When Layer 1 successfully posts the payload via the FastAPI webhook, it modifies the following database tables:

### 1. `claims` Table (Inserted)
Creates the foundational claim record that drives Layers 2, 3, and 4.
- **`status`**: Gets set to `'extracted'` (or `'under_review'` if the AI explicitly flagged it for manual validation).
- **`claim_number`**: Auto-generated string.
- **`extraction_raw`**: JSON representation of everything the LLM found (used for debugging/auditing).
- **`extraction_confidence`**: Float rating (0.0 - 1.0) of how well the AI understood the documents.
- **`extraction_warnings`**: JSON Array of parsing notes (e.g., "Invoice date is blurry").
- **Core fields**: `claimant_name`, `claimed_amount`, `provider_name`, `incident_date`, `incident_type`, etc., are explicitly set.

### 2. `audit_events` Table (Inserted)
- Appends an event (`stage: "layer1", action: "completed"`) storing the `execution_id`, the number of fields extracted, and the global LLM confidence for later traceability.

---

## ⚙️ Triggering the Rest of the Pipeline

Layer 1 acts as the "Domino" that knocks over the rest of the autonomous pipeline. 

Inside the `webhooks.py` router, provided the extraction targets the `'extracted'` status, it will synchronously dispatch a `BackgroundTasks` call to:
`trigger_pipeline(claim_id)`

This background task automatically triggers Layer 2 (Policy), Layer 3 (Fraud), and Layer 4 (Risk Fusion) sequentially.

---

## 📄 Payload Schema (Webhook Contract)

The n8n workflow must conform strictly to the `N8NExtractionPayload` Pydantic model. 

### Sample JSON POST Payload
```json
{
  "execution_id": "n8n-exec-9b32fa",
  "policy_number": "POL-123456",
  "claimant_name": "John Doe",
  "claimant_phone": "+1234567890",
  "incident_date": "2024-02-15T10:00:00Z",
  "incident_type": "accident",
  "incident_description": "Car collided with a pole due to slippery roads.",
  "claimed_amount": 15000.00,
  "provider_name": "City General Hospital",
  "invoice_number": "INV-00129",
  "extraction_raw": {
    "doctor_notes": "Patient suffered mild whiplash...",
    "vehicle_damage": "Front bumper destroyed"
  },
  "extraction_confidence": 0.92,
  "extraction_warnings": ["Could not verify provider phone number"],
  "needs_review": false
}
```
