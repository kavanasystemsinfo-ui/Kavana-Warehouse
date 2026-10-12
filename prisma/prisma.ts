import { defineConfig } from 'prisma/config';

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL es requerida (sin credenciales por defecto en el repo; ver .env.example).');
}

export default defineConfig({
  datasources: {
    db: {
      url
    }
  },
  generators: {
    client: {
      provider: 'prisma-client-js'
    }
  }
});
