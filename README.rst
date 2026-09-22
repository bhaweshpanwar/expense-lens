=============================================================
ExpenseLens - Enterprise Expense Intelligence & Advisory Platform
=============================================================

Overview
========

ExpenseLens is a full-stack financial analytics and expense management platform engineered for small to medium businesses. The platform bridges traditional relational ledger accounting with modern artificial intelligence, combining relational transaction integrity, automated statistical anomaly detection, multimodal computer vision OCR, and high-parameter strategic financial reasoning.

The application allows business owners to record expenses, track multi-sector spending trends, detect operational outliers, import transaction records in bulk, scan physical receipts, and receive strategic budget optimization recommendations powered by high-parameter language models.


Architecture and Technology Stack
=================================

The platform is designed with a decoupled client-server architecture:

Frontend Layer
--------------
- **Framework**: React 18, Vite build tool
- **Styling**: Tailwind CSS with custom CSS variable tokens
- **Routing**: React Router DOM (v6) with protected route enforcement
- **Icons**: Lucide React
- **Internationalization**: react-i18next with runtime locale switching (English and Hindi)
- **State Management**: React Context API (`AuthContext`, `ExpenseContext`)

Backend Layer
-------------
- **Runtime**: Node.js, Express.js
- **Database Driver**: `pg` (Node Postgres Connection Pool)
- **Security**: JWT (JSON Web Tokens) with 24-hour expiration, bcryptjs password hashing
- **File Handling**: Multer memory storage
- **Scheduling**: Node-cron background daemon
- **CORS**: Configured for local development across development ports

Database Layer
--------------
- **Engine**: PostgreSQL 16
- **Architecture**: Relational schema with UUID primary keys, normalized foreign keys, and soft deletion (`is_deleted` flags)
- **Abstraction**: Custom database views (`active_transactions`) ensuring soft-deleted transactions are excluded from accounting calculations

Artificial Intelligence Layer
-----------------------------
- **NVIDIA NIM Cloud API**:
  - `meta/llama-3.2-11b-vision-instruct`: Multimodal vision model for optical character recognition (OCR) of printed and handwritten physical receipts.
  - `nvidia/nemotron-3-ultra-550b-a55b`: 550-billion parameter reasoning model providing strategic business expense analysis, category cutback targets, and budget limit optimization.
- **Python AI Microservice**:
  - FastAPI service providing local rule-based heuristics and failover endpoints.


Core Features and Functional Capabilities
=========================================

1. Interactive Financial Dashboard
----------------------------------
The primary dashboard aggregates operational financial health in real time:

- **Metric Cards**: Monthly budget ceiling, total spending, budget variance (surplus vs. deficit), and utilization percentages.
- **Dynamic Visual Progress Bar**: Visual gauge with color shifts indicating healthy spend versus budget overrun thresholds.
- **Sector Breakdown Chart**: Bar and pie representations of total spend categorized by business operational areas.
- **Top Vendors Distribution**: Visual rankings of top payees by transaction volume and cumulative capital outlay.
- **Monthly Trailing Trend**: Six-month historical comparison of income versus expenditure patterns.
- **Recent Transaction Table**: Real-time listing of the most recent business transactions.

2. Statistical Anomaly Detection (Unusual Transactions)
-------------------------------------------------------
Identifies abnormal operational expenses using rigorous mathematical thresholds rather than static guess values:

- **Algorithm**: Flags any transaction where the expense amount exceeds:
  
  `Threshold = Mean + 2 * Standard Deviation`
  
  evaluated per category over trailing six-month historical windows.
- **Confidence Requirement**: Requires a minimum sample size of at least four historical transactions in a category before evaluating anomalies, preventing false positives on sparse categories.
- **Explanatory Context**: Generates detailed analytical justifications for each flagged transaction (e.g., historical category averages, standard deviation variances, and sample counts).
- **Dual Evaluation Engine**:
  - Live query evaluation via `GET /api/dashboard/unusual-transactions`.
  - Background database synchronization via an automated CRON daemon.

3. Background CRON Service
--------------------------
- An automated background worker running inside the backend process.
- Executes periodic batch scans across all user transactions in PostgreSQL.
- Evaluates statistical thresholds and persists flags (`is_flagged_unusual = true`) directly onto transaction rows for instant retrieval across dashboard queries.

4. Strategic Savings Advisor (Nemotron AI)
------------------------------------------
- Integrated within the Expense Analysis module.
- Accessible via `POST /api/savings-goal/suggestion`.
- Evaluates the user's categorized spending, primary vendors, and desired monthly savings target.
- Transmits structured transaction aggregations to the `nvidia/nemotron-3-ultra-550b-a55b` model.
- Generates strategic business recommendations including:
  - Exact category-by-category expense reduction targets.
  - Vendor renegotiation opportunities and bulk-purchasing adjustments.
  - Confidence scoring on goal feasibility (`high`, `medium`, `stretch`).

5. Dynamic Budget Manager and Limits Optimizer
----------------------------------------------
- Accessible within the Budget and Alerts module.
- Connected to the PostgreSQL `budgets` table.
- Enables setting custom spending caps at both an overall business level and for individual expense sectors.
- Features an AI-driven limit optimizer that evaluates trailing 90-day spending patterns and computes sustainable sector allocations.

6. Multimodal Vision OCR Receipt Scanner
----------------------------------------
- Accessible via the Add Expense view.
- Accepts image uploads of printed cash receipts, physical memos, or invoices.
- Converts image streams into base64 payload transmissions to `meta/llama-3.2-11b-vision-instruct`.
- Extracts structured financial fields:
  - Store / Vendor Name
  - Transaction Date
  - Total Paid Amount
  - Appropriate Expense Category
- Automatically populates the transaction entry form for user confirmation and one-click submission.

