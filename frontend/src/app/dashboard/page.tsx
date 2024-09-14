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

function CreatorDashboard() {
  const { data: session, status } = useSession();
  const [hasPendingPartnership, setHasPendingPartnership] = useState(false);
  const [checkingPartnership, setCheckingPartnership] = useState(true);

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

  if (isStoreConnected) {
    return <StoreDashboard />;
  }

  return <CreatorDashboard />;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Dashboard />
    </Suspense>
  );
}
