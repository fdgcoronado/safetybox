import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "./auth/auth.module";
import { FileLoggerService } from "./common/logging/file-logger.service";
import { HealthController } from "./health.controller";
import { UsersModule } from "./users/users.module";
import { VaultModule } from "./vault/vault.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "mysql",
        host: config.get<string>("DB_HOST", "localhost"),
        port: Number(config.get<string>("DB_PORT", "3306")),
        username: config.get<string>("DB_USERNAME"),
        password: config.get<string>("DB_PASSWORD"),
        database: config.get<string>("DB_DATABASE"),
        autoLoadEntities: true,
        synchronize: config.get<string>("NODE_ENV") !== "production",
      }),
    }),
    UsersModule,
    AuthModule,
    VaultModule,
  ],
  controllers: [HealthController],
  providers: [FileLoggerService],
})
export class AppModule {}
