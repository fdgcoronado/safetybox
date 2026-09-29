import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { AuthService } from "./auth.service";
import { CredentialsDto } from "./dto/auth.dto";
import { AuthenticatedUser, JwtAuthGuard } from "./jwt-auth.guard";

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  register(@Body() credentials: CredentialsDto) {
    return this.authService.register(credentials.email, credentials.password);
  }

  @Post("login")
  login(@Body() credentials: CredentialsDto) {
    return this.authService.login(credentials.email, credentials.password);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return this.authService.getProfile(request.user.sub);
  }
}
