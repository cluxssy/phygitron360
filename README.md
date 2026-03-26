# 🚀 PHYGITRON 360

## AI-Powered Talent Intelligence Platform

PHYGITRON 360 is a modular SaaS platform designed to manage the entire talent lifecycle — from sourcing candidates to training, verifying, and deploying them.

---

## 🧠 Vision

- One unified talent profile per individual
- Verified skills with proof
- Trust-based hiring ecosystem

---

## 🧩 Core Modules

| Module  | Description |
|--------|------------|
| Source | Candidate sourcing, resume parsing, skill graph |
| Forge  | Learning system (LXP), upskilling |
| Verify | Assessments, proctoring, certification |
| Deploy | HR management, employee lifecycle |

---

## 🏗️ Architecture

- Modular Monolith
- Event-Driven Communication
- Multi-Tenant SaaS Ready

---

## 📂 Project Structure

phygitron360/
│
├── backend/
│   ├── core/
│   ├── common/
│   ├── modules/
│   │   ├── source/
│   │   ├── forge/
│   │   ├── verify/
│   │   ├── deploy/
│   │   └── auth/
│   ├── api/
│   └── main.py
│
├── frontend/
│   ├── src/
│   │   ├── core/
│   │   ├── components/
│   │   ├── modules/
│
├── docs/
├── infra/
├── scripts/

---

## ⚙️ Tech Stack

### Backend
- FastAPI
- PostgreSQL
- SQLAlchemy
- JWT Authentication

### Frontend
- React (Vite)
- Tailwind CSS
- Axios

---

## 🚀 Getting Started

### 1. Clone the repository
git clone https://github.com/cluxssy/phygitron360.git
cd phygitron360

### 2. Setup Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

### 3. Run Backend
uvicorn main:app --reload

### 4. Setup Frontend
cd frontend
npm install
npm run dev

---

## 🔥 Key Principles

- One talent profile per user
- Modules are independent
- No direct module-to-module imports
- Communication via events only
- Role-based access control

---

## 📌 Development Status

Under active development

---

## 🤝 Contribution

Please read [CONTRIBUTION.md](docs/CONTRIBUTION.md) before contributing.

---

## 👨‍💻 Team

PHYGITRON Team

---

## 📄 License

Private / Confidential