7. Client-Side CSV Batch Import Engine
--------------------------------------
- High-throughput CSV ingestion engine operating directly in the client application.
- Supports quoted commas, escaped strings, and flexible column ordering (`Date`, `Amount`, `Vendor`, `Category`, `Notes`, `Type`).
- **Data Validation Pipeline**: Evaluates each row prior to database insertion:
  - Validates date formats and parseability.
  - Verifies positive numeric amounts.
  - Ensures presence of mandatory category allocations.
- **Real-Time Execution Reporting**:
  - Displays a visual progress bar during asynchronous multi-batch inserts.
  - Generates an interactive summary card breaking down processed rows versus skipped rows.
  - Detailed diagnostic table highlighting the exact missing or malformed fields per skipped row.
- Injects valid entries directly into PostgreSQL with concurrent request throttling to maintain database pool stability.

8. Comprehensive Expense Ledger
-------------------------------
- Full tabular ledger supporting multi-parameter filtering:
  - Date ranges (From / To).
  - Operational Category.
  - Merchant / Vendor.
  - Transaction Type (Expense vs. Income).
  - Free-text search matching transaction notes.
- Complete CRUD capabilities (Create, Read, Update, Soft-Delete).

9. Bilingual Internationalization
---------------------------------
- Full bilingual coverage across all views and component trees.
- Supports English and Hindi (`hi-IN`).
- Handles localized date formatting, currency symbols, and numerical formatting conventions.


Database Schema
===============

The underlying PostgreSQL database enforces data integrity through foreign keys, check constraints, and soft-delete safeguards.

Primary Tables
--------------
- **`users`**: User identities, credentials (`password_hash`), business names, and roles (`Owner`, `Staff`).
- **`categories`**: Expense and income classifications (`name`, `type`, `user_id`).
- **`vendors`**: Payee registries (`name`, `normalized_name`, `user_id`).
- **`transactions`**: Financial records (`type`, `amount`, `currency`, `txn_date`, `notes`, `is_flagged_unusual`, `is_deleted`).
- **`budgets`**: Configured spending thresholds (`category_id`, `limit_amount`, `period`).
- **`savings_goals`**: User target goals (`target_amount`, `monthly_save_amount`, `target_date`).

Database Views
--------------
- **`active_transactions`**: Encapsulates `WHERE is_deleted = false` and joins category and vendor metadata. All reporting and analytics queries query this view to guarantee soft-deleted records never distort financial balances.


API Specification
=================

Authentication Endpoints
------------------------
- `POST /api/auth/register`: Create user account and business profile.
- `POST /api/auth/login`: Authenticate credentials; returns signed JWT.
- `GET /api/auth/me`: Retrieve current session user profile.

Transaction Endpoints
---------------------
- `GET /api/transactions`: Retrieve paginated transactions with multi-field filtering.
- `POST /api/transactions`: Create a single transaction with automatic vendor assignment.
- `PUT /api/transactions/:id`: Update an existing transaction record.
- `DELETE /api/transactions/:id`: Soft-delete a transaction (`is_deleted = true`).

Dashboard and Analytics Endpoints
---------------------------------
- `GET /api/dashboard/summary`: Income, expense, and net balance aggregations for date ranges.
- `GET /api/dashboard/by-category`: Total spend and percentage share grouped by category.
- `GET /api/dashboard/by-vendor`: Top payees ranked by total capital expenditure.
- `GET /api/dashboard/trend`: Trailing monthly comparison of income against expenses.
- `GET /api/dashboard/unusual-transactions`: Live statistical anomaly evaluation.

Budgets and Savings Endpoints
-----------------------------
- `GET /api/budgets`: Retrieve active budget thresholds and spending statuses.
- `POST /api/budgets`: Set or update category or overall budget ceilings.
- `GET /api/savings-goal`: Retrieve active target savings plans.
- `POST /api/savings-goal`: Define savings goals and target deadlines.
- `POST /api/savings-goal/suggestion`: Generate strategic savings plans via Nemotron AI.

Artificial Intelligence Endpoints
---------------------------------
- `GET /api/ai/health`: Connection check for NVIDIA NIM and local microservices.
- `POST /api/ai/analyze-receipt`: Multimodal OCR processing via Llama 3.2 Vision.
- `POST /api/ai/budget-recommendation`: Compute sector limit allocations via Nemotron AI.


Setup and Configuration
=======================

Prerequisites
-------------
- Node.js (v18.0.0 or higher)
- PostgreSQL (v14.0 or higher)
- npm or yarn

Environment Variables
---------------------
Configure `backend/.env` with the following keys:

.. code-block:: text

   PORT=5000
   DATABASE_URL=postgres://<user>:<password>@localhost:5432/expenselens
   JWT_SECRET=<your-cryptographic-jwt-secret>
   NODE_ENV=development
   AI_SERVICE_URL=http://localhost:8000
   NVIDIA_API_KEY=<your-nvidia-nim-api-key>
   NVIDIA_MODEL=nvidia/nemotron-3-ultra-550b-a55b
   NVIDIA_VISION_MODEL=meta/llama-3.2-11b-vision-instruct

Configure `frontend/expense-analyzer/expense-analyzer/.env`:

.. code-block:: text

   VITE_API_BASE_URL=http://localhost:5000/api

Installation
------------
Install backend dependencies:

.. code-block:: bash

   cd backend
   npm install

Install frontend dependencies:

.. code-block:: bash

   cd ../frontend/expense-analyzer/expense-analyzer
   npm install

Execution
---------
Run the Express backend server:

.. code-block:: bash

   cd backend
   npm start

Run the Vite frontend development server:

.. code-block:: bash

   cd frontend/expense-analyzer/expense-analyzer
   npm run dev
