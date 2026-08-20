import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(correo: string, contrasena: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { correo },
    });

    if (!user || !user.activo) {
      throw new UnauthorizedException('Credenciales inválidas o usuario inactivo');
    }

    const isMatch = await bcrypt.compare(contrasena, user.contrasena_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = {
      sub: user.id,
      correo: user.correo,
      rol: user.rol,
      iglesiaId: user.iglesia_id,
      nombre: user.nombre_completo,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        nombre_completo: user.nombre_completo,
        correo: user.correo,
        rol: user.rol,
        iglesia_id: user.iglesia_id,
      },
    };
  }
}
