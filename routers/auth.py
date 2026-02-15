from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.auth_service import login_user
from services.auth_service import register_staff

router = APIRouter(prefix="/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str
    full_name: str
    role: str

@router.post("/login")
def login(data: LoginRequest):
    result = login_user(data.username, data.password)

    if not result:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    return result


@router.post("/register")
def register(data: RegisterRequest):
    result = register_staff(
        data.username,
        data.password,
        data.full_name,
        data.role
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result

