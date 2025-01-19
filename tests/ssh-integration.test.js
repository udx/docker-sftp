const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const { describe, test, expect, beforeAll } = require('@jest/globals');

describe('SSH Integration Tests', () => {
    const sshConfig = {
        host: process.env.TEST_SSH_HOST || 'localhost',
        port: process.env.TEST_SSH_PORT || 2222,
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
        await new Promise(resolve => setTimeout(resolve, 15000));
        
        // Debug SSH setup
        console.log('SSH Config:', {
            host: sshConfig.host,
            port: process.env.TEST_SSH_PORT || 22,
            user: sshConfig.user,
            keyPath: sshConfig.keyPath
        });
        
        try {
            // Verify SSH key permissions
            await execAsync(`chmod 600 ${sshConfig.keyPath}`);
            
            // Test SSH connection with verbose output
            const sshCmd = `ssh -v -i ${sshConfig.keyPath} -p ${process.env.TEST_SSH_PORT || 22} -o StrictHostKeyChecking=no ${sshConfig.user}@${sshConfig.host} "echo Test Connection"`;
            console.log('Testing SSH connection with:', sshCmd);
            
            const { stdout } = await execAsync(sshCmd, { timeout: 30000 });
            console.log('SSH Connection Test:', stdout);
        } catch (err) {
            console.error('SSH Connection Test Failed:', err.message);
            console.error('Error Details:', err);
            console.error('Command Output:', err.stdout, err.stderr);
        }
    });

    test('SSH connection and command execution', async () => {
        for (const cmd of testCommands) {
            const sshCmd = `ssh -i ${sshConfig.keyPath} -p ${sshConfig.port} -o StrictHostKeyChecking=no ${sshConfig.user}@${sshConfig.host} "${cmd}"`;
            console.log('Executing SSH command:', sshCmd);
            
            try {
                const { stdout, stderr } = await execAsync(sshCmd, { timeout: 30000 });
                console.log(`Command: ${cmd}`);
                console.log('Output:', stdout);
                if (stderr) console.log('stderr:', stderr);
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
        const sftpCommands = `put ${testFile}\nls -l\nrm ${testFile}\nexit\n`;

        try {
            // Create test file
            await execAsync(`echo "test content" > ${testFile}`);

            // Execute SFTP commands
            const sftpCmd = `sftp -i ${sshConfig.keyPath} -P ${sshConfig.port} -o StrictHostKeyChecking=no ${sshConfig.user}@${sshConfig.host}`;
            console.log('Executing SFTP command:', sftpCmd);
            console.log('SFTP commands:', sftpCommands);
            
            const { stdout, stderr } = await execAsync(sftpCmd, { 
                input: sftpCommands,
                timeout: 30000
            });

            expect(stderr).toBeFalsy();
            expect(stdout).toContain(testFile);
        } catch (error) {
            console.error('SFTP test failed:', error);
            throw error;
        }
    });
});
