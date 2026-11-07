import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { NoyauModule } from "./noyau/noyau.module.js";
import { TachesModule } from "./taches/taches.module.js";
import { ClientModule } from "./modules/client/client.module.js";
import { VendeurModule } from "./modules/vendeur/vendeur.module.js";
import { AdministrateurModule } from "./modules/administrateur/administrateur.module.js";
import { CommunModule } from "./modules/commun/commun.module.js";

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), NoyauModule, TachesModule, ClientModule, VendeurModule, AdministrateurModule, CommunModule] })
export class AppModule {}
