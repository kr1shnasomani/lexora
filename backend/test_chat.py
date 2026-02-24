import sys
import asyncio
sys.path.append('c:/Users/josna/OneDrive/Desktop/lexora/backend')
from routes.chat import handle_chat_message, ChatMessageParams
import traceback

async def run():
    try:
        # Create a new session with name intro
        res1 = await handle_chat_message(ChatMessageParams(message="Hi, my name is Alex Chang."))
        print("\n=== RES 1 ===")
        print(res1)
        
        # Test history memory
        res = await handle_chat_message(ChatMessageParams(message="Can you investigate Meera's and Asha's claims, I feel they are quite suspicious"))
        print("\n=== RES ===")
        print(res)
        
    except Exception as e:
        traceback.print_exc()

asyncio.run(run())
