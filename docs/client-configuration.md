# SSH Client Configuration

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

## Usage

```bash
# Connect to production
ssh www-myapp-com

# Connect to development
ssh www-myapp-com-dev

# Use SFTP
sftp www-myapp-com-dev

# Copy files
scp local.txt www-myapp-com-dev:/remote/path/
```

## Configuration Explained

- `HostName`: The SSH server address
- `User`: Your pod-specific username
- `IdentityFile`: Your GitHub SSH key
- `StrictHostKeyChecking no`: Skip host verification
- `UserKnownHostsFile /dev/null`: Don't store host keys
- `RequestTTY force`: Ensure proper terminal allocation
- `ConnectTimeout 10`: Connection timeout in seconds
- `ServerAliveInterval 15`: Keep connection alive
- `ServerAliveCountMax 3`: Maximum keepalive retries
