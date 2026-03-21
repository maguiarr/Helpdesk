import { cleanupE2ETickets } from './cleanup';

async function globalSetup() {
  await cleanupE2ETickets('globalSetup');
}

export default globalSetup;
