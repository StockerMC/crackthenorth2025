"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowRight, Youtube } from "lucide-react";
import SquigglyUnderlineText from "@/components/SquigglyUnderlineText";
import Gradient from "@/components/Gradient";

export default function CreatorsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "authenticated") {
            router.push("/dashboard");
        }
    }, [status, router]);

    const handleLogin = async () => {
        await signIn("google", { callbackUrl: "/dashboard" });
    };

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-black/5 rounded-2xl ml-20 mr-20 backdrop-blur-sm">
            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-8">
                <div className="max-w-4xl w-full mx-auto text-center bg-black/5 backdrop-blur-sm rounded-3xl shadow-2xl p-8 md:p-12">
                    <div className="flex items-center justify-center mb-6">
                        <Youtube className="w-16 h-16 text-red-600" />
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold text-gray-100 mb-4">
                        Join the <SquigglyUnderlineText>Creator</SquigglyUnderlineText> Economy
                    </h1>
                    <p className="text-lg md:text-xl text-gray-100 max-w-2xl mx-auto mb-8">
                        Monetize your YouTube content and connect with your audience in a whole new way. Turn your videos into shoppable experiences.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={handleLogin}
                            disabled={status === "loading"}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-red-600 rounded-full hover:bg-red-700 transition-all duration-300 transform hover:scale-105"
                        >
                            <span>{status === "loading" ? "Loading..." : "Connect with YouTube"}</span>
                            <ArrowRight className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => router.push("/")}
                            className="w-full sm:w-auto px-8 py-4 text-lg font-semibold text-gray-700 bg-[#e6e1c5] rounded-full hover:brightness-90 transition-all duration-300"
                        >
                            Learn More
                        </button>
                    </div>
                </div>

                <div className="w-full max-w-5xl mx-auto mt-16 px-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                        <div className="p-6 bg-black/5 backdrop-blur-sm rounded-2xl shadow-lg">
                            <h3 className="text-xl font-bold text-gray-100 mb-2">Seamless Integration</h3>
                            <p className="text-gray-100">
                                Connect your YouTube channel in seconds. We automatically sync your videos and analytics.
                            </p>
                        </div>
                        <div className="p-6 bg-black/5 backdrop-blur-sm rounded-2xl shadow-lg">
                            <h3 className="text-xl font-bold text-gray-100 mb-2">Powerful Monetization</h3>
                            <p className="text-gray-100">
                                Tag products in your videos and earn commissions on every sale. No upfront costs.
                            </p>
                        </div>
                        <div className="p-6 bg-black/5 backdrop-blur-sm rounded-2xl shadow-lg">
                            <h3 className="text-xl font-bold text-gray-100 mb-2">Audience Insights</h3>
                            <p className="text-gray-100">
                                Understand your viewers&apos; shopping habits and optimize your content for higher earnings.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
