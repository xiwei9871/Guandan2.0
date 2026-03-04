const fs = require('fs');
const os = require('os');
const path = require('path');
const { runUbuntuDeployCheck } = require('../ubuntuDeployCheck');

function makeProjectRoot({ envContent, withBuild = true } = {}) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'guandan-deploy-check-'));

  fs.writeFileSync(
    path.join(tempRoot, 'package.json'),
    JSON.stringify({ name: 'guandan-game', private: true }, null, 2),
    'utf8'
  );
  fs.writeFileSync(path.join(tempRoot, 'server.js'), 'console.log("server");\n', 'utf8');

  if (envContent) {
    fs.writeFileSync(path.join(tempRoot, '.env'), envContent, 'utf8');
  }

  if (withBuild) {
    fs.mkdirSync(path.join(tempRoot, '.next'));
  }

  return tempRoot;
}

function runCheck(projectRoot) {
  return runUbuntuDeployCheck({ projectRoot });
}

describe('ubuntu deploy check script', () => {
  test('shell wrapper delegates to the node checker', () => {
    const scriptPath = path.resolve(__dirname, '../ubuntu-deploy-check.sh');
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');

    expect(scriptContent).toContain('ubuntuDeployCheck.js');
    expect(scriptContent).toContain('node');
  });

  test('fails when required deployment artifacts are missing', () => {
    const projectRoot = makeProjectRoot({
      envContent: 'APP_ORIGIN=https://guandan.example.com\n',
      withBuild: false,
    });

    const result = runCheck(projectRoot);

    expect(result.status).not.toBe(0);
    expect(result.output).toContain('.next');
    expect(result.output).toContain('SOCKET_CORS_ORIGINS');
    expect(result.output).toContain('HOST');
    expect(result.output).toContain('PORT');
  });

  test('passes when the ubuntu deploy requirements are present', () => {
    const projectRoot = makeProjectRoot({
      envContent: [
        'HOST=0.0.0.0',
        'PORT=3003',
        'APP_ORIGIN=https://guandan.example.com',
        'SOCKET_CORS_ORIGINS=https://guandan.example.com',
      ].join('\n'),
      withBuild: true,
    });

    const result = runCheck(projectRoot);

    expect(result.status).toBe(0);
    expect(result.output).toContain('Ubuntu deploy check passed');
  });
});
