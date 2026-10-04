import { spawnSync } from 'node:child_process';
const projects = ['john-and-patricias-romantic-comfort-website-main', 'lib-main', 'folio-room-main', 'yard-main', 'cove-main'];
for (const cwd of projects) {
  for (const args of [['ci', '--include=dev', '--no-audit', '--no-fund'], ...(cwd === 'cove-main' ? [] : [['run', 'build']])]) {
    const result = spawnSync('npm', args, { cwd, stdio: 'inherit', env: { ...process.env, ECOSYSTEM: '1', NITRO_PRESET: 'node-server' } });
    if (result.status !== 0) process.exit(result.status || 1);
  }
}
