# 🚚 Financial Tracking and Management System (Backend)

Backend of a logistics financial tracking system built with **FastAPI + MySQL**.

This project is part of an individual university project focused on creating a real-world financial management platform for logistics companies.

---

## 🛠 Tech Stack

- Python 3.11
- FastAPI
- MySQL
- JWT Authentication
- Role-Based Access Control (RBAC)
- Git & GitHub

---

## 📌 Project Overview

The system helps logistics companies manage:

- Shipments
- Staff accounts and roles
- Company profit
- Payroll & salary calculations
- Financial dashboards (next module)

---

# 🔐 Authentication Module

Implemented features:

- Staff registration
- Login with bcrypt password hashing
- JWT token generation (24h expiration)
- Swagger Authorize integration
- Protected API routes

Security libraries used:

- passlib + bcrypt
- python-jose

---

# 👥 Role-Based Access Control (RBAC)

| Role | Access |
|---|---|
| Owner | View company profit |
| Manager | Full system access |
| Accounting | Salary & finance |
| Supervisor | Shipments & dashboard |
| HR | Staff management |
| Dispatcher / Tracking | Personal data |

---

# 🚚 Shipments Financial Module

Shipments are the **financial core** of the system.

Implemented features:

- Create shipment endpoint
- Automatic company profit calculation
- Dispatcher margin KPI
- Commission per shipment
- Shipment logging system

### 💰 Profit Formula


profit = broker_price - driver_pay


Each shipment stores:

- broker price  
- driver pay  
- company profit  
- margin percentage (KPI)  
- commission percentage (salary)

---

# 💰 Payroll & Salary Engine ✅

The payroll module is fully implemented.

### Salary Formula


Monthly Salary = Base Salary + Shipment Commissions + Custom Bonuses


### Commission Formula


commission = shipment_profit × commission_percentage / 100


### Implemented Features

- Salary generation per period
- Commission from **delivered shipments only**
- Custom bonus support
- Salary history records
- Duplicate salary generation protection
- Salary API endpoints
- Fully integrated with RBAC & JWT

---

# 📊 Versioned Salary Records (Audit Trail)

Financial records are **never deleted**.

If salary is recalculated:

| id | staff | total | active |
|---|---|---|---|
| 10 | John | 60 | ❌ old |
| 11 | John | 80 | ✅ current |

This ensures:
- Audit trail
- Financial transparency
- Error correction workflow

---

# 📡 API Endpoints

## Authentication
- POST `/auth/register`
- POST `/auth/login`

## Shipments
- POST `/shipments/create`

## Payroll / Salary
- POST `/salary/generate`
- GET `/salary/my`
- GET `/salary/all`

---

## 📂 Project Structure

```
FinancialTracking/
│
├── data/        # DB connection & security
├── routers/     # API endpoints
├── services/    # Business logic
├── utils/       # Calculations
└── main.py
```
    
---

# ▶️ Running the Project

Install dependencies:


pip install -r requirements.txt


Run server:


uvicorn main:app --reload


Swagger docs:


http://127.0.0.1:8000/docs


---

# 🚀 Project Status

## Completed Modules
- Authentication & Security
- RBAC Authorization
- Shipments Financial Engine
- Payroll & Salary System

## Next Module
📊 Financial Dashboard & Analytics

---

## 👨‍🎓 Academic Project

Bangor University  
ICE3001 Individual Project  
**Financial Tracking and Management Website for Logistics Companies**