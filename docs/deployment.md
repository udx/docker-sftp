# Deployment Guide

This guide covers local testing and Kubernetes deployment. For all available
settings, see [Runtime Configuration](environment.md).

## Before You Start

- Kubernetes access with `kubectl` configured
- A GitHub token that can evaluate the repositories used for access checks
- A Kubernetes service account with only the workload access the gateway needs
- An SSH key registered with the GitHub account that will connect

Keep tokens and certificates in Docker secrets, Kubernetes Secrets, or the
deployment system. Do not commit them to manifests.

## Local Test

Export the required values:

```bash
export ACCESS_TOKEN="your-github-token"
export KUBERNETES_CLUSTER_ENDPOINT="https://your-cluster"
export KUBERNETES_CLUSTER_USER_TOKEN="your-service-account-token"
```

Start the published image:

```bash
docker run -d \
  --name sftp-gateway \
  -p 2222:22 \
  --env ACCESS_TOKEN \
  --env KUBERNETES_CLUSTER_ENDPOINT \
  --env KUBERNETES_CLUSTER_USER_TOKEN \
  usabilitydynamics/docker-sftp:0.14.2
```

## Kubernetes

Maintained example manifests are available for the
[Deployment](../examples/configs/kubernetes/deployment.yml),
[LoadBalancer Service](../examples/configs/kubernetes/service.yml), and optional
[restart CronJob](../examples/configs/kubernetes/deployment-restart-cronjob.yml).

1. Copy the manifests into the deployment repository and replace their
   `${...}` placeholders. The deployment template expects the cluster endpoint,
   service-account name, service-account token, certificate, access token, and
   image coordinates.
2. Select the image source. The template currently uses Artifact Registry; for
   Docker Hub, replace its `image` value with
   `usabilitydynamics/docker-sftp:0.14.2` or an immutable digest.
3. Create or select a service account and grant only the permissions needed to
   reach the intended workloads. Set its name in `serviceAccountName` and in
   the `KUBERNETES_CLUSTER_SERVICEACCOUNT` value.
4. Apply the rendered Deployment and Service:

```bash
NAMESPACE=your-namespace
RESOURCE_NAME=sftp-gateway

kubectl apply -n "$NAMESPACE" -f deployment.yml
kubectl apply -n "$NAMESPACE" -f service.yml
kubectl rollout status -n "$NAMESPACE" deployment/"$RESOURCE_NAME"
```

## Verify

Find the LoadBalancer address, then connect using the target namespace and pod
name as the SSH user:

```bash
SSH_HOST=$(kubectl get service -n "$NAMESPACE" "$RESOURCE_NAME" \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

ssh namespace.pod-name@"$SSH_HOST"
```

If the load balancer exposes an IP rather than a hostname, retrieve
`.status.loadBalancer.ingress[0].ip` instead. See the [Client Guide](client-guide.md)
for SSH configuration and SFTP usage, or [Troubleshooting](troubleshooting.md)
when the connection fails.
