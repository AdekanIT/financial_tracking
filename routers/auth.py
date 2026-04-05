from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.auth_service import login_user

router = APIRouter(prefix="/auth", tags=["Auth"])


# ==========================
# LOGIN REQUEST MODEL
# ==========================
class LoginRequest(BaseModel):
    username: str
    password: str


# ==========================
# LOGIN ENDPOINT
# ==========================
@router.post("/login")
def login(data: LoginRequest):
    result = login_user(data.username, data.password)

    if result is None:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if "error" in result:
        raise HTTPException(status_code=403, detail=result["error"])

    return {
        "access_token": result["access_token"],
        "token_type": "bearer",
        "staff_id": result["staff_id"],
        "staff_username": result["staff_username"],
        "staff_full_name": result["staff_full_name"],
        "job_title": result["job_title"],
        "expires_in": 86400
    }