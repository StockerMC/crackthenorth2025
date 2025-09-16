'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

function ConnectPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isUpdatingComment, setIsUpdatingComment] = useState(false);
  
  useEffect(() => {
    const channelId = searchParams.get('channelId');
    const state = searchParams.get('state');
    const videoId = searchParams.get('videoid');
    
    if (channelId) {
      // Store channelId in both localStorage and cookie
      localStorage.setItem('youtube_channel_id', channelId);
      document.cookie = `youtube_channel_id=${channelId}; path=/; max-age=86400`; // 24 hours
      console.log('Stored channelId:', channelId);
    }
    
    // If we have a videoId, immediately call the update_comment API
    if (videoId && channelId) {
      updateComment(channelId, videoId);
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

  const updateComment = async (channelId: string, videoId: string) => {
    setIsUpdatingComment(true);
    try {
      const response = await fetch('http://localhost:8000/comments/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel_id: channelId,
          comment_id: `${channelId}_${videoId}`, // Generate a unique comment ID
          text: "Check out our product set: http://localhost:3000/product/OeSIRB",
          video_id: videoId
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Comment updated successfully:', result);
      } else {
        console.error('Failed to update comment:', response.statusText);
      }
    } catch (error) {
      console.error('Error updating comment:', error);
    } finally {
      setIsUpdatingComment(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Connecting to Google...</h1>
        <p>Please wait while we redirect you to Google for authentication.</p>
        {isUpdatingComment && (
          <p className="mt-4 text-blue-600">Updating video comment...</p>
        )}
      </div>
    </div>
  );
}

export default function ConnectPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
          <p>Please wait while we prepare the connection page.</p>
        </div>
      </div>
    }>
      <ConnectPageContent />
    </Suspense>
  );
}
