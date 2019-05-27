* Starts PM2 inside which runs SSHD.

Build:
```
docker build --tag=rabbit-ssh:dev .
```

Run for debug:
```
docker-compose up --build --renew-anon-volumes
```
