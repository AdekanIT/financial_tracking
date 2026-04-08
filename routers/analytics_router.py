from fastapi import APIRouter, Depends

from data.db import get_current_user, require_roles
from services.analytics_service import (
    build_dashboard,
    company_profit
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


# =============================
# ROLE-BASED DASHBOARD
# =============================
@router.get("/dashboard")
def dashboard(current_user: dict = Depends(get_current_user)):
    return build_dashboard(current_user)


# =============================
# COMPANY PROFIT
# manager, supervisor, accounting
# =============================
@router.get("/company-profit")
def get_company_profit(
    current_user: dict = Depends(require_roles(["manager", "supervisor", "accounting"]))
):
    return company_profit()