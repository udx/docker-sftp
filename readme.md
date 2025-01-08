# Docker SFTP/SSH Gateway for Kubernetes

A secure SSH/SFTP gateway that provides direct access to Kubernetes pods using GitHub authentication and permissions.

## Features

- 🔐 GitHub-based authentication using SSH keys
- 🚀 Direct SSH/SFTP access to Kubernetes pods
- 👥 Role-based access control tied to GitHub permissions
- 🔄 Real-time key synchronization
- 📊 Container state management via Firebase
- 🔔 Slack notifications for system events

## Quick Start

```bash
# Build the image
docker build --tag=rabbit-ssh:dev .

# Run for development
docker-compose up --build --renew-anon-volumes

# Connect to a pod
ssh [pod-name]@ssh.rabbit.ci
```

## Architecture

### Core Components

1. **SSH Gateway**
   - Handles SSH/SFTP connections
   - Authenticates using GitHub SSH keys
   - Routes connections to appropriate pods

2. **API Server**
   - Manages pod connections
   - Handles container state
   - Provides health endpoints

3. **Key Management**
   - Syncs with GitHub collaborators
   - Manages access permissions
   - Updates authorized_keys

### Security

- GitHub-based authentication
- Role-based access control
- No password authentication
- Kubernetes service account integration

## Configuration

### Required Secrets

| Secret | Description |
|--------|-------------|
| `GKE_SA_KEY` | GCP Service Account key (JSON) |
| `ACCESS_TOKEN` | GitHub Access Token |
| `KUBERNETES_CLUSTER_USER_TOKEN` | Kubernetes auth token |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ALLOW_SSH_ACCESS_ROLES` | "admin,maintain,write" | GitHub roles allowed to access |
| `PRODUCTION_BRANCH` | "production" | Branch for production environment |
| `ALLOW_SSH_ACCES_PROD_ROLES` | "admin" | Roles allowed in production |

See [Environment Variables](docs/environment.md) for full list.

## Usage

### SSH Access
```bash
# Direct shell access
ssh [pod-name]@ssh.rabbit.ci

# Run specific command
ssh [pod-name]@ssh.rabbit.ci [command]
```

### SFTP Access
```bash
# Interactive SFTP session
sftp [pod-name]@ssh.rabbit.ci

# File transfer
scp local-file [pod-name]@ssh.rabbit.ci:/path/
```

## Documentation

- [Architecture Details](docs/architecture.md)
- [Security Model](docs/security.md)
- [Kubernetes Integration](docs/kubernetes.md)
- [Client Configuration](docs/client-configuration.md)
- [Troubleshooting](docs/troubleshooting.md)
- [API Reference](docs/api.md)

## Contributing

See [CONTRIBUTING.md](docs/contributing.md) for development guidelines.

## License

This project is proprietary software. All rights reserved.
