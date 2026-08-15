# Cloud Deployment Guide (GCP + Vercel)

**Stack**: Cloud Run (backend) + Vercel (frontend) + MongoDB Atlas + Upstash Redis.
All four services offer free tiers with no credit card required for Atlas, Upstash, and Vercel. GCP's free tier requires a card on file, but Cloud Run's scale-to-zero pricing ensures a low-traffic project typically incurs no costs.

**Total setup time**: 45-60 minutes initially.

---

## 0. Prerequisites

- A GCP project with billing enabled (required for Cloud Run, even within the free tier).
  `gcloud projects create scamescape-<yourname> && gcloud beta billing projects link ...`
- [Terraform](https://developer.hashicorp.com/terraform/install) installed locally (run `terraform validate` yourself before applying).
- `gcloud` CLI installed and authenticated: `gcloud auth login`.
- A [Vercel](https://vercel.com) account (free, GitHub login).

---

## 1. MongoDB Atlas (Free Tier - M0 Cluster)

1. Sign up at https://www.mongodb.com/cloud/atlas/register.
2. Create a free M0 cluster (select a region close to `asia-south1`, e.g., Mumbai).
3. **Database Access**: Add a user with a strong generated password.
4. **Network Access**: Add `0.0.0.0/0`. Cloud Run's outbound IPs aren't static, making this a pragmatic choice for a demo project. Note: A production system would instead use Atlas VPC peering.
5. **Connect**: Click "Drivers" and copy the connection string. It resembles:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   This is your `mongodb_url` value.

---

## 2. Upstash Redis (Free Tier, Serverless)

1. Sign up at https://upstash.com.
2. Create a Redis database, selecting a region close to `asia-south1`.
3. Copy the **`rediss://` connection string**. Ensure it is `rediss` and not `redis`, as TLS is required on Upstash's public endpoint. This is your `redis_url` value.

---

## 3. GCP: One-Time Setup

```bash
export PROJECT_ID=scamescape-<yourname>
gcloud config set project $PROJECT_ID

gcloud services enable run.googleapis.com artifactregistry.googleapis.com \
  iamcredentials.googleapis.com cloudbuild.googleapis.com
```

### 3a. Terraform - Provision Artifact Registry + Cloud Run

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars: Set project_id, and input the mongodb_url and redis_url from steps 1-2.
# Generate a jwt_secret_key (openssl rand -hex 32), and set your Vercel URL once obtained in step 5.

terraform init
terraform plan   # Review planned resources
terraform apply
```

This creates the Artifact Registry repository and a Cloud Run service running a placeholder image (`us-docker.pkg.dev/cloudrun/container/hello`). Step 3b replaces this placeholder with your actual application image.

### 3b. First Image Push (Manual, One-Time)

```bash
# Execute from the repository root
gcloud builds submit \
  --tag ${REGION:-asia-south1}-docker.pkg.dev/$PROJECT_ID/scamescape/scamescape-backend:initial \
  --config=- <<'EOF'
steps:
  - name: gcr.io/cloud-builders/docker
    args: ['build', '-f', 'backend/Dockerfile', '-t', '${_TAG}', '.']
images: ['${_TAG}']
EOF
```

Then, deploy to Cloud Run:
```bash
gcloud run deploy scamescape-backend \
  --image asia-south1-docker.pkg.dev/$PROJECT_ID/scamescape/scamescape-backend:initial \
  --region asia-south1
```

Record the provided URL. This serves as your backend's public URL and will be set as `NEXT_PUBLIC_API_URL` in Vercel.

---

## 4. Continuous Deploys via GitHub Actions (Workload Identity Federation)

Storing a service-account JSON key as a GitHub secret poses a credential-leak risk. Workload Identity Federation allows GitHub Actions to authenticate to GCP using short-lived, OIDC-issued tokens, eliminating long-lived keys.

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

Next, configure the following **GitHub repo secrets** (Settings -> Secrets and variables -> Actions):
| Secret | Value |
|---|---|
| `GCP_PROJECT_ID` | Your project ID |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/<project-number>/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |
| `GCP_SERVICE_ACCOUNT` | `github-deployer@<project-id>.iam.gserviceaccount.com` |

Following this setup, `.github/workflows/deploy-gcp.yml` will automatically build, push, and deploy a new Cloud Run revision upon successful CI completion on the `main` branch.

---

## 5. Frontend on Vercel

1. Import the GitHub repository at https://vercel.com/new.
2. Set the **Root Directory** to `frontend`.
3. Vercel auto-detects Next.js. No build command modifications are necessary.
4. **Environment Variables**: Add the following:
   ```
   NEXT_PUBLIC_API_URL = https://<your-cloud-run-url>
   ```
5. Deploy. Vercel provides a `https://<project>.vercel.app` URL.
6. Return to `terraform.tfvars`, set `frontend_origin` to the newly acquired URL, and execute `terraform apply` once more. This updates Cloud Run's CORS allowlist to permit frontend communication with the backend.

---

## Technical Highlights

- A live, accessible URL demonstrating a working project deployment.
- **Cloud Engineering Alignment**: Concepts utilized here (Cloud Run, Artifact Registry, IAM, Workload Identity Federation) correspond directly with AWS equivalents (ECS Fargate, ECR, AWS IAM roles + OIDC), serving as valuable technical discussion points.
- **Infrastructure as Code**: Utilization of Terraform for automated resource provisioning.
- **Keyless CI/CD**: Implementation of Workload Identity Federation adhering to modern credential hygiene best practices.
