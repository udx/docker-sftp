#!/bin/bash

# Switch to K8s project and get cluster info
echo "Getting K8s cluster info..."
gcloud config set project rabbit-cdmsqarskcacnbpe

# Get GKE cluster name
GKE_CLUSTER_NAME=$(gcloud container clusters list --format="value(name)")
gh secret set GKE_CLUSTER_NAME --body="$GKE_CLUSTER_NAME"

# Create K8s service account
K8S_SA_NAME="k8gate-gke-sa"
K8S_SA_EMAIL="${K8S_SA_NAME}@rabbit-cdmsqarskcacnbpe.iam.gserviceaccount.com"

gcloud iam service-accounts create $K8S_SA_NAME \
  --display-name="K8s Gate GKE Service Account" || true

# Grant GKE access
gcloud projects add-iam-policy-binding rabbit-cdmsqarskcacnbpe \
  --member="serviceAccount:${K8S_SA_EMAIL}" \
  --role="roles/container.developer"

gh secret set K8S_SERVICE_ACCOUNT --body="$K8S_SA_EMAIL"

# Switch to Cloud Run project
echo "Setting up Cloud Run project..."
gcloud config set project destinationpickleball-com-8173

# Create Cloud Run service account
CLOUD_RUN_SA_NAME="k8gate-cloudrun-sa"
CLOUD_RUN_SA_EMAIL="${CLOUD_RUN_SA_NAME}@destinationpickleball-com-8173.iam.gserviceaccount.com"

gcloud iam service-accounts create $CLOUD_RUN_SA_NAME \
  --display-name="K8s Gate Cloud Run Service Account" || true

# Grant Cloud Run access
gcloud projects add-iam-policy-binding destinationpickleball-com-8173 \
  --member="serviceAccount:${CLOUD_RUN_SA_EMAIL}" \
  --role="roles/run.invoker"

# Grant Secrets access
gcloud projects add-iam-policy-binding destinationpickleball-com-8173 \
  --member="serviceAccount:${CLOUD_RUN_SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"

gh secret set CLOUD_RUN_SERVICE_ACCOUNT --body="$CLOUD_RUN_SA_EMAIL"

# Set up Workload Identity Federation
WIF_POOL="k8gate-gh-pool"
WIF_PROVIDER="k8gate-gh-provider"

# Create Workload Identity Pool
gcloud iam workload-identity-pools create $WIF_POOL \
  --location="global" \
  --display-name="K8s Gate GitHub Pool" || true

# Get Pool name
POOL_NAME=$(gcloud iam workload-identity-pools describe $WIF_POOL \
  --location="global" --format="value(name)")

# Create Workload Identity Provider
gcloud iam workload-identity-pools providers create-oidc $WIF_PROVIDER \
  --location="global" \
  --workload-identity-pool=$WIF_POOL \
  --display-name="K8s Gate GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com" || true

# Get Provider name
PROVIDER_NAME=$(gcloud iam workload-identity-pools providers describe $WIF_PROVIDER \
  --location="global" \
  --workload-identity-pool=$WIF_POOL \
  --format="value(name)")

# Allow GitHub repo to impersonate service account
gcloud iam service-accounts add-iam-policy-binding $CLOUD_RUN_SA_EMAIL \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${POOL_NAME}/attribute.repository/andypotanin/docker-sftp"

gh secret set GCP_WORKLOAD_IDENTITY_PROVIDER --body="$PROVIDER_NAME"

# Set namespace for K8s
gh secret set KUBERNETES_CLUSTER_NAMESPACE --body="default"

echo "Done! GitHub secrets have been configured."
