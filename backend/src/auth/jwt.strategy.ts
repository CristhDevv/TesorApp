import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { getJwtSecret } from './auth.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  async validate(payload: any) {
    if (!payload?.sub || !payload?.correo) {
      throw new UnauthorizedException('Token inválido');
    }

    const user = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        correo: true,
        rol: true,
        iglesia_id: true,
        nombre_completo: true,
        activo: true,
      },
    });

    if (!user || !user.activo) {
      throw new UnauthorizedException('Sesión inválida o usuario inactivo');
    }

    return {
      userId: user.id,
      correo: user.correo,
      rol: user.rol,
      iglesiaId: user.iglesia_id,
      iglesia_id: user.iglesia_id,
      nombre: user.nombre_completo,
    };
  }
}
