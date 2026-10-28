import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureGateway } from './gateway/configure-gateway';

async function bootstrap() {
  // bodyParser desactivado: el cuerpo se reenvía intacto a cada microservicio
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.set('trust proxy', 1); // Render está detrás de un balanceador
  app.enableCors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true, credentials: true });
  // Apagado limpio: en Docker el proceso es el PID 1 y no muere con el SIGTERM re-enviado por
  // enableShutdownHooks; Render lo mataba a la fuerza y marcaba el servicio como "Failed".
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.once(signal, () => {
      Logger.log(`${signal} recibido: cerrando el servicio`, 'Bootstrap');
      const force = setTimeout(() => process.exit(0), 10_000);
      force.unref();
      app.close().finally(() => process.exit(0));
    });
  }
  configureGateway(app);
  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
  Logger.log(`api-gateway escuchando en el puerto ${port}`, 'Bootstrap');
}

void bootstrap();
