* Starts PM2 inside which runs SSHD.

Build:
```
docker build --tag=rabbit-ssh:dev .
```

Run for debug:
```
docker-compose up --build --renew-anon-volumes
```

### Environment Variables

* GITHUB_ACCESS_TOKENS - comma separated list of GitHub personal access tokens to use to discover repository ACL
* KUBERNETES_CLUSTER_ENDPOINT
* KUBERNETES_CLUSTER_NAME
* KUBERNETES_CLUSTER_SERVICEACCOUNT
* KUBERNETES_CLUSTER_CERTIFICATE - stringified PEM certificate
* KUBERNETES_CLUSTER_NAMESPACE
* KUBERNETES_CLUSTER_USER_SECRET
* KUBERNETES_CLUSTER_USER_TOKEN
* KUBERNETES_CLUSTER_CONTEXT
* SLACK_NOTIFICACTION_URL
* SLACK_NOTIFICACTION_CHANNEL