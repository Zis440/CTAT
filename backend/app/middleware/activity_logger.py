import time
import logging
import asyncio
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from jose import JWTError

from app.auth.jwt_utils import decode_token
from app.database import SessionLocal
from app.services.audit_service import audit_service

logger = logging.getLogger(__name__)

def _log_activity_sync(user_id: str, method: str, path: str, status_code: int, ip: str, process_time: float, url: str):
    """Synchronous function to write the log to the DB."""
    db = SessionLocal()
    try:
        audit_service.log_activity(
            db=db,
            user_id=user_id,
            action="PAGE_VISIT" if method == "GET" else "USER_ACTION",
            details={
                "url": url,
                "path": path,
                "method": method,
                "status_code": status_code,
                "ip_address": ip,
                "process_time_ms": process_time
            }
        )
    except Exception as e:
        logger.error(f"Failed to log user activity: {e}")
    finally:
        db.close()

class ActivityLoggerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()

        response = await call_next(request)

        path = request.url.path
        if path.startswith(("/health", "/readiness", "/api/auth/avatar", "/docs", "/openapi.json")):
            return response

        user_id = "ANONYMOUS"
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                payload = decode_token(token)
                if "sub" in payload:
                    user_id = payload["sub"]
            except JWTError:
                pass

        process_time = round((time.time() - start_time) * 1000, 2)
        ip_address = request.client.host if request.client else "unknown"

        if user_id == "ANONYMOUS":
            return response

        referer = request.headers.get("referer", "")

        loop = asyncio.get_running_loop()
        loop.run_in_executor(
            None,
            _log_activity_sync,
            user_id,
            request.method,
            path,
            response.status_code,
            ip_address,
            process_time,
            referer
        )

        return response
