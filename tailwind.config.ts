import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
        xl: "3rem",
        "2xl": "4rem",
      },
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Poppins", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Arial", "sans-serif"],
        serif: ["Hahmlet", "ui-serif", "Georgia", "Cambria", "Times New Roman", "serif"],
      },
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
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        brand: {
          DEFAULT: "hsl(var(--brand))",
          foreground: "hsl(var(--brand-foreground))",
        },
        // Bubu Lifestyle colors
        "bubu-red": {
          DEFAULT: "hsl(var(--bubu-red))",
          foreground: "hsl(var(--bubu-red-foreground))",
        },
        "bubu-green": {
          DEFAULT: "hsl(var(--bubu-green))",
          foreground: "hsl(var(--bubu-green-foreground))",
        },
        "bubu-sky": {
          DEFAULT: "hsl(var(--bubu-sky))",
          foreground: "hsl(var(--bubu-sky-foreground))",
        },
        "bubu-amber": {
          DEFAULT: "hsl(var(--bubu-amber))",
          foreground: "hsl(var(--bubu-amber-foreground))",
        },
        "bubu-teal": {
          DEFAULT: "hsl(var(--bubu-teal))",
          foreground: "hsl(var(--bubu-teal-foreground))",
        },
        // Legacy tokens
        gold: {
          DEFAULT: "hsl(var(--gold))",
          foreground: "hsl(var(--gold-foreground))",
        },
        maroon: {
          DEFAULT: "hsl(var(--maroon))",
          foreground: "hsl(var(--maroon-foreground))",
        },
        midnight: {
          DEFAULT: "hsl(var(--midnight))",
          foreground: "hsl(var(--midnight-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "1.25rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      boxShadow: {
        elegant: "var(--shadow-elegant)",
        soft: "var(--shadow-soft)",
      },
      backgroundImage: {
        "hero-gradient": "var(--gradient-hero)",
        "gold-gradient": "var(--gradient-gold)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        floaty: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shine: {
          "0%": { transform: "translateX(-140%)" },
          "40%": { transform: "translateX(240%)" },
          "100%": { transform: "translateX(240%)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        floaty: "floaty 7s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.6s ease-out both",
        shine: "shine 5.5s ease-in-out infinite",
        marquee: "marquee 28s linear infinite",
        "marquee-fast": "marquee 12s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
