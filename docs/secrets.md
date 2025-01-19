# Required Secrets Configuration

The following secrets must be configured in your GitHub repository settings before running the workflows:

## Docker Registry Configuration
- `DOCKER_REGISTRY`: Docker registry URL (e.g., "usabilitydynamics")
- `IMAGE_NAME`: Name of the Docker image (e.g., "k8-container-gate")
- `DOCKER_HUB_USERNAME`: DockerHub username
- `DOCKER_HUB_ACCESS_TOKEN`: DockerHub access token

## Google Cloud Configuration
- `GCP_PROJECT_ID`: Google Cloud project ID
- `GCP_SA_KEY`: Google Cloud service account key (JSON format)
- `GCP_SERVICE_ACCOUNT`: Service account email
- `GCP_REGION`: Deployment region (e.g., "us-central1")
- `LOAD_BALANCER_NAME`: Name for the TCP load balancer

## Kubernetes Configuration
- `KUBERNETES_CLUSTER_ENDPOINT`: Kubernetes API endpoint
- `KUBERNETES_CLUSTER_NAMESPACE`: Target namespace
- `KUBERNETES_CLUSTER_USER_TOKEN`: Service account token

## GitHub Integration
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions

Note: Never commit actual secret values. Use GitHub repository secrets for secure storage.
