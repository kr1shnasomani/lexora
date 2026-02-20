from supabase import create_client, Client
from app.core.settings import settings
from app.core.logging import logger

_supabase_client: Client | None = None

def get_supabase() -> Client | None:
    """
    Returns a configured Supabase Client using the Service Role Key.
    Returns None if in simulation mode or credentials are missing.
    """
    global _supabase_client
    
    if settings.simulation_mode:
        return None
        
    if _supabase_client is None:
        if not settings.supabase_url or not settings.supabase_service_role_key:
            logger.warning("Supabase credentials missing. Client not initialized.")
            return None
            
        try:
            _supabase_client = create_client(
                settings.supabase_url, 
                settings.supabase_service_role_key
            )
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            return None
            
    return _supabase_client
