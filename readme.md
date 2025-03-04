# 🔒 Docker SFTP/SSH Gateway for Kubernetes

Secure SSH/SFTP gateway providing direct access to Kubernetes pods using GitHub authentication and permissions.

## ✨ Features

- 🔐 GitHub-based authentication using SSH keys
- 🚀 Direct SSH/SFTP access to Kubernetes pods
- 👥 Role-based access control tied to GitHub permissions
- 🔄 Real-time key synchronization with Firebase
- 📊 Container state management
- 🔍 Detailed access logging

## 🚀 Quick Start

```bash
# Connect to a pod
ssh [pod-name]@ssh.rabbit.ci

# With specific namespace
ssh [namespace].[pod-name]@ssh.rabbit.ci

# File transfer
scp local-file [pod-name]@ssh.rabbit.ci:/remote/path/
```

## 🛠 Architecture

The gateway consists of three main components:
- **SSH Gateway**: Handles connections and GitHub authentication
- **API Server**: Manages pods and container state
- **Key Management**: Handles GitHub key synchronization

For detailed architecture and security model, see [Architecture Details](docs/architecture.md).

## ⚙️ Configuration

The service requires configuration for three main components:

### 1. Kubernetes Access
```bash
# Required for pod access
KUBERNETES_CLUSTER_ENDPOINT=https://your-cluster:6443
KUBERNETES_CLUSTER_NAME=prod-cluster
KUBERNETES_CLUSTER_CERTIFICATE=<cluster-ca-cert>
```

### 2. GitHub Authentication
```bash
# Required for SSH key management
ACCESS_TOKEN=<github-token>
ALLOW_SSH_ACCESS_ROLES=admin,maintain,write
```

### 3. Firebase Integration
```bash
# Required for container state
FIREBASE_PROJECT_ID=your-project
FIREBASE_PRIVATE_KEY=<service-account-key>
```

See [Environment Variables](docs/environment.md) for the complete configuration guide.

## 👍 Usage

Connect to pods using standard SSH/SFTP tools:
```bash
# SSH access
ssh www-myapp-com "ls -la"

# File transfer
scp local-file www-myapp-com:/remote/path/
```

For detailed usage examples and client setup, see [Client Guide](docs/client-guide.md).

## 🔍 Debugging

### Quick Health Check
```bash
# Check service status
worker service list

# View SSH logs
tail -f /var/log/sshd.log
```

For detailed troubleshooting steps, log locations, and common issues, see our [Troubleshooting Guide](docs/troubleshooting.md).

## 📚 Documentation

### Core Documentation
- [Architecture Details](docs/architecture.md) - System components and design
- [Environment Variables](docs/environment.md) - Configuration options
- [Client Guide](docs/client-guide.md) - SSH/SFTP setup and usage

### Integration Guides
- [Kubernetes Authentication](docs/kuberentes-auth.md) - Service account setup
- [Firebase Integration](docs/firebase-integration.md) - Container state management

### Development
- [API Reference](docs/api-reference.md) - REST API endpoints
- [User Management](docs/user-management.md) - Access and permissions

### Support
- [Troubleshooting](docs/troubleshooting.md) - Common issues and debugging

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Submit a Pull Request

### Bug Reports & Feature Requests
- Use GitHub Issues for bug reports and feature requests
- Include detailed steps to reproduce bugs
- Follow the issue template guidelines

### Security Reports
For security issues, please email security@udx.io instead of using GitHub Issues.

## 📄 License

This project is proprietary software. All rights reserved.
