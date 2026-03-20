export const TestData = {
  tickets: {
    valid: () => ({
      title: `E2E Test Ticket ${Date.now()}`,
      description: 'This is an automated test ticket created by Playwright E2E tests.',
      priority: 'Medium',
    }),
    highPriority: () => ({
      title: `E2E High Priority ${Date.now()}`,
      description: 'High priority test ticket.',
      priority: 'High',
    }),
    critical: () => ({
      title: `E2E Critical ${Date.now()}`,
      description: 'Critical test ticket.',
      priority: 'Critical',
    }),
  },
  validation: {
    titleRequired: 'Title is required',
    descriptionRequired: 'Description is required',
    titleMaxLength: 200,
    descriptionMaxLength: 4000,
  },
  priorities: ['Low', 'Medium', 'High', 'Critical'] as const,
  statuses: ['Open', 'InProgress', 'Resolved', 'Closed'] as const,
  users: {
    employee: {
      username: 'employee1',
      password: 'password123',
    },
    admin: {
      username: 'admin1',
      password: 'password123',
    },
  },
  statLabels: ['Open', 'In Progress', 'Resolved', 'Closed', 'Total'] as const,
};
