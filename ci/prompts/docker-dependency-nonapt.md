Non-apt dependency rules:
- Use `dependencies.non_apt.pins` and `dependencies.non_apt.urls` from the dependency report as the starting inventory of Dockerfile-owned non-apt candidates.
- Treat Dockerfile `ARG`s as the complete inventory of versioned non-apt dependencies. Do not add apt package pins to that inventory.
- For every non-apt `ARG`, resolve the authoritative source dynamically from the Dockerfile usage: an image registry/release source for a base image, or the official release source for a downloaded artifact.
- Update only to a newer stable version that is compatible with the existing Dockerfile contract.
- Preserve existing checksum verification and artifact-selection logic when updating a downloaded tool.
- Include the upstream source URL for every non-apt update in the changelog.
- Leave pins unchanged when the upstream source cannot be identified, cannot be checked, is ambiguous, or does not clearly show a newer stable release/version.
- Keep dynamically installed dependencies unpinned unless Dockerfile already pins them; mention them in the changelog only.
