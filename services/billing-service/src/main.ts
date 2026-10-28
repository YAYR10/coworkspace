import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
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
  const port = Number(process.env.PORT) || 3004;
  await app.listen(port, '0.0.0.0');
  Logger.log(`billing-service escuchando en el puerto ${port}`, 'Bootstrap');
}

void bootstrap();
