import "./globals.css";
import { Providers } from "./providers";

const themeScript = `
(function(){
  var t=localStorage.getItem('marketbuzz-theme');
  if(t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches))
    document.documentElement.classList.add('dark');
  else
    document.documentElement.classList.remove('dark');
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-800 antialiased dark:bg-slate-900 dark:text-slate-200">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
