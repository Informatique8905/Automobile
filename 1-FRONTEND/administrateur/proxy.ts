import { rafraichirSession } from "@auto/supabase";
import type { NextRequest } from "next/server";
export async function proxy(request: NextRequest) { return rafraichirSession(request); }
