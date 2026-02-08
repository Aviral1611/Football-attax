'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';

export default function ClientWrapper({ children }: { children: ReactNode }) {
    return (
        <AuthProvider>
            <Navbar />
            {children}
        </AuthProvider>
    );
}
