from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.user_service import login_user

router = APIRouter(prefix="/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login")
def login(data: LoginRequest):

    result = login_user(data.username, data.password)

    if not result:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    if "error" in result:
        raise HTTPException(
            status_code=403,
            detail=result["error"]
        )

    return result