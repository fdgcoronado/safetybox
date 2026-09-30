import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { compare, hash } from "bcryptjs";
import { UsersService } from "../users/users.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await hash(password, 12);
    const user = await this.usersService.create(normalizedEmail, passwordHash);
    return this.issueToken(user.id, user.email);
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(
      email.trim().toLowerCase(),
    );
    const passwordMatches = user
      ? await compare(password, user.passwordHash)
      : false;

    if (!user || !passwordMatches) {
      throw new UnauthorizedException("Correo o contraseña incorrectos");
    }

    return this.issueToken(user.id, user.email);
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException("El usuario ya no existe");
    }

    return { id: user.id, email: user.email, createdAt: user.createdAt };
  }

  private issueToken(userId: string, email: string) {
    return {
      accessToken: this.jwtService.sign({ sub: userId, email }),
      user: { id: userId, email },
    };
  }
}
