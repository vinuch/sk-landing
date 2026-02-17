import { supabase } from "@/lib/supabaseClient";
import { useCallback, useEffect, useState } from "react";
import useAuth from "./useAuth";

type Profile = {
    id: string;
    full_name: string | null;
    phone: string | null;
    onboarded: boolean | null;
};

export type UserAddress = {
    id: string;
    user_id: string;
    label: string | null;
    address_line: string;
    is_default: boolean;
};

export default function useUserProfile() {
    const { user } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [addresses, setAddresses] = useState<UserAddress[]>([]);
    const [defaultAddressLine, setDefaultAddressLine] = useState<string>("");
    const [loading, setLoading] = useState(true);

    const fetchProfile = useCallback(async () => {
        if (!user?.id) {
            setProfile(null);
            setAddresses([]);
            setDefaultAddressLine("");
            setLoading(false);
            return;
        }

        setLoading(true);

        const [{ data: profileData }, { data: addressData }] = await Promise.all([
            supabase.from("profiles").select("id, full_name, phone, onboarded").eq("id", user.id).maybeSingle(),
            supabase
                .from("user_addresses")
                .select("id, user_id, label, address_line, is_default")
                .eq("user_id", user.id)
                .order("is_default", { ascending: false }),
        ]);

        setProfile((profileData as Profile | null) ?? null);
        const list = (addressData as UserAddress[] | null) ?? [];
        setAddresses(list);

        const defaultAddress = list.find((item) => item.is_default) || list[0];
        setDefaultAddressLine(defaultAddress?.address_line || "");
        setLoading(false);
    }, [user?.id]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    useEffect(() => {
        const handleProfileUpdated = () => {
            fetchProfile();
        };

        window.addEventListener("profile-updated", handleProfileUpdated);
        return () => window.removeEventListener("profile-updated", handleProfileUpdated);
    }, [fetchProfile]);

    const saveDefaultAddress = async (addressLine: string) => {
        if (!user?.id || !addressLine.trim()) return { error: "Missing user or address" };

        const normalized = addressLine.trim();
        const currentDefault = addresses.find((addr) => addr.is_default);

        if (currentDefault?.address_line === normalized) {
            setDefaultAddressLine(normalized);
            return { error: null };
        }

        if (currentDefault?.id) {
            const { error } = await supabase
                .from("user_addresses")
                .update({ address_line: normalized, label: "Default" })
                .eq("id", currentDefault.id)
                .eq("user_id", user.id);

            if (error) return { error: error.message };
        } else {
            const { error } = await supabase.from("user_addresses").insert({
                user_id: user.id,
                label: "Default",
                address_line: normalized,
                is_default: true,
            });

            if (error) return { error: error.message };
        }

        await fetchProfile();
        window.dispatchEvent(new Event("profile-updated"));
        return { error: null };
    };

    return {
        profile,
        addresses,
        defaultAddressLine,
        saveDefaultAddress,
        loading,
        refresh: fetchProfile,
    };
}
