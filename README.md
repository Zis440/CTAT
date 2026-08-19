# PsyicHub

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)

A comprehensive full-stack platform for **automated psychometric assessments**. PsyicHub features a robust suite of **11 clinical tests and screening tools**, ranging from general health screenings to projective, self-report, behavioral, and psychoanalytic evaluations. The platform rigorously analyzes patient narratives and multi-informant data through deep learning, NLP, and AI to deliver structured clinical insights via an interactive dashboard and comprehensive PDF reports.

---

## 📖 Project Overview

Clinical assessment interpretation has historically been a manual, highly subjective process requiring extensive clinical expertise. **PsyicHub** digitizes and standardizes this process across 11 distinct assessments by combining modern deep learning constructs with grounded psychological frameworks.

Through a hybrid architecture incorporating Large Language Models (LLMs), Computer Vision (Faster R-CNN / VLM LLaVA), and deterministic Knowledge Graphs, PsyicHub acts as an advanced clinical decision-support system to drastically reduce evaluation time while maintaining analytical rigor.

---

## 🌟 Key Features

- **Multi-Assessment Architecture** — Handles projective, self-report, behavioral, and psychoanalytic tests. All 11 assessments managed via the Super Admin dashboard.
- **11-Step Analysis Pipeline** — Semantic narrative parsing, Murray need-press scoring, theme detection, relational field analysis, conflict detection, environment classification, quantitative scoring, risk assessment, defense inference, and LLM-verified meta-reasoning.
- **8-Dimension Scoring** — Ego strength, reality testing, affective integration, cognitive complexity, social cognition, emotional stability, narrative coherence, and object relations.
- **Defense Mechanism Detection** — Identifies and flags 7 core defense mechanisms.
- **Hybrid Visual Recognition** — VLM (Ollama/LLaVA) annotation cache backed by CNN (Faster R-CNN) and manual heuristic fallback.
- **Knowledge Graph & RAG** — FAISS vector search over clinical literature for evidence-augmented scoring.
- **Clinical PDF Reports** — Multi-axis reports with radar profiles, longitudinal tracking, and AI-summarized insights.
- **Multi-Role Platform** — Super Admin, Clinic Admin, Clinic Staff, and Individual Psychologist, each with tailored dashboards and permissions.
- **Wallet & Billing** — Credit-based purchasing with Razorpay integration and transaction logs.
- **Staff Support Requests** — Clinic Admins manage staff-raised support tickets from their dashboard.
- **Feedback Loop** — Clinician corrections feed active model fine-tuning via `FeedbackStore`.

---

## 🧪 Supported Assessments

| Assessment | Category | Status |
|---|---|---|
| Narrative Intelligence | Projective | ✅ Active |
| Employee Mental Health & Wellbeing - Level 1 | General Screening | ✅ Active |
| Pre Adolescent Personality Assessment Intelligence | Self-Report Inventory | 🔜 Coming Soon |
| Attention Deficit And Hyperactivity Intelligence | Behavioral Rating | 🔜 Coming Soon |
| Psychological Symptom Checklist Intelligence | Symptom Checklist | 🔜 Coming Soon |
| Adult Attention Deficit And Hyperactivity Intelligence | Behavioral Rating | 🔜 Coming Soon |
| Adolescent Developmental And Behavioral Intelligence | Behavioral Assessment | 🔜 Coming Soon |
| Child Developmental And Behavioral Intelligence | Behavioral Assessment | 🔜 Coming Soon |
| Adolescent Personality Intelligence | Self-Report Inventory | 🔜 Coming Soon |
| Adult Personality Intelligence | Self-Report Inventory | 🔜 Coming Soon |
| Dream Insite Intelligence | Psychoanalytic | 🔜 Coming Soon |

---

## 👥 Account Roles

| Role | Access |
|---|---|
| **Super Admin** | Full platform control: user management, clinic management, assessments pricing, income analytics, platform settings |
| **Clinic Admin** | Manage clinic staff, patients, reports, wallet/transactions, staff support requests, clinic & staff settings |
| **Clinic Staff** | Conduct assessments, view sessions & patients, raise support tickets |
| **Individual Psychologist** | Conduct assessments, manage own patients & sessions, wallet recharge |

---

## 🏗️ System Architecture & Workflow

1. **Client Layer (Frontend)**: Vite-powered React 19 SPA with Tailwind CSS v4, Shadcn/UI, and Zustand state management.
2. **API Gateway (Backend)**: FastAPI + Uvicorn — handles async REST, JWT-based RBAC, and ML orchestration.
3. **Inference Engines**:
    - **NLP Tier**: spaCy, PyABSA, Sentence-BERT, GoEmotions, RoBERTa.
    - **Vision Tier**: Faster R-CNN, VLM (Ollama/LLaVA).
    - **Reasoning Tier**: Knowledge Graphs (NetworkX) and RAG constraints.
4. **Data Persistence**: PostgreSQL via SQLAlchemy & Alembic. Local filesystem for documents, session JSON, PDFs.

