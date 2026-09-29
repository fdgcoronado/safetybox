import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { webcrypto as crypto } from "crypto";
import { Repository } from "typeorm";
import { VaultRecord } from "./vault-record.entity";

@Injectable()
export class VaultEntryService {
  constructor(
    @InjectRepository(VaultRecord)
    private readonly vaultEntryRepository: Repository<VaultRecord>,
    private readonly configService: ConfigService,
  ) {}

  private getPersistKey() {
    const secret =
      this.configService.get<string>("JWT_SECRET") ??
      "safetybox-local-dev-secret";
    return crypto.subtle
      .importKey("raw", new TextEncoder().encode(secret), "PBKDF2", false, [
        "deriveKey",
      ])
      .then((material) =>
        crypto.subtle.deriveKey(
          {
            name: "PBKDF2",
            salt: new TextEncoder().encode("safetybox-persist-key"),
            iterations: 200000,
            hash: "SHA-256",
          },
          material,
          { name: "AES-GCM", length: 256 },
          false,
          ["encrypt", "decrypt"],
        ),
      );
  }

  private async encryptPayload(payload: unknown) {
    const key = await this.getPersistKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode(JSON.stringify(payload));
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      plaintext,
    );

    return {
      encryptedPayload: Buffer.from(new Uint8Array(encrypted)).toString(
        "base64",
      ),
      iv: Buffer.from(iv).toString("base64"),
    };
  }

  private async decryptPayload(record: VaultRecord) {
    const key = await this.getPersistKey();
    const iv = Buffer.from(record.iv ?? record.initializationVector ?? "", "base64");
    const ciphertext = Buffer.from(record.encryptedPayload, "base64");
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext,
    );
    return JSON.parse(new TextDecoder().decode(plaintext));
  }

  async listEntriesForUser(ownerId: string) {
    const records = await this.vaultEntryRepository.find({
      where: { ownerId },
      order: { createdAt: "DESC" },
    });

    return Promise.all(records.map((record) => this.decryptPayload(record)));
  }

  async replaceEntriesForUser(ownerId: string, payloads: unknown[]) {
    await this.vaultEntryRepository.delete({ ownerId });

    const rows = await Promise.all(
      payloads.map(async (payload) => {
        const encrypted = await this.encryptPayload(payload);
        return this.vaultEntryRepository.create({
          ownerId,
          encryptedPayload: encrypted.encryptedPayload,
          iv: encrypted.iv,
        });
      }),
    );

    await this.vaultEntryRepository.save(rows);
    return { ok: true };
  }

  async clearEntriesForUser(ownerId: string) {
    await this.vaultEntryRepository.delete({ ownerId });
    return { ok: true };
  }
}
