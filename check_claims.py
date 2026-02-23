import urllib.request
import json

try:
    res = urllib.request.urlopen('http://localhost:8000/api/claims?page_size=5')
    data = json.loads(res.read().decode('utf-8'))
    claims = data['items']

    for claim in claims:
        clm = claim['claim_number']
        clmid = claim['id']
        print(f'Claim {clm}:')
        res = urllib.request.urlopen(f'http://localhost:8000/api/claims/{clmid}/audit')
        audit = json.loads(res.read().decode('utf-8'))
        for e in audit['audit_trail']:
            print(f"  {e['stage']} - {e['event_type']}")
            if e['stage'] in ['perception', 'layer1', 'perception_engine'] and e['event_type'] != 'started':
                print("    Payload:", json.dumps(json.loads(e['payload']) if isinstance(e['payload'], str) else e['payload'])[:200])
except Exception as e:
    print(e)
