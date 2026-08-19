import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" faz os arquivos gerados usarem caminhos relativos,
// então funciona em qualquer subpasta do GitHub Pages sem precisar
// editar isso manualmente com o nome do seu repositório.
export default defineConfig({
  plugins: [react()],
  base: "/Painel-de-Contratos/",
});
