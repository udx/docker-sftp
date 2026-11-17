# Runtime Configuration

The image includes a [Worker configuration](../etc/configs/worker/worker.yaml)
with safe defaults such as the service port, Kubernetes context name, and allowed
GitHub roles. Use it as the starting point for a portable deployment
configuration.

## `worker.yaml` and service settings

`worker.yaml` uses the standard [UDX Worker configuration format](https://github.com/udx/worker/blob/master/docs/config.md).
The Worker handles generic configuration: `config.env` provides defaults,
deployment environment variables take precedence, and `config.secrets` can
refer to runtime-resolved secrets. This document covers only docker-sftp
settings.

For example, this image's built-in configuration supplies service defaults:

```yaml
config:
  env:
    NODE_PORT: "8080"
    ALLOW_SSH_ACCESS_ROLES: "admin,maintain,write"
```

Copy the default file, change the settings for the deployment, and mount that
same file wherever the image runs:

```bash
cp etc/configs/worker/worker.yaml ./worker.yaml
# Edit ./worker.yaml, then mount it at the Worker configuration path.

docker run -d \
  --volume "$PWD/worker.yaml:/home/udx/.config/worker/worker.yaml:ro" \
  usabilitydynamics/docker-sftp:latest
```

In Kubernetes, mount the file from a ConfigMap at
`/home/udx/.config/worker/worker.yaml`. Deployment environment variables still
override its `config.env` values, so secrets and per-environment values can stay
in Kubernetes Secrets or the deployment system.

For custom `worker.yaml` files, secret references, mount locations, and
precedence, use the [Worker configuration reference](https://github.com/udx/worker/blob/master/docs/config.md).

Configuration is applied in this order:

1. The Worker reads `$HOME/.config/worker/worker.yaml`: the image default
   unless a deployment mounts its own file there.
2. Deployment environment variables override `config.env` values.
3. Secrets such as `ACCESS_TOKEN` are injected by Docker, Kubernetes Secrets,
   or the deployment system.

Mounting `worker.yaml` is optional: deployments can use the image defaults and
set only environment overrides. Change
[`etc/configs/worker/worker.yaml`](../etc/configs/worker/worker.yaml) and rebuild
only when the image's defaults should change for every deployment. Never store
credentials in that file or in deployment manifests.

For a local Docker run, export the required secrets and cluster values in your
host shell, then pass their names to `docker run`:

```bash
docker run -d \
  --name sftp-gateway \
  -p 2222:22 \
  --env ACCESS_TOKEN \
  --env KUBERNETES_CLUSTER_ENDPOINT \
  --env KUBERNETES_CLUSTER_USER_TOKEN \
  usabilitydynamics/docker-sftp:latest
```

## Kubernetes Configuration

Variables for connecting to your Kubernetes cluster:

| Variable                            | Description                                    | Required | Default         |
| ----------------------------------- | ---------------------------------------------- | -------- | --------------- |
| `KUBERNETES_CLUSTER_ENDPOINT`       | API server address (e.g. https://your-cluster) | Yes      | -               |
| `KUBERNETES_CLUSTER_USER_TOKEN`     | Service account token for authentication       | Yes      | -               |
| `KUBERNETES_CLUSTER_NAME`           | Name for kubectl cluster context               | No       | `default`       |
| `KUBERNETES_CLUSTER_SERVICEACCOUNT` | Service account name for kubectl config        | No       | "default"       |

See [Deployment Guide](deployment.md) for instructions on setting up service accounts and getting credentials.

## GitHub Configuration

| Variable                     | Description                                              | Required | Default                |
| ---------------------------- | -------------------------------------------------------- | -------- | ---------------------- |
| `ACCESS_TOKEN`               | GitHub access token                                      | Yes      | -                      |
| `ALLOW_SSH_ACCESS_ROLES`     | Allowed GitHub roles                                     | No       | `admin,maintain,write` |
| `COLLABORATORS_CACHE_TTL_MS` | Milliseconds a repository's collaborators are remembered | No       | `600000`               |

### Collaborator lookups and the GitHub rate limit

A key refresh runs when the set of pods in the cluster changes. It needs the
collaborators of every application's repository, and `ACCESS_TOKEN` shares its
hourly GitHub rate limit with everything else that uses the same account.

- GitHub is asked once per repository, not once per application: the branch
  environments of a repository share one lookup.
- The answer is remembered for `COLLABORATORS_CACHE_TTL_MS`: ten minutes by
  default, an hour at most, and `0` asks at every refresh. The value is a
  number of milliseconds in digits; anything else means the default. A refresh
  inside that time asks nothing, so a change to a repository's collaborators
  reaches the key files at the first refresh after it has passed.
- A user's public keys are kept with the repository list that names the user,
  and are fetched only together with a list GitHub gives in the same refresh.
  A refresh that goes by a remembered list writes the keys fetched for that
  list and fetches none, so a key a user adds or removes on GitHub arrives
  with the next list GitHub gives. Where a remembered list has no keys for a
  user it gives access to (the fetch failed, or the user had no access
  through it until now), the refresh asks GitHub for that repository again,
  once, and fetches the keys with the answer.
- When GitHub reports the rate limit as spent, the gateway stops asking until
  the limit resets. Until then, and also when GitHub cannot be reached or
  answers with an error, it goes by the last list it has for each repository,
  for up to two hours, so the key files still follow pods that are replaced in
  the meantime.
- When GitHub answers "not found" or "forbidden" for a repository, the gateway
  has no collaborators for it and stops going by an earlier list. As before,
  key files that already exist are left as they are: a refresh rewrites a key
  file only when it has keys to write.
- What is remembered lives in the process that asked. The API server and the
  Firebase consumer are separate processes; where both refresh keys, each
  remembers on its own.

## Firebase Configuration

The system uses Firebase Realtime Database to maintain container state and enable real-time tracking. This allows for:

- Automatic cleanup of terminated containers
- Real-time state synchronization
- Container lifecycle management

### Required Variables

The Firebase consumer is configured with a service-account JSON file. The
legacy server-side Firebase paths also read the individual `FIREBASE_*` service
account values below, so provide those values when `SERVICE_ENABLE_FIREBASE=true`.

| Variable                         | Description                                                          | Firebase consumer | Legacy server state¹ |
| -------------------------------- | -------------------------------------------------------------------- | ----------------- | -------------------- |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON file downloaded from Firebase console   | Required          | -                    |
| `FIREBASE_DATABASE_URL`          | Firebase Realtime Database URL (e.g. https://your-db.firebaseio.com) | Required          | Required             |
| `FIREBASE_PROJECT_ID`            | Firebase service-account project ID                                 | -                 | Required             |
| `FIREBASE_PRIVATE_KEY`           | Firebase service-account private key                                | -                 | Required             |
| `FIREBASE_CLIENT_EMAIL`          | Firebase service-account email                                      | -                 | Required             |
| `FIREBASE_PRIVATE_KEY_ID`        | Firebase service-account private-key ID                             | -                 | Optional             |
| `FIREBASE_CLIENT_ID`             | Firebase service-account client ID                                  | -                 | Optional             |
| `FIREBASE_CLIENT_CERT_URL`       | Firebase service-account client certificate URL                     | -                 | Optional             |

¹ The legacy server state path is enabled with `SERVICE_ENABLE_FIREBASE=true`.

### Setup Instructions

1. Go to Firebase Console > Project Settings > Service Accounts
2. Click "Generate New Private Key" to download the JSON file
3. Set `GOOGLE_APPLICATION_CREDENTIALS` to the path of this file
4. Set `FIREBASE_DATABASE_URL` to your database URL

### Data Structure

The service maintains the following collections:

```json
{
  "deployment": {
    "[pod-id]": {
      "status": "active|terminated",
      "lastSeen": "timestamp",
      "metadata": {
        "namespace": "string",
        "name": "string"
      }
    }
  }
}
```

See [Architecture Details](architecture.md#state-management) for more information about state management.

## Server Configuration

| Variable                      | Description                                      | Required |
| ----------------------------- | ------------------------------------------------ | -------- |
| `NODE_PORT`                   | API server port (default: 8080)                  | No       |
| `SSH_KEY_REFRESH_TIMEOUT_MS`  | Key-refresh timeout in milliseconds (default: 60000) | No       |

The Worker always starts the Firebase consumer process. It initializes Firebase
and listens for deployment changes only when both
`GOOGLE_APPLICATION_CREDENTIALS` and `FIREBASE_DATABASE_URL` are present;
otherwise the process remains idle. Set `SERVICE_ENABLE_FIREBASE=true` only
when the server's legacy Firebase container-state integration is also required.

For Kubernetes deployment configuration, including health checks and resource limits, see the [Deployment Guide](deployment.md).

## Deployment Labels

Each deployment includes metadata labels:

```yaml
git.name: docker-sftp
git.owner: [organization]
git.branch: [branch-name]
```

Use these labels to identify the gateway deployment and service.
