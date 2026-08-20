import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'secret-key-for-jwt-tesorapp-2026',
    });
  }

  async validate(payload: any) {
    if (!payload.sub || !payload.correo) {
      throw new UnauthorizedException('Token inválido');
    }
    return {
      userId: payload.sub,
      correo: payload.correo,
      rol: payload.rol,
      iglesiaId: payload.iglesiaId,
      nombre: payload.nombre,
    };
  }
}
