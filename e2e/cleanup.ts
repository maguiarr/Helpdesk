const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8180';
const BASE_URL = process.env.BASE_URL || 'http://localhost:4200';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin1';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password123';

export async function cleanupE2ETickets(caller: string) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  try {
    const tokenRes = await fetch(
      `${KEYCLOAK_URL}/realms/helpdesk/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: 'helpdesk-frontend',
          username: ADMIN_USERNAME,
          password: ADMIN_PASSWORD,
        }),
      },
    );

    if (!tokenRes.ok) {
      console.log(`[${caller}] Failed to get admin token: ${tokenRes.status}`);
      return;
    }

    const { access_token } = (await tokenRes.json()) as { access_token: string };

    const ticketsRes = await fetch(`${BASE_URL}/api/tickets`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!ticketsRes.ok) {
      console.log(`[${caller}] Failed to fetch tickets: ${ticketsRes.status}`);
      return;
    }

    const tickets = (await ticketsRes.json()) as { ticketId: string; title: string }[];
    const e2eTickets = tickets.filter((t) => t.title.startsWith('E2E '));

    if (e2eTickets.length === 0) {
      console.log(`[${caller}] No E2E tickets to clean up`);
      return;
    }

    let deleted = 0;
    for (const ticket of e2eTickets) {
      const res = await fetch(`${BASE_URL}/api/tickets/${ticket.ticketId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (res.ok) deleted++;
    }

    console.log(`[${caller}] Deleted ${deleted}/${e2eTickets.length} E2E tickets`);
  } catch (error) {
    console.log(`[${caller}] Cleanup error (non-fatal): ${error}`);
  }
}
