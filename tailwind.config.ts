import type { Config } from "tailwindcss";

const config: Config = {
  // Um padrão só, cobrindo src/ inteiro: a lista anterior omitia `src/hooks`,
  // e classe escrita fora das pastas listadas é silenciosamente removida do CSS.
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  future: {
    // Envolve todo `hover:` em `@media (hover: hover)`. Sem isto, no iOS o
    // estado de hover GRUDA depois do toque — o cartão fica levitado até que se
    // toque noutro lugar. É o ajuste certo para um painel de toque.
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};
export default config;
