import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#20254D",
        }}
      >
        <div style={{ position: "absolute", left: 24, top: 24, width: 132, height: 132, borderRadius: 66, background: "#FFF7E8" }} />
        <div style={{ position: "absolute", left: 48, top: 39, width: 84, height: 71, borderRadius: "48% 48% 38% 38%", background: "#7B3B2E" }} />
        <div style={{ position: "absolute", left: 50, top: 54, width: 80, height: 76, borderRadius: "46% 46% 48% 48%", background: "#FFDAB5" }} />
        <div style={{ position: "absolute", left: 64, top: 83, width: 9, height: 13, borderRadius: 8, background: "#20254D" }} />
        <div style={{ position: "absolute", left: 107, top: 83, width: 9, height: 13, borderRadius: 8, background: "#20254D" }} />
        <div style={{ position: "absolute", left: 78, top: 111, width: 25, height: 6, borderRadius: 6, background: "#DF3D48" }} />
        <div style={{ position: "absolute", left: 73, top: 125, width: 34, height: 25, borderRadius: "50% 8% 50% 8%", background: "#F3C744", transform: "rotate(45deg)" }} />
        <div style={{ position: "absolute", left: 76, top: 132, width: 28, height: 28, borderRadius: "50% 8% 50% 8%", background: "#DF3D48", transform: "rotate(45deg)" }} />
      </div>
    ),
    { ...size },
  );
}
