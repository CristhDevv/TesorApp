import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express, Request, Response } from 'express';
import { ValidationPipe } from '@nestjs/common';

let AppModule: any;
try {
  AppModule = require('../src/app.module').AppModule;
} catch {
  AppModule = require('../app.module').AppModule;
}

let AllExceptionsFilter: any;
try {
  AllExceptionsFilter = require('../src/common/all-exceptions.filter').AllExceptionsFilter;
} catch {
  AllExceptionsFilter = require('../common/all-exceptions.filter').AllExceptionsFilter;
}

let cachedServer: Express;

async function bootstrap(): Promise<Express> {
  if (!cachedServer) {
    const expressApp = express();
    expressApp.use(express.json());
    expressApp.use(express.urlencoded({ extended: true }));
    
    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
      bodyParser: false,
    });
    
    app.enableCors({
      origin: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    });
    
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
      }),
    );
    
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    cachedServer = expressApp;
  }
  return cachedServer;
}

export default async function handler(req: Request, res: Response) {
  const server = await bootstrap();
  server(req, res);
}
