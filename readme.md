# 🔒 Docker SFTP/SSH Gateway for Kubernetes

Secure SSH/SFTP gateway providing direct access to Kubernetes pods using GitHub authentication and permissions.

## ✨ Features

### Core Features
- 🔐 GitHub-based authentication using SSH keys
- 🚀 Direct SSH/SFTP access to Kubernetes pods
- 👥 Role-based access control tied to GitHub permissions
- 🔍 Detailed access logging

### Additional Features
- 📊 Container state management via Firebase
- 🔄 Real-time state synchronization
- 🧹 Automatic cleanup of terminated containers

## 🚀 Quick Start

### 1. Deploy Gateway
```bash
# Deploy locally with Docker
docker run -d \
  --name sftp-gateway \
  -p 2222:22 \
  # Required: Kubernetes access
  -e KUBERNETES_CLUSTER_ENDPOINT=https://your-cluster:6443 \
  -e KUBERNETES_CLUSTER_NAME=prod-cluster \
  # Required: GitHub authentication
  -e ACCESS_TOKEN=<github-token> \
  -e ALLOW_SSH_ACCESS_ROLES="admin,maintain,write" \
  udx/docker-sftp

# Verify deployment
docker ps | grep sftp-gateway
curl http://localhost:8080/users
```

Your gateway address will be:
- Local testing: `localhost` (like above)
- Production: Your server's hostname/IP (e.g., `sftp.company.com`)

See [Configuration](#%EF%B8%8F-configuration) for optional features.

### 2. Configure Access
```bash
# Add to ~/.ssh/config
Host pod-example
    # For local testing use localhost
    HostName localhost     
    # Port you exposed in docker run (-p 2222:22)
    Port 2222             
    # The pod you want to access
    User example-pod      
    # Your GitHub SSH key
    IdentityFile ~/.ssh/github_rsa
```

### 3. Start Using
```bash
# Direct pod access
ssh pod-example

# File transfer
scp local-file pod-example:/remote/path/
```

See [Client Guide](docs/client-guide.md) for detailed usage examples.

## ⚙️ Configuration

The gateway needs these environment variables to run:

### Required for Basic Setup

```bash
# Connect to your Kubernetes cluster
KUBERNETES_CLUSTER_ENDPOINT=https://your-cluster:6443
KUBERNETES_CLUSTER_NAME=prod-cluster

# Enable GitHub-based authentication
ACCESS_TOKEN=<github-token>              # GitHub personal access token
ALLOW_SSH_ACCESS_ROLES=admin,maintain     # Which GitHub roles can access
```

### Additional Capabilities

```bash
# Enable container state tracking (optional)
FIREBASE_PROJECT_ID=your-project         # Track container lifecycle
FIREBASE_PRIVATE_KEY=<service-account>   # Firebase authentication
```

For production setup, see:
- [Environment Variables](docs/environment.md) - Complete configuration guide
- [Kubernetes Authentication](docs/kuberentes-auth.md) - Service account setup

## 👍 Usage

### SSH Access
```bash
# Interactive shell
ssh pod-name@localhost        # Local testing
ssh pod-name@sftp.company.com # Production example

# Run commands
ssh pod-name@localhost "ls -la"

# Access specific namespace
ssh namespace.pod-name@localhost
```

### File Transfer
```bash
# Upload files
scp local-file pod-name@localhost:/path/

# Download files
scp pod-name@localhost:/path/file ./

# Interactive SFTP
sftp pod-name@localhost
```

For production deployment and advanced features, see:
- [Kubernetes Setup](docs/kuberentes-auth.md)
- [Environment Variables](docs/environment.md)
- [Client Guide](docs/client-guide.md)

## 📚 Documentation

- [Client Guide](docs/client-guide.md) - Usage examples and SSH configuration
- [Troubleshooting](docs/troubleshooting.md) - Common issues and solutions
- [Architecture Details](docs/architecture.md) - System design and components

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
