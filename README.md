# 🚚 Financial Tracking and Management System

![FastAPI](https://img.shields.io/badge/FastAPI-backend-green)
![MySQL](https://img.shields.io/badge/Database-MySQL-blue)
![JWT](https://img.shields.io/badge/Auth-JWT-orange)

Backend of a logistics financial tracking system built with **FastAPI + MySQL**.

The project is being extended with a web-based interface using **HTML, CSS, and JavaScript**, which will allow users to interact with the system through a browser dashboard.

---

## 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| Python 3.11 | Main programming language |
| FastAPI | Backend API framework |
| MySQL | Relational database |
| JWT | Authentication system |
| RBAC | Role-Based Access Control |
| Bcrypt | Password hashing |
| OpenPyXL | Excel report generation |
| HTML | Website structure |
| CSS | User interface styling |
| JavaScript | Client-side logic |
| Chart.js | Financial charts and dashboards |
| Git & GitHub | Version control |

---

## 🌐 Frontend Architecture (In Development)

The frontend is currently being developed with:

- HTML templates
- CSS styling
- JavaScript client-side logic
- Chart.js for financial dashboards

The web interface communicates with the FastAPI backend via REST API endpoints.

Current progress:

- Frontend folder structure prepared
- Pages for Login, Dashboard, Shipments, Salary, Users, and Archive planned
- Implementation in progress

---

## 🌐 Web Interface Pages

| Page | Purpose |
|------|---------|
| Login | Staff authentication |
| Dashboard | Company financial overview |
| Shipments | Shipment management |
| Salary | Employee salary management |
| Users | Staff administration |
| Archive | Historical shipment records |

---

## 📌 Project Overview

The system helps logistics companies manage:

- 🚚 Shipments
- 👥 Staff accounts and roles
- 💰 Company profit tracking
- 📊 Payroll & salary calculations
- 📈 Financial analytics dashboards
- 📄 Excel financial reports
- 📜 User activity audit logs

---

## 🔐 Authentication System

The system implements **secure authentication using JWT tokens**.

### Features

- Staff login system
- Password hashing with **bcrypt**
- JWT token generation
- Token expiration (24 hours)
- Swagger authorization integration
- Protected API routes

---

## 🔄 Recent Updates & Improvements

### 🚚 Shipment System Improvements

#### Partial Update (NEW)

Shipment update now supports **partial JSON update**.
You no longer need to send the full shipment object.

**Example:**

```json
{
  "shipment_id": 11,
  "external_reference": "BROKER-1003"
}
```

#### Reference System Upgrade

System now supports **two references**:

- `company_reference` (internal)
- `external_reference` (broker)

Both can now be updated manually.

**Example:**

```json
{
  "shipment_id": 11,
  "company_reference": "EML0420260003",
  "external_reference": "BROKER-1003"
}
```

#### Reference Validation

Before update:

- System checks uniqueness of both references
- Prevents duplicate values

Result:

- No duplicate shipment references
- Improved data integrity

---

### 🧾 Soft Delete Implementation

Shipments are no longer permanently deleted.

Instead:

```
is_deleted = 1
deleted_at = NOW()
deleted_by = staff_id
```

#### Important Rule

Deleted shipments:

- Stay in database
- Stay in logs
- **DO NOT** affect:
  - Salary
  - Profit
  - Analytics
  - Dashboard
  - KPIs

---

### 💰 Payroll System Update

Salary calculation now strictly uses:

- `shipment_status = 'delivered'`
- `is_deleted = 0`

#### Result

Deleted shipments:

- Do NOT affect salary
- Do NOT give commission
- Do NOT affect payroll totals

---

### 📊 Analytics Update

All analytics now exclude deleted shipments:

```
is_deleted = 0
```

#### Affected Modules

- Dashboards
- KPI
- Leaderboard
- Profit trends
- Dispatcher performance

#### Result

Analytics now reflects only active business data.

---

### 🧠 Business Logic Enhancements

#### Profit Formula

```
profit = broker_price - driver_pay
```

#### Auto Recalculation

If updated:

- `broker_price`
- `driver_pay`

System automatically recalculates:

- `profit`
- `margin`

---

### 📜 Logging System

All changes are tracked:

- Shipment creation
- Updates
- Reference changes
- Deletion

Each log includes:

- Field name
- Old value
- New value
- User

---

## 👥 User Management System

Users are never deleted.

Instead:

```
is_active = False
```

---

## 👥 RBAC (Role-Based Access Control)

| Role | Access |
|------|--------|
| Owner | Full overview |
| Manager | Full system |
| Accounting | Financial data |
| Supervisor | Monitoring |
| HR | Staff management |
| Dispatcher | Own shipments |

---

## 🚚 Shipments Financial Module

Each shipment contains:

- Broker price
- Driver pay
- Profit
- Margin
- Commission

Only shipments with:

```
shipment_status = delivered
AND is_deleted = 0
```

are used in calculations.

---

## 💰 Payroll & Salary Engine

### Salary Formula

```
Salary = Base + Shipment Bonus + Bonus
```

### Commission

```
commission = profit × percentage / 100
```

---

## 📈 Analytics & Dashboard

Provides:

- Profit trends
- Dispatcher leaderboard
- KPI dashboard
- Payroll vs profit
- Growth indicators

---

## 🗄 Database Schema

| Table | Purpose |
|-------|---------|
| staff | Users |
| shipments | Shipment data |
| salary_records | Payroll |
| user_logs | Audit |
| shipment_logs | Shipment audit |

---

## 📡 API Endpoints

### Auth

```
POST /auth/login
```

### Users

```
POST /users/create
POST /users/change-password
POST /users/change-role
POST /users/change-status
```

### Shipments

```
POST /shipments/create
PUT  /shipments/update
PUT  /shipments/delete
```

### Salary

```
POST /salary/generate
GET  /salary/all
```

### Analytics

```
GET /analytics/dashboard
GET /analytics/kpi
```

---

## 📂 Project Structure

```
FinancialTracking/
├── data/
├── routers/
├── services/
├── utils/
├── templates/
├── static/
└── main.py
```

---

## ▶️ Run Project

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

Swagger: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 🚀 Project Status

### Completed

- ✅ Authentication
- ✅ RBAC
- ✅ Shipments
- ✅ Salary
- ✅ Analytics
- ✅ Logging

### In Progress

- 🔧 Frontend UI

---

## 🎯 Architecture

```
Browser
  ↓
FastAPI
  ↓
Services
  ↓
MySQL
```

---

## 👨‍🎓 Academic Project

- **University:** Bangor University
- **Module:** ICE3001
- **Project:** Financial Tracking System