import baseConfig from "./vite.config";
import { defineConfig, mergeConfig } from "vite";

const wingmanChunkConfig = defineConfig({
  build: {
    /*
      Wingman is a route-heavy internal SPA. The default 500 kB warning is useful
      for simple sites, but Wingman needs a governed budget plus explicit chunking.
      The budget checker below still reports review chunks above 500 kB.
    */
    chunkSizeWarningLimit: 850,

    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "vendor-react",
              test: /node_modules[\\/](react|react-dom|scheduler|use-sync-external-store)[\\/]/,
            },
            {
              name: "vendor-ui",
              test: /node_modules[\\/](@radix-ui|lucide-react|clsx|class-variance-authority)[\\/]/,
            },
            {
              name: "vendor-document-tools",
              test: /node_modules[\\/](pdfjs-dist|mammoth|jszip)[\\/]/,
            },
            {
              name: "vendor-visual-tools",
              test: /node_modules[\\/](@xyflow|reactflow|dagre)[\\/]/,
            },
            {
              name: "wm-compare-engine",
              test: /src[\\/]wingman2[\\/](lib|components)[\\/].*(compare|Compare|competitor|Competitor).*\.tsx?$/,
            },
            {
              name: "wm-product-evidence",
              test: /src[\\/]wingman2[\\/](lib|data)[\\/].*(productStory|productPositioning|recommendationEvidence|salesReadiness|wyrestormSkuBusinessStatus|roomTemplates).*\.tsx?$/,
            },
            {
              name: "wm-project-workflow",
              test: /src[\\/]wingman2[\\/](data|lib|components)[\\/].*(project|Project|proposal|Proposal|template|Template).*\.tsx?$/,
            },
          ],
        },
      },
    },
  },
});

export default defineConfig(async (env) => {
  const resolvedBaseConfig =
    typeof baseConfig === "function" ? await baseConfig(env) : await baseConfig;

  return mergeConfig(resolvedBaseConfig, wingmanChunkConfig);
});