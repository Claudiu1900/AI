import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import Navbar from '@/components/Navbar';
import AnimatedBackground from '@/components/AnimatedBackground';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'ToxiQ AI — Intelligent Conversations',
  description: 'Chat with multiple AI models, generate images, and send voice messages — all in one beautiful interface.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen antialiased">
        <AuthProvider>
          <AnimatedBackground />
          <Navbar />
          <main className="relative z-10 pt-16">
            {children}
          </main>
          <Toaster
            position="top-right"
            toastOptions={{
              className: 'toast-custom',
              duration: 3500,
              style: {
                background: 'rgba(9, 9, 11, 0.95)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                backdropFilter: 'blur(24px)',
                borderRadius: '10px',
                fontSize: '0.875rem',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
