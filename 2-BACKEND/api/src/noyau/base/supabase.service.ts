import { Injectable } from "@nestjs/common";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

@Injectable()
export class SupabaseService {
  readonly client: SupabaseClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
}
