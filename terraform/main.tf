############################################################################
# ScamEscape backend — GCP infrastructure (Cloud Run + Artifact Registry)
#
# Minimal but real IaC: this is what actually gets provisioned, not a
# hand-clicked Cloud Run service. Run `terraform apply` once to create the
# Artifact Registry repo + Cloud Run service; CI/CD (see
# .github/workflows/deploy-gcp.yml) then just pushes new image tags and
# updates the running revision.
############################################################################

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for Cloud Run + Artifact Registry"
  type        = string
  default     = "asia-south1" # Mumbai — closest region to most Indian users
}

variable "service_name" {
  description = "Cloud Run service name"
  type        = string
  default     = "scamescape-backend"
}

variable "image" {
  description = "Full Artifact Registry image path (set by CI after first build). Defaults to a placeholder so `terraform apply` works before any image has been pushed."
  type        = string
  default     = "us-docker.pkg.dev/cloudrun/container/hello"
}

# ─── Secrets, passed in via -var or a .tfvars file (never commit real values) ───
variable "groq_api_key" {
  type      = string
  sensitive = true
}

variable "mongodb_url" {
  type      = string
  sensitive = true
}

variable "redis_url" {
  type      = string
  sensitive = true
}

variable "jwt_secret_key" {
  type      = string
  sensitive = true
}

variable "frontend_origin" {
  description = "Comma-separated allowed CORS origins, e.g. your Vercel URL(s)"
  type        = string
}

provider "google" {
  project = var.project_id
  region  = var.region
}

resource "google_project_service" "run" {
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "artifact_registry" {
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "backend" {
  location      = var.region
  repository_id = "scamescape"
  description   = "ScamEscape backend container images"
  format        = "DOCKER"

  depends_on = [google_project_service.artifact_registry]
}

resource "google_cloud_run_v2_service" "backend" {
  name     = var.service_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      min_instance_count = 0 # scale to zero — stays inside the free tier
      max_instance_count = 3
    }

    containers {
      image = var.image

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      env {
        name  = "ENVIRONMENT"
        value = "production"
      }
      env {
        name  = "GROQ_API_KEY"
        value = var.groq_api_key
      }
      env {
        name  = "MONGODB_URL"
        value = var.mongodb_url
      }
      env {
        name  = "REDIS_URL"
        value = var.redis_url
      }
      env {
        name  = "JWT_SECRET_KEY"
        value = var.jwt_secret_key
      }
      env {
        name  = "FRONTEND_ORIGIN"
        value = var.frontend_origin
      }
      # REQUIRE_AUTH intentionally left at its app default (false) here —
      # flip via `gcloud run services update --set-env-vars` once the
      # frontend has a real login flow.

      ports {
        container_port = 8000
      }

      startup_probe {
        http_get {
          path = "/health/health"
        }
        initial_delay_seconds = 5
        period_seconds        = 5
        failure_threshold     = 6
      }
    }
  }

  depends_on = [google_project_service.run]
}

# Cloud Run defaults to requiring IAM auth on every request — this is a
# public game backend, so explicitly allow unauthenticated invocation.
# (App-level auth is handled by the JWT layer, not IAM.)
resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  location = google_cloud_run_v2_service.backend.location
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

output "backend_url" {
  value       = google_cloud_run_v2_service.backend.uri
  description = "Public URL of the deployed backend — set this as NEXT_PUBLIC_API_URL in Vercel"
}

output "artifact_registry_repo" {
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.backend.repository_id}"
  description = "Push images here, e.g. via `gcloud builds submit` or the CI workflow"
}
