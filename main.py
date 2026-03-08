from fastapi import FastAPI
from routers import shipments, salary, dashboard, auth, analytics_router, users

app = FastAPI()

app.include_router(shipments.router)
app.include_router(salary.router)
app.include_router(dashboard.router)
app.include_router(auth.router)
app.include_router(analytics_router.router)
app.include_router(users.router)