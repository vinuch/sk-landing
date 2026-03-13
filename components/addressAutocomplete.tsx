"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";

type AddressAutocompleteProps = {
    value?: string;
    disabled?: boolean;
    className?: string;
    onAddressSelect: (address: string) => void | Promise<void>;
    onInputChange?: (address: string) => void;
};

type PlacePrediction = {
    place_id: string;
    description: string;
};

type PlacesServiceStatus = {
    OK: string;
};

type AutocompleteServiceLike = {
    getPlacePredictions: (
        request: { input: string; componentRestrictions?: { country: string } },
        callback: (predictions: PlacePrediction[] | null, status: string) => void
    ) => void;
};

type GoogleMapsLike = {
    maps?: {
        places?: {
            AutocompleteService: new () => AutocompleteServiceLike;
            PlacesServiceStatus: PlacesServiceStatus;
        };
    };
};

declare global {
    interface Window {
        google?: GoogleMapsLike;
    }
}

export default function AddressAutocomplete({
    value = "",
    disabled,
    className = "",
    onAddressSelect,
    onInputChange,
}: AddressAutocompleteProps) {
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const serviceRef = useRef<AutocompleteServiceLike | null>(null);
    const [scriptReady, setScriptReady] = useState(false);
    const [inputValue, setInputValue] = useState(value);
    const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const canSearch = Boolean(scriptReady && window.google?.maps?.places && inputValue.trim().length >= 3);

    useEffect(() => {
        setInputValue(value);
    }, [value]);

    useEffect(() => {
        if (window.google?.maps?.places) {
            setScriptReady(true);
        }
    }, []);

    useEffect(() => {
        if (!scriptReady || !window.google?.maps?.places || serviceRef.current) {
            return;
        }
        serviceRef.current = new window.google.maps.places.AutocompleteService();
    }, [scriptReady]);

    useEffect(() => {
        const closeOnOutsideClick = (event: MouseEvent) => {
            if (!wrapperRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", closeOnOutsideClick);
        return () => document.removeEventListener("mousedown", closeOnOutsideClick);
    }, []);

    useEffect(() => {
        if (!canSearch || !serviceRef.current) {
            setSuggestions([]);
            return;
        }

        setLoading(true);
        const handle = setTimeout(() => {
            serviceRef.current?.getPlacePredictions(
                {
                    input: inputValue.trim(),
                    // componentRestrictions: { country: "ng" },
                },
                (predictions: PlacePrediction[] | null, status: string) => {
                    setLoading(false);
                    if (status !== window.google?.maps?.places?.PlacesServiceStatus.OK || !predictions) {
                        setSuggestions([]);
                        return;
                    }
                    setSuggestions(predictions.slice(0, 6));
                    setOpen(true);
                }
            );
        }, 200);

        return () => clearTimeout(handle);
    }, [inputValue, canSearch]);

    const helperText = useMemo(() => {
        if (!apiKey) return "Google Maps API key is missing";
        if (!scriptReady) return "Loading maps...";
        if (inputValue.trim().length < 3) return "Type at least 3 characters";
        if (loading) return "Searching addresses...";
        return "";
    }, [apiKey, scriptReady, inputValue, loading]);

    const selectSuggestion = async (description: string) => {
        setInputValue(description);
        onInputChange?.(description);
        setOpen(false);
        setSuggestions([]);
        await onAddressSelect(description);
    };

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            {apiKey ? (
                <Script
                    src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`}
                    strategy="afterInteractive"
                    onLoad={() => setScriptReady(true)}
                />
            ) : (
                <div className="text-red-500 text-xs">API Key missing</div>
            )}
            <input
                type="text"
                value={inputValue}
                disabled={disabled}
                onFocus={(e) => {
                    setOpen(suggestions.length > 0);
                    // Scroll input into view on mobile when keyboard opens
                    setTimeout(() => {
                        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 100);
                }}
                onChange={(e) => {
                    setInputValue(e.target.value);
                    onInputChange?.(e.target.value);
                    if (!open) setOpen(true);
                }}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && inputValue.trim()) {
                        e.preventDefault();
                        onAddressSelect(inputValue.trim());
                        setOpen(false);
                        setSuggestions([]);
                    }
                }}
                placeholder="Type delivery address"
                className="border rounded-md px-2 py-1 text-sm w-full text-black placeholder:text-gray-500"
            />
            {helperText ? <p className="text-xs text-gray-500 mt-1">{helperText}</p> : null}
            {open && suggestions.length > 0 ? (
                <div className="relative mt-1 w-full">
                    <div className="max-h-60 overflow-y-auto overflow-x-hidden rounded-md border bg-white shadow-lg">
                        {suggestions.map((item) => (
                            <button
                                key={item.place_id}
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm text-gray-900 bg-white hover:bg-gray-100 whitespace-normal break-words leading-5"
                                onClick={() => selectSuggestion(item.description)}
                            >
                                {item.description}
                            </button>
                        ))}
                    </div>
                </div>
            ) : open && inputValue.trim().length >= 3 && !loading ? (
                <div className="relative mt-1 w-full">
                    <div className="rounded-md border bg-white shadow-lg">
                        <button
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm text-gray-900 bg-white hover:bg-gray-100 whitespace-normal break-words leading-5"
                            onClick={() => selectSuggestion(inputValue.trim())}
                        >
                            Use &quot;{inputValue.trim()}&quot;
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
