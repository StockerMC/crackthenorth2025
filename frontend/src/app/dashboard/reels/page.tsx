"use client";

import YouTubeReels from "@/components/YoutubeReels";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export default function ReelsPage() {
    type Reel = {
        id: number;
        company: string;
        // Add other fields from your yt_shorts_pending table as needed
        [key: string]: unknown;
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
            console.log("Setting data:", yt_shorts_pending);
            setData(yt_shorts_pending || []);
        };
        fetchData();
    }, []);

    return (
        <div className="relative">
            <YouTubeReels reelsData={data || []} />
        </div>
    );
}