# 🚛 Financial Tracking and Management System

A backend system for logistics companies to manage shipments, staff operations, salary records, financial reporting, and analytics — built with **FastAPI** and **MySQL**.

---

## 📌 Overview

The **Financial Tracking and Management System** is a centralized backend platform designed for logistics companies. It covers the full operational cycle from shipment creation to salary payouts and profit analytics, with role-based access control and a complete audit trail.

### Key capabilities

- Shipment CRUD with soft delete and financial auto-calculation
- Dispatcher assignment and commission tracking
- Salary preview, generation, and Excel export
- Company profit analytics with period-based breakdowns
- JWT authentication with role-based access control
- Full audit logging for shipments and user changes

---

## ⚙️ Tech Stack

| Technology | Purpose |
|---|---|
| **FastAPI** | Backend API framework |
| **MySQL** | Relational database |
| **mysql-connector-python** | Database connection (raw SQL) |
| **python-jose** | JWT authentication |
| **bcrypt / passlib** | Password hashing |
| **Pydantic** | Request/response validation |
| **OpenPyXL** | Excel export generation |

---

## 🏗️ Architecture

The project follows a clean layered structure:

```
routers/    → API endpoints
services/   → Business logic
data/       → Database connection & auth helpers
utils/      → Shared calculation logic
```

---

## 🗂️ Project Structure

```
FinancialTracking/
├── data/
│   └── db.py
├── routers/
│   ├── auth.py
│   ├── users.py
│   ├── shipments.py
│   ├── salary.py
│   ├── analytics_router.py
│   └── dashboard.py
├── services/
│   ├── auth_service.py
│   ├── user_service.py
│   ├── shipment_service.py
│   ├── salary_service.py
│   ├── salary_export_service.py
│   ├── analytics_service.py
│   └── logging_service.py
├── utils/
│   └── calculations.py
├── templates/
├── static/
├── main.py
└── requirements.txt
```

---

## 🗄️ Database Schema

The system uses **6 core tables**:

| Table | Purpose |
|---|---|
| `staff` | System users, roles, salary config |
| `companies` | Logistics company records |
| `shipments` | Shipment data with financial fields |
| `salary_records` | Official generated salary records |
| `shipment_logs` | Shipment audit history |
| `user_logs` | User/account change history |

### Key Relationships

```
companies.company_id      → shipments.company_id
staff.staff_id             → shipments.assigned_staff_id
staff.staff_id             → salary_records.staff_id
shipments.shipment_id      → shipment_logs.shipment_id
staff.staff_id             → user_logs.staff_id / changed_by
```

---

## 🔐 Authentication & Authorization

- **JWT-based authentication** — login returns a token used for all protected routes
- **Password hashing** via bcrypt
- **Role-based access** controlled by `job_title`

### Roles

| Role | Access Level |
|---|---|
| `manager` | Full backend access |
| `supervisor` | Monitoring, analytics |
| `dispatcher` | Own shipments only |
| `accounting` | Financial & salary data |
| `hr` | Staff management |
| `tracking` | Shipment tracking |

---

## 🚚 Shipment Module

- Create, update, and soft-delete shipments
- Auto-calculated field:

```
profit = broker_price - driver_pay
```

- Internal reference auto-generated
- Staff full name stored as snapshot
- Soft delete system:
  - `is_deleted`
  - `deleted_at`
  - `deleted_by`

---

## 💰 Salary Module

### Calculation Logic

```
profit     = broker_price - driver_pay
commission = profit × dispatcher_commission_percent / 100

gross_salary  = base_salary + shipment_bonus + bonus
tax_amount    = gross_salary × tax_percent / 100
total_salary  = gross_salary - tax_amount
```

### Features

- Salary preview before generation
- Official salary record creation
- Name normalization (`john smith → John Smith`)
- Duplicate name handling via `staff_id`
- Excel export with:
  - Employee Salaries
  - Company Summary
- Browser preview for export

---

## 📊 Analytics Module

- Role-based dashboard
- Profit analytics grouped by:
  - Day
  - Week
  - Month
- Nested breakdown support
- Only delivered shipments counted

### Example response

```json
{
  "period_key": "2026-04",
  "period_label": "2026-04",
  "shipments": 8,
  "profit": 3200.0,
  "gross": 18500.0,
  "breakdown": [
    {
      "label": "2026-04-01",
      "shipments": 2,
      "profit": 800.0,
      "gross": 4500.0
    }
  ]
}
```

---

## 📜 Audit Logging

All changes are tracked:

- **Shipment logs**
  - creation
  - updates
  - status changes
  - soft delete
- **User logs**
  - role changes
  - status updates
  - admin/HR actions

---

## 📡 API Endpoints

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/login` | User login |

### Users

| Method | Endpoint | Description |
|---|---|---|
| POST | `/users/create` | Create user |
| POST | `/users/change-password` | Change password |
| POST | `/users/change-role` | Change role |
| POST | `/users/change-status` | Toggle status |

### Shipments

| Method | Endpoint | Description |
|---|---|---|
| POST | `/shipments/create` | Create shipment |
| PUT | `/shipments/update` | Update shipment |
| PUT | `/shipments/delete` | Soft delete |
| GET | `/shipments/my` | My shipments |
| GET | `/shipments/all` | All shipments |
| GET | `/shipments/{id}` | Single shipment |

### Salary

| Method | Endpoint | Description |
|---|---|---|
| GET | `/salary/my` | My preview |
| GET | `/salary/my-record` | My record |
| GET | `/salary/all` | All previews |
| GET | `/salary/all-records` | All records |
| POST | `/salary/generate` | Generate salary |
| GET | `/salary/export` | Download Excel |
| GET | `/salary/export-preview` | Preview |

### Analytics

| Method | Endpoint | Description |
|---|---|---|
| GET | `/analytics/dashboard` | Dashboard |
| GET | `/analytics/company-profit` | Profit analytics |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- MySQL

### Installation

```bash
git clone https://github.com/your-username/FinancialTracking.git
cd FinancialTracking

pip install -r requirements.txt
uvicorn main:app --reload
```

### Swagger UI

```
http://127.0.0.1:8000/docs
```

---

## ✅ Project Status

### Completed

- ✅ Authentication & RBAC
- ✅ Shipment module
- ✅ Salary system + Excel export
- ✅ Analytics
- ✅ Audit logging
- ✅ Database schema

### In Progress

- 🔧 Frontend (HTML / CSS / JS)
- 🔧 Charts & filters
- 🔧 UI export tools

---

## 🎓 Academic Context

| Field | Value |
|---|---|
| **University** | Bangor University |
| **Module** | ICE3001 |
| **Project** | Financial Tracking System |
| **Type** | Individual Project |

---

## 📄 License

This project was developed for academic purposes.