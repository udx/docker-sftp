# Required Secrets Configuration

The following secrets must be configured in your GitHub repository settings before running the workflows:

## Build and Test
- `TEST_K8S_ENDPOINT`: Kubernetes API endpoint for testing
- `TEST_K8S_NAMESPACE`: Kubernetes namespace for testing
- `TEST_K8S_TOKEN`: Kubernetes service account token for testing

## DockerHub Publishing
- `DOCKER_HUB_USERNAME`: DockerHub username
- `DOCKER_HUB_ACCESS_TOKEN`: DockerHub access token
- `DOCKER_REGISTRY`: Docker registry URL (default: usabilitydynamics)

## Cloud Run Deployment
- `GCP_PROJECT_ID`: Google Cloud project ID
- `GCP_SA_KEY`: Google Cloud service account key
- `GCP_SERVICE_ACCOUNT`: Google Cloud service account email
- `KUBERNETES_CLUSTER_NAMESPACE`: Target Kubernetes namespace
- `KUBERNETES_CLUSTER_USER_TOKEN`: Kubernetes service account token

## GitHub Integration
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions

Note: Never commit actual secret values. Use GitHub repository secrets for secure storage.
