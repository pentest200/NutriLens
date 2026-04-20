# NutriLens — AI Meal Analyzer

NutriLens is an AI-powered nutrition tracking web app that turns a meal description (and optionally a photo) into calorie + macro estimates, a health score, and healthier alternatives—then tracks daily + weekly history.

## Problem statement
Tracking daily nutrition is tedious, manual, and often inaccurate.

## What this app does
- Analyze meals using AI and return structured nutrition JSON.
- Show a Dashboard with daily totals, a weekly calories chart, and a calorie-goal progress indicator.
- Save meals to Firestore, view them on the History page, filter by date, and edit/delete entries (CRUD).
- Provide healthier suggestions (from the AI response).

## Tech stack
- Frontend: React (functional components), React Router, Context API, Tailwind CSS
- Backend: Express (Node.js), OpenAI SDK (server-side only)
- Data/Auth: Firebase Auth + Firestore
- Charts: Recharts

## Project structure
- `src/components` reusable UI components
- `src/pages` route-level pages
- `src/hooks` custom hooks
- `src/context` global contexts (Auth, Theme)
- `src/services` Firebase + API + DB layer
- `src/utils` shared utils
- `server/` Express backend for `/api/analyze`

## Setup (local)

### 0) Prerequisites
- Node.js 18+ and npm
- A Firebase project
- An OpenAI API key

### 1) Install dependencies
From the project root:
```bash
npm install
npm --prefix server install
```

### 2) Configure Firebase (Auth + Firestore)

1. Create a Firebase project.
2. Authentication → Sign-in method → enable **Email/Password**.
3. Firestore Database → create a database (production mode is fine).
4. Project settings → add a Web App → copy the config values.

Create a file named `.env.local` in the root and fill it using `.env.example` as a reference:
```bash
# Firebase
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

# Optional
VITE_API_BASE=/api
```

### 3) Secure Firestore
In Firebase Console → Firestore → Rules, paste the contents of `firestore.rules`.

### 4) Create Firestore indexes (required)
Because the app queries by `userId` + `timestamp`, you’ll likely need composite indexes.

When Firebase throws an index error, it includes a direct link to create it.
Typical indexes for this app:
- Collection: `meals` fields: `userId` (ASC), `timestamp` (DESC)
- Collection: `nutrition_logs` fields: `userId` (ASC), `timestamp` (ASC)

### 5) Configure the AI server
Create `server/.env` from `server/.env.example`:
```bash
PORT=5174
CLIENT_ORIGIN=http://localhost:5173
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4.1-mini
```

### 6) Run the app
```bash
npm run dev:all
```

- Client: http://localhost:5173
- Server: http://localhost:5174

## Production build
Frontend:
```bash
npm run build
npm run preview
```

Backend:
```bash
npm --prefix server start
```

## Notes
- Image upload is supported for **preview** in the UI. The backend receives an optional `imageDataUrl`, but currently prioritizes the text description (to avoid claiming visual certainty). If you want full image analysis, update the server prompt to use a vision-capable model and pass image content accordingly.
- Meals are stored in Firestore under `meals/`. Daily aggregates are stored under `nutrition_logs/` and updated transactionally whenever meals are added/edited/deleted.
