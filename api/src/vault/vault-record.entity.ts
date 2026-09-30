import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("vault_records")
export class VaultRecord {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ length: 36 })
  ownerId!: string;

  @Column({ type: "longtext" })
  encryptedPayload!: string;

  @Column({ type: "longtext", nullable: true })
  iv?: string;

  @Column({ length: 64, nullable: true })
  salt?: string;

  @Column({ length: 32, nullable: true })
  initializationVector?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
