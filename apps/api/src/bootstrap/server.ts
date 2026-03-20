import { env } from '../config/env.js';
import { createAgentContainer } from './container.js';
import { createApp } from './app.js';

async function main() {
  const container = await createAgentContainer();
  const app = await createApp(container);

  const port = env.PORT;
  const host = '0.0.0.0';

  const close = async () => {
    await app.close();
    await container.dispose();
  };

  process.on('SIGINT', () => {
    void close().finally(() => process.exit(0));
  });
  process.on('SIGTERM', () => {
    void close().finally(() => process.exit(0));
  });

  await app.listen({ port, host });
  app.log.info(`API listening on http://${host}:${port}/api/v1`);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
