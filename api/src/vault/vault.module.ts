import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { VaultRecord } from './vault-record.entity'

@Module({
  imports: [TypeOrmModule.forFeature([VaultRecord])],
  exports: [TypeOrmModule],
})
export class VaultModule {}
