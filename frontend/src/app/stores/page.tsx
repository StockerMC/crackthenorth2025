"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function ConnectStorePage() {
  const [shopName, setShopName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!shopName) {
      setError("Shop name is required.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop_name: shopName }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || "Failed to connect store.");
      }
      
      // Store the shop name in local storage to be retrieved by the dashboard
      localStorage.setItem("shop_name", shopName);

      router.push("/dashboard?store_connected=true");
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="absolute flex items-center justify-center h-screen align-middle">
      <div className="w-full max-w-md p-8 space-y-6 bg-black/10 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
        <h1 className="text-2xl font-bold text-center text-white">Connect Your Shopify Store</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="shopName" className="block text-sm font-medium text-white/90">
              Shop Name
            </label>
            <input
              id="shopName"
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="your-store.myshopify.com"
              className="w-full px-3 py-2 mt-1 border border-white/30 rounded-md shadow-sm bg-white/10 backdrop-blur-sm text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              required
            />
          </div>
          <Button type="submit" className="w-full cursor-pointer bg-[#e6e1c5] text-gray-800 hover:bg-[#d9d4ba]" disabled={isLoading}>
            {isLoading ? "Connecting..." : "Connect Store"}
          </Button>
          {error && <p className="text-sm text-red-300">{error}</p>}
        </form>
      </div>
    </div>
  );
}
