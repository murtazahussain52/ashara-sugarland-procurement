import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        its: {
          navy:       "#0f2d3d",
          teal:       "#1a3d4f",
          "teal-mid": "#1e4d63",
          "teal-light":"#235a72",
          gold:       "#c9a84c",
          "gold-light":"#e2c97e",
          "gold-pale": "#f5ecd0",
          cream:      "#f7f5f0",
          "cream2":   "#eef0eb",
          red:        "#b03030",
          border:     "#2a5068",
        },
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        sans:    ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
