from fastapi import APIRouter, Depends
from data.db import get_current_user
from services.analytics_service import build_dashboard, top_dispatchers, company_net_profit, payroll_vs_profit

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/dashboard")
def dashboard(current_user: dict = Depends(get_current_user)):
    return build_dashboard(current_user)

@router.get("/top-dispatchers")
def get_top_dispatchers(current_user: dict = Depends(get_current_user)):
    return top_dispatchers()

@router.get("/company-net-profit")
def get_company_net_profit(current_user: dict = Depends(get_current_user)):
    return company_net_profit()

@router.get("/payroll-vs-profit")
def get_payroll_vs_profit(current_user: dict = Depends(get_current_user)):
    return payroll_vs_profit()