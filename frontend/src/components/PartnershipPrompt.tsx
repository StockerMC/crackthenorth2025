'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface Partnership {
  id: string;
  status: string;
  company: {
    shop_name: string;
  };
  short: {
    title: string;
    youtube_id: string;
  };
}

interface PartnershipPromptProps {
  partnershipId: string;
}

export default function PartnershipPrompt({ partnershipId }: PartnershipPromptProps) {
  const [partnership, setPartnership] = useState<Partnership | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    const fetchPartnership = async () => {
      try {
        const response = await fetch(`/api/partnerships/${partnershipId}`);
        const data = await response.json();
        
        if (data.error) {
          setError(data.error);
        } else {
          setPartnership(data);
        }
      } catch (err) {
        setError('Failed to load partnership details');
      } finally {
        setLoading(false);
      }
    };

    if (partnershipId) {
      fetchPartnership();
    }
  }, [partnershipId]);

  const handleAccept = async () => {
    if (!partnership) return;
    
    setProcessing(true);
    try {
      // First, post the comment using the backend /comments/update API
      const commentResponse = await fetch('/api/video_comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel_id: session?.user?.channelId || '',
          comment_id: '', // New comment, so empty
          text: `Check out the products from ${partnership.company.shop_name} featured in this video!`,
          video_id: partnership.short.youtube_id,
        }),
      });

      const commentData = await commentResponse.json();
      
      if (commentData.error) {
        setError(`Failed to post comment: ${commentData.error}`);
        return;
      }

      // Then confirm the partnership
      const confirmResponse = await fetch('/api/partnerships/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ partnershipId }),
      });

      const confirmData = await confirmResponse.json();
      
      if (confirmData.error) {
        setError(confirmData.error);
        return;
      }

      // Redirect to dashboard
      router.push('/dashboard');
      
    } catch (err) {
      setError('Failed to accept partnership');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeny = async () => {
    if (!partnership) return;
    
    setProcessing(true);
    try {
      const response = await fetch('/api/partnerships/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ partnershipId }),
      });

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        return;
      }

      // Redirect to dashboard
      router.push('/dashboard');
      
    } catch (err) {
      setError('Failed to reject partnership');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading partnership details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-pink-50">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.push('/dashboard')} variant="outline">
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!partnership) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🤷‍♂️</div>
          <h1 className="text-2xl font-bold text-gray-600 mb-2">Partnership Not Found</h1>
          <p className="text-gray-600 mb-4">The partnership you&apos;re looking for doesn&apos;t exist.</p>
          <Button onClick={() => router.push('/dashboard')} variant="outline">
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const videoId = partnership.short.youtube_id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <h1 className="text-3xl font-bold mb-2">🤝 Partnership Invitation</h1>
          <p className="text-blue-100">You&apos;ve been invited to collaborate!</p>
        </div>

        <div className="p-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Video Section */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Featured Video</h2>
              
              {/* YouTube Video Embed */}
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden shadow-lg">
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube-nocookie.com/embed/${videoId}?controls=1&modestbranding=1&rel=0`}
                  title={partnership.short.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              {/* Video Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-2">Video Title:</h3>
                <p className="text-gray-600">{partnership.short.title}</p>
              </div>
            </div>

            {/* Partnership Details Section */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Partnership Details</h2>
              
              {/* Company Info */}
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-2 flex items-center">
                  🏪 Company:
                </h3>
                <p className="text-lg font-bold text-blue-900">{partnership.company.shop_name}</p>
              </div>

              {/* Partnership Benefits */}
              <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                <h3 className="font-semibold text-green-800 mb-3 flex items-center">
                  ✨ What you&apos;ll get:
                </h3>
                <ul className="space-y-2 text-green-700">
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Product promotion in your video
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Automatic comment with product links
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Potential revenue sharing
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4 pt-6">
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <p className="text-sm text-yellow-800 mb-4">
                    By accepting this partnership, we&apos;ll automatically add a promotional comment to your video featuring {partnership.company.shop_name}&apos;s products.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    onClick={handleAccept}
                    disabled={processing}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 text-lg rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {processing ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <span className="mr-2">✓</span>
                        Accept Partnership
                      </div>
                    )}
                  </Button>

                  <Button
                    onClick={handleDeny}
                    disabled={processing}
                    variant="outline"
                    className="flex-1 border-2 border-red-300 text-red-600 hover:bg-red-50 font-bold py-4 text-lg rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {processing ? (
                      'Processing...'
                    ) : (
                      <div className="flex items-center justify-center">
                        <span className="mr-2">✗</span>
                        Decline
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}