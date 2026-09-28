import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Request } from 'express'

export type AuthenticatedUser = { sub: string; email: string }
type AuthenticatedRequest = Request & { user: AuthenticatedUser }

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const [scheme, token] = request.headers.authorization?.split(' ') ?? []

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Se requiere un token Bearer')
    }

    try {
      request.user = await this.jwtService.verifyAsync<AuthenticatedUser>(token)
      return true
    } catch {
      throw new UnauthorizedException('El token no es válido o ha expirado')
    }
  }
}
