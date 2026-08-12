import type { Metadata } from "next";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "SOS 수학서재 | 창의적인 수학 문제 모음",
  description: "계산보다 질문과 논리를 즐기는 창의적인 수학 문제 아카이브",
  applicationName: "SOS 수학서재",
  icons: {
    icon: "/icon.jpg",
    apple: "/apple-icon",
  },
  other: {
    "theme-color": "#f1eddf",
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
