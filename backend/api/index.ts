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

let applySecurityMiddleware: any;
try {
  applySecurityMiddleware = require('../src/common/security.config').applySecurityMiddleware;
} catch {
  applySecurityMiddleware = require('../common/security.config').applySecurityMiddleware;
}

const server = express();
let isInitialized = false;

async function bootstrapServer(): Promise<void> {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  applySecurityMiddleware(app, server);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
}

export default async function handler(req: Request, res: Response) {
  try {
    if (!isInitialized) {
      await bootstrapServer();
      isInitialized = true;
    }
    server(req, res);
  } catch (err: any) {
    console.error('SERVER BOOTSTRAP ERROR:', err);
    res.status(500).json({
      statusCode: 500,
      message: 'Error interno al inicializar el servidor.',
    });
  }
}
