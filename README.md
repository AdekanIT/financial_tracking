# 🚛 Financial Tracking and Management System

A full-stack platform for logistics companies to manage shipments, staff operations, salary records, financial reporting, and analytics — built with **FastAPI**, **MySQL**, and **Vanilla JavaScript**.

---

## 📌 Overview

The **Financial Tracking and Management System (FTMS)** is a centralized platform designed for logistics companies. It covers the full operational cycle — from shipment creation to salary payouts and profit analytics — with role-based access control, a complete audit trail, and a polished frontend interface.

The system is **fully complete** and ready for deployment.

### Key Capabilities

- Shipment CRUD with soft delete and financial auto-calculation
- Dispatcher assignment and commission tracking
- Salary preview, generation, and Excel export
- Company profit analytics with period-based breakdowns
- JWT authentication with role-based access control
- Full audit logging for shipments and user changes
- Interactive dashboard with charts and filters
- Archive module with multi-field search

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
| **HTML / CSS / JS** | Frontend interface |
| **Chart.js** | Dashboard visualizations |

---

## 🏗️ Architecture

The project follows a clean layered structure:

```
routers/    → API endpoints
services/   → Business logic
data/       → Database connection & auth helpers
utils/      → Shared calculation logic
templates/  → Frontend pages
static/     → JS & CSS assets
```

---

## 🗂️ Project Structure

```
FinancialTracking/
├── data/
│   ├── db.py
│   └── datasets/
│       └── FTMS_full_dump.sql
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
│   ├── dashboard/
│   ├── shipments/
│   ├── salary/
│   ├── users/
│   └── archive/
├── static/
│   ├── css/
│   └── js/
├── main.py
├── .env
└── requirements.txt
```

---

## 🗄️ Database Setup

A full MySQL database dump is included in the project for easy setup and testing.

### Step 1 — Create the Database

```sql
CREATE DATABASE financial_tracking;
```

### Step 2 — Import the Dump

The dump file is located at:

```
data/datasets/FTMS_full_dump.sql
```

**Option A — MySQL Workbench**

1. Go to **Server → Data Import**
2. Select **Import from Self-Contained File**
3. Choose file: `data/datasets/FTMS_full_dump.sql`
4. Select target schema: `financial_tracking`
5. Click **Start Import**

**Option B — Command Line**

```bash
mysql -u root -p financial_tracking < data/datasets/FTMS_full_dump.sql
```

### What's Included in the Dump

The dump file contains the full database structure (tables, relationships, constraints) for all six core tables — `staff`, `companies`, `shipments`, `salary_records`, `shipment_logs`, and `user_logs` — along with preloaded test data for immediate usage.

### Step 3 — Configure Environment

Create a `.env` file in the project root with your local MySQL credentials:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=financial_tracking
SECRET_KEY=your_secret_key
ALGORITHM=HS256
```

> ⚠️ This database is intended for **development and testing only**. Do not store real credentials in `.env`. Make sure your `.env` matches your local MySQL configuration.

---

## 🗃️ Database Schema

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

| Role | Access Level |
|---|---|
| `manager` | Full system access |
| `supervisor` | Monitoring, analytics |
| `dispatcher` | Own shipments only |
| `accounting` | Financial & salary data |
| `hr` | Staff management |
| `tracking` | Shipment tracking |

---

## 🚚 Shipment Module

- Create, update, and soft-delete shipments
- Internal reference auto-generated
- Dispatcher assignment with commission tracking
- Advanced filters, search, and date-based filtering
- Staff full name stored as snapshot
- Auto-calculated profit:

```
profit = broker_price - driver_pay
```

- Soft delete system: `is_deleted`, `deleted_at`, `deleted_by`

---

## 💰 Salary Module

### Calculation Logic

```
profit        = broker_price - driver_pay
commission    = profit × dispatcher_commission_percent / 100

gross_salary  = base_salary + shipment_bonus + bonus
tax_amount    = gross_salary × tax_percent / 100
total_salary  = gross_salary - tax_amount
```

### Features

- Salary preview (all staff / personal) before generation
- Official salary record creation
- Name normalization (`john smith → John Smith`)
- Duplicate name handling via `staff_id`
- Excel export with Employee Salaries and Company Summary sheets
- Browser preview for exported reports
- Custom popup UI (no browser alerts)

---

## 📊 Analytics Module

Role-based dashboard with profit analytics grouped by day, week, or month. Only delivered shipments are counted.

| Component | Logic |
|---|---|
| **Contribution** (donut chart) | Current selected period only |
| **Trend** (line chart) | Historical performance over time |
| **Bar** (stacked chart) | Period-to-period comparison |
| **Staff Breakdown** (table) | Individual staff metrics |

### Example Response

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

## 📦 Archive Module

- Fully frontend-driven filtering (no additional backend endpoints)
- Uses the existing `/shipments/all` endpoint
- Multi-field search: company reference, broker reference, broker name, dates
- Financial summaries per search result

---

## 📜 Audit Logging

All changes are tracked automatically:

- **Shipment logs** — creation, updates, status changes, soft delete
- **User logs** — role changes, status updates, admin/HR actions

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
| POST | `/users/change-status` | Toggle active status |

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
| GET | `/salary/my-record` | My official record |
| GET | `/salary/all` | All previews |
| GET | `/salary/all-records` | All official records |
| POST | `/salary/generate` | Generate salary |
| GET | `/salary/export` | Download Excel |
| GET | `/salary/export-preview` | Browser preview |

### Analytics

| Method | Endpoint | Description |
|---|---|---|
| GET | `/analytics/dashboard` | Dashboard data |
| GET | `/analytics/company-profit` | Profit analytics |

---

## 🎨 Frontend Highlights

- Unified sidebar navigation across all pages
- Archive integrated into main navigation
- Custom modal dialogs (no default browser alerts)
- Chart animations with smooth transitions
- Improved UX for date inputs (auto-formatting)
- Responsive layout

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- MySQL

### Installation

```bash
git clone https://github.com/AdekanIT/financial_tracking.git
cd financial_tracking

pip install -r requirements.txt
uvicorn main:app --reload
```

### Access

| URL | Description |
|---|---|
| `http://127.0.0.1:8000` | Application |
| `http://127.0.0.1:8000/docs` | Swagger API docs |

---

## ✅ Project Status

**Status: Complete** 🎉

All planned modules and features have been fully implemented, tested, and finalized.

### Completed

- ✅ Authentication & role-based access control
- ✅ Shipment module with soft delete
- ✅ Salary system + Excel export
- ✅ Analytics dashboard with charts
- ✅ Audit logging
- ✅ Database schema
- ✅ Archive module
- ✅ Frontend UI
- ✅ Bug fixing & edge cases
- ✅ UI polishing
- ✅ Data validation
- ✅ Final testing

### Future Improvements

- Advanced analytics & reporting
- Mobile responsiveness
- Notifications system
- Performance optimization

---

## 🎓 Academic Context

| Field | Value |
|---|---|
| **University** | Bangor University |
| **Module** | ICE3001 |
| **Project** | Financial Tracking System |
| **Type** | Individual Project |
| **Student** | Dilmurod Yakhshiboev |
| **Student ID** | B2201051 |

---

## 📄 License

This project was developed for academic purposes.

---

🔗 **Repository**: [github.com/AdekanIT/financial_tracking](https://github.com/AdekanIT/financial_tracking)