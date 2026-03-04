const fs = require('fs');
const path = require('path');

const REQUIRED_COMMANDS = ['node', 'npm'];
const REQUIRED_FILES = ['package.json', 'server.js', '.env'];
const REQUIRED_DIRECTORIES = ['.next'];
const REQUIRED_ENV_KEYS = ['HOST', 'PORT', 'APP_ORIGIN', 'SOCKET_CORS_ORIGINS'];

function defaultCommandExists(commandName) {
  const pathEntries = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
  const executableNames =
    process.platform === 'win32'
      ? [commandName, `${commandName}.exe`, `${commandName}.cmd`, `${commandName}.bat`]
      : [commandName];

  return pathEntries.some((entry) =>
    executableNames.some((fileName) => fs.existsSync(path.join(entry, fileName)))
  );
}

function hasEnvAssignment(envContent, key) {
  const assignmentPattern = new RegExp(`^\\s*${key}=`, 'm');
  return assignmentPattern.test(envContent);
}

function runUbuntuDeployCheck({
  projectRoot = process.env.PROJECT_ROOT || process.cwd(),
  commandExists = defaultCommandExists,
} = {}) {
  const envFile = path.join(projectRoot, '.env');
  const missingItems = [];

  for (const commandName of REQUIRED_COMMANDS) {
    if (!commandExists(commandName)) {
      missingItems.push(`command:${commandName}`);
    }
  }

  for (const fileName of REQUIRED_FILES) {
    if (!fs.existsSync(path.join(projectRoot, fileName))) {
      missingItems.push(fileName);
    }
  }

  for (const directoryName of REQUIRED_DIRECTORIES) {
    if (!fs.existsSync(path.join(projectRoot, directoryName))) {
      missingItems.push(directoryName);
    }
  }

  if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, 'utf8');

    for (const envKey of REQUIRED_ENV_KEYS) {
      if (!hasEnvAssignment(envContent, envKey)) {
        missingItems.push(envKey);
      }
    }
  }

  if (missingItems.length > 0) {
    const output = [
      `Ubuntu deploy check failed in ${projectRoot}`,
      'Missing required items:',
      ...missingItems.map((item) => `- ${item}`),
      '',
    ].join('\n');

    return {
      status: 1,
      output,
    };
  }

  return {
    status: 0,
    output: `Ubuntu deploy check passed for ${projectRoot}\n`,
  };
}

if (require.main === module) {
  const result = runUbuntuDeployCheck();
  const writer = result.status === 0 ? process.stdout : process.stderr;
  writer.write(result.output);
  process.exit(result.status);
}

module.exports = {
  runUbuntuDeployCheck,
};
