import { config } from "./config.js";
import { db } from "./db.js";
import { buildApp } from "./app.js";

let appRef: Awaited<ReturnType<typeof buildApp>> | null = null;

async function start() {
  appRef = await buildApp({
    serverUrl: `http://localhost:${config.port}`,
  });

  try {
    await appRef.listen({ port: config.port, host: config.host });
    appRef.log.info(`API running at http://${config.host}:${config.port}`);
    appRef.log.info(`Swagger docs at http://${config.host}:${config.port}/docs`);
  } catch (err) {
    appRef.log.error(err);
    process.exit(1);
  }
}

export async function close() {
  if (appRef) {
    await appRef.close();
    appRef = null;
  }
  await db.close();
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
