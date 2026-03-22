from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.user_service import login_user

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

    # Try to login
    result = login_user(data.username, data.password)

    # Wrong username OR wrong password
    if result is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    # Account exists but inactive or blocked
    if "error" in result:
        raise HTTPException(
            status_code=403,
            detail=result["error"]
        )

    # Successful login — frontend gets EVERYTHING:
    # token, role, staff_id, username
    return {
        "access_token": result["access_token"],
        "token_type": "bearer",
        "staff_id": result["staff_id"],
        "staff_username": result["staff_username"],
        "staff_full_name": result["staff_full_name"],
        "role": result["role"],
        "expires_in": 86400  # 24 hours
    }