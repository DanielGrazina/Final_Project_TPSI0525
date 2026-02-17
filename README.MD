# ATEC Security Management System

## 📄 Project Overview

A comprehensive **Training Center Management Platform** built as an academic final project. It provides full management of users, courses, classes, scheduling, evaluations, and rooms — with a focus on security best practices.

The system features a **.NET Core Backend API**, a **React Frontend**, and a **Kotlin Mobile App**, implementing industry standards such as JWT Authentication, Two-Factor Authentication (2FA), and Role-Based Access Control.

**Key Features:**
* 🔐 **Secure Authentication:** JWT (JSON Web Tokens) & BCrypt password hashing.
* 🛡️ **Two-Factor Authentication:** Google Authenticator integration with QR Code generation.
* 📧 **Email Flows:** Account Activation and Password Recovery via SMTP.
* 🌐 **Social Login:** OAuth integration architecture (Google/Facebook).
* 👥 **User & Role Management:** Full CRUD with roles (SuperAdmin, Admin, Secretaria, Formador, Formando).
* � **Pedagogical Management:** Areas (with descriptions), Courses, Modules (with room-type requirements), and Classes (Turmas).
* 📅 **Auto-Scheduling:** Intelligent automatic session scheduling that matches modules to rooms of the correct type (Theoretical, Computer Lab, Workshop, Meeting Room) with conflict detection.
* 📊 **Evaluations:** Grade management with role-specific averages — students see their personal average, trainers see per-class averages.
* 🏫 **Room & Availability Management:** Room CRUD with type classification and availability/blocking system for both rooms and trainers.
* 📈 **Statistics Dashboard:** Visual analytics with charts and KPIs.
* 📱 **Mobile App:** Kotlin-based Android companion app.

---

## 🏗️ Architecture

```
Final_Project_TPSI0525/
├── SecManagement_API/      # .NET Core 8 Web API (C#)
│   ├── Controllers/        # REST API endpoints
│   ├── Services/           # Business logic
│   ├── Models/             # Entity Framework models
│   ├── DTOs/               # Data Transfer Objects
│   └── Data/               # DbContext & Seed data
├── SecManagement_Web/      # React Frontend (Vite)
│   └── src/pages/          # UI pages (admin, auth, dashboard)
├── SecManagement_Mobile/   # Kotlin Android App
├── database/
│   └── init.sql            # PostgreSQL schema initialization
└── docker-compose.yml      # Container orchestration
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | .NET Core 8, Entity Framework Core, PostgreSQL |
| Frontend | React 18, Vite, Tailwind CSS, Axios |
| Mobile | Kotlin, Android SDK |
| Auth | JWT, BCrypt, TOTP (2FA), OAuth 2.0 |
| Infrastructure | Docker, Docker Compose |

---

## 📋 Prerequisites

Ensure you have the following installed:
* **Docker Desktop** — Required for the API and PostgreSQL database
* **Node.js** (v18+) — Required for the React frontend

---

## 🚀 How to Run

### 1. Start Backend & Database (Docker)

This initializes the PostgreSQL database, applies the `init.sql` schema, builds the API, and starts the server.

1.  Open your terminal in the project root folder (where `docker-compose.yml` is located).
2.  (Optional) Configure SMTP settings in `SecManagement_API/appsettings.json` for real email sending.
3.  Run:
    ```bash
    docker-compose up -d --build
    ```
4.  Wait for the containers to initialize:
    * **API:** `http://localhost:5000`
    * **Swagger Docs:** `http://localhost:5000/swagger`
    * **Database:** Port `5432`

### 2. Start Frontend (React)

1.  Navigate to the web folder:
    ```bash
    cd SecManagement_Web
    ```
2.  Install dependencies (first time only):
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
4.  Access the application at: **`http://localhost:5173`**

---

## 🧪 Testing Guide

### Authentication & Security

1.  **Registration & Activation:**
    * Register a new account (status defaults to **Inactive**).
    * Check your email (or the API Docker logs) for the activation link.
    * Click the link to activate the account.

2.  **Social Login (Simulation):**
    * On the login screen, click "Sign in with Google".
    * The system simulates the OAuth handshake and logs you in, demonstrating the backend architecture for external providers.

3.  **Two-Factor Authentication (2FA):**
    * Log in and go to the **Dashboard**.
    * Click "Enable 2FA" and scan the QR Code with **Google Authenticator**.
    * Logout and log in again — you will be prompted for the 6-digit code.

4.  **Password Recovery:**
    * On the login screen, click "Forgot Password?" and enter your email.

### Pedagogical Features

5.  **Areas & Courses:**
    * Navigate to Areas → Create an area with a name and **description** → Verify description persists.
    * Create Courses linked to areas.

6.  **Modules & Room Types:**
    * Navigate to Modules → Create a module and set its **Tipo de Sala** (Teórica, Informática, Oficina, Reunião).
    * This determines which room type the auto-scheduler assigns.

7.  **Auto-Scheduling:**
    * Create a Turma (class) with modules that have different room types.
    * Run the auto-scheduler → Verify that IT modules are placed in computer labs, theoretical modules in lecture rooms, etc.

8.  **Evaluations & Averages:**
    * **As a Student (Formando):** The stats card shows "A Minha Média" with your personal grade average.
    * **As a Trainer (Formador):** The stats card shows the average per selected class (Turma).
    * **As Admin:** The stats card shows the global average across all evaluations.

### Default Seed Accounts

| Role | Email | Password |
|------|-------|----------|
| SuperAdmin | `superadmin@123.pt` | `123456` |
| Admin | `admin@123.pt` | `123456` |
| Secretaria | `secretaria@123.pt` | `123456` |
| Formador | `formador001@123.pt` | `123456` |
| Formando | `aluno0001@123.pt` | `123456` |

---

## ⚠️ Important Notes

* **Email Debugging:** If you haven't configured real SMTP credentials, check the API container logs (`docker logs <container_id>`) to see the generated Activation and Reset links.
* **Ports:** Ensure ports `5000`, `5173`, and `5432` are free on your machine.
* **Database Reset:** To reset all data, run `docker-compose down -v` then `docker-compose up -d --build`.

---

**Developed by:**
- Daniel Grazina
- Vitor Andrade
