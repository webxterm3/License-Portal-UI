# License Portal UI

Next.js frontend for the WebXTerm Licensing Portal — the superadmin dashboard used to onboard customers and manage licenses.

## Prerequisites

- Node.js 18+
- The [License Portal Backend](../Licence-Portal-backend) running and reachable (default `http://localhost:8080`)

## 1. Configure environment

Copy the example env file:

```bash
cp .env.example .env
```

| Variable | Purpose |
|:---------|:--------|
| `NEXT_PUBLIC_API_URL` | Base URL of the License Portal Backend API (default `http://localhost:8080`) |

## 2. Install dependencies

```bash
npm install
```

## 3. Run the dev server

```bash
npm run dev
```

The portal is served at [http://localhost:3000](http://localhost:3000).

## Other commands

```bash
npm run build   # production build
npm run start   # serve the production build on :3000
npm run lint     # lint the codebase
```

## Notes

- Make sure the backend is running first (see its README) — the UI calls it directly via `NEXT_PUBLIC_API_URL`, no local API routes.
- If `CORS_ORIGINS` on the backend is not `*`, add `http://localhost:3000` to it so the browser can call the API in development.
