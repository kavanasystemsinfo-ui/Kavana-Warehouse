import { defineConfig } from 'prisma/config';

export default defineConfig({
  datasources: {
    db: {
      url: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/kavana_cleanstock?schema=public'
    }
  },
  generators: {
    client: {
      provider: 'prisma-client-js'
    }
  }
});
