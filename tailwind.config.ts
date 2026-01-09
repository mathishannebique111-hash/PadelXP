import type { Config } from "tailwindcss";


const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        /* Variables de thème personnalisées PadelXP - avec support opacité */
        theme: {
          page: "rgb(var(--theme-page) / <alpha-value>)",
          "player-page": "rgb(var(--theme-player-page) / <alpha-value>)",
          card: "rgb(var(--theme-card) / <alpha-value>)",
          secondary: "rgb(var(--theme-secondary) / <alpha-value>)",
          text: "rgb(var(--theme-text) / <alpha-value>)",
          "text-muted": "rgb(var(--theme-text-muted) / <alpha-value>)",
          "text-secondary": "rgb(var(--theme-text-secondary) / <alpha-value>)",
          border: "rgb(var(--theme-border) / <alpha-value>)",
          "border-light": "rgb(var(--theme-border-light) / <alpha-value>)",
          accent: "rgb(var(--theme-accent) / <alpha-value>)",
          "accent-hover": "rgb(var(--theme-accent-hover) / <alpha-value>)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      keyframes: {
        fadeInUp: {
          "0%": {
            opacity: "0",
            transform: "translateY(8px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
      },
      animation: {
        fadeInUp: "fadeInUp 700ms ease-out forwards",
      },
    },
  },
  plugins: [
    function({ addVariant }: any) {
      addVariant('is-app', '.is-app &');
      addVariant('is-web', '.is-web &');
    }
  ],
};


export default config;
