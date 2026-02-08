from fastapi import FastAPI
from routers import shipments, salary, dashboard, auth

app = FastAPI()

app.include_router(shipments.router)
app.include_router(salary.router)
app.include_router(dashboard.router)
app.include_router(auth.router)