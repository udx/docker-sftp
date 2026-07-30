You are updating Dockerfile dependency pins for this repository.

Inputs:
- Dockerfile: `Dockerfile`
- Dependency report: `docker-dependency-report.json`

Hard boundaries:
- This is an edit-only dependency update task.
- Read both input files before editing.
- Edit only Dockerfile dependency pins and ARG/ENV values.
- Keep apt package pins inline in their `apt-get install` command. Use Dockerfile `ARG`s only for non-apt dependency versions.
- Do not edit workflow files, docs, tests, or application code.
- Do not validate, build, test, run the container pipeline, inspect GitHub Actions runs, wait for workflows, create pull requests, commit, push, or request reviews.
- Do not run `docker`, `make`, test commands, CI commands, `gh run`, `gh workflow`, `gh pr`, `git commit`, `git push`, or any command that waits on external workflow state.
- Do not use vulnerability scanners or security reports to decide whether a dependency should be updated.
- Apt package updates must be backed by the dependency report.
- Non-apt package updates must be backed by the dependency report inventory plus clear upstream version evidence.
- If an update is not backed by the required evidence, leave it unchanged and mention why.
