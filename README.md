# 🚛 Financial Tracking and Management System

A backend system for logistics companies to manage shipments, dispatcher commissions, salary calculations, financial analytics, and role-based access — built with **FastAPI** and **MySQL**.

---

## ⚙️ Technology Stack

| Technology | Purpose |
|---|---|
| **FastAPI** | Backend API framework |
| **MySQL** | Relational database |
| **mysql-connector-python** | Database connector (raw SQL) |
| **JWT (python-jose)** | Token-based authentication |
| **bcrypt** | Password hashing |
| **Pydantic** | Request/response validation |
| **OpenPyXL** | Excel report generation |
| **Chart.js** | Financial charts *(planned)* |

**Architecture:** Layered — `routers → services → database`

---

## 🏗️ Project Structure

```
FinancialTracking/
├── data/
│   └── db.py                    # Database connection
├── routers/
│   ├── auth.py                  # Authentication endpoints
│   ├── users.py                 # User management endpoints
│   ├── shipments.py             # Shipment endpoints
│   ├── salary.py                # Salary endpoints
│   └── analytics_router.py      # Analytics endpoints
├── services/
│   ├── auth_service.py          # Login & token logic
│   ├── user_service.py          # User CRUD operations
│   ├── shipment_service.py      # Shipment business logic
│   ├── salary_service.py        # Salary calculations
│   ├── analytics_service.py     # Dashboard & KPI logic
│   └── logging_service.py       # Audit trail logging
├── utils/
│   └── calculations.py          # Shared calculation helpers
├── templates/                   # HTML templates (frontend)
├── static/                      # CSS, JS, assets
├── main.py                      # Application entry point
└── requirements.txt
```

---

## 🗄️ Database Schema

| Table | Purpose |
|---|---|
| `staff` | System users, roles, and credentials |
| `companies` | Logistics company records |
| `shipments` | Shipment data and financials |
| `salary_records` | Official payroll records |
| `shipment_logs` | Shipment change audit history |
| `user_logs` | User activity audit trail |

---

## 🔐 Authentication & RBAC

The system uses **JWT tokens** for authentication with **bcrypt** password hashing. Tokens expire after 24 hours. All protected routes enforce role-based permissions via FastAPI dependencies.

| Role | Access Level |
|---|---|
| `manager` | Full system access |
| `supervisor` | Monitoring and oversight |
| `dispatcher` | Own shipments only |
| `accounting` | Financial data |
| `hr` | Staff management |
| `tracking` | Shipment tracking |

---

## 🚚 Shipment System

Each shipment tracks: `broker_price`, `driver_pay`, `profit`, `margin`, and `dispatcher_commission_percent`.

**Business rules:**

- **Profit formula:** `profit = broker_price - driver_pay`
- **Auto-recalculation:** Updating `broker_price` or `driver_pay` automatically recalculates `profit` and `margin`
- **Soft delete:** Shipments are never permanently removed — they are flagged with `is_deleted = 1`, `deleted_at`, and `deleted_by`
- **Deleted shipments** do not affect salary, profit, analytics, or KPIs
- **Dual references:** Each shipment supports both `company_reference` (internal) and `external_reference` (broker), with uniqueness validation
- **Partial updates:** Only the fields included in the request body are updated

---

## 💰 Salary System

The salary module separates **preview calculations** from **official stored records**.

### Preview vs. Record

| Concept | Description |
|---|---|
| **Preview** | Real-time calculation from shipment data — no database write |
| **Record** | Official payroll entry created by a manager — stored permanently |

### Formulas

```
commission       = profit × commission_percent / 100
shipment_bonus   = sum of all commissions for the period
total_salary     = (base_salary + shipment_bonus + bonus) × tax_rate
```

### Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/salary/my` | GET | Preview salary for current user |
| `/salary/my-record` | GET | Saved salary record for current user |
| `/salary/all` | GET | Preview salary for all employees |
| `/salary/all-records` | GET | All official salary records |
| `/salary/generate` | POST | Create an official salary record |

**Eligibility criteria:** Only shipments where `assigned_staff_id` matches the user, `is_deleted = 0`, and the shipment falls within the selected period are included.

---

## 📊 Analytics & Dashboard

The analytics module provides profit trends, dispatcher leaderboards, KPI dashboards, payroll-vs-profit comparisons, and growth indicators. All analytics exclude soft-deleted shipments (`is_deleted = 0`).

---

## 📜 Logging System

All changes are tracked with full audit detail: field name, old value, new value, and the user who made the change. This covers shipment creation, updates, reference changes, deletions, and user activity.

---

## 📡 API Endpoints Overview

| Group | Endpoint | Method |
|---|---|---|
| **Auth** | `/auth/login` | POST |
| **Users** | `/users/create` | POST |
| | `/users/change-password` | POST |
| | `/users/change-role` | POST |
| | `/users/change-status` | POST |
| **Shipments** | `/shipments/create` | POST |
| | `/shipments/update` | PUT |
| | `/shipments/delete` | PUT |
| **Salary** | `/salary/my` | GET |
| | `/salary/my-record` | GET |
| | `/salary/all` | GET |
| | `/salary/all-records` | GET |
| | `/salary/generate` | POST |
| **Analytics** | `/analytics/dashboard` | GET |
| | `/analytics/kpi` | GET |

---

## 🚀 Running the Project

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 📈 Project Status

### ✅ Completed

- JWT authentication
- Role-based access control
- Shipment CRUD with soft delete
- Salary preview and record generation
- Logging and audit system
- Database schema finalized

### 🔧 In Progress

- Frontend UI (HTML / CSS / JS)
- Analytics dashboard with Chart.js
- Excel export from UI
- Advanced filtering

---

## 🎓 Academic Context

| | |
|---|---|
| **University** | Bangor University |
| **Module** | ICE3001 |
| **Project** | Financial Tracking System |