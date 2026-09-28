import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('vault_records')
export class VaultRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ length: 36 })
  ownerId!: string

  @Column({ type: 'longtext' })
  encryptedPayload!: string

  @Column({ length: 64 })
  salt!: string

  @Column({ length: 32 })
  initializationVector!: string

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
