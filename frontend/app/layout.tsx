import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import FloatingCallWidget from '@/components/FloatingCallWidget';

export const metadata: Metadata = {
  title: 'R4R AI – Enterprise Voice AI SaaS Platform',
  description: 'Production-Ready Voice AI Assistant Platform for Telephony, Customer Support, and Lead Generation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen relative">
        {children}
        {/* Floating Voice AI Customer Support Advisor Widget */}
        <FloatingCallWidget />
      </body>
    </html>
  );
}
