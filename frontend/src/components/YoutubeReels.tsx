"use client";

import { useState, useEffect } from "react";
import { Carousel, CarouselContent, CarouselItem } from "./ui/carousel";
import { supabase } from "@/lib/supabase";
import toast from 'react-hot-toast';

interface ReelData {
    id: string;
    yt_short_url: string;
    product_imgs: string[];
    product_titles?: string[];
    company: string;
    channel_id: string;
    email: string;
    company_id: string;
}

interface YouTubeReelsProps {
    reelsData: ReelData[];
    className?: string;
}

export default function YouTubeReels({ reelsData, className }: YouTubeReelsProps) {
    const [reelsList, setReelsList] = useState(reelsData);
    const [currentIndex, setCurrentIndex] = useState(0);

    console.log("YouTubeReels received reelsData:", reelsData);
    console.log("YouTubeReels reelsData length:", reelsData?.length);
    console.log("YouTubeReels reelsList:", reelsList);
    console.log("YouTubeReels reelsList length:", reelsList?.length);

    // Update reelsList when reelsData changes
    useEffect(() => {
        console.log("useEffect: reelsData changed to:", reelsData);
        setReelsList(reelsData);
    }, [reelsData]);

    const handleDelete = async (index: number, reelId: string) => {
        try {
            // Delete from Supabase
            const { error } = await supabase
                .from("yt_shorts_pending")
                .delete()
                .eq("id", reelId);

            if (error) {
                console.error("Error deleting reel:", error);
                return;
            }

            // Remove from local state if deletion was successful
            const newReelsList = reelsList.filter((_, i) => i !== index);
            setReelsList(newReelsList);
        } catch (error) {
            console.error("Error deleting reel:", error);
        }
    };

    const handleInitiatePartnership = async (reel: ReelData, index: number) => {        
        toast.success(
            `📧 Partnership email sent to the creator with instructions!`,
            {
                duration: 6000,
                position: 'top-center',
                style: {
                    maxWidth: '500px',
                    whiteSpace: 'pre-line',
                },
            }
        );

        // Instantly remove from local state for better UX
        const newReelsList = reelsList.filter((_, i) => i !== index);
        setReelsList(newReelsList);
        console.log(newReelsList)
        console.log(reel)

        try {
            await fetch("/api/initiate-partnership", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    companyId: reel.company,
                    shortId: reel.id,
                    channelId: reel.channel_id,
                    email: reel.email,
                }),
            });
        } catch (error) {
            console.error("Error initiating partnership:", error);
            toast.error("Failed to send partnership email. Please try again.", {
                position: 'top-center'
            });
        }
    };

    return (
        <div className="overflow-hidden h-[1000px] w-[700px]">
            {reelsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[800px] w-full text-center">
                    <img
                        src="https://media2.giphy.com/media/v1.Y2lkPTZjMDliOTUyMmc0Y2U3cHJ5dW5kdjc0cmtvNzR4cnZ1dXNrM2FlY2lhOXBjeHg2ZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/SS40oFiyppsHhvClo2/200.gif"
                        alt="Labubu"
                        className="w-64 h-64 object-contain mb-8"
                    />
                    <h1 className="text-3xl font-bold text-gray-800 mb-4">
                        That&apos;s all for now, working hard to find more content...
                    </h1>
                </div>
            ) : (
                <div className="relative">
                    <Carousel
                        className="w-full h-full max-w-xs"
                        opts={{ loop: true }}
                        orientation="vertical"
                        setApi={(api) => {
                            if (api) {
                                api.on("select", () => {
                                    setCurrentIndex(api.selectedScrollSnap());
                                });
                            }
                        }}
                    >
                        <CarouselContent className="h-[800px] w-[700px]">
                        {reelsList.map((reel, index) => {
                            const videoId = reel.yt_short_url.split("=")[1];
                            return (
                                <CarouselItem key={reel.id}>
                                    <div className="flex items-center gap-2">
                                        <div className="grid grid-cols-2 gap-2 w-44 h-[300px]">
                                            {Array.from({ length: 6 }).map((_, boxIndex) => {
                                                const imgSrc = reel.product_imgs?.[boxIndex];
                                                const productTitle = reel.product_titles?.[boxIndex] || `Product ${boxIndex + 1}`;
                                                return (
                                                    <div
                                                        key={boxIndex}
                                                        className="w-20 h-24 rounded-lg border border-gray-300 bg-gray-100 overflow-hidden relative group cursor-pointer"
                                                    >
                                                        {imgSrc ? (
                                                            <>
                                                                <img
                                                                    src={imgSrc}
                                                                    alt={productTitle}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                                {/* Hover overlay with product title */}
                                                                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center p-1">
                                                                    <span className="text-white text-xs font-medium text-center leading-tight">
                                                                        {productTitle}
                                                                    </span>
                                                                </div>
                                                            </>
                                                        ) : null}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    <iframe
                                        key={index}
                                        className="h-[800px] w-[500px]"
                                        src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&loop=1&mute=1&playlist=${videoId}&controls=0`}
                                        title="Maatchaa Reels"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        referrerPolicy="strict-origin-when-cross-origin"
                                        allowFullScreen
                                    />
                                    <div className="cursor-pointer flex flex-col gap-4">
                                        <button
                                            onClick={() => handleInitiatePartnership(reel, index)}
                                            className="cursor-pointer bg-[#e6e1c5] hover:bg-[#d9d4ba] text-gray-900 font-semibold w-16 h-16 rounded-full text-2xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                                            ✓
                                        </button>
                                        <button
                                            onClick={() => handleDelete(index, reel.id)}
                                            className="cursor-pointer bg-[#e6e1c5] hover:bg-[#d9d4ba] text-gray-900 font-semibold w-16 h-16 rounded-full text-2xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                                            X
                                        </button>
                                    </div>
                                </div>
                            </CarouselItem>
                        );
                    })}
                        </CarouselContent>
                    </Carousel>

                    {/* Reel Counter */}
                    <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
                        {currentIndex + 1} / {reelsList.length}
                    </div>
                </div>
            )}
        </div>
    );
}