import uuid
from typing import Any, Dict, List, Optional

from engines.llm_engine import GroqEngine
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

from database import get_supabase

router = APIRouter()

# --- Models ---
class ChatMessageParams(BaseModel):
    session_id: str | None = None
    message: str
    ui_context: dict[str, Any] | None = None

class CustomerChatMessageParams(BaseModel):
    session_id: str | None = None
    message: str
    email: str # Used to securely scope data access
    ui_context: dict[str, Any] | None = None

class CreateSessionParams(BaseModel):
    title: str | None = "New Session"
    user_id: str # Ideally from auth token

class SessionResponse(BaseModel):
    session_id: str
    title: str

class ChatResponse(BaseModel):
    session_id: str
    message: str
    tool_calls_executed: list[str] = []

# --- Tool Call Router ---
def execute_internal_tool(function_name: str, arguments: dict):
    """
    Executes an internal backend function when Groq requests it.
    """
    db = get_supabase()
    
    if function_name == "get_claim_details":
        claim_id = arguments.get("claim_id")
        res = db.table("claims").select("*").eq("id", claim_id).execute()
        return res.data
        
    if function_name == "get_active_anomalies":
        # Simplified query picking high risk claims
        res = db.table("claims").select("id, status, fraud_score").gt("fraud_score", 80).limit(5).execute()
        return res.data
        
    if function_name == "get_table_data":
        table_name = arguments.get("table_name")
        limit = arguments.get("limit", 10)
        filters = arguments.get("filters", {})
        try:
            query = db.table(table_name).select("*").limit(limit)
            for k, v in filters.items():
                if isinstance(v, str) and any(text_key in k for text_key in ['name', 'title', 'email', 'description', 'content']):
                    query = query.ilike(k, f"%{v}%")
                else:
                    query = query.eq(k, v)
            res = query.execute()
            
            # Prune bloated columns to prevent Groq token limit overflow
            pruned_data = []
            for row in res.data:
                row.pop("extraction_raw", None)
                row.pop("current_state_context", None)
                row.pop("decision_output", None)
                row.pop("decision_rationale", None)
                row.pop("fraud_analysis", None)
                pruned_data.append(row)
                
            return pruned_data
        except Exception as e:
            return {"error": str(e)}

    return {"error": f"Tool {function_name} not found"}

def execute_customer_tool(function_name: str, arguments: dict, user_email: str):
    """
    Executes customer-facing tools, strictly scoping by user_email.
    """
    db = get_supabase()
    
    if function_name == "get_my_claims":
        user_res = db.table("users").select("id, full_name").eq("email", user_email).limit(1).execute()
        if not user_res.data: return {"error": "User not found"}
            
        full_name = user_res.data[0]["full_name"]
        policies_res = db.table("policies").select("id").eq("holder_name", full_name).execute()
        
        if not policies_res.data: return []
            
        policy_ids = [p["id"] for p in policies_res.data]
        claims_res = db.table("claims").select("id, claim_number, status, claimed_amount, created_at").in_("policy_id", policy_ids).execute()
        return claims_res.data
        
    if function_name == "get_my_policies":
        user_res = db.table("users").select("id, full_name").eq("email", user_email).limit(1).execute()
        if not user_res.data: return {"error": "User not found"}
            
        full_name = user_res.data[0]["full_name"]
        policies_res = db.table("policies").select("id, policy_number, policy_type, annual_limit, is_active").eq("holder_name", full_name).execute()
        
        # Transform the result to match what the LLM expects, or just map the dict
        mapped_policies = []
        for p in (policies_res.data or []):
            mapped_policies.append({
                "id": p.get("id"),
                "policy_number": p.get("policy_number"),
                "policy_type": p.get("policy_type"),
                "coverage_amount": f"₹{p.get('annual_limit'):,.0f}" if p.get('annual_limit') else "Unknown",
                "status": "active" if p.get("is_active") else "expired"
            })
        return mapped_policies

    return {"error": f"Tool {function_name} not found or unauthorized"}

