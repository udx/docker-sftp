const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const { describe, test, expect, beforeAll } = require('@jest/globals');

describe('SSH Integration Tests', () => {
    const sshConfig = {
        host: process.env.TEST_SSH_HOST || 'localhost',
        user: process.env.TEST_SSH_USER || 'test-user',
        keyPath: process.env.TEST_SSH_KEY_PATH || '~/.ssh/id_rsa'
    };

    const testCommands = [
        'wp plugin list',
        'git status',
        'git remote -v'
    ];

    beforeAll(async () => {
        // Wait for SSH service to be ready
        await new Promise(resolve => setTimeout(resolve, 5000));
    });

    test('SSH connection and command execution', async () => {
        for (const cmd of testCommands) {
            const sshCmd = `ssh -i ${sshConfig.keyPath} -o StrictHostKeyChecking=no ${sshConfig.user}@${sshConfig.host} "${cmd}"`;
            
            try {
                const { stdout, stderr } = await execAsync(sshCmd);
                console.log(`Command: ${cmd}`);
                console.log('Output:', stdout);
                expect(stderr).toBeFalsy();
                expect(stdout).toBeTruthy();
            } catch (error) {
                console.error(`Failed to execute command: ${cmd}`);
                console.error('Error:', error);
                throw error;
            }
        }
    });

    test('SFTP file transfer', async () => {
        const testFile = '/tmp/test-file.txt';
        const sftpCommands = `
            put ${testFile}
            ls -l
            rm ${testFile}
            exit
        `;

        try {
            // Create test file
            await execAsync(`echo "test content" > ${testFile}`);

            // Execute SFTP commands
            const sftpCmd = `sftp -i ${sshConfig.keyPath} -o StrictHostKeyChecking=no ${sshConfig.user}@${sshConfig.host}`;
            const { stdout, stderr } = await execAsync(sftpCmd, { input: sftpCommands });

            expect(stderr).toBeFalsy();
            expect(stdout).toContain(testFile);
        } catch (error) {
            console.error('SFTP test failed:', error);
            throw error;
        }
    });
});
