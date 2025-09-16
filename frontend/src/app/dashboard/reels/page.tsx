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
        };
        fetchData();
    }, []);

    return (
        <div className="relative">
            <YouTubeReels reelsData={data || []} />
        </div>
    );
}