# FitDeck

Hackathon prototype for FitDeck (Auth0 + React/Vite + Flask). Touch UI everywhere; camera + hand-gesture code will live only inside Try-On.

## Local dev

### 1) Env files

- Backend reads **root** `.env` at `fitdeck/.env` (copy from `.env.example`)
- Frontend reads `fitdeck/frontend/.env.local` (copy from `frontend/.env.example`)

Minimum for auth prototype:

- Root `.env`: `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, `FRONTEND_URL`, `FLASK_SECRET_KEY`
- `frontend/.env.local`: `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`, `VITE_API_URL`

Note: On macOS, port `5000` is commonly taken (AirPlay). This repo defaults to running Flask on `5001` and setting `VITE_API_URL=http://127.0.0.1:5001`.

### 2) Run backend (Flask)

```bash
cd backend
python3 -m venv ../.venv
. ../.venv/bin/activate
pip install -r requirements.txt

# run on 5001 to avoid macOS port 5000 conflicts
PORT=5001 python run.py
```

Health check: `GET http://127.0.0.1:5001/health`

### 3) Run frontend (Vite)

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Auth0 dashboard checklist

1. Create **Single Page Application** (React). Copy **Domain** + **Client ID**.
2. Create **API** named `FitDeck API` with Identifier (audience) `https://fitdeck-api`.
3. SPA app settings:
   - Allowed Callback URLs: `http://localhost:5173/callback`
   - Allowed Logout URLs: `http://localhost:5173`
   - Allowed Web Origins: `http://localhost:5173`
4. SPA app → APIs: authorize SPA to access **FitDeck API** so access tokens are minted for audience `https://fitdeck-api`.