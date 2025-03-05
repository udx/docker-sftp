# Environment Variables

## Kubernetes Configuration

Variables for connecting to your Kubernetes cluster:

| Variable                            | Description                                    | Required | Default         |
| ----------------------------------- | ---------------------------------------------- | -------- | --------------- |
| `KUBERNETES_CLUSTER_ENDPOINT`       | API server address (e.g. https://your-cluster) | Yes      | -               |
| `KUBERNETES_CLUSTER_USER_TOKEN`     | Service account token for authentication       | Yes      | -               |
| `KUBERNETES_CLUSTER_NAME`           | Name for kubectl cluster context               | No       | Auto-generated¹ |
| `KUBERNETES_CLUSTER_SERVICEACCOUNT` | Service account name for kubectl config        | No       | "default"       |

¹ When not set, generates a random name like "cluster-12345"

See [Deployment Guide](deployment.md) for instructions on setting up service accounts and getting credentials.

## GitHub Configuration

| Variable                 | Description                                         | Required |
| ------------------------ | --------------------------------------------------- | -------- |
| `ACCESS_TOKEN`           | GitHub access token                                 | Yes      |
| `ALLOW_SSH_ACCESS_ROLES` | Allowed GitHub roles (e.g., "admin,maintain,write") | Yes      |

## Firebase Configuration

The system uses Firebase Realtime Database to maintain container state and enable real-time tracking. This allows for:

- Automatic cleanup of terminated containers
- Real-time state synchronization
- Container lifecycle management

### Required Variables

Firebase credentials are loaded from a service account JSON file:

| Variable                         | Description                                                          | Required |
| -------------------------------- | -------------------------------------------------------------------- | -------- |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON file downloaded from Firebase console   | Yes      |
| `FIREBASE_DATABASE_URL`          | Firebase Realtime Database URL (e.g. https://your-db.firebaseio.com) | Yes      |

### Setup Instructions

1. Go to Firebase Console > Project Settings > Service Accounts
2. Click "Generate New Private Key" to download the JSON file
3. Set `GOOGLE_APPLICATION_CREDENTIALS` to the path of this file
4. Set `FIREBASE_DATABASE_URL` to your database URL

### Data Structure

The service maintains the following collections:

```json
{
  "deployment": {
    "[pod-id]": {
      "status": "active|terminated",
      "lastSeen": "timestamp",
      "metadata": {
        "namespace": "string",
        "name": "string"
      }
    }
  }
}
```

See [Architecture Details](architecture.md#state-management) for more information about state management.

## Server Configuration

| Variable    | Description                     | Required |
| ----------- | ------------------------------- | -------- |
| `NODE_PORT` | API server port (default: 8080) | No       |

For Kubernetes deployment configuration, including health checks and resource limits, see [Kubernetes Deployment](kubernetes-deployment.md).

## Deployment Labels

Each deployment includes metadata labels:

```yaml
git.name: docker-sftp
git.owner: [organization]
git.branch: [branch-name]
```

These are used for service discovery and routing.
