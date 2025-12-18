# Webshop Project 

## Backend
1. `cd backend`
2. Install deps: `pip install -r requirements.txt`
3. Run migrations (assuming SQLite exists): `python manage.py migrate`
4. Start server: `python manage.py runserver` 

## Frontend
1. `cd frontend`
2. Install dependenciess: `npm install`
3. Start server: `npm start`

## Run both
- Use two terminals: one in `backend/` with `python manage.py runserver`, another in `frontend/` with `npm start`.

## Project structure
- `backend/`:  `config`, app `core` with landing view and `api/`.
- `frontend/`:  `/`, `/signup`, `/login`, `/account`, `/myitems`,  `src/api/client.js`.

