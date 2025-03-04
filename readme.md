# Docker SFTP/SSH Gateway for Kubernetes

A secure SSH/SFTP gateway that provides direct access to Kubernetes pods using GitHub authentication and permissions.

## Features

- 🔐 GitHub-based authentication using SSH keys
- 🚀 Direct SSH/SFTP access to Kubernetes pods
- 👥 Role-based access control tied to GitHub permissions
- 🔄 Real-time key synchronization
- 📊 Container state management
- 🔍 Detailed access logging

## Quick Start

```bash
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

### Required Environment Variables

#### Kubernetes Configuration
| Variable | Description |
|----------|-------------|
| `KUBERNETES_CLUSTER_ENDPOINT` | Kubernetes API endpoint |
| `KUBERNETES_CLUSTER_NAME` | Cluster name |
| `KUBERNETES_CLUSTER_SERVICEACCOUNT` | Service account name |
| `KUBERNETES_CLUSTER_USER_TOKEN` | Kubernetes auth token |

#### GitHub Configuration
| Variable | Description |
|----------|-------------|
| `ALLOW_SSH_ACCESS_ROLES` | GitHub roles allowed to access |
| `ACCESS_TOKEN` | GitHub access token |

#### Firebase Configuration
| Variable | Description |
|----------|-------------|
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_PRIVATE_KEY` | Firebase service account key |
| `FIREBASE_CLIENT_EMAIL` | Service account email |

See [Environment Variables](docs/environment.md) for full list.

## Usage

### SSH Access
```bash
# Direct shell access
ssh www-myapp-com

# Run specific command
ssh www-myapp-com "ls -la"
```

### SFTP Access
```bash
# Interactive SFTP session
sftp www-myapp-com

# File transfer
scp local-file www-myapp-com:/remote/path/
```

## Logging and Debugging

Key log locations:
- SSH/SFTP sessions: `/var/log/sshd.log`
  - Contains connection attempts
  - SFTP path resolutions
  - User session details
- Service logs: `worker service logs`
  - API server activity
  - Key synchronization events
  - General process health
- Container logs: `kubectl logs <pod-name>`
  - Container-level events
  - System messages
  - Authentication details

Quick debug commands:
```bash
# View SSH session logs
tail -f /var/log/sshd.log

# View service status
worker service list

# View specific service logs
worker service logs sshd             # SSH daemon
worker service logs rabbit-ssh-server  # API server
worker service logs k8s-setup       # Kubernetes setup
worker service logs firebase-consume # Firebase watcher
```

## Documentation

### Core Documentation
- [Architecture Details](docs/architecture.md) - System components and design
- [Environment Variables](docs/environment.md) - Configuration options and required variables
- [Client Guide](docs/client-guide.md) - SSH/SFTP setup and usage

### Integration Guides
- [Kubernetes Authentication](docs/kuberentes-auth.md) - Setting up Kubernetes service account
- [Firebase Integration](docs/firebase-integration.md) - Real-time container state management

### Development
- [API Reference](docs/api-reference.md) - REST API endpoints and usage
- [User Management](docs/user-management.md) - Managing access and permissions

### Support
- [Troubleshooting](docs/troubleshooting.md) - Common issues and debugging

## Contributing

See [CONTRIBUTING.md](docs/contributing.md) for development guidelines.

## License

This project is proprietary software. All rights reserved.
