#!/bin/bash

# Exit on error
set -e

# Required environment variables
: "${GCP_PROJECT_ID:?'GCP_PROJECT_ID is required'}"
: "${GCP_SERVICE_ACCOUNT:?'GCP_SERVICE_ACCOUNT is required'}"
: "${GCP_REGION:?'GCP_REGION is required'}"
: "${KUBERNETES_CLUSTER_ENDPOINT:?'KUBERNETES_CLUSTER_ENDPOINT is required'}"
: "${KUBERNETES_CLUSTER_NAMESPACE:?'KUBERNETES_CLUSTER_NAMESPACE is required'}"
: "${KUBERNETES_CLUSTER_USER_TOKEN:?'KUBERNETES_CLUSTER_USER_TOKEN is required'}"
: "${DOCKER_REGISTRY:?'DOCKER_REGISTRY is required'}"
: "${IMAGE_NAME:?'IMAGE_NAME is required'}"
: "${LOAD_BALANCER_NAME:?'LOAD_BALANCER_NAME is required'}"

# Deploy to Cloud Run
gcloud run deploy ${IMAGE_NAME} \
  --image=${DOCKER_REGISTRY}/${IMAGE_NAME}:latest \
  --platform=managed \
  --region=${GCP_REGION} \
  --project="${GCP_PROJECT_ID}" \
  --port=8080 \
  --memory=512Mi \
  --cpu=1 \
  --timeout=300 \
  --concurrency=80 \
  --service-account="${GCP_SERVICE_ACCOUNT}" \
  --set-env-vars="NODE_ENV=production,SERVICE_ENABLE_SSHD=true,SERVICE_ENABLE_API=true" \
  --set-env-vars="KUBERNETES_CLUSTER_ENDPOINT=${KUBERNETES_CLUSTER_ENDPOINT},KUBERNETES_CLUSTER_NAMESPACE=${KUBERNETES_CLUSTER_NAMESPACE}" \
  --set-secrets="KUBERNETES_CLUSTER_USER_TOKEN=${K8S_TOKEN_SECRET_NAME},ACCESS_TOKEN=${GITHUB_TOKEN_SECRET_NAME}" \
  --allow-unauthenticated \
  --use-http2

# Set up TCP load balancer for SSH access
gcloud compute forwarding-rules create ${LOAD_BALANCER_NAME} \
  --load-balancing-scheme=EXTERNAL \
  --ports=22 \
  --target-service=${IMAGE_NAME} \
  --region=${GCP_REGION} || true  # Don't fail if already exists

# Get the endpoints
HTTPS_ENDPOINT=$(gcloud run services describe ${IMAGE_NAME} --platform managed --region ${GCP_REGION} --format 'value(status.url)')
SSH_ENDPOINT=$(gcloud compute forwarding-rules describe ${LOAD_BALANCER_NAME} --region=${GCP_REGION} --format='get(IPAddress)')

echo "Deployment complete!"
echo "HTTPS Endpoint: ${HTTPS_ENDPOINT}"
echo "SSH Endpoint: ${SSH_ENDPOINT}"
