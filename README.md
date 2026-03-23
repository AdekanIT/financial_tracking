# 🚚 Financial Tracking and Management System

![FastAPI](https://img.shields.io/badge/FastAPI-backend-green)
![MySQL](https://img.shields.io/badge/Database-MySQL-blue)
![JWT](https://img.shields.io/badge/Auth-JWT-orange)

Backend of a logistics financial tracking system built with **FastAPI + MySQL**.

The project is being extended with a web-based interface using **HTML, CSS, and JavaScript**, which will allow users to interact with the system through a browser dashboard.

---

# 🛠 Tech Stack

| Technology | Purpose |
|------------|--------|
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

<!-- START FRONTEND ARCHITECTURE -->
# 🌐 Frontend Architecture (In Development)

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
<!-- END FRONTEND ARCHITECTURE -->

<!-- START WEB INTERFACE PAGES -->
# 🌐 Web Interface Pages

| Page | Purpose |
|-----|------|
| Login | Staff authentication |
| Dashboard | Company financial overview |
| Shipments | Shipment management |
| Salary | Employee salary management |
| Users | Staff administration |
| Archive | Historical shipment records |
<!-- END WEB INTERFACE PAGES -->

## Planned Website Pages

The web interface will include the following pages:

| Page | Purpose |
|-----|------|
| Login | Staff authentication |
| Dashboard | Company financial overview |
| Shipments | Shipment management |
| Salary | Employee salary management |
| Users | Staff administration |
| Archive | Historical shipment records |

---

# 📌 Project Overview

The system helps logistics companies manage:

- 🚚 Shipments
- 👥 Staff accounts and roles
- 💰 Company profit tracking
- 📊 Payroll & salary calculations
- 📈 Financial analytics dashboards
- 📄 Excel financial reports
- 📜 User activity audit logs

The backend follows a **layered architecture**, separating:

- API endpoints
- business logic
- database access

---



---

# 🔐 Authentication System

The system implements **secure authentication using JWT tokens**.

### Features

- Staff login system
- Password hashing with **bcrypt**
- JWT token generation
- Token expiration (24 hours)
- Swagger authorization integration
- Protected API routes

### Security Libraries
passlib + bcrypt
python-jose

---

<!-- START USER MANAGEMENT -->
# 👥 User Management System

Users are **never deleted**, instead:

```python
is_active = False
```

### Features

- Create users
- Change user password
- Change user role
- Activate / deactivate user accounts
- List system users
- View user audit logs

Users are **never deleted** from the database.

Instead:

```python

```
is_active = False

This preserves historical data.

## 📜 User Audit Logs

Tracked events:

- `user_created`
- `password_changed`
- `role_changed`
- `status_changed`

### Example Log

| ID  | Staff | Action       | Changed By | Date |
|-----|-------|-------------|------------|------|
| 1   | Alex  | user_created | Manager    | 2026 |

This provides a complete **audit trail for system activity**.

---

<!-- START RBAC -->
## 👥 Role-Based Access Control (RBAC)

| Role | Access |
|------|-------|
| Owner | Full company financial overview |
| Manager | Full system access |
| Accounting | Payroll & financial data |
| Supervisor | Shipment monitoring |
| HR | Staff management |
| Dispatcher / Tracking | Personal shipment data |

RBAC is enforced using **FastAPI dependency validation**.
<!-- END RBAC -->
---

<!-- START SHIPMENTS MODULE -->
## 🚚 Shipments Financial Module

Each shipment contains:

- broker price
- driver pay
- company profit
- margin percentage
- commission percentage

### Profit Formula

```text
profit = broker_price - driver_pay
```
Only shipments with status delivered are used for payroll and analytics.

<!-- END SHIPMENTS MODULE -->

### Profit Formula
profit = broker_price - driver_pay


Only shipments with status:


delivered


are used for payroll calculations and analytics.

---

<!-- START PAYROLL MODULE -->
## 💰 Payroll & Salary Engine

### Salary Formula

Monthly Salary = Base Salary + Shipment Commissions + Custom Bonuses


### Commission Formula

commission = shipment_profit × commission_percentage / 100


### Features
- Salary generation by date period
- Commission calculation from delivered shipments
- Custom bonus support
- Salary history tracking
- Duplicate salary protection
- RBAC-secured payroll endpoints

### Versioned Salary Records (Audit Trail)

| ID  | Staff | Total | Active |
|-----|-------|-------|--------|
| 10  | John  | 60    | ❌ Old |
| 11  | John  | 80    | ✅ Current |

<!-- END PAYROLL MODULE -->

### Salary Formula


Monthly Salary = Base Salary + Shipment Commissions + Custom Bonuses


### Commission Formula


commission = shipment_profit × commission_percentage / 100


### Implemented Features

- Salary generation by date period
- Commission calculation from delivered shipments
- Custom bonus support
- Salary history tracking
- Duplicate salary protection
- Salary API endpoints
- RBAC-secured payroll operations

---

## 📊 Versioned Salary Records (Audit Trail)

Financial records are **never overwritten**.

| ID | Staff | Total | Active |
|----|------|------|------|
| 10 | John | 60 | ❌ Old |
| 11 | John | 80 | ✅ Current |

Old records remain stored to maintain **financial transparency and auditability**.

---

## 📈 Analytics & Financial Dashboard

The analytics module provides **business intelligence metrics**.

### Implemented Analytics

- Company profit trend
- Payroll vs profit comparison
- Dispatcher performance
- Top dispatcher leaderboard
- Monthly profit growth indicator
- Company KPI dashboard

### Example KPIs

- Total shipments
- Total company profit
- Total payroll cost
- Net company profit

---

## 📊 Excel Financial Reporting

Managers and accounting staff can export payroll reports.

### Features

- Salary export to Excel
- Employee salary breakdown
- Company payroll summary
- Automatic tax calculation
- Net salary calculation

Generated Excel file includes:


Sheet 1 – Employee Salaries
Sheet 2 – Company Summary


---

## ⚙️ System Workflow

User opens web dashboard  
↓  
User logs into the system  
↓  
Dashboard loads financial data via API  
↓  
Dispatcher creates shipment  
↓  
Shipment stored in database  
↓  
Profit calculated automatically  
↓  
Salary engine calculates commissions  
↓  
Salary record generated  
↓  
Analytics data displayed on dashboard  
↓  
Managers export financial reports  

---

This workflow converts operational logistics activity into financial insights.

---

## 🗄 Database Schema

| Table | Purpose |
|------|------|
| staff | system users and roles |
| shipments | shipment financial data |
| salary_records | payroll history |
| user_logs | user activity audit trail |
| shipment_logs | shipment status history |

---

## 📊 Database Relationships


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
  

---

## 📡 API Endpoints  

### Authentication  


POST /auth/login  


### User Management  


POST /users/create  
POST /users/change-password  
POST /users/change-role  
POST /users/change-status  
GET /users  
GET /users/logs  


### Shipments  


POST /shipments/create  


### Payroll  

  
POST /salary/generate  
GET /salary/my  
GET /salary/all  
GET /salary/export  


### Analytics  


GET /analytics/dashboard  
GET /analytics/top-dispatchers  
GET /analytics/company-net-profit  
GET /analytics/payroll-vs-profit  
GET /analytics/profit-growth  
GET /analytics/leaderboard  
GET /analytics/kpi  


---

## 📂 Project Structure

FinancialTracking/

data/  
├── db.py  
└── security.py  
  
routers/  
├── auth.py  
├── users.py  
├── shipments.py  
├── salary.py  
├── analytics_router.py  
  
services/  
├── auth_service.py  
├── user_service.py  
├── shipment_service.py  
├── salary_service.py  
├── salary_export_service.py  
└── analytics_service.py  

utils/  
└── calculations.py  

templates/  
├── archive/archive.html  
├── auth/auth.html  
├── dashboard/dashboard.html  
├── salary/salary.html  
├── shipment/shipment.html  
└── users/users.html  

static/  
├── css/style.css  
└── js/  
├── api.js  
├── archive.js  
├── auth.js  
├── dashboard.js  
├── salary.js  
├── shipment.js  
└── user.js    
  
main.py  

---

## 🌍 Frontend – Backend Interaction

The website interacts with the backend using REST API requests.

Browser (HTML + JS)  
↓  
FastAPI Routers  
↓  
Service Layer  
↓  
MySQL Database  

JavaScript fetch requests retrieve data from API endpoints and dynamically update the dashboard interface.

---

## ▶️ Running the Project

### Install dependencies


pip install -r requirements.txt


### Run server


uvicorn main:app --reload


### Open API documentation


http://127.0.0.1:8000/docs


---

## 🚀 Project Status

### Completed Modules

- Authentication & Security
- User Management System
- RBAC Authorization
- Shipments Financial Engine
- Payroll & Salary System
- Financial Analytics
- Excel Reporting
- Audit Logging


### Frontend Development

- Web interface architecture designed
- Frontend folder structure prepared
- HTML dashboard pages planned
- Frontend implementation in progress

---

## 🎯 System Architecture


Browser (HTML + JS)
↓
FastAPI Routers (API Layer)
↓
Service Layer (Business Logic)
↓
Database Layer (MySQL)


This structure improves:

- maintainability
- scalability
- modularity

---

## 👨‍🎓 Academic Project

**Bangor University**  
ICE3001 Individual Project  

**Financial Tracking and Management Website for Logistics Companies**