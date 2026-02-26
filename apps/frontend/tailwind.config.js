/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Nepal flag colors
                nepal: {
                    red: '#DC143C',
                    blue: '#003893',
                },
                primary: {
                    50: '#eff6ff',
                    100: '#dbeafe',
                    200: '#bfdbfe',
                    300: '#93c5fd',
                    400: '#60a5fa',
                    500: '#003893', // Nepal blue
                    600: '#002d75',
                    700: '#002259',
                    800: '#00184a',
                    900: '#000e2d',
                },
                accent: {
                    50: '#fef2f2',
                    100: '#fee2e2',
                    200: '#fecaca',
                    300: '#fca5a5',
                    400: '#f87171',
                    500: '#DC143C', // Nepal red
                    600: '#b91030',
                    700: '#980c27',
                    800: '#7a091f',
                    900: '#5c0617',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