# --- Endpoints ---
@router.post("/chat/message", response_model=ChatResponse)
async def handle_chat_message(params: ChatMessageParams):
    db = get_supabase()
    session_id = params.session_id
    
    # 1. Create session if none exists
    if not session_id:
        new_sess = db.table("chat_sessions").insert({"title": params.message[:30] + "..."}).execute()
        if not new_sess.data:
            raise HTTPException(status_code=500, detail="Failed to create session")
        session_id = new_sess.data[0]["id"]
        
    # 2. Save User Message
    db.table("chat_messages").insert({
        "session_id": session_id,
        "role": "user",
        "content": params.message
    }).execute()
    
    # 3. Retrieve Context from Supabase for this Session
    msg_history_res = db.table("chat_messages").select("role, content").eq("session_id", session_id).order("created_at").execute()
    
    messages = [
        {"role": "system", "content": "You are Lexora Assistant, a helpful AI specifically trained on insurance fraud investigation. You have access to tools that can pull data directly from ANY system database table.\n\nCRITICAL RULES:\n1. ONLY use tools if the user EXPLICITLY asks for data that requires a database lookup (e.g., 'show me high risk claims', 'what are the anomalies', 'details for claim C-123', 'list users').\n2. Do NOT use tools for general greetings, introductions, conversational responses, or questions that don't require live data lookup.\n3. If the user asks a conversational question or reminds you of something, rely on the message history context WITHOUT calling tools.\n4. You have READ-ONLY access. Do not attempt to update tables. Offer advice based on the data you retrieve.\n\nSCHEMA CHEAT SHEET:\n- `users` table: `id`, `full_name`, `email`\n- `policies` table: `id`, `policy_number`, `holder_name` (matches users.full_name)\n- `claims` table: `id`, `claim_number`, `policy_id` (links to policies.id), `status`, `fraud_score`, `calculated_amount`, `claimant_name`\n- `claim_documents` table: `id`, `claim_id` (links to claims.id), `file_name`\nIf you need a user's claims, fetch `policies` via `holder_name`, then query `claims` using that `policy_id`."}
    ]
    
    if params.ui_context:
        messages.append({
            "role": "system", 
            "content": f"The admin's current UI context is: {params.ui_context}. Use this context if their prompt is ambiguous (e.g., 'What about this one')."
        })
        
    messages.extend(msg_history_res.data or [])

    # 4. Engine & Tools
    llm = GroqEngine()
    
    tools = [
        {
            "type": "function",
            "function": {
                "name": "get_claim_details",
                "description": "Fetch detailed data for a specific insurance claim ID",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "claim_id": {"type": "string", "description": "The exact ID of the claim, e.g. LX-992"}
                    },
                    "required": ["claim_id"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_active_anomalies",
                "description": "Fetch a list of active claims with a very high fraud score.",
                "parameters": {
                    "type": "object",
                    "properties": {},
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_table_data",
                "description": "Fetch generic multi-row data from any system table (e.g. users, claims, policies, customers). Use this when the admin asks for a broad list of things, and optionally filter by column.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "table_name": {"type": "string", "description": "The exact name of the table to query, e.g. 'users', 'claims'."},
                        "limit": {"type": "integer", "description": "Maximum number of rows to return. Default 10."},
                        "filters": {
                            "type": "object", 
                            "description": "Optional dictionary of column names and values to filter on (e.g. {'full_name': 'Ravi', 'user_id': 'uuid'}). String values will be fuzzy matched.",
                            "additionalProperties": {"type": "string"}
                        }
                    },
                    "required": ["table_name"]
                }
            }
        }
    ]

    try:
        response_json = llm.generate(messages, tools=tools)
        tool_calls_executed = []
        
        max_loops = 5
        loop_count = 0
        final_answer = ""
        
        while loop_count < max_loops:
            loop_count += 1
            response_message = response_json["choices"][0]["message"]
            content = response_message.get("content", "")
            
            # Qwen Fallback: If no native tool_calls, but content contains <tool_call> JSON
            import json
            import re
            import uuid
            if not response_message.get("tool_calls") and "<tool_call>" in content:
                tool_call_match = re.search(r'<tool_call>\s*({.*?})\s*</tool_call>', content, re.DOTALL)
                if tool_call_match:
                    try:
                        parsed_tool = json.loads(tool_call_match.group(1).strip())
                        response_message["tool_calls"] = [{
                            "id": f"call_{uuid.uuid4().hex[:8]}",
                            "type": "function",
                            "function": {
                                "name": parsed_tool["name"],
                                "arguments": json.dumps(parsed_tool.get("arguments", {}))
                            }
                        }]
                        response_message["content"] = content.replace(tool_call_match.group(0), "").strip()
                    except Exception as e:
                        print("Failed to parse fallback tool:", e)

            # Check if Groq wanted to use a tool (either natively or via fallback)
            if response_message.get("tool_calls"):
                messages.append(response_message)
                
                for tool_call in response_message["tool_calls"]:
                    func_name = tool_call["function"]["name"]
                    
                    # Simple eval or json parse for arguments
                    args = json.loads(tool_call["function"]["arguments"])
                    
                    # Execute backend function
                    print(f"!!! EXECUTING TOOL: {func_name} WITH ARGS: {args}")
                    tool_result = execute_internal_tool(func_name, args)
                    print(f"!!! TOOL RESULT: {str(tool_result)[:100]}")
                    tool_calls_executed.append(func_name)
                    
                    messages.append({
                        "tool_call_id": tool_call["id"],
                        "role": "tool",
                        "name": func_name,
                        "content": json.dumps(tool_result)
                    })
                    
                # Call Groq again with the newly retrieved tool context
                response_json = llm.generate(messages, tools=tools)
            else:
                final_answer = response_message.get("content", "I am currently unable to process that.")
                break

        import re
        # Remove Qwen reasoning tags
        if final_answer:
            final_answer = re.sub(r'<think>.*?</think>', '', final_answer, flags=re.DOTALL).strip()
    except Exception as e:
        final_answer = f"I encountered an error connecting to the Intelligence API. Please try again. (Details: {e!s})"
        tool_calls_executed = []

    # 5. Save final Assistant answer
    db.table("chat_messages").insert({
        "session_id": session_id,
        "role": "assistant",
        "content": final_answer
    }).execute()

    return ChatResponse(
        session_id=session_id,
        message=final_answer,
        tool_calls_executed=tool_calls_executed
    )
    
