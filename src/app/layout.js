import { Inter, Libre_Franklin } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const franklin = Libre_Franklin({ subsets: ["latin"], variable: "--font-franklin" });

export const metadata = {
  title: "Nobelium | Science Publication",
};

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={franklin.variable}>
      <body className={inter.className}>
        <div className="page-wrapper">
          <Navbar />
          <main>
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
