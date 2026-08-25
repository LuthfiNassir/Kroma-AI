/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          canvas: "#212222",
          card: "#18191b",
          coral: "#FE6749",
          purple: "#A5329E",
        },
      },
      borderRadius: {
        '2xl': '1.125rem', // 18px
        '3xl': '1.5rem',   // 24px
      },
    },
  },
  plugins: [],
};
