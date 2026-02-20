import logging
import uuid
from contextvars import ContextVar
from fastapi import Request

# Correlation ID context
correlation_id: ContextVar[str] = ContextVar("correlation_id", default="")

class CorrelationFilter(logging.Filter):
    def filter(self, record):
        record.correlation_id = correlation_id.get()
        return True

def setup_logging(log_level: str = "INFO"):
    logger = logging.getLogger("lexora")
    logger.setLevel(log_level.upper())
    
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            '%(asctime)s | %(levelname)-8s | [%(correlation_id)s] | %(name)s | %(message)s'
        )
        handler.setFormatter(formatter)
        handler.addFilter(CorrelationFilter())
        logger.addHandler(handler)
        
    return logger

logger = setup_logging()

async def correlation_id_middleware(request: Request, call_next):
    req_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
    token = correlation_id.set(req_id)
    response = await call_next(request)
    response.headers["X-Correlation-ID"] = req_id
    correlation_id.reset(token)
    return response
