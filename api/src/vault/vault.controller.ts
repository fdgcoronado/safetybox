import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import {
  decryptTransportPayload,
  encryptTransportPayload,
  type EncryptedTransportPayload,
} from "../common/security/encrypted-json.util";
import { AuthenticatedUser, JwtAuthGuard } from "../auth/jwt-auth.guard";
import { VaultEntryService } from "./vault-entry.service";
import { VaultService } from "./vault.service";

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller("vault")
export class VaultController {
  constructor(
    private readonly vaultService: VaultService,
    private readonly vaultEntryService: VaultEntryService,
  ) {}

  private getTokenFromRequest(request: Request) {
    const [scheme, token] = request.headers.authorization?.split(" ") ?? [];

    if (scheme !== "Bearer" || !token) {
      throw new UnauthorizedException("Se requiere un token Bearer");
    }

    return token;
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getVault(@Req() request: AuthenticatedRequest) {
    const vault = await this.vaultService.getVaultForUser(request.user.sub);
    if (!vault) {
      return null;
    }

    return encryptTransportPayload(vault, this.getTokenFromRequest(request));
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async saveVault(
    @Req() request: AuthenticatedRequest,
    @Body() payload: EncryptedTransportPayload,
  ) {
    const decryptedVault = await decryptTransportPayload<{
      salt: string;
      iv: string;
      ciphertext: string;
    }>(payload, this.getTokenFromRequest(request));

    return this.vaultService.saveVaultForUser(request.user.sub, decryptedVault);
  }

  @Get("entries")
  @UseGuards(JwtAuthGuard)
  async listEntries(@Req() request: AuthenticatedRequest) {
    const entries = await this.vaultEntryService.listEntriesForUser(
      request.user.sub,
    );
    return encryptTransportPayload(entries, this.getTokenFromRequest(request));
  }

  @Put("entries")
  @UseGuards(JwtAuthGuard)
  async replaceEntries(
    @Req() request: AuthenticatedRequest,
    @Body() payload: EncryptedTransportPayload,
  ) {
    const entries = await decryptTransportPayload<unknown[]>(
      payload,
      this.getTokenFromRequest(request),
    );

    return this.vaultEntryService.replaceEntriesForUser(
      request.user.sub,
      entries,
    );
  }

  @Delete("entries")
  @UseGuards(JwtAuthGuard)
  async clearEntries(@Req() request: AuthenticatedRequest) {
    return this.vaultEntryService.clearEntriesForUser(request.user.sub);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  async clearVault(@Req() request: AuthenticatedRequest) {
    return this.vaultService.clearVaultForUser(request.user.sub);
  }
}
