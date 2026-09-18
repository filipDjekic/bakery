import { Pool } from 'pg';

type IntegrationEnvironment = {
  DATABASE_URL?: string;
  NODE_ENV?: string;
  ALLOW_INTEGRATION_DB_RESET?: string;
};

export function getIntegrationDatabaseUrl(
  environment: IntegrationEnvironment = process.env,
): string {
  const databaseUrl = environment.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for integration tests.');
  }

  const parsed = new URL(databaseUrl);
  const isLoopback = ['127.0.0.1', 'localhost', '[::1]'].includes(
    parsed.hostname,
  );
  const isTestDatabase = parsed.pathname.slice(1).endsWith('_test');

  if (
    environment.NODE_ENV !== 'test' ||
    environment.ALLOW_INTEGRATION_DB_RESET !== 'true' ||
    !isLoopback ||
    !isTestDatabase
  ) {
    throw new Error(
      'Refusing integration database access: expected an explicitly enabled localhost *_test database.',
    );
  }

  return parsed.toString();
}

export function createIntegrationPool(): Pool {
  return new Pool({ connectionString: getIntegrationDatabaseUrl() });
}
