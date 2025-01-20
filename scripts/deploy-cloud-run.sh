#!/bin/bash

# Exit on error
set -e

# Required environment variables
: "${GCP_PROJECT_ID:?'GCP_PROJECT_ID is required'}"
: "${GCP_SERVICE_ACCOUNT:?'GCP_SERVICE_ACCOUNT is required'}"
: "${KUBERNETES_CLUSTER_ENDPOINT:?'KUBERNETES_CLUSTER_ENDPOINT is required'}"
: "${KUBERNETES_CLUSTER_NAMESPACE:?'KUBERNETES_CLUSTER_NAMESPACE is required'}"
: "${KUBERNETES_CLUSTER_USER_TOKEN:?'KUBERNETES_CLUSTER_USER_TOKEN is required'}"

# Deploy to Cloud Run
gcloud run deploy k8-container-gate \
  --image=usabilitydynamics/k8-container-gate:latest \
  --platform=managed \
  --region=us-central1 \
  --project="${GCP_PROJECT_ID}" \
  --port=8080 \
  --memory=512Mi \
  --cpu=1 \
  --timeout=300 \
  --concurrency=80 \
  --service-account="${GCP_SERVICE_ACCOUNT}" \
  --set-env-vars="NODE_ENV=production,SERVICE_ENABLE_SSHD=true,SERVICE_ENABLE_API=true" \
  --set-env-vars="KUBERNETES_CLUSTER_ENDPOINT=${KUBERNETES_CLUSTER_ENDPOINT},KUBERNETES_CLUSTER_NAMESPACE=${KUBERNETES_CLUSTER_NAMESPACE}" \
  --set-secrets="KUBERNETES_CLUSTER_USER_TOKEN=k8gate-k8s-token:latest" \
  --allow-unauthenticated \
  --use-http2

# Set up TCP load balancer for SSH access
gcloud compute forwarding-rules create k8gate-ssh \
  --load-balancing-scheme=EXTERNAL \
  --ports=22 \
  --target-service=k8-container-gate \
  --region=us-central1 || true  # Don't fail if already exists

# Get the endpoints
HTTPS_ENDPOINT=$(gcloud run services describe k8-container-gate --platform managed --region us-central1 --format 'value(status.url)')
SSH_ENDPOINT=$(gcloud compute forwarding-rules describe k8gate-ssh --region=us-central1 --format='get(IPAddress)')

echo "Deployment complete!"
echo "HTTPS Endpoint: ${HTTPS_ENDPOINT}"
echo "SSH Endpoint: ${SSH_ENDPOINT}"
