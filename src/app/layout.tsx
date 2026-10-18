// src/app/layout.tsx
import type { Metadata } from 'next';
import ToastProvider from '../components/providers/ToastProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext';
import IndiaPhonePrefix from '@/components/providers/IndiaPhonePrefix';

export const metadata: Metadata = {
  title: 'School Management System',
  description: 'Complete school administration and management platform',
  icons: {
    icon: '/app_logo.jpeg',
    shortcut: '/app_logo.jpeg',
    apple: '/app_logo.jpeg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <ThemeProvider>
        <AuthProvider>
          <IndiaPhonePrefix />
          {children}
          <ToastProvider />
        </AuthProvider>
        </ThemeProvider>
      </body>
      
    </html>
  );
}
