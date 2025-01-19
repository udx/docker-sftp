# Cloud Run Configuration

## Required Secrets and Environment Variables

### Kubernetes Authentication
```bash
# Required for K8s API access
KUBERNETES_CLUSTER_ENDPOINT=[CLUSTER_ENDPOINT]  # Your cluster endpoint
KUBERNETES_CLUSTER_NAMESPACE=[NAMESPACE]       # Namespace for resources
KUBERNETES_CLUSTER_USER_TOKEN=<from-sa-key>    # Service account token
```

### GitHub Integration
```bash
# Required for SSH key synchronization
ACCESS_TOKEN=<github-token>                    # GitHub access token
ALLOW_SSH_ACCESS_ROLES=admin,maintain,write    # Allowed GitHub roles
```

### Service Configuration
```bash
# Core service settings
NODE_ENV=production
SERVICE_ENABLE_SSHD=true
SERVICE_ENABLE_API=true
DEBUG=ssh:*
```

### Optional Firebase Configuration
```bash
# Only required if using Firebase state provider
SERVICE_ENABLE_FIREBASE=false                  # Enable Firebase integration
FIREBASE_PROJECT_ID=<project-id>              # Firebase project ID
FIREBASE_PRIVATE_KEY=<private-key>            # Service account private key
FIREBASE_CLIENT_EMAIL=<client-email>          # Service account email
FIREBASE_DATABASE_URL=<database-url>          # Realtime Database URL
```

## Setting Up Cloud Run

1. Create secrets in Secret Manager:
```bash
# Create secrets
gcloud secrets create k8gate-k8s-token --data-file=/path/to/k8s-token.txt
gcloud secrets create k8gate-github-token --data-file=/path/to/github-token.txt

# Grant access to Cloud Run service account
gcloud secrets add-iam-policy-binding k8gate-k8s-token \
    --member="serviceAccount:k8gate-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

2. Deploy to Cloud Run with secrets:
```bash
gcloud run deploy k8-container-gate \
  --image=usabilitydynamics/k8-container-gate:latest \
  --platform=managed \
  --region=us-central1 \
  --port=8080 \
  --memory=512Mi \
  --cpu=1 \
  --timeout=300 \
  --service-account=[SERVICE_ACCOUNT_EMAIL] \
  --set-env-vars="NODE_ENV=production,SERVICE_ENABLE_SSHD=true,SERVICE_ENABLE_API=true" \
  --set-env-vars="KUBERNETES_CLUSTER_ENDPOINT=[CLUSTER_ENDPOINT],KUBERNETES_CLUSTER_NAMESPACE=[NAMESPACE]" \
  --set-secrets="KUBERNETES_CLUSTER_USER_TOKEN=k8gate-k8s-token:latest,ACCESS_TOKEN=k8gate-github-token:latest" \
  --allow-unauthenticated

# Note: The service will be available on port 8080 for HTTP traffic
# SSH traffic (port 22) must be handled through a separate TCP load balancer
```

## Verifying Configuration

1. Check environment variables:
```bash
gcloud run services describe k8-container-gate \
  --platform managed \
  --region us-central1 \
  --format 'yaml(spec.template.spec.containers[].env)'
```

2. Verify service account permissions:
```bash
gcloud projects get-iam-policy ${PROJECT_ID} \
  --flatten="bindings[].members" \
  --format='table(bindings.role)' \
  --filter="bindings.members:k8gate-sa@${PROJECT_ID}.iam.gserviceaccount.com"
```

## Required IAM Roles

The service account needs the following roles:
- roles/run.invoker
- roles/secretmanager.secretAccessor
- roles/container.developer (for GKE access)
