
### 0.2.4
* Added an option to set roles by `ALLOW_SSH_ACCESS_ROLES` env. Set `admin`, `maintain`, `write` by default.

### 0.2.3
* Prevent access to `production` containers.

### 0.2.2
* Prevent access to users with roles: `Read`, `Triage` and `Write`. Provide access only for roles: `Maintain` and `Admin`.

### 0.2.1
* Fixed getPods endpoint for getting pods from all namespaces

### 0.2.0
* Updated Node to 14
* Request module replaced by axios
* Added deploy action for deploying k8s service and deployment to the cluster from GitHub
* Updated kubectl to v1.23.0

### 0.1.4
* Bugfix with permissions on .kube directory.

### 0.1.3
* Improving permission fixes and making pm2 silent

### 0.1.2
* Version bump.