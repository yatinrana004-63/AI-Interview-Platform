# Talent IQ

Talent IQ is a MERN workspace for solo coding practice, two-person mock interviews, and AI interview coaching.

- Practice JavaScript or Python in Monaco. Run examples, submit against hidden cases, and track results in the dashboard.
- Create a private room, share its invitation, and interview with Stream video, screen sharing, chat, and optional recording.
- Rehearse a data structures, system design, or behavioral interview with Gemini. Supported browsers can dictate answers and read replies aloud.

## Local development

Use Node.js 24. From the repository root, create `backend/.env` and `frontend/.env` using the corresponding examples. The backend values stay server-side. The Vite Clerk publishable key is bundled into the browser.

```sh
npm ci --prefix backend
npm ci --prefix frontend
```

Run each command in its own terminal.

```sh
npm run dev --prefix backend
npm run dev --prefix frontend
```

Open the URL printed by Vite. Its dev proxy forwards `/api` to `http://localhost:3000` by default. Set `API_PROXY_TARGET` in the frontend environment if you change the backend port.

To test the production build locally, run `npm run build` at the repository root, set `NODE_ENV=production`, and run `npm start`. Express serves the built files and API from the same port. The build path is relative to the server file, so starting from `backend/` also works.

## Render

Keep the existing native Node Web Service with the repository root as the working directory.

| Setting | Value |
|---|---|
| Build Command | `npm run build` |
| Start Command | `npm start` |
| HTTP Health Check Path | `/health` |

Set the values in the service's Environment tab. Render supplies `PORT` and sets `NODE_ENV=production` at runtime. Set `CLIENT_URL` to the deployed app's origin and supply `VITE_CLERK_PUBLISHABLE_KEY` before building. Use the same Clerk instance for the backend and frontend.

- **MongoDB**. Set `DB_URL` to an Atlas connection string and allow connections from the Render service in Atlas.
- **Clerk and Inngest**. Subscribe the Clerk integration to `user.created`, `user.updated`, and `user.deleted`. Sync the Inngest app with `https://YOUR-SERVICE.onrender.com/api/inngest`.
- **Stream**. Set `STREAM_API_KEY` and `STREAM_API_SECRET` for an app with Chat and Video enabled. The backend provisions the private interview call and chat types on first connection. Recording availability and retention depend on the Stream account.
- **JDoodle Compiler API**. Choose an API plan and set `JDOODLE_CLIENT_ID` and `JDOODLE_CLIENT_SECRET`. The free plan allows 20 executions per day. Each run or submission sends its test cases to a single managed sandbox execution.
- **Gemini**. Set `GEMINI_API_KEY`. The default model is `gemini-3.1-flash-lite` and can be overridden with `GEMINI_MODEL`. Browser voice input depends on speech recognition support and microphone access.

## Pull requests

Create a feature branch, run `npm run lint --prefix frontend` and `npm run build`, then open a pull request against `main`. The CodeRabbit configuration enables PR reviews once the CodeRabbit GitHub app is installed for this repository. Merging to the Render-linked branch deploys when auto-deploy is enabled.
