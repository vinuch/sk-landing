import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import useAuth from "@/hooks/useAuth";
import AddressAutocomplete from "./addressAutocomplete";

const identifierSchema = z.object({
    emailOrPhone: z
        .string()
        .min(1, "This field is required")
        .refine(
            (value) => {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                const phoneRegex = /^\+?[0-9]{9,15}$/;
                return emailRegex.test(value) || phoneRegex.test(value);
            },
            { message: "Enter a valid email or phone number" }
        ),
});

const otpSchema = z.object({
    otp: z.string().min(4, "Enter a valid OTP code").max(8, "Enter a valid OTP code"),
});

const onboardingSchema = z.object({
    fullName: z.string().min(2, "Enter your name"),
    phone: z.string().min(9, "Enter a valid phone number"),
    address: z.string().min(6, "Enter a valid address"),
});

type IdentifierSchema = z.infer<typeof identifierSchema>;
type OtpSchema = z.infer<typeof otpSchema>;
type OnboardingSchema = z.infer<typeof onboardingSchema>;

type OtpChannel = "email" | "phone";

export default function SignupForm() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState<"request" | "verify" | "onboarding">("request");
    const [identifier, setIdentifier] = useState("");
    const [channel, setChannel] = useState<OtpChannel>("email");
    const [userId, setUserId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset: resetIdentifierForm,
    } = useForm<IdentifierSchema>({
        resolver: zodResolver(identifierSchema),
    });

    const {
        register: registerOtp,
        handleSubmit: handleOtpSubmit,
        formState: { errors: otpErrors },
        reset: resetOtpForm,
    } = useForm<OtpSchema>({
        resolver: zodResolver(otpSchema),
    });

    const {
        register: registerOnboarding,
        control,
        handleSubmit: handleOnboardingSubmit,
        formState: { errors: onboardingErrors },
        reset: resetOnboardingForm,
    } = useForm<OnboardingSchema>({
        resolver: zodResolver(onboardingSchema),
    });

    const resetAll = () => {
        setStep(user ? "onboarding" : "request");
        setIdentifier("");
        setChannel("email");
        setUserId(user?.id ?? null);
        setSubmitting(false);
        resetIdentifierForm();
        resetOtpForm();
        resetOnboardingForm();
    };

    useEffect(() => {
        if (!isOpen || !user?.id) return;

        const preloadOnboarding = async () => {
            const [{ data: profile }, { data: defaultAddress }] = await Promise.all([
                supabase
                    .from("profiles")
                    .select("full_name, phone")
                    .eq("id", user.id)
                    .maybeSingle(),
                supabase
                    .from("user_addresses")
                    .select("address_line")
                    .eq("user_id", user.id)
                    .eq("is_default", true)
                    .maybeSingle(),
            ]);

            setUserId(user.id);
            setStep("onboarding");
            resetOnboardingForm({
                fullName: profile?.full_name ?? "",
                phone: profile?.phone ?? user.phone ?? "",
                address: defaultAddress?.address_line ?? "",
            });
        };

        preloadOnboarding();
    }, [isOpen, user?.id, user?.phone, resetOnboardingForm]);

    const requestOtp = async ({ emailOrPhone }: IdentifierSchema) => {
        setSubmitting(true);
        const value = emailOrPhone.trim();
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

        const redirectTo =
            typeof window !== "undefined"
                ? `${window.location.origin}/auth/callback`
                : undefined;
        const { error } = await supabase.auth.signInWithOtp(
            isEmail
                ? {
                    email: value,
                    options: {
                        shouldCreateUser: true,
                        emailRedirectTo: redirectTo,
                    },
                }
                : {
                    phone: value,
                    options: {
                        shouldCreateUser: true,
                    },
                }
        );

        setSubmitting(false);

        if (error) {
            toast.error(error.message || "Could not send OTP");
            return;
        }

        setIdentifier(value);
        setChannel(isEmail ? "email" : "phone");
        resetOtpForm({ otp: "" });
        setStep("verify");
        toast.success(`OTP sent to your ${isEmail ? "email" : "phone"}`);
    };

    const verifyOtp = async ({ otp }: OtpSchema) => {
        if (!identifier) return;
        setSubmitting(true);

        const payload =
            channel === "email"
                ? { email: identifier, token: otp.trim(), type: "email" as const }
                : { phone: identifier, token: otp.trim(), type: "sms" as const };

        const { data, error } = await supabase.auth.verifyOtp(payload);
        setSubmitting(false);

        if (error) {
            toast.error(error.message || "OTP verification failed");
            return;
        }

        const authedUserId = data.user?.id || null;
        setUserId(authedUserId);

        if (!authedUserId) {
            toast.error("Could not load user session");
            return;
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, phone, onboarded")
            .eq("id", authedUserId)
            .maybeSingle();

        const { data: defaultAddress } = await supabase
            .from("user_addresses")
            .select("id")
            .eq("user_id", authedUserId)
            .eq("is_default", true)
            .maybeSingle();

        const hasName = Boolean(profile?.full_name);
        const hasPhone = Boolean(profile?.phone);
        const hasAddress = Boolean(defaultAddress?.id);
        const hasOnboarded = Boolean(profile?.onboarded);

        if (hasOnboarded && hasName && hasPhone && hasAddress) {
            toast.success("You are now logged in");
            setIsOpen(false);
            resetAll();
            return;
        }

        setStep("onboarding");
    };

    const submitOnboarding = async ({ fullName, phone, address }: OnboardingSchema) => {
        if (!userId) {
            toast.error("No active user session");
            return;
        }

        setSubmitting(true);

        const { error: profileError } = await supabase.from("profiles").upsert(
            {
                id: userId,
                full_name: fullName.trim(),
                phone: phone.trim(),
                onboarded: true,
            },
            { onConflict: "id" }
        );

        if (profileError) {
            setSubmitting(false);
            toast.error(profileError.message || "Could not save profile");
            return;
        }

        const { data: existingDefault } = await supabase
            .from("user_addresses")
            .select("id")
            .eq("user_id", userId)
            .eq("is_default", true)
            .maybeSingle();

        if (existingDefault?.id) {
            const { error: updateAddressError } = await supabase
                .from("user_addresses")
                .update({
                    address_line: address.trim(),
                    label: "Default",
                })
                .eq("id", existingDefault.id);

            if (updateAddressError) {
                setSubmitting(false);
                toast.error(updateAddressError.message || "Could not save address");
                return;
            }
        } else {
            const { error: insertAddressError } = await supabase.from("user_addresses").insert({
                user_id: userId,
                label: "Default",
                address_line: address.trim(),
                is_default: true,
            });

            if (insertAddressError) {
                setSubmitting(false);
                toast.error(insertAddressError.message || "Could not save address");
                return;
            }
        }

        setSubmitting(false);
        toast.success("Profile setup complete");
        window.dispatchEvent(new Event("profile-updated"));
        setIsOpen(false);
        resetAll();
    };

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                setIsOpen(open);
                if (!open) resetAll();
            }}
        >
            <DialogTrigger asChild>
                <Button className="bg-primary-green px-4 py-6 text-base my-3">
                    {user ? "Complete Profile" : "Login"}
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-lg bg-white">
                <DialogHeader>
                    <DialogTitle className="text-black">Login</DialogTitle>
                    <DialogDescription>
                        {step === "request" && "Enter your email or phone to receive a one-time code."}
                        {step === "verify" && `Enter the OTP sent to ${identifier}.`}
                        {step === "onboarding" && "Complete your profile to continue ordering."}
                    </DialogDescription>
                </DialogHeader>

                {step === "request" ? (
                    <form key="request-form" onSubmit={handleSubmit(requestOtp)} className="space-y-4 mt-4">
                        <div className="flex flex-col space-y-2">
                            <label className="text-sm text-black font-medium">Email or Phone</label>
                            <input
                                type="text"
                                className="border rounded-md p-2 text-gray-900 placeholder:text-gray-500"
                                placeholder="you@example.com or +2348012345678"
                                {...register("emailOrPhone")}
                            />
                            {errors.emailOrPhone && (
                                <p className="text-red-500 text-sm">{errors.emailOrPhone.message}</p>
                            )}
                            <p className="text-xs text-gray-600">
                                Phone OTP is sent via SMS (or WhatsApp, depending on your provider setup).
                            </p>
                        </div>

                        <Button type="submit" className="w-full bg-primary-green py-2" disabled={submitting}>
                            {submitting ? "Sending..." : "Send OTP"}
                        </Button>
                    </form>
                ) : step === "verify" ? (
                    <form key="verify-form" onSubmit={handleOtpSubmit(verifyOtp)} className="space-y-4 mt-4">
                        <div className="flex flex-col space-y-2">
                            <label className="text-sm text-black font-medium">OTP Code</label>
                            <input
                                type="text"
                                className="border rounded-md p-2 text-gray-900 placeholder:text-gray-500"
                                placeholder="Enter code"
                                autoComplete="one-time-code"
                                {...registerOtp("otp")}
                            />
                            {otpErrors.otp && (
                                <p className="text-red-500 text-sm">{otpErrors.otp.message}</p>
                            )}
                        </div>

                        <Button type="submit" className="w-full bg-primary-green py-2" disabled={submitting}>
                            {submitting ? "Verifying..." : "Verify OTP"}
                        </Button>

                        <button
                            type="button"
                            className="w-full text-sm underline text-black"
                            disabled={submitting}
                            onClick={() => {
                                setStep("request");
                                resetOtpForm();
                            }}
                        >
                            Change email or phone
                        </button>
                    </form>
                ) : (
                    <form key="onboarding-form" onSubmit={handleOnboardingSubmit(submitOnboarding)} className="space-y-4 mt-4">
                        <div className="flex flex-col space-y-2">
                            <label className="text-sm text-black font-medium">Full Name</label>
                            <input
                                type="text"
                                className="border rounded-md p-2 text-gray-900 placeholder:text-gray-500"
                                placeholder="Enter your full name"
                                {...registerOnboarding("fullName")}
                            />
                            {onboardingErrors.fullName && (
                                <p className="text-red-500 text-sm">{onboardingErrors.fullName.message}</p>
                            )}
                        </div>

                        <div className="flex flex-col space-y-2">
                            <label className="text-sm text-black font-medium">Phone Number</label>
                            <input
                                type="text"
                                className="border rounded-md p-2 text-gray-900 placeholder:text-gray-500"
                                placeholder="+2348012345678"
                                {...registerOnboarding("phone")}
                            />
                            {onboardingErrors.phone && (
                                <p className="text-red-500 text-sm">{onboardingErrors.phone.message}</p>
                            )}
                        </div>

                        <div className="flex flex-col space-y-2">
                            <label className="text-sm text-black font-medium">Default Delivery Address</label>
                            <Controller
                                control={control}
                                name="address"
                                render={({ field }) => (
                                    <AddressAutocomplete
                                        value={field.value || ""}
                                        onInputChange={(value) => field.onChange(value)}
                                        onAddressSelect={(value) => field.onChange(value)}
                                    />
                                )}
                            />
                            {onboardingErrors.address && (
                                <p className="text-red-500 text-sm">{onboardingErrors.address.message}</p>
                            )}
                        </div>

                        <Button type="submit" className="w-full bg-primary-green py-2" disabled={submitting}>
                            {submitting ? "Saving..." : "Save & Continue"}
                        </Button>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
