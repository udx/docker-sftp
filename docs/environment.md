# Environment Variables

## Kubernetes Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `KUBERNETES_CLUSTER_ENDPOINT` | Kubernetes API endpoint | Yes |
| `KUBERNETES_CLUSTER_NAME` | Name of the cluster | Yes |
| `KUBERNETES_CLUSTER_NAMESPACE` | Namespace for deployments | Yes |
| `KUBERNETES_CLUSTER_USER_TOKEN` | Authentication token | Yes |
| `KUBERNETES_CLUSTER_SERVICEACCOUNT` | Service account name | Yes |
| `KUBERNETES_CLUSTER_CERTIFICATE` | Cluster certificate | Yes |
| `KUBERNETES_CLUSTER_USER_SECRET` | User secret for auth | Yes |
| `KUBERNETES_CLUSTER_CONTEXT` | Kubernetes context | Yes |

## GitHub Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `ACCESS_TOKEN` | GitHub access token | Yes |
| `ALLOW_SSH_ACCESS_ROLES` | Allowed GitHub roles (e.g., "admin,maintain,write") | Yes |

## Firebase Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `FIREBASE_PRIVATE_KEY_ID` | Private key ID | Yes |
| `FIREBASE_PRIVATE_KEY` | Private key (with newlines) | Yes |
| `FIREBASE_CLIENT_EMAIL` | Service account email | Yes |
| `FIREBASE_CLIENT_ID` | Client ID | Yes |
| `FIREBASE_CLIENT_CERT_URL` | Client cert URL | Yes |

## Server Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_PORT` | API server port (default: 8080) | No |

## Health Checks

The service includes built-in health monitoring:

```yaml
livenessProbe:
  tcpSocket:
    port: ssh
  initialDelaySeconds: 10
  periodSeconds: 10
  timeoutSeconds: 3
  failureThreshold: 2

readinessProbe:
  tcpSocket:
    port: ssh
  initialDelaySeconds: 10
  periodSeconds: 10
  timeoutSeconds: 3
  failureThreshold: 2
```

## Deployment Labels

Each deployment includes metadata labels:
```yaml
git.name: docker-sftp
git.owner: [organization]
git.branch: [branch-name]
```

These are used for service discovery and routing.
