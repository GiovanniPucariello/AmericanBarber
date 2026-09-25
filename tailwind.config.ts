import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0B0B0C",
          900: "#141415",
          800: "#1D1D1F",
        },
        paper: {
          50: "#F5F3EF",
          200: "#E7E3DB",
        },
        accent: {
          DEFAULT: "#8C1F28",
          hover: "#731A22",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        // DESIGN.md section J: a blackletter accent is permitted at large
        // sizes (>=24px) for non-interactive marketing headlines only -
        // never for functional UI. Restrict usage accordingly, not this
        // token's fault if it gets misused elsewhere.
        display: ["Pirata One", "serif"],
      },
      borderRadius: {
        // DESIGN.md section J's radius scale - previously unimplemented,
        // every card/button used Tailwind's bare default (rounded-md, 6px)
        // with no distinction between a button and a hero card.
        sm: "6px",
        md: "10px",
        lg: "16px",
      },
    },
  },
  plugins: [],
};

export default config;
