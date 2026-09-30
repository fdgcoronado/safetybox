import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { VaultEntryService } from "./vault-entry.service";
import { VaultController } from "./vault.controller";
import { VaultRecord } from "./vault-record.entity";
import { VaultService } from "./vault.service";

@Module({
  imports: [TypeOrmModule.forFeature([VaultRecord]), AuthModule],
  controllers: [VaultController],
  providers: [VaultService, VaultEntryService],
  exports: [VaultService, VaultEntryService],
})
export class VaultModule {}
