"use client";

import YouTubeReels from "@/components/YoutubeReels";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export default function ReelsPage() {
    type Reel = {
        id: string;
        company: string;
        yt_short_url: string;
        product_text?: string;
        product_imgs: string[];
        product_titles?: string[];
        short_id?: string;
        email: string;
        channel_id: string;
        company_id: string; // This will be set from company field
    };
    const [data, setData] = useState<Reel[] | null>(null);
    const [isIngesting, setIsIngesting] = useState(false);
    
    useEffect(() => {
        const fetchData = async () => {
            const shop_name = localStorage.getItem("shop_name");
            const { data: yt_shorts_pending, error } = await supabase
                .from("yt_shorts_pending")
                .select("*")
                .eq("company", shop_name);
            
            if (error) {
                console.error("Error fetching reels:", error);
                return;
            }

            console.log("Fetched data:", yt_shorts_pending);
            console.log("Data length:", yt_shorts_pending?.length);
            
            // Transform the data to match ReelData interface
            const transformedData = (yt_shorts_pending || []).map((reel: Reel) => ({
                ...reel,
                company_id: reel.company // Map company to company_id
            }));
            
            console.log("Setting data:", transformedData);
            setData(transformedData);
            
            // If no shorts were found, check if we should trigger ingestion
            if (!transformedData || transformedData.length === 0) {
                await checkAndTriggerIngestion(shop_name);
            }
        };
        
        const checkAndTriggerIngestion = async (shop_name: string | null) => {
            if (!shop_name || isIngesting) return;
            
            try {
                // Get company data to check last ingestion attempt
                const { data: company, error: companyError } = await supabase
                    .from("companies")
                    .select("last_ingest_attempt, access_token")
                    .eq("shop_name", shop_name)
                    .single();
                
                if (companyError) {
                    console.error("Error fetching company data:", companyError);
                    return;
                }
                
                // Check cooldown (2 minutes = 120000 milliseconds)
                const now = new Date();
                const lastAttempt = company.last_ingest_attempt ? new Date(company.last_ingest_attempt) : null;
                const cooldownPeriod = 2 * 60 * 1000; // 2 minutes in milliseconds
                
                if (lastAttempt && (now.getTime() - lastAttempt.getTime()) < cooldownPeriod) {
                    console.log("Ingestion is on cooldown. Last attempt:", lastAttempt);
                    return;
                }
                
                // Trigger ingestion
                setIsIngesting(true);
                console.log("No shorts found, triggering ingestion for:", shop_name);
                
                // Update last_ingest_attempt timestamp
                await supabase
                    .from("companies")
                    .update({ last_ingest_attempt: now.toISOString() })
                    .eq("shop_name", shop_name);
                
                const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/ingest`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ shop_url: shop_name, access_token: company.access_token }),
                });
                
                if (response.ok) {
                    console.log("Ingestion triggered successfully");
                    // Optionally refetch data after a delay to see if new shorts were generated
                    setTimeout(() => {
                        fetchData();
                    }, 5000); // Wait 5 seconds then refetch
                } else {
                    console.error("Failed to trigger ingestion:", response.statusText);
                }
                
            } catch (error) {
                console.error("Error triggering ingestion:", error);
            } finally {
                setIsIngesting(false);
            }
        };
        
        fetchData();
    }, [isIngesting]);

    return (
        <div className="relative">
            {isIngesting && (
                <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
                    Generating new content...
                </div>
            )}
            <YouTubeReels reelsData={data || []} />
        </div>
    );
}