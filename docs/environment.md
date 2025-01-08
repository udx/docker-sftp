# Environment Variables

## Kubernetes Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `KUBERNETES_CLUSTER_ENDPOINT` | Yes | Domain or IP of Kubernetes API server |
| `KUBERNETES_CLUSTER_NAME` | Yes | Name of the Kubernetes cluster |
| `KUBERNETES_CLUSTER_NAMESPACE` | Yes | Default namespace for operations |
| `KUBERNETES_CLUSTER_SERVICEACCOUNT` | Yes | Service account name for cluster access |
| `KUBERNETES_CLUSTER_CERTIFICATE` | Yes | PEM certificate for cluster authentication |
| `KUBERNETES_CLUSTER_USER_SECRET` | Yes | Name of the secret containing user token |
| `KUBERNETES_CLUSTER_USER_TOKEN` | Yes | Authentication token for Kubernetes API |
| `KUBERNETES_CLUSTER_CONTEXT` | Yes | Kubernetes context to use |

## Google Cloud Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `GKE_PROJECT` | Yes | GCP Project ID |
| `GKE_CLUSTER` | Yes | GKE Cluster name |
| `GKE_REGION` | Yes | GKE Cluster region |
| `GKE_SA_KEY` | Yes | Service Account key (JSON format) |

## Artifact Registry Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `AR_LOCATION` | Yes | Artifact Registry location |
| `AR_REPOSITORY` | Yes | Artifact Registry repository name |

## Access Control

| Variable | Default | Description |
|----------|---------|-------------|
| `ALLOW_SSH_ACCESS_ROLES` | "admin,maintain,write" | GitHub roles allowed SSH access |
| `PRODUCTION_BRANCH` | "production" | Branch name for production environment |
| `ALLOW_SSH_ACCES_PROD_ROLES` | "admin" | GitHub roles allowed access in production |

## Notifications

| Variable | Required | Description |
|----------|----------|-------------|
| `SLACK_NOTIFICACTION_URL` | No | Webhook URL for Slack notifications |
| `SLACK_NOTIFICACTION_CHANNEL` | No | Slack channel for notifications |

## Service Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | "production" | Node.js environment |
| `SERVICE_ENABLE_SSHD` | "true" | Enable SSH daemon |
| `SERVICE_ENABLE_API` | "true" | Enable API server |
| `SERVICE_ENABLE_FIREBASE` | "false" | Enable Firebase integration |
| `NODE_PORT` | "8080" | Port for API server |
