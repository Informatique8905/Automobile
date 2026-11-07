import { rafraichirSession } from "@auto/supabase";
import type { NextRequest } from "next/server";
export async function middleware(request: NextRequest) { return rafraichirSession(request); }
