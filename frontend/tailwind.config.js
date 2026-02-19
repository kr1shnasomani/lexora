/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                // Brand
                "primary": "#e83049",
                "primary-dark": "#b01d32",
                "primary-light": "#ff5c72",
                "primary-hover": "#d02038",
                // Backgrounds (admin uses darker tones)
                "background-light": "#f8f6f6",
                "background-dark": "#0A0A0C",
                "background-dark-alt": "#0f0f11",
                // Surfaces
                "surface-dark": "#131316",
                "surface-dark-customer": "#18181b",
                "surface-dark-lighter": "#2a1d20",
                // Borders
                "border-dark": "#27272a",
                "surface-border": "#27272a",
                // Text
                "text-muted": "#b89da1",
                // Status
                "success": "#10b981",
                "emerald-accent": "#10b981",
                "warning": "#fbbf24",
            },
            fontFamily: {
                "display": ["Space Grotesk", "sans-serif"],
                "body": ["Space Grotesk", "sans-serif"],
                "sans": ["Space Grotesk", "sans-serif"],
                "mono": ["JetBrains Mono", "monospace"],
            },
            borderRadius: {
                "DEFAULT": "0.375rem",
                "lg": "0.5rem",
                "xl": "0.75rem",
                "2xl": "1rem",
                "full": "9999px",
            },
            boxShadow: {
                "neon": "0 0 10px rgba(232,48,73,0.3), 0 0 20px rgba(232,48,73,0.1)",
                "glass": "0 4px 30px rgba(0,0,0,0.1)",
            },
            animation: {
                "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            },
        },
    },
    plugins: [],
}
