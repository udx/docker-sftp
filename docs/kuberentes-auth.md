### On Your VM

```
## create new service account called docker-ssh
kubectl create sa docker-ssh -n default

KUBERNETES_CLUSTER_USER_SECRET=$(kubectl get sa -n default docker-ssh -o json | jq -r .secrets[].name)

kubectl get secret -n default $KUBERNETES_CLUSTER_USER_SECRET -o json | jq -r '.data["ca.crt"]' | base64 -D > /Users/andy/Documents/GitHub/rabbit-ssh/static/kuberentes-ca.crt

KUBERNETES_CLUSTER_USER_TOKEN=$(kubectl get -n default secret $KUBERNETES_CLUSTER_USER_SECRET -o json | jq -r '.data["token"]' | base64 -D)

KUBERNETES_CLUSTER_CONTEXT=$(kubectl config current-context)

## get cluster name of context
KUBERNETES_CLUSTER_NAME=$(kubectl config get-contexts $current_context | awk '{print $3}' | tail -n 1)

# get endpoint of current context 
KUBERNETES_CLUSTER_ENDPOINT=$(kubectl config view -o jsonpath="{.clusters[?(@.name == \"$KUBERNETES_CLUSTER_NAME\")].cluster.server}");
```

```
kubectl -n default get serviceaccount docker-ssh
kubectl -n default describe serviceaccount docker-ssh
kubectl -n default get secret docker-ssh-token-6s4kk
kubectl -n default describe secret default-token-wt87w
```

Add role binding
```
kubectl -n default get rolebinding

kubectl -n default create rolebinding docker-ssh-admin \
  --clusterrole=admin \
  --serviceaccount=default:docker-ssh
```



