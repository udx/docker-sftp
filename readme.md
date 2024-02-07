* Starts PM2 inside which runs SSHD.

Build:
```
docker build --tag=rabbit-ssh:dev .
```

Run for debug:
```
docker-compose up --build --renew-anon-volumes
```

You can control an access to containers by adding `ALLOW_SSH_ACCESS_ROLES` env(str). 
Set roles through coma you want to grant an access. 
Roles `admin`, `maintain`, `write` are set by default.

### Secrets
* GKE_PROJECT - GCP Project ID
* GKE_SA_KEY - GCP Service Account key(in json format)
* ACCESS_TOKEN - GitHub Access Token
* KUBERNETES_CLUSTER_ENDPOINT - domain or IP, without http/s
* KUBERNETES_CLUSTER_SERVICEACCOUNT - k8s SA name
* KUBERNETES_CLUSTER_CERTIFICATE - stringified PEM certificate
* KUBERNETES_CLUSTER_NAMESPACE
* KUBERNETES_CLUSTER_USER_SECRET - k8s secret name
* KUBERNETES_CLUSTER_USER_TOKEN
* KUBERNETES_CLUSTER_CONTEXT
* SLACK_NOTIFICACTION_URL - optional
* SLACK_NOTIFICACTION_CHANNEL - optional

### Variables
* GKE_CLUSTER - GKE Cluster name
* GKE_REGION - GKE Cluster region
* AR_LOCATION - Artifact Registry location
* AR_REPOSITORY - Artifact Registry repository

### Environment Variables
* KUBERNETES_CLUSTER_ENDPOINT
* KUBERNETES_CLUSTER_NAME
* KUBERNETES_CLUSTER_SERVICEACCOUNT
* KUBERNETES_CLUSTER_CERTIFICATE
* KUBERNETES_CLUSTER_NAMESPACE
* KUBERNETES_CLUSTER_USER_SECRET
* KUBERNETES_CLUSTER_USER_TOKEN
* KUBERNETES_CLUSTER_CONTEXT
* SLACK_NOTIFICACTION_URL
* SLACK_NOTIFICACTION_CHANNEL
