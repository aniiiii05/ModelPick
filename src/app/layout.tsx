import type { Metadata, Viewport } from "next";
import { Archivo, Hanken_Grotesk, Red_Hat_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"] });
const hanken = Hanken_Grotesk({ variable: "--font-hanken", subsets: ["latin"] });
const mono = Red_Hat_Mono({ variable: "--font-rx", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ModelPick · An eye exam for your prompts",
  description:
    "Paste any prompt. ModelPick prescribes the AI model, effort level and subscription that fit it, across 18 models from 12 labs.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef2f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1214" },
  ],
};

// Applies the saved "lights" preference before paint so there is no theme flash.
const themeScript = `try{var t=localStorage.getItem("mp-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${archivo.variable} ${hanken.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
