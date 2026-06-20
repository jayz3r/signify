import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#1A1130",
        panel: "#251A45",
        panel2: "#2F2156",
        line: "#4A3580",
        ink: "#F5F0FF",
        mute: "#B6A6E0",
        beat: "#FF3D7F",
        shape: "#29E7CD",
        combo: "#FFC247",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      keyframes: {
        pulse_ring: {
          "0%": { transform: "scale(0.85)", opacity: "0.55" },
          "80%": { transform: "scale(1.6)", opacity: "0" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        fall: {
          "0%": { transform: "translateY(-10%)", opacity: "0" },
          "10%": { opacity: "1" },
          "90%": { opacity: "1" },
          "100%": { transform: "translateY(420%)", opacity: "0" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
      animation: {
        pulse_ring: "pulse_ring 2.8s cubic-bezier(0.2,0.6,0.4,1) infinite",
        fall: "fall 3.4s linear infinite",
        flicker: "flicker 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
