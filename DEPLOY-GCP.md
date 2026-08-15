# Phase 2 — Cloud Deployment (GCP + Vercel)

Stack: **Cloud Run** (backend) + **Vercel** (frontend) + **MongoDB Atlas** +
**Upstash Redis**. All four have real free tiers with no credit card
required for Atlas/Upstash/Vercel; GCP's free tier does ask for a card on
file but Cloud Run's scale-to-zero pricing means a low-traffic portfolio
project realistically costs $0/month.

Total setup time: ~45–60 minutes the first time.

---

## 0. Prerequisites

- A GCP project with billing enabled (Cloud Run requires it, even though
  usage will fall inside the free tier for a demo app).
  `gcloud projects create scamescape-<yourname> && gcloud beta billing projects link ...`
- [Terraform](https://developer.hashicorp.com/terraform/install) installed locally (couldn't be verified inside this sandbox — install and run `terraform validate` yourself before `apply`).
- `gcloud` CLI installed and authenticated: `gcloud auth login`.
- A [Vercel](https://vercel.com) account (free, GitHub login).

---

## 1. MongoDB Atlas (free tier — M0 cluster)

1. Sign up at https://www.mongodb.com/cloud/atlas/register — no card required for M0.
2. Create a free M0 cluster (pick a region close to `asia-south1` if offered, e.g. Mumbai).
3. **Database Access** → add a user with a strong generated password.
4. **Network Access** → add `0.0.0.0/0` (Cloud Run's outbound IPs aren't static, so this is the pragmatic choice for a demo project — note this tradeoff if asked about it in an interview: a production system would instead use Atlas's VPC peering).
5. **Connect** → "Drivers" → copy the connection string. It looks like:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   This is your `mongodb_url` value.

---

## 2. Upstash Redis (free tier, serverless)

1. Sign up at https://upstash.com — no card required.
2. Create a Redis database, region close to `asia-south1`.
3. Copy the **`rediss://` connection string** (note: `rediss`, not `redis` — TLS is required on Upstash's public endpoint). This is your `redis_url` value.

---

## 3. GCP: one-time setup

```bash
export PROJECT_ID=scamescape-<yourname>
gcloud config set project $PROJECT_ID

gcloud services enable run.googleapis.com artifactregistry.googleapis.com \
  iamcredentials.googleapis.com cloudbuild.googleapis.com
```

### 3a. Terraform — provision Artifact Registry + Cloud Run

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars: project_id, and paste in the mongodb_url /
# redis_url from steps 1–2, a generated jwt_secret_key
# (openssl rand -hex 32), and your Vercel URL once you have it (step 5 —
# you can come back and update frontend_origin + re-apply later).

terraform init
terraform plan   # review what it's about to create
terraform apply
```

This creates the Artifact Registry repo and a Cloud Run service running a
GCP-provided placeholder image (`us-docker.pkg.dev/cloudrun/container/hello`)
just so the service exists. Step 3b replaces that with your real image.

### 3b. First real image push (manual, one-time)

```bash
# from the repo root
gcloud builds submit \
  --tag ${REGION:-asia-south1}-docker.pkg.dev/$PROJECT_ID/scamescape/scamescape-backend:initial \
  --config=- <<'EOF'
steps:
  - name: gcr.io/cloud-builders/docker
    args: ['build', '-f', 'backend/Dockerfile', '-t', '${_TAG}', '.']
images: ['${_TAG}']
EOF
```
*(Or simpler, if you don't want a Cloud Build config: build and push locally with `docker build` + `docker push`, same as the Docker Compose Dockerfile from Phase 1 — it's the same `backend/Dockerfile`.)*

Then point Cloud Run at it:
```bash
gcloud run deploy scamescape-backend \
  --image asia-south1-docker.pkg.dev/$PROJECT_ID/scamescape/scamescape-backend:initial \
  --region asia-south1
```

Grab the printed URL — that's your backend's public URL, and what you'll
set as `NEXT_PUBLIC_API_URL` in Vercel.

---

## 4. Continuous deploys via GitHub Actions (Workload Identity Federation — no service-account key)

Storing a service-account JSON key as a GitHub secret is the common
approach but is a real credential-leak risk if it ever ends up in a log or
fork. Workload Identity Federation lets GitHub Actions authenticate to GCP
using short-lived, OIDC-issued tokens instead — no long-lived key exists
anywhere.

```bash
gcloud iam workload-identity-pools create "github-pool" \
  --location="global" --display-name="GitHub Actions Pool"

gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"

gcloud iam service-accounts create github-deployer \
  --display-name="GitHub Actions deployer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud iam service-accounts add-iam-policy-binding \
  "github-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')/locations/global/workloadIdentityPools/github-pool/attribute.repository/<your-github-username>/ScamEscape"
```

Then add these **GitHub repo secrets** (Settings → Secrets and variables → Actions):
| Secret | Value |
|---|---|
| `GCP_PROJECT_ID` | your project ID |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/<project-number>/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |
| `GCP_SERVICE_ACCOUNT` | `github-deployer@<project-id>.iam.gserviceaccount.com` |

From then on, `.github/workflows/deploy-gcp.yml` builds, pushes, and
deploys a new Cloud Run revision automatically after CI passes on `main`.

---

## 5. Frontend on Vercel

1. Import the GitHub repo at https://vercel.com/new.
2. Set the **Root Directory** to `frontend`.
3. Vercel auto-detects Next.js — no build command changes needed (it does
   *not* use the standalone-output Dockerfile from Phase 1; Vercel has its
   own optimized Next.js runtime, so `output: 'standalone'` is simply
   ignored there and stays purely for the Docker path).
4. **Environment Variables** → add:
   ```
   NEXT_PUBLIC_API_URL = https://<your-cloud-run-url>
   ```
5. Deploy. Vercel gives you a `https://<project>.vercel.app` URL.
6. Go back to `terraform.tfvars`, set `frontend_origin` to that URL, and
   `terraform apply` again — this updates Cloud Run's CORS allowlist so the
   deployed frontend can actually call the deployed backend.

---

## What this gets you (resume-wise)

- A live, working URL for the project (put it at the top of the resume entry).
- **Cloud Engineer / AWS-Developer-adjacent story**: even though this used
  GCP, the underlying concepts — Cloud Run (~ ECS Fargate/App Runner),
  Artifact Registry (~ ECR), IAM + Workload Identity Federation
  (~ AWS IAM roles + OIDC) — map directly onto AWS equivalents, and you can
  say so explicitly in an interview.
- **Infrastructure as Code**: real Terraform provisioning real resources,
  not console clicks.
- **Keyless CI/CD**: Workload Identity Federation is the current best
  practice over long-lived service-account keys — a good "I think about
  credential hygiene" talking point.
