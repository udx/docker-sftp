# K8 Container Gate (formerly docker-sftp)

A secure, Kubernetes-native SSH/SFTP gateway with GitHub-based authentication and flexible state management.

## Features

- 🔐 GitHub-based SSH key authentication
- 🚀 Direct SSH/SFTP access to Kubernetes pods
- 👥 Role-based access control tied to GitHub permissions
- 🔄 Real-time key synchronization
- 📊 Flexible state management (Kubernetes, Firebase, Local)
- 🛡️ Configurable rate limiting
- 🔍 Detailed access logging
- 🌐 Multi-cloud deployment support

## Container Labels

For a container to be accessible via K8 Container Gate, it must have the following labels:

| Label | Description | Example |
|-------|-------------|---------|
| `ci.rabbit.ssh.user` | SSH username for container access | `myapp-dev` |
| `git.name` | Repository name | `my-project` |
| `git.owner` | Repository owner | `organization` |
| `git.branch` | Git branch (optional) | `main` |
| `name` | Container name | `myapp-web` |

Example Kubernetes deployment:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    metadata:
      labels:
        ci.rabbit.ssh.user: myapp-dev
        git.name: my-project
        git.owner: organization
        git.branch: main
        name: myapp-web
```

## Quick Start

### Prerequisites

- Kubernetes cluster (AKS, GKE, or other)
- kubectl configured with cluster access
- GitHub account with repository access
- Docker for local development

### Installation

1. Clone the repository:
```bash
git clone https://github.com/andypotanin/k8-container-gate.git
cd k8-container-gate
```

2. Configure environment variables:
```bash
# Kubernetes Configuration
export KUBERNETES_CLUSTER_NAME="your-cluster"
export KUBERNETES_CLUSTER_NAMESPACE="your-namespace"
export KUBERNETES_CLUSTER_SERVICEACCOUNT="k8gate-service-account"

# GitHub Configuration
export ACCESS_TOKEN="your-github-token"
export ALLOW_SSH_ACCESS_ROLES="admin,maintain,write"
```

3. Deploy to Kubernetes:
```bash
kubectl apply -f ci/deployment-aks.yml
```

### Basic Usage

1. Add your SSH public key to GitHub
2. Configure your SSH client:
```bash
# ~/.ssh/config
Host k8gate
    HostName <your-loadbalancer-ip>
    User <github-username>
    IdentityFile ~/.ssh/id_rsa
```

3. Connect to a pod (non-interactive mode preferred):
```bash
# Run single command
ssh k8gate "wp plugin list"

# Interactive mode (when necessary)
ssh k8gate "curl https://cognition-public.s3.amazonaws.com/install_shell_integration.sh | bash"
ssh -t k8gate
```

For detailed instructions on SSH, SFTP, and SCP usage, see [Remote Access Guide](docs/remote-access.md).

## Architecture

K8 Container Gate consists of several core components:

### 1. SSH Gateway
- OpenSSH server with custom authentication
- GitHub key synchronization
- Role-based access control

### 2. State Management
Flexible backend storage options:
- Kubernetes Secrets (default)
- Firebase Realtime Database
- Local file system

### 3. Access Control
- GitHub-based authentication
- Repository-level permissions
- Rate limiting and monitoring

For detailed architecture information, see [Architecture Documentation](docs/architecture.md).

## Configuration

### worker.yml Configuration

```yaml
kind: workerConfig
version: udx.io/worker-v1/config
config:
  env:
    # Service Control
    NODE_ENV: "production"
    SERVICE_ENABLE_SSHD: "true"
    SERVICE_ENABLE_API: "true"
    DEBUG: "ssh:*"
    
  # Repository Configuration
  repos:
    - name: "owner/repo"
      branch: "master"
      roles: ["admin", "maintain", "write"]
```

### State Management Configuration

```yaml
state:
  provider: kubernetes  # or firebase, local
  options:
    kubernetes:
      secretName: k8-container-gate-keys
      namespace: ${KUBERNETES_CLUSTER_NAMESPACE}
```

For detailed configuration options, see [State Management Documentation](docs/state-management.md).

## Deployment

### Azure Kubernetes Service (AKS)

1. Create AKS cluster:
```bash
az aks create \
  --resource-group your-rg \
  --name your-cluster \
  --node-count 1 \
  --enable-addons monitoring
```

2. Configure authentication:
```bash
az aks get-credentials --resource-group your-rg --name your-cluster
```

3. Deploy K8 Container Gate:
```bash
kubectl apply -f ci/deployment-aks.yml
```

### Other Kubernetes Platforms

The deployment process is similar for other Kubernetes platforms. Adjust the following:

1. Use platform-specific cluster creation
2. Configure appropriate RBAC
3. Apply the deployment configuration

## Development

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev-start
```

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
npm run lint:fix  # Auto-fix issues
```

## Troubleshooting

### Common Issues

1. SSH Connection Failed
- Verify GitHub SSH key is properly added
- Check ALLOW_SSH_ACCESS_ROLES configuration
- Verify pod status with `kubectl get pods`

2. State Management Issues
- Check provider configuration in worker.yml
- Verify Kubernetes secrets permissions
- Check Firebase credentials if using Firebase provider

### Logs

View container logs:
```bash
kubectl logs -f deployment/k8-container-gate
```

View SSH daemon logs:
```bash
kubectl exec -it deployment/k8-container-gate -- tail -f /var/log/sshd.log
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
