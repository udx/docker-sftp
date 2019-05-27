#!/bin/sh

# generate fresh rsa key
if [[ ! -f "/etc/ssh/ssh_host_rsa_key" ]]; then
	ssh-keygen -f /etc/ssh/ssh_host_rsa_key -N '' -t rsa
  chmod 0600 /etc/ssh/ssh_host_rsa_key
fi

# generate fresh dsa key
if [[ ! -f "/etc/ssh/ssh_host_dsa_key" ]]; then
	ssh-keygen -f /etc/ssh/ssh_host_dsa_key -N '' -t dsa
  chmod 0600 /etc/ssh/ssh_host_dsa_key
fi

chmod 0600 /etc/ssh/ssh_host_ecdsa_key

pm2 startOrReload /opt/sources/rabbitci/rabbit-ssh/static/ecosystem.config.js

if [[ -f /opt/sources/rabbitci/rabbit-ssh/static/kuberentes-ca.crt ]]; then
  echo "Setting up Kubernetes.";

  kubectl config set-cluster ${KUBERNETES_CLUSTER_NAME} \
    --embed-certs=true \
    --server=${KUBERNETES_CLUSTER_ENDPOINT} \
    --certificate-authority=/opt/sources/rabbitci/rabbit-ssh/static/kuberentes-ca.crt

  kubectl config set-context ${KUBERNETES_CLUSTER_NAMESPACE} \
    --namespace=${KUBERNETES_CLUSTER_NAMESPACE} \
    --cluster=${KUBERNETES_CLUSTER_NAME} \
    --user=${KUBERNETES_CLUSTER_SERVICEACCOUNT}

  kubectl config set-credentials ${KUBERNETES_CLUSTER_SERVICEACCOUNT} --token=${KUBERNETES_CLUSTER_USER_TOKEN}

  kubectl config use-context ${KUBERNETES_CLUSTER_NAMESPACE}

  cp /root/.kube/config /home/node/.kube/config
  chown node:node /home/node/.kube/config

fi;

## Command pass-through.
exec "$@"

