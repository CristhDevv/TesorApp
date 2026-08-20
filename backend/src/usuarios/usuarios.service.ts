import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HistorialService } from '../historial/historial.service';
import { Rol } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsuariosService {
  constructor(
    private prisma: PrismaService,
    private historial: HistorialService,
  ) {}

  async findAll() {
    return this.prisma.usuario.findMany({
      select: {
        id: true,
        nombre_completo: true,
        correo: true,
        rol: true,
        iglesia_id: true,
        activo: true,
        creado_en: true,
        iglesia: {
          select: {
            nombre: true,
          },
        },
      },
      orderBy: { nombre_completo: 'asc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nombre_completo: true,
        correo: true,
        rol: true,
        iglesia_id: true,
        activo: true,
        creado_en: true,
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async create(
    data: {
      nombre_completo: string;
      correo: string;
      contrasena: string;
      rol: Rol;
      iglesia_id?: string;
    },
    realizadoPor: string,
  ) {
    // Validate email uniqueness
    const existing = await this.prisma.usuario.findUnique({ where: { correo: data.correo } });
    if (existing) {
      throw new BadRequestException('El correo ya se encuentra registrado.');
    }

    if (data.rol === 'iglesia' && !data.iglesia_id) {
      throw new BadRequestException('El rol de iglesia requiere asignar una congregación.');
    }

    // Hash password
    const contrasena_hash = await bcrypt.hash(data.contrasena, 10);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.usuario.create({
        data: {
          nombre_completo: data.nombre_completo,
          correo: data.correo,
          contrasena_hash,
          rol: data.rol,
          iglesia_id: data.rol === 'iglesia' ? data.iglesia_id : null,
        },
      });

      // Clear password hash before logging or returning
      const { contrasena_hash: _, ...userWithoutPass } = user;

      await this.historial.log(tx, {
        entidad: 'usuario' as any, // Not an audited enum, but generic reference
        entidadId: user.id,
        accion: 'creacion',
        valorNuevo: userWithoutPass,
        realizadoPor,
      });

      return userWithoutPass;
    });
  }

  async update(
    id: string,
    data: {
      nombre_completo?: string;
      correo?: string;
      contrasena?: string;
      rol?: Rol;
      iglesia_id?: string;
      activo?: boolean;
    },
    realizadoPor: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const original = await tx.usuario.findUnique({ where: { id } });
      if (!original) throw new NotFoundException('Usuario no encontrado');

      if (data.correo && data.correo !== original.correo) {
        const existing = await tx.usuario.findUnique({ where: { correo: data.correo } });
        if (existing) {
          throw new BadRequestException('El correo ya se encuentra registrado.');
        }
      }

      const updatedData: any = {
        nombre_completo: data.nombre_completo,
        correo: data.correo,
        rol: data.rol,
        activo: data.activo,
      };

      if (data.rol) {
        updatedData.iglesia_id = data.rol === 'iglesia' ? (data.iglesia_id ?? original.iglesia_id) : null;
        if (data.rol === 'iglesia' && !updatedData.iglesia_id) {
          throw new BadRequestException('El rol de iglesia requiere asignar una congregación.');
        }
      }

      if (data.contrasena) {
        updatedData.contrasena_hash = await bcrypt.hash(data.contrasena, 10);
      }

      const user = await tx.usuario.update({
        where: { id },
        data: updatedData,
      });

      const { contrasena_hash: _, ...userWithoutPass } = user;
      const { contrasena_hash: __, ...origWithoutPass } = original;

      await this.historial.log(tx, {
        entidad: 'usuario' as any,
        entidadId: user.id,
        accion: 'actualizacion',
        valorAnterior: origWithoutPass,
        valorNuevo: userWithoutPass,
        realizadoPor,
      });

      return userWithoutPass;
    });
  }

  async remove(id: string, realizadoPor: string) {
    if (id === realizadoPor) {
      throw new BadRequestException('No puede eliminar su propia cuenta de usuario en sesión.');
    }

    return this.prisma.$transaction(async (tx) => {
      const original = await tx.usuario.findUnique({ where: { id } });
      if (!original) throw new NotFoundException('Usuario no encontrado');

      const { contrasena_hash: _, ...origWithoutPass } = original;

      // 1. Limpiar referencias foráneas en periodos
      await tx.periodo.updateMany({
        where: { cerrado_por_id: id },
        data: { cerrado_por_id: null },
      });
      await tx.periodo.updateMany({
        where: { reabierto_por_id: id },
        data: { reabierto_por_id: null },
      });

      // 2. Reasignar autor en historial de cambios si existieran auditorías previas de este usuario
      await tx.historialCambios.updateMany({
        where: { realizado_por: id },
        data: { realizado_por: realizadoPor },
      });

      // 3. Eliminar físicamente el usuario de la base de datos
      await tx.usuario.delete({
        where: { id },
      });

      // 4. Registrar la eliminación en auditoría
      await this.historial.log(tx, {
        entidad: 'usuario' as any,
        entidadId: id,
        accion: 'eliminacion',
        valorAnterior: origWithoutPass,
        realizadoPor,
      });

      return { success: true, message: `Usuario "${original.nombre_completo}" eliminado permanentemente.` };
    });
  }
}
