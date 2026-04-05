from fastapi import APIRouter, Depends

from data.db import get_current_user, require_roles
from services.analytics_service import (
    build_dashboard,
    top_dispatchers,
    company_net_profit,
    payroll_vs_profit
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


# =============================
# ROLE-BASED DASHBOARD
# =============================
@router.get("/dashboard")
def dashboard(current_user: dict = Depends(get_current_user)):
    return build_dashboard(current_user)


# =============================
# TOP DISPATCHERS
# manager, supervisor, accounting
# =============================
@router.get("/top-dispatchers")
def get_top_dispatchers(
    current_user: dict = Depends(require_roles(["manager", "supervisor", "accounting"]))
):
    return top_dispatchers()


# =============================
# COMPANY NET PROFIT
# manager, supervisor
# =============================
@router.get("/company-net-profit")
def get_company_net_profit(
    current_user: dict = Depends(require_roles(["manager", "supervisor"]))
):
    return company_net_profit()


# =============================
# PAYROLL VS PROFIT
# manager, accounting
# =============================
@router.get("/payroll-vs-profit")
def get_payroll_vs_profit(
    current_user: dict = Depends(require_roles(["manager", "accounting"]))
):
    return payroll_vs_profit()