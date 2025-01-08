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

| Variable | Description |
|----------|-------------|
| `KUBERNETES_CLUSTER_ENDPOINT` | Kubernetes API endpoint |
| `KUBERNETES_CLUSTER_NAME` | Cluster name |
| `KUBERNETES_CLUSTER_SERVICEACCOUNT` | Service account name |
| `KUBERNETES_CLUSTER_USER_TOKEN` | Kubernetes auth token |
| `ALLOW_SSH_ACCESS_ROLES` | GitHub roles allowed to access |

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
- Process logs: `pm2 logs`
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

# View API and process logs
pm2 logs

# View specific service logs
pm2 logs sshd        # SSH daemon
pm2 logs api         # API server
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
