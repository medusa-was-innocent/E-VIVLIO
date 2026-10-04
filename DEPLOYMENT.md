# Deploy E-VIVLIO

This project deploys as one Render Node web service connected to one PostgreSQL database. All app folders must stay together with the root package.json and render.yaml.

## 1. Source repository

Push the project source to a private GitHub repository. The root .gitignore excludes local databases, secrets, dependencies, build outputs, test artifacts, and the academic reports in output/. These remain on your computer.

## 2. Database

Create a PostgreSQL project in Neon and copy its connection string with its TLS options. Choose a region near the web service. Keep the URL in Render's secret environment settings, not in GitHub or chat. All apps use this same DATABASE_URL.

The app creates its tables on startup. Local PGlite records in .data/postgres are not copied automatically; a new hosted database starts empty.

## 3. Render service

Connect the GitHub repository using New > Blueprint and select the root render.yaml. Review the service plan and its cost before creating the service. The repository does not choose a free plan automatically.

Set DATABASE_URL when prompted. The app automatically uses Render's RENDER_EXTERNAL_URL for its public HTTPS origin. If you connect a custom domain, set APP_URL to that exact HTTPS origin with no trailing slash and redeploy before testing sign-in.

The blueprint generates BETTER_AUTH_SECRET and sets the remaining environment values. Do not regenerate the auth secret on each deployment.

Manual Web Service configuration, if you do not use a Blueprint:

- Runtime: Node
- Root directory: repository root
- Node version: 22.23.2
- Build command: npm ci --include=dev && npm run build
- Start command: npm start
- Health check: /healthz
- Environment: NODE_ENV=production, TRUST_PROXY=1, DATABASE_URL, APP_URL, BETTER_AUTH_SECRET

For manual setup, generate a secret locally with:

    node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"

Paste its output only into Render's BETTER_AUTH_SECRET field. Render supplies PORT; do not set it to the local worker ports.

## 4. Verify the public deployment

1. Visit /healthz and confirm {"ok":true}.
2. Create a test account and confirm one sign-in opens all four apps.
3. Search in Library and Yard, then check /account for saved history.
4. Create a Folio room and test it from another device.
5. Play Yard music and move to Library; verify uninterrupted playback.
6. Join the same Cove room on two devices, enable media, switch apps and verify the mini-call.
7. Confirm sign-out ends access to protected pages.

Real-device media testing is still required. Restrictive networks may need a TURN relay for Cove. The current Cove signaling roster is in memory; use one service instance until shared signaling state is implemented. Deployments and restarts can interrupt live sessions.

## Deployment status

Hosting configuration is prepared. A public service and hosted database must still be provisioned in the owner's accounts. Check current provider plans before proceeding; billing and runtime limits are external to this repository.

## Group chat and call update

Run the usual build/start commands after uploading this version. Startup applies
`0003_groups.sql` automatically. Keep one service instance for Cove signaling.
Sign in, open **Group chat**, create a named group, and share its group code once.
Other members enter it in **Join group**. Each account belongs to one group at a
time. New room visits by a room's creator publish one room card to that group;
chat and room cards are visible only to its current members. Joining a group also
shows its recent history. Leaving removes access, but previous messages remain.
The panel shows the newest 80 events; older events remain in the database.
Notifications are in-app (usually within 8 seconds), not browser push notifications.
Room links still act as invitations to signed-in users; group privacy does not
make the existing rooms access-controlled vaults.

Cove now uses a remote-video view with a small self-preview for two people. Calls
with more people retain a grid. The mini-call is on the right. Camera capture
prefers 360p at 24 fps, and the hidden cottage stops its rendering loop.

For networks where direct peer connections fail, configure a TURN provider in
Render with `TURN_URLS` (comma-separated URLs), `TURN_USERNAME`, and
`TURN_CREDENTIAL`. Use dedicated relay credentials; signed-in clients need them
to connect to the relay. Without a configured TURN service, restrictive networks
can still prevent calls. Real-device latency depends on hosting and networking.

## Loading and search-history update

The cottage now initially downloads nine GPU-compressed day textures (about
6.9 MB), instead of day and night WebP textures together (about 20.2 MB on
non-iOS clients). The model, code, fonts, and decoder downloads are additional.
Night textures load when you switch lighting. App links remain available while
3D assets load. Public hashed JS/CSS bundles are cached for one year, and the
server compresses eligible responses. Protected pages, APIs, uploaded documents,
and sockets continue to require authentication.

The login page uses Folio's forest/paper style without loading its 3D scene.
Yard renders its interface before requesting the remote catalog and only fetches
catalog sections in use. Third-party catalog latency can still affect results.

With DATABASE_URL set to Neon, each submitted Lib search and each settled Yard
query is written to ecosystem_search_events with the signed-in user ID. Repeated
queries create separate events. ecosystem_searches remains the deduplicated
recent-history list. Clearing history deletes both for that user/app. Startup
applies migration 0004_search_events.sql; older overwritten events cannot be
reconstructed. Searches are not used to train an AI model by this update.

Render Free may sleep after 15 minutes idle and take about a minute to wake:
https://render.com/docs/free . Application optimizations cannot remove that
provider-controlled delay. Compare the first visit after idle with a second
visit after the service is awake when evaluating performance. Keep the app and
Neon in nearby regions to reduce database round trips.
