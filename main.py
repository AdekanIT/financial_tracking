from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from routers import shipments, salary, auth, analytics_router, users

app = FastAPI()

# ================= STATIC =================
app.mount("/static", StaticFiles(directory="static"), name="static")

# ================= TEMPLATES =================
templates = Jinja2Templates(directory="templates")

# ================= API ROUTERS =================
app.include_router(shipments.router)
app.include_router(salary.router)
app.include_router(auth.router)
app.include_router(analytics_router.router)
app.include_router(users.router)

# ================= PAGE ROUTES =================
@app.get("/")
def root():
    return {"status": "working"}


@app.get("/login")
def login_page(request: Request):
    return templates.TemplateResponse("auth/login.html", {"request": request})


@app.get("/dashboard")
def dashboard_page(request: Request):
    return templates.TemplateResponse("dashboard/dashboard.html", {"request": request})


@app.get("/shipments")
def shipments_page(request: Request):
    return templates.TemplateResponse("shipments/shipments.html", {"request": request})


@app.get("/salary")
def salary_page(request: Request):
    return templates.TemplateResponse("salary/salary.html", {"request": request})


# ✅ NEW ROUTE — Excel Preview Page
@app.get("/excel")
def excel_page(request: Request):
    return templates.TemplateResponse("salary/excel.html", {"request": request})


@app.get("/users")
def users_page(request: Request):
    return templates.TemplateResponse("users/users.html", {"request": request})


@app.get("/archive")
def archive_page(request: Request):
    return templates.TemplateResponse("archive/archive.html", {"request": request})