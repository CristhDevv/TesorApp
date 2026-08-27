import { JwtStrategy } from './jwt.strategy';
import { UnauthorizedException } from '@nestjs/common';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    strategy = new JwtStrategy();
  });

  it('debe validar y mapear un payload JWT válido', async () => {
    const payload = {
      sub: 'user-id-123',
      correo: 'admin@tesorapp.com',
      rol: 'tesorero',
      iglesiaId: 'ig-123',
      nombre: 'Administrador General',
    };

    const result = await strategy.validate(payload);

    expect(result).toEqual({
      userId: 'user-id-123',
      correo: 'admin@tesorapp.com',
      rol: 'tesorero',
      iglesiaId: 'ig-123',
      iglesia_id: 'ig-123',
      nombre: 'Administrador General',
    });
  });

  it('debe lanzar UnauthorizedException si falta sub en el payload', async () => {
    const invalidPayload = {
      correo: 'admin@tesorapp.com',
      rol: 'tesorero',
    };

    await expect(strategy.validate(invalidPayload)).rejects.toThrow(UnauthorizedException);
  });

  it('debe lanzar UnauthorizedException si falta correo en el payload', async () => {
    const invalidPayload = {
      sub: 'user-id-123',
      rol: 'tesorero',
    };

    await expect(strategy.validate(invalidPayload)).rejects.toThrow(UnauthorizedException);
  });
});
