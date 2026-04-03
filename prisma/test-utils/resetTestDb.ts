import { execSync } from 'node:child_process';

export function resetTestDB() {
  execSync('npx prisma migrate reset --force', {
    stdio: 'inherit',
  });
}
