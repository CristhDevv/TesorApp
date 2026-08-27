import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockExecutionContext = (user: any): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  it('debe permitir acceso si no se especificaron roles requeridos', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
    const context = createMockExecutionContext({ rol: 'iglesia' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('debe denegar acceso si se requieren roles pero no hay usuario en el request', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['tesorero']);
    const context = createMockExecutionContext(null);

    expect(guard.canActivate(context)).toBe(false);
  });

  it('debe permitir acceso si el rol del usuario coincide con los requeridos', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['tesorero']);
    const context = createMockExecutionContext({ rol: 'tesorero' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('debe denegar acceso si el rol del usuario no está entre los permitidos', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['tesorero']);
    const context = createMockExecutionContext({ rol: 'iglesia' });

    expect(guard.canActivate(context)).toBe(false);
  });
});
