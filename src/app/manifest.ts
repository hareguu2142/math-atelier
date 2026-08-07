import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SOS 수학서재",
    short_name: "SOS 수학서재",
    description: "하루히 감성으로 다시 꾸민 창의 수학 문제 서재",
    start_url: "/",
    display: "standalone",
    background_color: "#FFF7E8",
    theme_color: "#20254D",
    icons: [
      {
        src: "/haruhi-mark.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/haruhi-mark.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
