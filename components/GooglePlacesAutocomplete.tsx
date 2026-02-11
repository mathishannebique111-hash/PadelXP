'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';

interface GooglePlacesAutocompleteProps {
    value?: string;
    onChange?: (value: string) => void;
    onSelect: (place: {
        name: string;
        address: string;
        city: string;
        postal_code: string;
        place_id: string;
        location?: { lat: number; lng: number };
    }) => void;
    placeholder?: string;
}

declare global {
    interface Window {
        google: any;
        initAutocomplete: () => void;
    }
}

export default function GooglePlacesAutocomplete({
    value,
    onChange,
    onSelect,
    placeholder = "Rechercher un club ou un lieu..."
}: GooglePlacesAutocompleteProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<any>(null);

    useEffect(() => {
        // Check if script is already loaded
        if (window.google && window.google.maps && window.google.maps.places) {
            setIsLoaded(true);
            return;
        }

        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
        if (!apiKey) {
            setError("Clé API Google Maps manquante");
            return;
        }

        // Load Google Maps script if not present
        if (!document.getElementById('google-maps-script')) {
            const script = document.createElement('script');
            script.id = 'google-maps-script';
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initAutocomplete`;
            script.async = true;
            script.defer = true;
            window.initAutocomplete = () => setIsLoaded(true);
            document.head.appendChild(script);
        }
    }, []);

    useEffect(() => {
        if (isLoaded && inputRef.current && !autocompleteRef.current) {
            const options = {
                componentRestrictions: { country: "fr" },
                fields: ["address_components", "geometry", "icon", "name", "place_id", "formatted_address"],
                types: ["establishment", "geocode"]
            };

            autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, options);

            autocompleteRef.current.addListener("place_changed", () => {
                const place = autocompleteRef.current.getPlace();

                if (!place.geometry) {
                    if (onChange && place.name) onChange(place.name);
                    return;
                }

                let city = '';
                let postalCode = '';

                if (place.address_components) {
                    for (const component of place.address_components) {
                        const types = component.types;
                        if (types.includes("locality")) {
                            city = component.long_name;
                        } else if (types.includes("postal_code")) {
                            postalCode = component.long_name;
                        }
                    }
                }

                const structuredPlace = {
                    name: place.name || '',
                    address: place.formatted_address || '',
                    city: city,
                    postal_code: postalCode,
                    place_id: place.place_id || '',
                    location: {
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng()
                    }
                };

                if (onChange) onChange(place.name || place.formatted_address || '');
                onSelect(structuredPlace);
            });
        }
    }, [isLoaded, onChange, onSelect]);

    const handleClear = () => {
        if (onChange) onChange("");
        if (inputRef.current) inputRef.current.focus();
    };

    if (error) {
        return (
            <div className="text-red-400 text-xs mt-1 px-1">
                {error}
            </div>
        );
    }

    return (
        <div className="relative w-full">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                {!isLoaded ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <MapPin className="w-5 h-5" />
                )}
            </div>

            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => onChange && onChange(e.target.value)}
                placeholder={placeholder}
                disabled={!isLoaded}
                className="w-full bg-white/5 border-2 border-white/10 rounded-2xl pl-12 pr-12 py-4 text-white placeholder-white/30 focus:outline-none focus:border-blue-500 transition-all font-medium disabled:opacity-50"
            />

            {value && (
                <button
                    onClick={handleClear}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors p-1"
                >
                    <X className="w-5 h-5" />
                </button>
            )}
        </div>
    );
}
