# GoalTrack — In-House Goal Setting & Tracking Portal
### AtomQuest Hackathon 1.0 Submission

A full-stack web portal for managing employee goal-setting, approval workflows, and quarterly performance check-ins.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | SQLite via Prisma ORM |
| Auth | JWT (JSON Web Tokens) |
| Charts | Recharts |

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### 1. Backend Setup
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npx ts-node prisma/seed.ts
npm run dev
# Backend runs on http://localhost:3001
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

---

## Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin / HR | admin@company.com | Admin@123 |
| Manager (L1) | manager@company.com | Manager@123 |
| Employee 1 | emp1@company.com | Emp@123 |
| Employee 2 | emp2@company.com | Emp@123 |
| Employee 3 | emp3@company.com | Emp@123 |

---

## Features Implemented

### Phase 1 — Goal Creation & Approval ✅
- Employee goal sheet creation with up to 8 goals
- Thrust Area selection, UoM types (MIN/MAX/TIMELINE/ZERO)
- Live weightage validator (must total 100%, min 10% per goal)
- Manager L1 approval workflow (inline edit, approve, return for rework)
- Goal locking on approval
- Shared Goals — pushed by Admin/Manager, synced achievements

### Phase 2 — Achievement Tracking & Check-ins ✅
- Quarterly achievement logging (Q1–Q4) per goal
- Status tracking: Not Started / On Track / Completed
- Automatic progress score computation per UoM formula
- Manager check-in module with structured comments
- Quarterly schedule enforcement

### Reporting & Governance ✅
- Achievement Report: CSV export (Planned vs. Actual)
- Completion Dashboard: real-time check-in completion visibility
- Audit Trail: full log of all post-lock changes

### Bonus Features ✅
- **Email Notifications**: automated triggers for submission, approval, rejection, check-in reminders
- **Escalation Module**: configurable rules with auto-notification chain
- **Analytics Dashboard**: QoQ trends, goal distribution charts, manager effectiveness metrics
