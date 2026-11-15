export function normalizePostgresConnectionString(connectionString: string): string {
  const connectionUrl = new URL(connectionString);

  if (
    connectionUrl.searchParams.get('sslmode') === 'require' &&
    !connectionUrl.searchParams.has('uselibpqcompat')
  ) {
    connectionUrl.searchParams.set('uselibpqcompat', 'true');

    return connectionUrl.toString();
  }

  return connectionString;
}
