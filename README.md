# Local SQLite backend for Idarraga card app

This small helper creates a local SQLite database and a simple HTTP API to persist phrases, templates, fields and events from the browser app.

Files added:

- `init_db.js` — script that creates `data/app.db` and the required tables.
- `server.js` — small Express server exposing `/api/*` endpoints to insert phrases, events, templates and fields.
- `package.json` — scripts and dependencies.

Getting started (Windows PowerShell):

1. Install dependencies:

```powershell
cd d:\PASANTIA\Idarraga
npm install
```

2. Create the database file:

```powershell
npm run init-db
```

3. Start the server:

```powershell
npm start
```

The server listens on `http://localhost:3000` by default.

API examples

- POST `/api/phrase`  { text: "Mi frase" }
- POST `/api/event`   { type: "saveOverlay", payload: { overlayRatios: { x:0.6, y:0.3 } } }
- POST `/api/template`{ name: "fondo1.png", data: "data:image/png;base64,..." }
- POST `/api/field`   { name: "phrase", x:0.5, y:0.08, size_ratio: 0.02 }

Notes

- The app remains a client-side static app. To persist operations automatically, the front-end must POST to these endpoints (I can add the client integration if you want).
- The DB file will be created in `data/app.db`.
