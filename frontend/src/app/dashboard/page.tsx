"use client";

import { useSession } from "next-auth/react";
import { redirect, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

interface Product {
  id: number;
  title: string;
  price: string;
  image_url: string;
}

function StoreDashboard() {
  const [shopName, setShopName] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const name = localStorage.getItem("shop_name");
    setShopName(name);

    if (name) {
      fetch(`/api/products?shop_name=${name}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.products) {
            setProducts(data.products);
          } else {
            setError("Could not fetch products.");
          }
        })
        .catch(() => setError("Failed to fetch products."))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
      setError("Shop name not found.");
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading Store...</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4 text-red-600">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
      <p className="text-xl text-gray-600 mb-8">
        Connected to: <span className="font-semibold">{shopName}</span>
      </p>

      <h2 className="text-2xl font-bold mb-4">Your Products</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <div key={product.id} className="border rounded-lg p-4 flex flex-col">
            <div className="relative w-full h-48 mb-4">
              <Image
                src={product.image_url}
                alt={product.title}
                layout="fill"
                objectFit="cover"
                className="rounded-md"
              />
            </div>
            <h3 className="text-lg font-semibold">{product.title}</h3>
            <p className="text-gray-500 mb-4">${product.price}</p>
            <Button className="mt-auto w-full">Sponsor this Product</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreatorDashboard({ videoId }: { videoId?: string | null }) {
  const { data: session, status } = useSession();
  const [hasPendingPartnership, setHasPendingPartnership] = useState(false);
  const [checkingPartnership, setCheckingPartnership] = useState(true);
  interface PartnershipData {
    status: string;
    short?: {
      youtube_id?: string;
      title?: string;
    };
    company?: {
      shop_name?: string;
    };
  }

  const [partnershipData, setPartnershipData] = useState<PartnershipData | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (session?.partnershipId) {
      // Check if this partnership is still pending
      fetch(`/api/partnerships/${session.partnershipId}`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'pending') {
            setHasPendingPartnership(true);
            // Redirect to partnership prompt
            window.location.href = `/partnership-prompt?id=${session.partnershipId}`;
          } else if (data.status === 'confirmed' && data.short?.youtube_id) {
            // Show partnership acceptance in dashboard
            setPartnershipData(data);
          }
        })
        .catch(console.error)
        .finally(() => setCheckingPartnership(false));
    } else {
      setCheckingPartnership(false);
    }
  }, [session]);

  if (status === "loading" || checkingPartnership) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    redirect("/creators");
  }

  if (session?.error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4 text-red-600">Connection Error</h1>
          <p className="text-gray-600">There was an error with your YouTube connection.</p>
          <p className="text-sm text-gray-500 mt-2">Error: {session.error}</p>
        </div>
      </div>
    );
  }

  const handleAcceptPartnership = async () => {
    if (!session?.user?.channelId) return;
    
    // Use videoId from URL parameter if available, otherwise fall back to partnership data
    const videoIdToUse = videoId || partnershipData?.short?.youtube_id;
    const companyName = partnershipData?.company?.shop_name || 'our partner company';
    
    if (!videoIdToUse) {
      alert('Video ID not found');
      return;
    }
    
    setProcessing(true);
    try {
      // Call backend update_comment API
      const response = await fetch('http://localhost:8080/comments/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel_id: session.user.channelId,
          comment_id: '', // New comment
          text: `Check out the products from ${companyName} featured in this video!`,
          video_id: videoIdToUse,
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        alert(`Failed to post comment: ${data.error}`);
        return;
      }

      // Mark partnership as processed
      setPartnershipData(null);
      alert('Partnership accepted! Comment posted successfully.');
      
    } catch (err) {
      alert('Failed to accept partnership');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeclinePartnership = () => {
    setPartnershipData(null);
  };

  // Show partnership acceptance prompt if we have confirmed partnership data OR videoId from URL
  if (partnershipData || videoId) {
    const displayVideoId = videoId || partnershipData?.short?.youtube_id;
    const displayTitle = partnershipData?.short?.title || 'Your Video';
    const displayCompany = partnershipData?.company?.shop_name || 'our partner company';

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <h2 className="text-2xl font-bold mb-4 text-center">Partnership Opportunity</h2>
          
          {/* Video embed */}
          {displayVideoId && (
            <div className="mb-6">
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube-nocookie.com/embed/${displayVideoId}?controls=1&modestbranding=1&rel=0`}
                  title={displayTitle}
                  frameBorder="0"
                  allowFullScreen
                />
              </div>
              <p className="text-sm text-gray-600 mt-2 text-center">{displayTitle}</p>
            </div>
          )}

          <p className="text-gray-700 mb-6 text-center">
            Accept partnership with <strong>{displayCompany}</strong> for this video?
          </p>
          
          <div className="flex gap-4">
            <Button
              onClick={handleAcceptPartnership}
              disabled={processing}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {processing ? 'Processing...' : 'Yes, Accept'}
            </Button>
            <Button
              onClick={handleDeclinePartnership}
              variant="outline"
              className="flex-1"
            >
              No, Decline
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If we got here, no pending partnerships - show regular creator dashboard
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4 text-green-600">Connected Successfully!</h1>
        <p className="text-gray-600 mb-2">Your YouTube channel is now connected.</p>
        <p className="text-sm text-gray-500">Channel ID: {session?.user?.channelId}</p>
        {session?.partnershipId && (
          <p className="text-sm text-blue-500 mt-2">
            Partnership Status: Completed or Processed
          </p>
        )}
      </div>
    </div>
  );
}

function Dashboard() {
  const searchParams = useSearchParams();
  const isStoreConnected = searchParams.get("store_connected") === "true";
  const videoId = searchParams.get("videoId");

  if (isStoreConnected) {
    return <StoreDashboard />;
  }

  return <CreatorDashboard videoId={videoId} />;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Dashboard />
    </Suspense>
  );
}
