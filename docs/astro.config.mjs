// @ts-check

import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  prefetch: {
    prefetchAll: true,
  },
  integrations: [
    starlight({
      title: "Talab",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/abubakriz/talab",
        },
      ],
      sidebar: [
        {
          label: "Guides",
          items: [
            {
              label: "Getting Started",
              slug: "guides/getting-started",
            },
            {
              label: "Instances and Configuration",
              slug: "guides/instances-and-configuration",
            },
            {
              label: "Middleware and Addons",
              slug: "guides/middleware-and-addons",
            },
            {
              label: "Timeouts and Abort Signals",
              slug: "guides/timeouts-and-abort-signals",
            },
            {
              label: "Custom Fetchers",
              slug: "guides/custom-fetchers",
            },
          ],
        },
        {
          label: "Reference",
          autogenerate: { directory: "reference" },
        },
      ],
    }),
  ],
});
