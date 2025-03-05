# Client Guide

## SSH Client Configuration

### Basic Setup

Add this to your `~/.ssh/config`:

```ssh-config
# Example SSH configuration
Host pod-example
    # Your deployed SFTP gateway address (e.g., sftp.company.com)
    HostName YOUR_GATEWAY_ADDRESS
    # Pod name from your cluster
    User example-pod-name
    # Your GitHub SSH key
    IdentityFile ~/.ssh/github_rsa
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
    RequestTTY force
    ConnectTimeout 10
    ServerAliveInterval 15
    ServerAliveCountMax 3

# Multiple environments example
Host pod-example-dev
    HostName YOUR_GATEWAY_ADDRESS
    User example-pod-name-dev
    IdentityFile ~/.ssh/github_rsa
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
    RequestTTY force
    ConnectTimeout 10
    ServerAliveInterval 15
    ServerAliveCountMax 3
```

### Configuration Options Explained

- `HostName`: Your deployed SFTP gateway address (the host where you deployed the container)
- `User`: The Kubernetes pod name you want to connect to
- `IdentityFile`: Path to your GitHub SSH key (must be added to your GitHub account)
- `StrictHostKeyChecking no`: Skip host verification (useful for dynamic pod environments)
- `UserKnownHostsFile /dev/null`: Don't store host keys (recommended for dynamic environments)
- `RequestTTY force`: Ensure proper terminal allocation
- `ConnectTimeout 10`: Connection timeout in seconds
- `ServerAliveInterval 15`: Keep connection alive
- `ServerAliveCountMax 3`: Maximum keepalive retries

## Usage Examples

### Basic SSH Connection

```bash
# Using SSH config
ssh pod-example

# Direct connection
ssh pod-name@YOUR_GATEWAY_ADDRESS

# With specific namespace
ssh namespace.pod-name@YOUR_GATEWAY_ADDRESS

# Run specific command
ssh pod-name@YOUR_GATEWAY_ADDRESS "ls -la"
```

### File Transfer

```bash
# Interactive SFTP session
sftp pod-example

# Upload file
scp local-file pod-name@YOUR_GATEWAY_ADDRESS:/remote/path/

# Download file
scp pod-name@YOUR_GATEWAY_ADDRESS:/remote/file local-path/
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

## Troubleshooting Guide

For connection issues, logs, security checks, and service health, see [complete troubleshooting documentation](troubleshooting.md).
