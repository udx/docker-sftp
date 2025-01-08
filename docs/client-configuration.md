# SSH Client Configuration

Add this to your `~/.ssh/config`:

```ssh-config
# Production environment
Host dp-prod
    HostName ssh.rabbit.ci
    User www-destinationpickleball-com-www-destinationpickleball-co98t79
    IdentityFile ~/.ssh/github_rsa
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
    RequestTTY force
    ConnectTimeout 10
    ServerAliveInterval 15
    ServerAliveCountMax 3

# Development/Feature environment
Host dp-feature-api
    HostName ssh.rabbit.ci
    User www-destinationpickleball-com-feature-api-gpt-779575d557-k5vb2
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
ssh dp-prod

# Connect to feature environment
ssh dp-feature-api

# Use SFTP
sftp dp-feature-api

# Copy files
scp local.txt dp-feature-api:/remote/path/
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
