import { cleanupE2ETickets } from './cleanup';

async function globalTeardown() {
  await cleanupE2ETickets('globalTeardown');
}

export default globalTeardown;
