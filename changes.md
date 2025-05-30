### 0.7.4
* Update npm packages
  * `debug` → `^4.4.1` (from `^4.4.0`)
  * `firebase-admin` → `^13.4.0` (from `^13.2.0`)
  * `google-gax` → `^4.6.1` (from `^4.6.0`)
* Set `--no-install-recommends` for `apt-get install` to reduce image size and fix build

### 0.7.3
* Upgraded base image to `usabilitydynamics/udx-worker-nodejs:0.13.0` (from `0.12.0`)

### 0.7.2
* Upgraded base image to `usabilitydynamics/udx-worker-nodejs:0.12.0` (from `0.11.0`)
* Updated Docker packages:
  * `apt-transport-https` → `3.0.0` (from `2.9.32ubuntu1`)
  * `gnupg2` → `2.4.4-2ubuntu23` (from `2.4.4-2ubuntu22`)
  * `libssl-dev` → `3.4.1-1ubuntu3` (from `3.4.1-1ubuntu1`)
  * `openssl` → `3.4.1-1ubuntu3` (from `3.4.1-1ubuntu1`)
  * `openssh-server` → `1:9.9p1-3ubuntu3.1` (from `1:9.9p1-3ubuntu3`)
  * `openssh-client` → `1:9.9p1-3ubuntu3.1` (from `1:9.9p1-3ubuntu3`)
* Updated NPM packages:
  * `axios` → `^1.9.0` (from `^1.8.3`)
  * `firebase-admin` → `^13.3.0` (from `^13.2.0`)
  * `google-gax` → `^4.6.0` (new dependency)
  * `express` → `^5.1.0` (new dependency)

### 0.7.1
* Docker `apt-transport-https` → `2.9.32ubuntu1`
* NPM `axios` → `^1.8.3`
* NPM `firebase-admin` → `^13.2.0`
* Fixed package versions alignment

### 0.7.0
* Migrated image to be based on `usabilitydynamics/udx-worker-nodejs:0.11.0`
* Improved build to pre-configure environment
* Moved entrypoint logic to services
* Added services config manifest
* Cleaned up pm2 configs
* Moved js scripts to `/lib`
* Updated docs
* Repo cleanup

### 0.6.2
* added changes to controller.ssh.entrypoint. Fixes for exec command

### 0.6.1
* added changes to fix startup warnings

### 0.6.0
* updated kubectl to 1.32.0
* changed kubectl package source

### 0.5.5
* OS updates
* Updated node modules. Updated Alpine to node:23.5-alpine
* Improved SSH/SFTP handling and documentation
* Improved SSH config and add logging documentation

### 0.5.4
* Updated openssh to 9.9p1

### 0.5.3
* Updated node modules. Updated Alpine to node:23.4-alpine

### 0.5.2
* Update node modules. Update Alpine

### 0.5.1
* OS updates
* added config for a cronjob to scheduled container restart
* set limits for k8s deploymets

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