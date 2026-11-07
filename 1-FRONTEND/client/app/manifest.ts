import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest { return { name: "Automobile", short_name: "Automobile", start_url: "/", display: "standalone" }; }
