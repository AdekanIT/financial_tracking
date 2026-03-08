🚚 Financial Tracking and Management System (Backend)






Backend of a logistics financial tracking system built with FastAPI + MySQL.

This project is part of an individual university project focused on developing a real-world financial management platform for logistics companies.

The system provides tools for managing shipments, calculating company profit, handling payroll, and generating financial analytics dashboards.

🛠 Tech Stack

Python 3.11

FastAPI

MySQL

JWT Authentication

Role-Based Access Control (RBAC)

Bcrypt Password Hashing

OpenPyXL (Excel reporting)

Git & GitHub

📌 Project Overview

The system helps logistics companies manage:

Shipments

Staff accounts and roles

Company profit tracking

Payroll & salary calculations

Financial analytics dashboards

Excel financial reports

User activity audit logs

The backend follows a layered architecture, separating API endpoints, business logic, and database access.

🔐 Authentication System

The system implements secure authentication using JWT tokens.

Features:

Staff login system

Password hashing using bcrypt

JWT token generation

Token expiration (24 hours)

Swagger authorization integration

Protected API routes

Security libraries used:

passlib + bcrypt

python-jose

👥 User Management System

The system includes a complete user administration module.

Features:

Create users

Change user password

Change user role

Activate / deactivate user accounts

List system users

View user audit logs

Users are never deleted from the database.
Instead, accounts can be deactivated using:

is_active = false

This preserves historical data.

📜 User Audit Logs

All user changes are recorded in the user_logs table.

Tracked events include:

user_created

password_changed

role_changed

status_changed

Example log:

id	staff	action	changed_by	date
1	Alex	user_created	Manager	2026

This provides a complete audit trail for system activity.

👥 Role-Based Access Control (RBAC)

The system enforces role-based permissions.

Role	Access
Owner	Company financial overview
Manager	Full system access
Accounting	Payroll & financial data
Supervisor	Shipment monitoring
HR	Staff management
Dispatcher / Tracking	Personal data only

Access control is implemented using FastAPI dependency validation.

🚚 Shipments Financial Module

Shipments represent the core operational and financial entity.

Each shipment contains:

broker price

driver pay

company profit

margin percentage

commission percentage

Profit Formula
profit = broker_price - driver_pay

Only shipments with status:

delivered

are used for payroll calculations and analytics.

💰 Payroll & Salary Engine

The payroll system calculates employee salaries based on completed shipments.

Salary Formula
Monthly Salary = Base Salary + Shipment Commissions + Custom Bonuses
Commission Formula
commission = shipment_profit × commission_percentage / 100
Implemented Features

Salary generation by date period

Commission calculation from delivered shipments only

Custom bonus support

Salary history tracking

Duplicate salary protection

Salary API endpoints

RBAC-secured payroll operations

📊 Versioned Salary Records (Audit Trail)

Financial records are never overwritten.

When salary changes:

id	staff	total	active
10	John	60	❌ old
11	John	80	✅ current

Old records remain stored to maintain financial transparency and auditability.

📈 Analytics & Financial Dashboard

The analytics module provides business intelligence metrics.

Implemented analytics:

Company profit trend

Payroll vs profit comparison

Dispatcher performance

Top dispatcher leaderboard

Monthly profit growth indicator

Company KPI dashboard

Example KPI metrics:

Total shipments

Total company profit

Total payroll cost

Net company profit

📊 Excel Financial Reporting

Managers and accounting staff can export payroll reports.

Features:

Salary export to Excel

Employee salary breakdown

Company payroll summary

Automatic tax calculation

Net salary calculation

The generated Excel file includes:

Sheet 1 – Employee Salaries
Sheet 2 – Company Summary

⚙️ System Workflow

The system processes operational and financial data through the following workflow.

Dispatcher creates shipment
        ↓
Shipment stored in database
        ↓
Profit calculated automatically
        ↓
Payroll engine calculates commissions
        ↓
Salary record generated
        ↓
Analytics dashboards update
        ↓
Managers export financial reports

This workflow converts operational logistics activity into financial insights.

🗄 Database Schema

Core tables used in the system:

Table	Purpose
staff	system users and roles
shipments	shipment financial data
salary_records	payroll history
user_logs	user activity audit trail
shipment_logs	shipment status history
📊 Database Relationships
staff
  │
  ├── shipments (dispatcher_id)
  │
  ├── salary_records (staff_id)
  │
  └── user_logs (staff_id)

shipments
  │
  └── shipment_logs (shipment_id)

This design ensures full traceability of financial operations.

📡 API Endpoints
Authentication
POST /auth/login
User Management
POST /users/create
POST /users/change-password
POST /users/change-role
POST /users/change-status
GET  /users
GET  /users/logs
Shipments
POST /shipments/create
Payroll
POST /salary/generate
GET  /salary/my
GET  /salary/all
GET  /salary/export
Analytics
GET /analytics/dashboard
GET /analytics/top-dispatchers
GET /analytics/company-net-profit
GET /analytics/payroll-vs-profit
GET /analytics/profit-growth
GET /analytics/leaderboard
GET /analytics/kpi
📂 Project Structure
FinancialTracking/

data/
    db.py
    security.py

routers/
    auth.py
    users.py
    shipments.py
    salary.py
    analytics_router.py

services/
    auth_service.py
    user_service.py
    salary_service.py
    salary_export_service.py
    analytics_scripts.py

utils/
    calculations.py

main.py
▶️ Running the Project

Install dependencies:

pip install -r requirements.txt

Run server:

uvicorn main:app --reload

Open API documentation:

http://127.0.0.1:8000/docs
🚀 Project Status
Completed Modules

Authentication & Security

User Management System

RBAC Authorization

Shipments Financial Engine

Payroll & Salary System

Financial Analytics

Excel Reporting

Audit Logging

🎯 System Architecture

The platform follows a layered architecture.

Client
   ↓
FastAPI Routers (API Layer)
   ↓
Service Layer (Business Logic)
   ↓
Database Layer (MySQL)

This structure improves maintainability, scalability, and modularity.

👨‍🎓 Academic Project

Bangor University
ICE3001 Individual Project

Financial Tracking and Management Website for Logistics Companies