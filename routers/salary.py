from fastapi import APIRouter, Depends
from data.db import get_current_user, require_roles, FINANCE_ROLES
router = APIRouter(prefix="/salary", tags=["Salary"])


#  (anyone)
@router.get("/my")
def my_salary(current_user: dict = Depends(get_current_user)):
    return {
        "message": "Returning my salary",
        "staff": current_user
    }


#  (manager + accounting)
@router.get("/all")
def all_salaries(
    current_user: dict = Depends(require_roles(FINANCE_ROLES))
):
    return {
        "message": "Returning all salaries",
        "staff": current_user
    }