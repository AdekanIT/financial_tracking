# 🚚 Financial Tracking and Management System (Backend)

Backend of a logistics financial tracking system built with **FastAPI** and **MySQL**.

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
- Salary calculations  
- Financial dashboards  

---

## 🔐 Authentication Module

Implemented features:

- Staff registration  
- Login with bcrypt password hashing  
- JWT token generation (24h expiration)  
- Swagger **Authorize** integration  
- Protected API routes  

Security libraries used:
- passlib + bcrypt  
- python-jose  

---

## 👥 Role-Based Access Control (RBAC)

| Role | Description |
|------|-------------|
| Owner | View company profit |
| Manager | Full system access |
| Accounting | Salary & finance |
| Supervisor | Shipments & dashboard |
| HR | Staff management |
| Dispatcher / Tracking | Personal data only |

---

## 🚚 Shipments Module

Implemented features:

- Create shipment endpoint  
- Automatic company profit calculation  
- Staff commission per shipment  
- Shipment logging system  

### 💰 Profit Formula
profit = broker_price - driver_pay

Each shipment stores:
- broker price  
- driver pay  
- company profit  
- staff percentage  

---

## 💰 Salary System (In Progress)

Planned features:

- Monthly payroll generation  
- Base salary + shipment commissions  
- Salary history records  
- Company profit calculation  
- Owner profit calculation  

### Salary Formula
Monthly Salary = Base Salary + Shipment Commissions + Custom Bonuses

---

## 📂 Project Structure
FinancialTracking/  
│  
├── data/ # DB connection & security  
├── routers/ # API endpoints  
├── services/ # Business logic  
├── utils/ # Calculations  
└── main.py  


---

## ▶️ Running the Project

Install dependencies:  
pip install -r requirements.txt

Run server:
uvicorn main:app --reload

Open Swagger docs:
http://127.0.0.1:8000/docs

---

## 🚀 Project Status

**Completed**
- Authentication  
- JWT Security  
- RBAC  
- Shipments Module  

**Next Step**
- Salary Calculation Engine