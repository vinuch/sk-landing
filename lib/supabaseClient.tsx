import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types_db";

let client: SupabaseClient<Database> | undefined;

function getSupabaseClient() {
    if (!client) {
        client = createClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true,
                },
            }
        );
    }

    return client;
}

export const supabase = getSupabaseClient();
