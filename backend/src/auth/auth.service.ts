import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(correo: string, contrasena: string) {
    const normalizedEmail = (correo || '').trim().toLowerCase();
    const user = await this.prisma.usuario.findUnique({
      where: { correo: normalizedEmail },
    });

    if (!user || !user.activo) {
      this.logger.warn(`Failed login attempt (unknown/inactive user): ${normalizedEmail}`);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isMatch = await bcrypt.compare(contrasena, user.contrasena_hash);
    if (!isMatch) {
      this.logger.warn(`Failed login attempt (invalid password) for userId=${user.id}`);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    this.logger.log(`Successful login for userId=${user.id} rol=${user.rol}`);

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
