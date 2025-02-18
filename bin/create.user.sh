#!/bin/bash
# Create users
touch /var/log/sshd.log
chmod 777 /var/log/sshd.log
for f in $(ls /etc/ssh/authorized_keys.d/); do
  id  -u $f &> /dev/null || {
      adduser -D $f
      passwd -u $f
  }
done