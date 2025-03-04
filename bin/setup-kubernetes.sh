#!/bin/bash
set -e

# Log helper
log() {
    echo "[k8s-setup] $1"
}

log "Starting Kubernetes setup"

# Check required variables
if [[ -z "${KUBERNETES_CLUSTER_NAME}" ]]; then
    log "KUBERNETES_CLUSTER_NAME not set, skipping setup"
    exit 0
fi

if [[ -z "${KUBERNETES_CLUSTER_ENDPOINT}" ]]; then
    log "KUBERNETES_CLUSTER_ENDPOINT not set, skipping setup"
    exit 0
fi

# Only proceed if Kubernetes certificate is provided
if [[ "${KUBERNETES_CLUSTER_CERTIFICATE}" != "" ]]; then
  echo "Writing Kubernetes certificate to [/home/udx/.kube/kuberentes-ca.crt]"
  cat /var/run/secrets/kubernetes.io/serviceaccount/ca.crt > /home/udx/.kube/kuberentes-ca.crt
fi

# Only proceed if certificate exists
if [[ -f /home/udx/.kube/kuberentes-ca.crt ]]; then
  echo "Setting up Kubernetes [$KUBERNETES_CLUSTER_NAME] cluster with [$KUBERNETES_CLUSTER_NAMESPACE] namespace."

  kubectl config set-cluster ${KUBERNETES_CLUSTER_NAME} \
    --embed-certs=true \
    --server=${KUBERNETES_CLUSTER_ENDPOINT} \
    --certificate-authority=/var/run/secrets/kubernetes.io/serviceaccount/ca.crt

  kubectl config set-context ${KUBERNETES_CLUSTER_NAMESPACE} \
    --namespace=${KUBERNETES_CLUSTER_NAMESPACE} \
    --cluster=${KUBERNETES_CLUSTER_NAME} \
    --user=${KUBERNETES_CLUSTER_SERVICEACCOUNT}

  kubectl config set-credentials ${KUBERNETES_CLUSTER_SERVICEACCOUNT} --token=${KUBERNETES_CLUSTER_USER_TOKEN}

  kubectl config use-context ${KUBERNETES_CLUSTER_NAMESPACE}
fi
