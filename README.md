# StatusPulse — 3-Tier DevOps Demo

A minimal 3-tier app wired into a full CI/CD pipeline:

```
push to GitHub
      │
      ▼
   Jenkins  ──build & push images──▶  DockerHub
      │
      ▼
  kubectl deploy  ──▶  Minikube (frontend + backend + db)
```

**Tiers**
| Tier | Tech | Folder |
|---|---|---|
| Frontend (presentation) | Static HTML/CSS/JS served by nginx | `frontend/` |
| Backend (business logic) | Flask REST API (`/api/tasks`) | `backend/` |
| DB (data) | PostgreSQL | `db/` (schema only — runs as the official `postgres` image) |

It's a small task tracker: add/complete/remove tasks. The UI also shows a
live status dot for whether the frontend can reach the backend, so it
doubles as a sanity check that all three tiers are actually connected.

---

## 1. Run it locally first (sanity check before touching Jenkins)

```bash
docker-compose up --build
```

- Frontend: http://localhost:8080
- Backend health check: http://localhost:5000/api/health
- Postgres: localhost:5432 (user `taskuser` / pass `taskpass` / db `tasksdb`)

If tasks load and you can add/check/remove them here, all three tiers talk
to each other correctly — any pipeline issues from here on are CI/CD
plumbing, not application bugs.

---

## 2. Push to GitHub

```bash
git init
git add .
git commit -m "Initial 3-tier StatusPulse app"
git remote add origin https://github.com/<your-username>/statuspulse-demo.git
git push -u origin main
```

---

## 3. DockerHub — create two empty repos

In DockerHub, create:
- `<your-dockerhub-username>/statuspulse-backend`
- `<your-dockerhub-username>/statuspulse-frontend`

(Public repos are simplest for a demo — no pull secret needed in Minikube.)

In the two k8s manifests, replace `DOCKERHUB_USERNAME` with your real
DockerHub username:
- `k8s/03-backend.yaml`
- `k8s/04-frontend.yaml`

---

## 4. Jenkins setup

**Plugins needed:** Docker Pipeline, GitHub Integration, Kubernetes CLI (or just ensure `kubectl` is on the Jenkins agent's PATH).

**Credentials** (Manage Jenkins → Credentials):
- Add a **Username with password** credential with ID `dockerhub-creds`
  → your DockerHub username + a DockerHub access token (not your account
  password — generate one under DockerHub → Account Settings → Security).

**Job:**
- New Item → Pipeline → "Pipeline script from SCM" → point at your GitHub
  repo, script path `Jenkinsfile`.

**kubectl access from Jenkins:**
Since Minikube and Jenkins are on the same Windows machine, the Jenkins
service just needs `kubectl` on PATH and pointed at the minikube context:
```
kubectl config use-context minikube
```
Run that once as whichever user/service account Jenkins executes builds
as, so the agent's `kubectl` calls in the `Jenkinsfile` target Minikube.

---

## 5. The GitHub webhook caveat (important for a local setup)

GitHub's webhook needs to reach Jenkins over the internet. If Jenkins is
running on your laptop (as in this setup), GitHub can't reach
`localhost:8080` directly. Two options:

**Option A — tunnel (closest to "real" auto-trigger on push):**
```bash
ngrok http 8080
```
Use the `https://xxxx.ngrok.io/github-webhook/` URL as the webhook payload
URL in your GitHub repo settings (Settings → Webhooks → Add webhook,
content type `application/json`, event: "Just the push event").

**Option B — Poll SCM (no tunnel needed, small delay instead of instant trigger):**
In the Jenkinsfile, swap:
```groovy
triggers { githubPush() }
```
for:
```groovy
triggers { pollSCM('H/2 * * * *') }  // checks GitHub every 2 minutes
```
This is the more practical default for a laptop-hosted Jenkins and is
worth using day-to-day; switch to the webhook + ngrok only when you want
to demo the "push triggers build" flow live (e.g. in an interview).

---

## 6. Minikube

```bash
minikube start
kubectl config use-context minikube
```

First-ever deploy (Jenkins also runs this every build, it's idempotent):
```bash
kubectl apply -f k8s/01-secrets.yaml
kubectl apply -f k8s/02-db.yaml
kubectl apply -f k8s/03-backend.yaml
kubectl apply -f k8s/04-frontend.yaml
```

View the app:
```bash
minikube service frontend
```

Watch the rollout:
```bash
kubectl get pods -w
```

---

## 7. End-to-end test

1. Edit something small — e.g. change `<h1>` text in `frontend/index.html`.
2. `git add . && git commit -m "tweak heading" && git push`
3. Jenkins triggers (webhook or poll), builds both images tagged with the
   build number, pushes them to DockerHub, then runs `kubectl set image`
   against the Minikube deployments.
4. `kubectl rollout status deployment/frontend` confirms
   the new pods are up.
5. Refresh `minikube service frontend` in the browser.

---

## Notes / things to harden later
- Secrets are in plain YAML here for demo simplicity — for anything beyond
  a local demo, use Jenkins credentials injection or a secrets manager
  instead of committing `01-secrets.yaml` with real values.
- `db` has no resource limits/requests, no backup strategy, single replica
  — fine for a demo, not for anything real.
- Add a `Test` stage to the Jenkinsfile (e.g. `pytest` against the Flask
  app) before the build stages once you have tests written.