@router.get("/chat/sessions")
async def get_sessions():
    db = get_supabase()
    res = db.table("chat_sessions").select("id, title, created_at").order("created_at", desc=True).limit(50).execute()
    return res.data

@router.get("/chat/session/{session_id}")
async def get_session_messages(session_id: str):
    db = get_supabase()
    res = db.table("chat_messages").select("id, role, content, created_at").eq("session_id", session_id).order("created_at").execute()
    return res.data

@router.post("/chat/customer/message", response_model=ChatResponse)
async def handle_customer_chat_message(params: CustomerChatMessageParams):
    db = get_supabase()
    session_id = params.session_id
    
    if not session_id:
        new_sess = db.table("chat_sessions").insert({"title": params.message[:30] + "..."}).execute()
        if not new_sess.data:
            raise HTTPException(status_code=500, detail="Failed to create session")
        session_id = new_sess.data[0]["id"]
        
    db.table("chat_messages").insert({
        "session_id": session_id,
        "role": "user",
        "content": params.message
    }).execute()
    
    msg_history_res = db.table("chat_messages").select("role, content").eq("session_id", session_id).order("created_at").execute()
    
    messages = [
        {"role": "system", "content": f"You are Lexora Assistant, a helpful AI customer support agent for '{params.email}'. You can securely check their claims and policies.\n\nCRITICAL RULES:\n1. ONLY answer questions regarding the user's own claims and policies.\n2. Do NOT disclose internal fraud scores or system algorithms.\n3. Be helpful, polite, and conversational.\n4. Call tools to fetch their data if they ask for details on their claims or coverages."}
    ]
    
    if params.ui_context:
        messages.append({
            "role": "system", 
            "content": f"The customer's current UI context is: {params.ui_context}."
        })
        
    messages.extend(msg_history_res.data or [])

    llm = GroqEngine()
    
    tools = [
        {
            "type": "function",
            "function": {
                "name": "get_my_claims",
                "description": "Fetch all claims filed by the current customer.",
                "parameters": {"type": "object", "properties": {}}
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_my_policies",
                "description": "Fetch all policies owned by the current customer.",
                "parameters": {"type": "object", "properties": {}}
            }
        }
    ]

    try:
        response_json = llm.generate(messages, tools=tools)
        tool_calls_executed = []
        
        max_loops = 5
        loop_count = 0
        final_answer = ""
        
        while loop_count < max_loops:
            loop_count += 1
            response_message = response_json["choices"][0]["message"]
            content = response_message.get("content", "")
            
            import json
            import re
            import uuid
            if not response_message.get("tool_calls") and "<tool_call>" in content:
                tool_call_match = re.search(r'<tool_call>\s*({.*?})\s*</tool_call>', content, re.DOTALL)
                if tool_call_match:
                    try:
                        parsed_tool = json.loads(tool_call_match.group(1).strip())
                        response_message["tool_calls"] = [{
                            "id": f"call_{uuid.uuid4().hex[:8]}",
                            "type": "function",
                            "function": {
                                "name": parsed_tool["name"],
                                "arguments": json.dumps(parsed_tool.get("arguments", {}))
                            }
                        }]
                        response_message["content"] = content.replace(tool_call_match.group(0), "").strip()
                    except: pass

            if response_message.get("tool_calls"):
                messages.append(response_message)
                for tool_call in response_message["tool_calls"]:
                    func_name = tool_call["function"]["name"]
                    args = json.loads(tool_call["function"]["arguments"])
                    
                    tool_result = execute_customer_tool(func_name, args, params.email)
                    tool_calls_executed.append(func_name)
                    
                    messages.append({
                        "tool_call_id": tool_call["id"],
                        "role": "tool",
                        "name": func_name,
                        "content": json.dumps(tool_result)
                    })
                response_json = llm.generate(messages, tools=tools)
            else:
                final_answer = response_message.get("content", "I am currently unable to process that.")
                break

        if final_answer:
            final_answer = re.sub(r'<think>.*?</think>', '', final_answer, flags=re.DOTALL).strip()
    except Exception as e:
        final_answer = f"I encountered an error connecting to Lexora Support. Please try again. (Details: {e!s})"
        tool_calls_executed = []

    db.table("chat_messages").insert({
        "session_id": session_id,
        "role": "assistant",
        "content": final_answer
    }).execute()

    return ChatResponse(
        session_id=session_id,
        message=final_answer,
        tool_calls_executed=tool_calls_executed
    )
