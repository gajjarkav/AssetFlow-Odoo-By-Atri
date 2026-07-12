# 🚀 AssetFlow ERP

**AssetFlow** is an ultra-modern, enterprise-grade Asset & Resource Management Platform. Designed for seamless tracking, allocation, and maintenance of company assets, it provides a unified hub for organizations to manage everything from laptops and vehicles to meeting rooms and software licenses.

---

## ✨ Key Features

- **🛡️ Role-Based Access Control (RBAC):** Distinct roles for Admin, Asset Manager, Department Head, and Employee.
- **📦 Asset Catalog & Lifecycle:** Complete CRUD operations, automated tagging, condition tracking, and acquisition cost management.
- **🔄 Custody & Allocations:** Assign assets to employees or departments. Prevents double-allocation natively.
- **📅 Shared Resource Booking:** Book shared assets (e.g., meeting rooms, projectors) with built-in time-overlap conflict prevention.
- **🛠️ Maintenance Workflows:** End-to-end maintenance state machine (PENDING → APPROVED → IN_PROGRESS → RESOLVED).
- **📋 Physical Audits:** Cycle counts and audits. Automatically marks missing items as LOST.
- **📊 Real-time Dashboard & Analytics:** Live operational KPIs, pie charts for department utilization, and CSV exports.
- **🔔 Notifications System:** In-app inbox triggered by transfers, bookings, and maintenance events.
- **🎨 Premium UI/UX:** Ultra-modern design using Tailwind CSS v4, Framer Motion animations, dark/light mode toggle with view transitions, and custom gradients.

---

## 🛠️ Technology Stack

**Frontend:**
- **React 18** + **Vite** (Ultra-fast HMR)
- **TypeScript**
- **Tailwind CSS v4** (Modern utility-first styling)
- **Framer Motion** (Fluid animations & micro-interactions)
- **Recharts** (Data visualization & Donut charts)
- **Lucide React** (Beautiful icons)
- **React Router** & **React Query** (State and routing)

**Backend:**
- **FastAPI** (High-performance Python async framework)
- **SQLAlchemy 2.0** (Async ORM)
- **Pydantic** (Data validation)
- **Uvicorn** (ASGI server)
- **SQLite / PostgreSQL** (Database layer)

---

## 🚀 Getting Started

### 1. Backend Setup (FastAPI)

1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies using `uv` (or `pip`):
   ```bash
   uv sync
   # or pip install -r requirements.txt
   ```
3. Set up your environment variables by copying the example file:
   ```bash
   cp .env.example .env
   ```
4. Start the backend server:
   ```bash
   uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
   ```
   *The API Docs will be available at: http://localhost:8000/api/v1/docs*

### 2. Frontend Setup (React/Vite)

1. Open a new terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   *The application will be available at: http://localhost:5173*

---

## 🌐 Exposing Locally via Ngrok

AssetFlow is pre-configured to easily run through ngrok tunnels without CORS or Invalid Host Header issues.

1. **Start the Frontend Tunnel:**
   Run the following command in your terminal to expose the Vite server:
   ```bash
   ngrok http 5173
   ```
2. **Access the App:**
   Copy the `https://<your-id>.ngrok-free.app` URL and open it on your phone or share it with others! 
   
   *(Note: The frontend is configured with a Vite proxy, so it will automatically and securely route `/api/v1` requests back to your local port 8000. You do **not** need to run a second ngrok tunnel for the backend unless you want direct API access!)*

---

## 📂 Project Structure

```text
AssetFlow-Odoo-By-Atri/
├── backend/
│   ├── src/
│   │   ├── api/          # API Routers and Endpoints
│   │   ├── core/         # Config, Security, Constants
│   │   ├── database/     # SQLAlchemy sessions and DB setup
│   │   ├── models/       # ORM Database Models
│   │   └── schemas/      # Pydantic schemas (Types/Validation)
│   └── .env              # Backend configuration
│
├── frontend/
│   ├── src/
│   │   ├── api/          # Axios Client & Endpoint Definitions
│   │   ├── components/   # Reusable UI components (Sidebar, Topbar, Cards)
│   │   ├── context/      # React Context (AuthContext)
│   │   ├── pages/        # Dashboard, Assets, Auth, Reports, etc.
│   │   └── index.css     # Global Styles & Dark Theme Overrides
│   ├── package.json      # Frontend dependencies
│   └── vite.config.ts    # Vite bundler & Proxy config
│
└── README.md             # This file
```

---

*Built with ❤️ for ultra-modern enterprise management.*