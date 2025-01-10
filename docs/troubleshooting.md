# Troubleshooting Guide

## Common Issues

### SSH Connection Issues

#### 1. "Permission denied (publickey)"
- Verify GitHub SSH key is properly added
- Check user has correct repository permissions
- Ensure key is synced to authorized_keys

#### 2. "Unknown operand" for SFTP
```
sh: internal-sftp: unknown operand
sh: /usr/lib/ssh/sftp-server: unknown operand
```
**Solution**:
- Container needs openssh-sftp-server package
- Check container OS type in logs
- Contact administrator to add SFTP support

#### 3. Pod Not Found
```
Error from server (NotFound): pods "www-myapp-com" not found
```
**Solution**:
- Verify pod exists in correct namespace
- Check connection string format
- Ensure proper Kubernetes permissions

## Logging

### Log Locations
- SSH/SFTP sessions: `/var/log/sshd.log`
  ```bash
  # View connection attempts
  tail -f /var/log/sshd.log
  
  # Example log entry:
  # [2025-01-07 19:42:27] SFTP connection attempt from [192.168.1.100] for user [www-myapp-com] to pod [production/www-myapp-com-a1b2c3]
  ```
- Process logs:
  ```bash
  # View all logs
  pm2 logs
  
  # View specific service
  pm2 logs sshd
  ```

### What's in the Logs
- Connection attempts (successful/failed)
- SFTP server availability
- Container OS detection
- Error messages and reasons
- Client IP addresses
- User and pod information

## Security Verification

### 1. Check Permissions
```bash
# Verify key permissions
ls -la /etc/ssh/ssh_host_*

# Check authorized_keys
ls -la /etc/ssh/authorized_keys.d/
```

### 2. Verify Configuration
```bash
# Check SSHD config
sshd -T | grep -E 'passwordauthentication|permitrootlogin|subsystem'
```

## Required Information for Support
1. Pod name and namespace
2. SSH client version
3. Contents of /var/log/sshd.log
4. Client IP address
5. GitHub username