### ⚙️ Automated Analysis Pipeline
1. Patient profile instantiated with cultural/background constraints.
2. Assessment inputs (e.g., projective cards or questionnaires) analyzed visually and textually.
3. NLP extracts characters, POS, syntactic relations.
4. Murray, Relational, and Defense engines score in parallel.
5. `ClinicalScoringEngine` resolves cross-engine contradictions.
6. Clinical Formulation generated → PDF exported → session stored.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS v4, Shadcn/UI, Zustand, Framer Motion |
| **Backend** | Python 3.10+, FastAPI, Pydantic, Uvicorn, SQLAlchemy, Alembic |
| **Database** | PostgreSQL, psycopg2 |
| **NLP & AI** | spaCy, PyTorch, Transformers, PyABSA, Sentence-BERT, GoEmotions, RoBERTa, BERTopic, LLaVA |
| **LLM Runtime** | Ollama (Llama 3 / Airavata) |
| **Search & Graphs** | FAISS, NetworkX |
| **Payments** | Razorpay |
| **Infra** | Docker, Docker-compose |

---

## 📂 Project Structure

```
PsyicHub/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app & lifespan orchestrator
│   │   ├── api/routes/          # Endpoint definitions (assessments, wallet, support…)
│   │   ├── auth/                # Registration, login, JWT, RBAC
│   │   ├── models/              # SQLAlchemy ORM models
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── core/                # Analysis orchestration, RAG
│   │   └── engines/             # ML engines (nlp, scoring, visual, graph, clinical)
│   ├── alembic/                 # DB migration scripts
│   ├── scripts/                 # seed_db.py and maintenance scripts
│   ├── DATABASE_SCHEMA.sql      # Full PostgreSQL schema + seed data
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── features/            # Page-level components (admin, clinic, support…)
│       ├── components/          # Shared UI & sidebar config
│       ├── services/            # API client & service modules
│       └── store/               # Zustand state stores
├── docs/                        # Architecture, setup, API reference, deployment guides
├── docker-compose.yml
├── CONTRIBUTING.md
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+ · Node.js 18+ · PostgreSQL 14+ · [Ollama](https://ollama.ai) (`llama3`, `llava:7b`)

### Windows
```bat
scripts\setup.bat
start.bat
```

### macOS / Linux
```bash
chmod +x scripts/setup.sh start.sh
./scripts/setup.sh
./start.sh
```

### Database (PostgreSQL)
```bash
# Fresh setup — full schema + seed data
psql -U <user> -d <db> -f backend/DATABASE_SCHEMA.sql

# OR migrate an existing DB
cd backend && alembic upgrade head && python scripts/seed_db.py
```

### Docker
```bash
docker-compose up --build
```

---

## 🗄️ Data Storage & Security

### Database Tables

| Table | Contents |
|-------|----------|
| `users` | Email, hashed password (bcrypt), name, role, account type, verification status |
| `wallets` | Per-user credit wallet (balance in paise) |
| `wallet_transactions` | Recharge and debit history with Razorpay IDs |
| `assessments` | All 11 assessments with pricing and `is_coming_soon` flag |
| `patients` | Patient records linked to their practitioner |
| `sessions` | Assessment session metadata and file paths |
| `support_tickets` | Platform-wide support tickets |
| `appointments` | Scheduled psychologist–patient appointments |
| `password_resets` | Password reset request tracking |
| `user_verification_documents` | Uploaded verification docs |
| `verification_document_requirements` | Required doc config per account/clinic type |

### Security
- Passwords hashed with **bcrypt** — never stored in plaintext.
- **JWT (HS256)** for stateless session authentication.
- **RBAC** enforced at the API level on every protected endpoint.
- Verification documents stored in isolated per-user directories.

---

## 🔌 Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | JWT issuance |
| POST | `/api/verify-rci` | Live RCI license verification |
| POST | `/api/analysis/analyze` | Run core analysis (11 ML engines) |
| POST | `/api/analysis/aggregate` | Aggregate multi-card analyses |
| POST | `/api/analysis/report` | Generate clinical PDF report |
| GET | `/api/assessments/` | List all 11 assessments with pricing |
| PUT | `/api/assessments/{id}` | Update assessment pricing (Super Admin) |

---

## 🔮 Future Roadmap

- Full backend implementation of all upcoming assessments across behavioral, self-report, and psychoanalytic categories.

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | System overview & tech stack |
| [Setup Guide](docs/setup.md) | Full installation instructions |
| [API Reference](docs/api_reference.md) | REST endpoint documentation |
| [Configuration](docs/configuration.md) | Model and runtime settings |
| [Deployment](docs/deployment.md) | Docker & VPS deployment |
| [PWA Guide](docs/pwa_guide.md) | Progressive Web App conversion |
| [Admin Subdomain Setup](docs/admin_subdomain_setup.md) | How to isolate Super Admin to a subdomain |

---
