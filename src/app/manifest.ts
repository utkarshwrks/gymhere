import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GymHere",
    short_name: "GymHere",
    description: "Run your gym, not your spreadsheets.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0f0c",
    theme_color: "#0b0f0c",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
