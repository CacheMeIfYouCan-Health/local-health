import './globals.css';
import Providers from './providers';

export const metadata = {
  title: 'Healthcare Access',
  description: 'Find and understand local healthcare access.',
};



export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-100 text-slate-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}