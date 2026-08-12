import type { Metadata } from "next";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "SOS 수학서재 | 창의적인 수학 문제 모음",
  description: "하루히 감성으로 다시 꾸민, 계산보다 논리를 즐기는 수학 문제 서재",
  applicationName: "SOS 수학서재",
  icons: {
    icon: "/icon.jpg",
    apple: "/apple-icon",
  },
  other: {
    "theme-color": "#20254D",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
