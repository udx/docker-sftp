### 0.5.0
* Upgraded parent Docker Image to `node:22.7.0-alpine`
* Improved `GitHub Action workflow` and removed sensitive data from Docker Image
* Updated `axios` to `1.7.5`

### 0.4.0
* Upgraded parent Docker image to `node:22`
* Upgraded `kubectl` to `1.31.0`
* Upgaded `OpenSSH` to `9.8`
* Solved vulnerabilities in `npm` packages and OS

### 0.3.0
* Fixed `JavaScript` errors 

### 0.2.9
* Forwarded `sshd` logs to `container` logs

### 0.2.8
* updated `NodeJS` version to `20`
* updated `NodeJS Modules` to the latest versions
* fixed issue with `SFTP` connection
* prevented access for the `root` user
* added processing `SLACK_NOTIFICACTION_CHANNEL` and `SLACK_NOTIFICACTION_URL` environment variables in `GitHub Action`
* updated `GitHub Action` `Build and Deploy to GKE`
* added additional logging

### 0.2.7
* updated curl to 8.5.0 because of vulnerability
* access is allowed for the admin role in production

### 0.2.6
* updated kubectl version
* changed gcloud installation logic

### 0.2.5
* upgraded node to 18
* added gcloud
* added gke-gcloud-auth-plugin
* moved docker image from GCR to AR

### 0.2.4
* Added an option to set roles by `ALLOW_SSH_ACCESS_ROLES` env. Set `admin`, `maintain`, `write` by default.
* Added the action to create a GitHub release.

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