'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

export default function ConnectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const channelId = searchParams.get('channelId');
    const state = searchParams.get('state');
    
    if (channelId) {
      // Store channelId in both localStorage and cookie
      localStorage.setItem('youtube_channel_id', channelId);
      document.cookie = `youtube_channel_id=${channelId}; path=/; max-age=86400`; // 24 hours
      console.log('Stored channelId:', channelId);
    }
    
    // Redirect to Google sign-in with the state parameter
    if (state) {
      signIn('google', { 
        callbackUrl: `/api/auth/callback/google?state=${state}` 
      });
    } else {
      // If no state, just do regular sign-in
      signIn('google');
    }
  }, [searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Connecting to Google...</h1>
        <p>Please wait while we redirect you to Google for authentication.</p>
      </div>
    </div>
  );
}
