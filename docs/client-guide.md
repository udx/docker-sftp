# Client Guide

## SSH Client Configuration

### Basic Setup

Add this to your `~/.ssh/config`:

```ssh-config
# Production environment
Host www-myapp-com
    HostName ssh.rabbit.ci
    User www-myapp-com-production-pod-a1b2c3
    IdentityFile ~/.ssh/github_rsa
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
    RequestTTY force
    ConnectTimeout 10
    ServerAliveInterval 15
    ServerAliveCountMax 3

# Development environment
Host www-myapp-com-dev
    HostName ssh.rabbit.ci
    User www-myapp-com-development-pod-x1y2z3
    IdentityFile ~/.ssh/github_rsa
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
    RequestTTY force
    ConnectTimeout 10
    ServerAliveInterval 15
    ServerAliveCountMax 3
```

### Configuration Options Explained

- `HostName`: The SSH server address
- `User`: Your pod-specific username
- `IdentityFile`: Your GitHub SSH key
- `StrictHostKeyChecking no`: Skip host verification
- `UserKnownHostsFile /dev/null`: Don't store host keys
- `RequestTTY force`: Ensure proper terminal allocation
- `ConnectTimeout 10`: Connection timeout in seconds
- `ServerAliveInterval 15`: Keep connection alive
- `ServerAliveCountMax 3`: Maximum keepalive retries

## Usage Examples

### Basic SSH Connection

```bash
# Connect to production pod
ssh www-myapp-com

# Connect to development pod
ssh www-myapp-com-dev

# With specific namespace
ssh [namespace].[pod-name]@ssh.rabbit.ci

# Run specific command
ssh [pod-name]@ssh.rabbit.ci "ls -la"
```

### File Transfer

```bash
# Interactive SFTP session
sftp www-myapp-com-dev

# Upload file
scp local-file [pod-name]@ssh.rabbit.ci:/remote/path/

# Download file
scp [pod-name]@ssh.rabbit.ci:/remote/file local-path/
```

## Administrative Tasks

### User Management

Users are automatically created and managed based on GitHub permissions. See [User Management](user-management.md) for details.

### Key Management

```bash
# Sync GitHub keys
node controller.keys.js sync

# List authorized keys
node controller.keys.js list
```

## Troubleshooting

### Health Check

```bash
# Check service status
worker service list

# View service logs
worker service logs sshd
worker service logs rabbit-ssh-server
```

### Common Issues

1. Check SSH logs:

   ```bash
   tail -f /var/log/sshd.log
   ```

2. Verify key permissions:
   ```bash
   ls -la /etc/ssh/authorized_keys.d/
   ```
