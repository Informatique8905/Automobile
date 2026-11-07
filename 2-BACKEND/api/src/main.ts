import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

async function demarrer() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: (process.env.CORS_ORIGINS ?? "http://localhost:3000,http://localhost:3001,http://localhost:3002").split(",") });
  await app.listen(process.env.PORT ?? 3003);
}
demarrer();
