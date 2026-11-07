import { Module } from "@nestjs/common";
import { SanteController } from "./sante/sante.controller.js";
import { SupabaseService } from "./base/supabase.service.js";

@Module({ controllers: [SanteController], providers: [SupabaseService], exports: [SupabaseService] })
export class NoyauModule {}
