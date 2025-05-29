## Fork Synchronization

This repository includes a reusable workflow (`fork-sync.yml`) for automating fork synchronization with the upstream repository.

### Setting Up Fork Sync

To enable automatic synchronization with the upstream repository:

1. **Add GitHub Token**: 
   - Create a personal access token with `repo` and `workflow` permissions
   - Add this token as a repository secret named `GH_TOKEN`

2. **Optional - Add Service Account**:
   - For organizations, add your service account as an outside collaborator to the parent repository with read access

3. **Optional - Configure Slack Notifications**:
   - Add your Slack webhook URL as a repository secret named `SLACK_WEBHOOK`

The workflow automatically detects your repository's fork status and syncs the appropriate branches without manual intervention.

You can trigger the sync manually from the Actions tab or configure it to run on a schedule.
