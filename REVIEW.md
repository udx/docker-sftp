# Review Guidelines - docker-sftp

SSH/SFTP gateway into Kubernetes tenant pods with GitHub-key auth (`ssh www.<domain>.<lifecycle>@ssh.rabbit.ci`). `FROM usabilitydynamics/udx-worker-nodejs` (pinned tag), port 22 via authbind as UID 500. This is a security boundary: it converts GitHub identities into shell access inside tenant pods.

## Release trap (read first)

- `.github/workflows/docker-ops.yml` has NO branch and NO path filter: EVERY push to `master` (including a merge of a docs-only PR) builds and PUBLISHES a new image release. Treat every PR into `master` as an image release; flag PRs bundling unrelated changes, and support adding a path filter.

## Critical Areas (extra scrutiny)

- `lib/controller.keys.js`: generates authorized_keys from GitHub collaborator data. This is the authentication boundary; any change to key sourcing, permission-to-collaborator mapping, or caching is a critical security finding until proven safe. Think auth bypass, privilege escalation via repo collaborator roles, and stale-key revocation.
- `bin/controller.ssh.entrypoint.sh`, `bin/setup-kubernetes.sh`: container boot and k8s wiring (kubectl exec into tenant pods).
- `lib/server.js` and `lib/firebase.consume.js`: session handling and the Firebase control-plane consumer.
- authbind port-22 binding as UID 500 (`/etc/authbind/byport/22` ownership) and `/var/log/sshd.log` ownership: the classic breakages when UID/user assumptions change. Any Dockerfile USER/ownership change requires a container boot test.
- `etc/configs/worker/services.yaml` and `deploy.yml`: supervision and deploy contract.
- sshd configuration anywhere in the image: review as a hardening surface (no password auth, no root login, forced commands preserved).

## Release Model

- `package.json` version + `changes.md` (`### <version>`) are maintained by hand; keep them consistent in release PRs.
- No lint workflows exist in-repo (no shellcheck/hadolint/yamllint); apply those standards manually in review.
- `node_modules/` is committed; watch for tampered vendored code in large diffs and require `npm test` evidence.

## Security

- Highest-sensitivity repo in the worker family. Escalate anything touching authentication, key handling, kubectl privileges, or logging of key material to a severe finding by default, and require explicit human sign-off in the PR discussion.
