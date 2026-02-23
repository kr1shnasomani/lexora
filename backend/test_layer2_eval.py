import asyncio
import json
from database import get_supabase
from engines.layer2.policy_engine import evaluate_policy, _load_claim_and_policy, _load_documents, _select_ruleset, _classify_incident

def main():
    claim_id = "370248be-b5f3-4228-a5c3-75b7568fd477" # Meera, Accident
    claim_number = "CLM-20260223192004" # This is probably not claim 1, let me query the db for the exact claim_number of Ravi, Health, Viral Fever.
    pass

if __name__ == "__main__":
    main()
