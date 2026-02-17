import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Session, User } from "@supabase/supabase-js";

export default function useAuth() {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load existing session on page load
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session);
            setLoading(false);
        });

        // Listen to login/logout
        const { data: listener } = supabase.auth.onAuthStateChange(
            (_ev, session) => {
                setSession(session);
                setLoading(false);
            }
        );

        return () => listener.subscription.unsubscribe();
    }, []);

    return {
        session,
        user: session?.user as User | null,
        loading,
    };
}
