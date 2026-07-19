# Client Guide

Connect with an SSH key registered on the GitHub account that has access to the
repository evaluated by the gateway.

## Connect

Use `namespace.pod-name` as the SSH user:

```bash
ssh namespace.pod-name@YOUR_GATEWAY_ADDRESS
```

Run a command in the target workload:

```bash
ssh namespace.pod-name@YOUR_GATEWAY_ADDRESS "ls -la"
```

If the gateway uses a non-default port, add `-p PORT` to each command.

## SSH Configuration

For a named shortcut, add an entry to `~/.ssh/config`:

```ssh-config
Host sftp-workload
    HostName YOUR_GATEWAY_ADDRESS
    User namespace.pod-name
    IdentityFile ~/.ssh/github_rsa
    RequestTTY force
```

Connect with `ssh sftp-workload`. Keep normal host-key verification enabled;
confirm the host fingerprint on the first connection.

## File Transfer

The target workload must support SFTP for file transfers.

```bash
# Interactive session
sftp namespace.pod-name@YOUR_GATEWAY_ADDRESS

# Upload and download
scp local-file namespace.pod-name@YOUR_GATEWAY_ADDRESS:/remote/path/
scp namespace.pod-name@YOUR_GATEWAY_ADDRESS:/remote/file ./local-path
```

## Access and Support

The gateway checks the authenticated GitHub user's repository role before
opening a session. See [User Management](user-management.md) for access rules.
For failed connections, see [Troubleshooting](troubleshooting.md).
