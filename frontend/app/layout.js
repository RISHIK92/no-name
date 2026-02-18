import "./globals.css";

export const metadata = {
  title: "PR Review Bot — AI-Powered Code Review",
  description:
    "Analyze GitHub Pull Requests with AI. Detect breaking bugs, code smells, and get modern refactor suggestions.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="antialiased grid-bg"
        style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
