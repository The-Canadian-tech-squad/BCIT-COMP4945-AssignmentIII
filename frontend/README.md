# Haven Frontend

Static frontend for the trivia application.

## Current service configuration

- `Auth service`: `http://localhost:5070`
- `Quiz service`: `http://localhost:5080`

Update service URLs in `assets/js/config.js` when backend endpoints change.

## Run locally

Serve the `frontend/` folder from `http://localhost:3000` so it can talk to the auth service during development.

### Option 1: Python

```bash
cd frontend
python3 -m http.server 3000
```

### Option 2: VS Code Live Server

Serve the `frontend/` folder on port `3000`.

## Current testable flow

- Landing page loads session state from local storage.
- Users can register and log in through the auth service.
- Authenticated users are routed to the user or admin dashboard based on role.
- The trivia-specific pages will replace the placeholder dashboards next.
