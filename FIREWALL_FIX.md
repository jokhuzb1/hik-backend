# VPS Firewall Troubleshooting

## Check Current Firewall Status

```bash
# Check UFW status
ufw status verbose

# Check if ports are listening
netstat -tulpn | grep -E ':(21|9000|10000)'

# Check Docker port mappings
docker ps
```

## Open Required Ports

```bash
# Allow FTP control port
ufw allow 21/tcp

# Allow web dashboard
ufw allow 9000/tcp

# Allow FTP passive mode ports
ufw allow 10000:10100/tcp

# Reload firewall
ufw reload

# Verify
ufw status numbered
```

## Test FTP Connection from Outside

```bash
# From your local machine (Windows PowerShell)
Test-NetConnection -ComputerName 77.237.245.47 -Port 21
```

## If UFW is not enabled, enable it:

```bash
ufw enable
ufw allow ssh  # IMPORTANT: Allow SSH first!
ufw allow 21/tcp
ufw allow 9000/tcp
ufw allow 10000:10100/tcp
```

## Alternative: Disable firewall temporarily to test

```bash
# ONLY FOR TESTING - NOT RECOMMENDED FOR PRODUCTION
ufw disable

# Try camera connection now
# If it works, the issue is firewall

# Re-enable and configure properly
ufw enable
ufw allow 21/tcp
ufw allow 9000/tcp
ufw allow 10000:10100/tcp
```
