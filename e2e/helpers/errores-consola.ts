import type { Page } from '@playwright/test';

export function capturarErroresConsola(page: Page): string[] {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  return consoleErrors;
}
