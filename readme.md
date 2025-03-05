# 🔒 Docker SFTP/SSH Gateway for Kubernetes

Secure SSH/SFTP gateway providing direct access to Kubernetes pods using GitHub authentication and permissions.

## ✨ Features

- 🔐 GitHub-based authentication using SSH keys
- 🚀 Direct SSH/SFTP access to Kubernetes pods
- 👥 Role-based access control tied to GitHub permissions
- 📊 Container state management via Firebase
- 🔄 Real-time state synchronization
- 🧹 Automatic cleanup of terminated containers
- 🔍 Detailed access logging

## 🚀 Quick Start

### Prerequisites

1. Access to a Kubernetes cluster with `kubectl` configured
2. GitHub token with repo access permissions

### Local Development

Run with Docker for local testing:

```bash
# Get cluster credentials
KUBE_ENDPOINT=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
KUBE_TOKEN=$(kubectl get secret $(kubectl get sa default -n default -o jsonpath='{.secrets[0].name}') \
  -o jsonpath='{.data.token}' | base64 -d)

# Run container
docker run -d \
  --name sftp-gateway \
  -p 2222:22 \
  -e KUBERNETES_CLUSTER_ENDPOINT=$KUBE_ENDPOINT \
  -e KUBERNETES_CLUSTER_USER_TOKEN=$KUBE_TOKEN \
  -e ACCESS_TOKEN=$GITHUB_TOKEN \
  udx/docker-sftp
```

For production deployment, see [Deployment Guide](docs/deployment.md).

See [Environment Variables](docs/environment.md) for auth setup and [Deployment Guide](docs/deployment.md) for production deployment.

### 2. Connect to Pods

```bash
# Interactive shell
ssh pod-myapp@sftp.company.com

# Transfer files
scp file pod-myapp@sftp.company.com:/path/
```

See [Client Guide](docs/client-guide.md) for SSH config and advanced usage.

## 📚 Documentation

### Core Concepts

- [Architecture](docs/architecture.md) - System design and components
- [API Reference](docs/api-reference.md) - HTTP API endpoints

### Setup & Configuration

- [Deployment Guide](docs/deployment.md) - Deployment options and setup
- [Environment Variables](docs/environment.md) - Configuration reference
- [User Management](docs/user-management.md) - Access control

### Help

- [Client Guide](docs/client-guide.md) - Usage examples
- [Troubleshooting](docs/troubleshooting.md) - Common issues

## 🤝 Contributing

- **Bug Reports & Features**: Use GitHub Issues
- **Security Reports**: Email security@udx.io
- **Pull Requests**: Fork and submit PRs

## 📄 License

Proprietary software. All rights reserved.
