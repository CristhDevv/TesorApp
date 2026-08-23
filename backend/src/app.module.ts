import { Module, Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { FormulasModule } from './formulas/formulas.module';
import { HistorialModule } from './historial/historial.module';
import { IglesiasModule } from './iglesias/iglesias.module';
import { CamposModule } from './campos/campos.module';
import { PermisosModule } from './permisos/permisos.module';
import { PeriodosModule } from './periodos/periodos.module';
import { ValoresModule } from './valores/valores.module';
import { ReportesModule } from './reportes/reportes.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { TablasModule } from './tablas/tablas.module';
import { AiModule } from './ai/ai.module';
import { GastosModule } from './gastos/gastos.module';

@Controller()
export class AppController {
  @Get()
  root(@Res() res: Response) {
    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <title>Cargando TesorApp...</title>
        <script>
          // Device detection on user agent and viewport width
          var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
          if (isMobile) {
            window.location.href = '/mobile/';
          } else {
            window.location.href = '/desktop/';
          }
        </script>
      </head>
      <body style="background-color: #020617; color: #94a3b8; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
        <div style="text-align: center;">
          <h2 style="color: #3b82f6;">TesorApp</h2>
          <p>Detectando dispositivo...</p>
        </div>
      </body>
      </html>
    `);
  }
}

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'frontend-desktop', 'dist'),
      serveRoot: '/desktop',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'frontend-mobile', 'dist'),
      serveRoot: '/mobile',
    }),
    PrismaModule,
    AuthModule,
    FormulasModule,
    HistorialModule,
    IglesiasModule,
    CamposModule,
    PermisosModule,
    PeriodosModule,
    ValoresModule,
    ReportesModule,
    UsuariosModule,
    TablasModule,
    AiModule,
    GastosModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
