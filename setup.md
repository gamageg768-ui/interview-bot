# 🧠 InterviewAI — Setup Guide

**AI-powered interview practice bot built with Next.js + Groq AI**

---

## Prerequisites

- Node.js 18+ 
- A free [Groq API key](https://console.groq.com) (takes 30 seconds)

---

## 1. Install Dependencies

```bash
npm install
```

---

## 2. Configure Environment

Edit `.env.local` and add your Groq API key:

```env
GROQ_API_KEY=gsk_your_actual_key_here
DATABASE_URL="file:./dev.db"
```

Get a free key at **https://console.groq.com** → API Keys.

---

## 3. Set Up the Database

```bash
npx prisma generate
npx prisma db push
```

This creates a local SQLite file (`dev.db`) with no additional setup.

---

## 4. Run in Development

```bash
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## 5. Build for Production

```bash
npm run build
npm start
```

---

## Features

- ✅ **4 Interview Types**: Technical, Behavioral, System Design, HR
- ✅ **12+ Job Roles** or enter a custom role
- ✅ **3 Difficulty Levels**: Easy, Medium, Hard
- ✅ **AI Question Generation** via Groq (llama-3.3-70b-versatile)
- ✅ **AI Answer Evaluation** with score (1–10), strengths, improvements, model answer
- ✅ **Live Timer** per question
- ✅ **Hint System** — toggle hints if you're stuck
- ✅ **Session History** — all past sessions saved to SQLite
- ✅ **PWA Installable** — add to home screen on mobile

---

## Project Structure

```
app/
├── page.tsx           # Home / setup form
├── interview/         # Interview session
├── history/           # Past sessions
└── api/
    ├── questions/     # Generate questions via Groq
    ├── feedback/      # Evaluate answers via Groq
    └── sessions/      # Save & retrieve sessions (SQLite)

components/
├── Navbar.tsx
├── ProgressBar.tsx
├── FeedbackCard.tsx
└── ScoreBadge.tsx

lib/
├── groq.ts            # Groq prompts & client
├── db.ts              # Prisma singleton
└── types.ts           # Shared TypeScript types
```

---

## Model

Uses **`llama-3.3-70b-versatile`** on Groq for ultra-fast inference.
Typical response time: **< 2 seconds** per evaluation.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `GROQ_API_KEY not configured` | Check `.env.local` has the correct key |
| `Failed to generate questions` | Verify key is valid at console.groq.com |
| DB errors | Run `npx prisma db push` again |
| Port in use | Run `npm run dev -- -p 3001` |
