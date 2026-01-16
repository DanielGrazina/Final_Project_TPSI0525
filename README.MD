# ATEC Security Management System

> **⚠️ STATUS: WORK IN PROGRESS**
> This project is beign developed as an academic final project. Features are being optimized, and new functionality is being added.

## 📄 Project Overview

This is a comprehensive Web Application for User Management with a strong focus on security. It features a .NET Core Backend and a React Frontend, implementing industry standards such as JWT Authentication, Two-Factor Authentication (2FA), and Role-Based Access Control.

**Key Features:**
* 🔐 **Secure Authentication:** JWT (JSON Web Tokens) & BCrypt hashing.
* 🛡️ **2FA:** Google Authenticator integration (QR Code generation).
* 📧 **Email Flows:** Account Activation and Password Recovery via SMTP.
* 🌐 **Social Login:** OAuth integration architecture (currently simulating Google/Facebook flows).
* 👥 **User Management:** Full CRUD capabilities.

---

## 📋 Prerequisites

Ensure you have the following installed on your machine:
* **Docker Desktop** (Required to run the API and PostgreSQL Database)
* **Node.js** (Required to run the Frontend)

---

## 🚀 How to Run

The project is split into infrastructure (Backend + DB) running on Docker, and the Frontend running locally.

### 1. Start Backend & Database (Docker)
This step initializes the PostgreSQL database, applies the `init.sql` script, builds the API, and starts the server.

1.  Open your terminal in the project root folder (where `docker-compose.yml` is located).
2.  (Optional) Configure your SMTP settings in `SecManagement_API/appsettings.json` for real email sending.
3.  Run the following command:
    ```bash
    docker-compose up -d --build
    ```
4.  Wait for the containers to initialize.
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

To test the core security features, follow this flow:

1.  **Registration & Activation:**
    * Register a new account. The status will default to **Inactive**.
    * Check your email (or the API Docker logs) for the activation link.
    * Click the link to activate the account.

2.  **Social Login (Simulation):**
    * On the login screen, click "Sign in with Google".
    * The system simulates the OAuth handshake and logs you in without a password, demonstrating the backend architecture for external providers.

3.  **Two-Factor Authentication (2FA):**
    * Log in and go to the **Dashboard**.
    * Click "Enable 2FA".
    * Scan the QR Code with **Google Authenticator**.
    * Logout and try to log in again. You will be prompted for the 6-digit code.

4.  **Password Recovery:**
    * On the login screen, click "Forgot Password?".
    * Enter your email to receive a secure reset link.

---

## ⚠️ Important Notes

* **Email Debugging:** If you haven't configured real SMTP credentials, check the API container logs (`docker logs <container_id>`) to see the generated Activation and Reset links.
* **Ports:** Ensure ports `5000`, `5173`, and `5432` are free on your machine.

---
**Developed by:** 
- Daniel Grazina
- Vitor Andrade