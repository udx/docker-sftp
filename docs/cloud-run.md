# Deploying to Google Cloud Run

This guide explains how to deploy K8 Container Gate to Google Cloud Run.

## Prerequisites

1. Google Cloud SDK installed and configured
2. Docker installed locally
3. Access to a Google Cloud project
4. Required permissions:
   - Cloud Run Admin
   - Service Account User
   - Storage Admin (for Container Registry)

## Configuration

### Environment Variables

Required environment variables:
```bash
KUBERNETES_CLUSTER_ENDPOINT=<your-k8s-cluster-endpoint>
KUBERNETES_CLUSTER_NAME=<your-k8s-cluster-name>
KUBERNETES_CLUSTER_NAMESPACE=<your-k8s-namespace>
KUBERNETES_CLUSTER_USER_TOKEN=<your-k8s-token>
ACCESS_TOKEN=<github-access-token>
```

Optional environment variables:
```bash
SERVICE_ENABLE_FIREBASE=false
STATE_PROVIDER=kubernetes
DEBUG=ssh:*
```

### Health Check Configuration

The service exposes a health check endpoint at `/health` that returns:
- 200: Service is healthy
- 503: Service is unhealthy
- 500: Internal error

## Deployment Steps

1. Build and push the Docker image:
```bash
# Build the image
docker build -t gcr.io/[PROJECT_ID]/k8-container-gate:latest -f Dockerfile.udx .

# Push to Container Registry
docker push gcr.io/[PROJECT_ID]/k8-container-gate:latest
```

2. Deploy to Cloud Run:
```bash
# Note: Cloud Run only supports HTTP/HTTPS ports (8080)
gcloud run deploy docker-sftp \
  --image=usabilitydynamics/docker-sftp:latest \
  --platform=managed \
  --region=us-central1 \
  --project=destinationpickleball-com-8173 \
  --port=8080 \
  --memory=512Mi \
  --cpu=1 \
  --timeout=300 \
  --concurrency=80 \
  --command=npm start \
  --service-account=213576542242-compute@developer.gserviceaccount.com \
  --set-env-vars="\
KUBERNETES_CLUSTER_ENDPOINT=value1here,\
KUBERNETES_CLUSTER_NAME=value2here,\
KUBERNETES_CLUSTER_NAMESPACE=default,\
SERVICE_ENABLE_SSHD=true,\
SERVICE_ENABLE_API=true,\
DEBUG=ssh:*" \
  --allow-unauthenticated \
  --use-http2

# Important: Since Cloud Run doesn't support SSH port 22 directly, 
# you'll need to set up a TCP proxy or load balancer to forward SSH traffic.
# See the "SSH Access Setup" section below for details.
```

### SSH Access Setup

Since Cloud Run only supports HTTP/HTTPS traffic, you'll need to set up one of these options for SSH access:

1. **Google Cloud Load Balancer**:
   ```bash
   # Create a TCP load balancer
   gcloud compute forwarding-rules create k8gate-ssh \
     --load-balancing-scheme=EXTERNAL \
     --ports=22 \
     --target-service=k8-container-gate \
     --region=us-central1
   ```

2. **Cloud NAT + VPC Connector**:
   ```bash
   # Create a VPC connector
   gcloud compute networks vpc-access connectors create k8gate-connector \
     --network=default \
     --region=us-central1 \
     --range=10.8.0.0/28
   
   # Update the Cloud Run service to use the connector
   gcloud run services update k8-container-gate \
     --vpc-connector=k8gate-connector \
     --region=us-central1
   ```

Replace the following placeholders:
- `[PROJECT_ID]`: Your Google Cloud project ID
- `[SERVICE_ACCOUNT_EMAIL]`: Service account email (e.g., `213576542242-compute@developer.gserviceaccount.com`)
- `[VALUE]`: Actual values for environment variables

## Health Check Setup

Add a health check in the Cloud Run console:
1. Go to your Cloud Run service
2. Click "EDIT & DEPLOY NEW REVISION"
3. Under "Container" section, add health check:
   - Type: HTTP
   - Path: /health
   - Initial delay: 0 seconds
   - Timeout: 1 second
   - Period: 10 seconds
   - Failure threshold: 3
   - Success threshold: 1

## Networking Configuration

1. HTTP/2 End-to-end:
   - Enabled by default with `--use-http2` flag
   - Improves performance for gRPC streaming

2. Session Affinity:
   - Optional: Enable if needed for consistent client routing
   - Configure through Cloud Console or `--session-affinity` flag

3. VPC Configuration:
   - Optional: Connect to VPC for secure internal communication
   - Use `--vpc-connector` flag if required

## Monitoring and Logging

1. View logs:
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=k8-container-gate" --limit=50
```

2. View metrics:
```bash
gcloud monitoring metrics list --filter="metric.type=run.googleapis.com/request_count"
```

## Troubleshooting

1. Container fails to start:
   - Check health check endpoint configuration
   - Verify environment variables are set correctly
   - Review container logs for startup errors

2. SSH connection issues:
   - Verify port configuration (22)
   - Check Kubernetes cluster connectivity
   - Ensure service account has necessary permissions

3. Health check failures:
   - Verify `/health` endpoint is responding
   - Check resource constraints (CPU/memory)
   - Review application logs for errors

## Security Considerations

1. Authentication:
   - Use `--no-allow-unauthenticated` for private deployments
   - Configure Identity and Access Management (IAM) roles

2. Secrets Management:
   - Use Secret Manager for sensitive values
   - Mount secrets as environment variables

3. Network Security:
   - Configure VPC connector for internal resources
   - Use Cloud Armor for DDoS protection

## Cost Optimization

1. Resource Allocation:
   - Start with 512Mi memory and 1 CPU
   - Adjust based on actual usage metrics

2. Autoscaling:
   - Configure min/max instances
   - Set appropriate concurrency

## Additional Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Container Runtime Contract](https://cloud.google.com/run/docs/container-contract)
- [Pricing Calculator](https://cloud.google.com/products/calculator)
