// vite.config.ts
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
var vite_config_default = defineConfig({
  tanstackStart: {
    server: { entry: "server" }
  }
});
export {
  vite_config_default as default
};
