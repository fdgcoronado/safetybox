import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { VaultRecord } from "./vault-record.entity";

@Injectable()
export class VaultService {
  constructor(
    @InjectRepository(VaultRecord)
    private readonly vaultRepository: Repository<VaultRecord>,
  ) {}

  async getVaultForUser(ownerId: string) {
    const record = await this.vaultRepository.findOne({ where: { ownerId } });

    if (!record) {
      return null;
    }

    return {
      salt: record.salt,
      iv: record.initializationVector,
      ciphertext: record.encryptedPayload,
    };
  }

  async saveVaultForUser(
    ownerId: string,
    payload: { salt: string; iv: string; ciphertext: string },
  ) {
    const existing = await this.vaultRepository.findOne({ where: { ownerId } });

    if (existing) {
      existing.salt = payload.salt;
      existing.initializationVector = payload.iv;
      existing.encryptedPayload = payload.ciphertext;
      await this.vaultRepository.save(existing);
      return { ok: true };
    }

    const record = this.vaultRepository.create({
      ownerId,
      salt: payload.salt,
      initializationVector: payload.iv,
      encryptedPayload: payload.ciphertext,
    });

    await this.vaultRepository.save(record);
    return { ok: true };
  }

  async clearVaultForUser(ownerId: string) {
    const result = await this.vaultRepository.delete({ ownerId });

    if (result.affected === 0) {
      throw new NotFoundException("No hay una bóveda para este usuario");
    }

    return { ok: true };
  }
}
