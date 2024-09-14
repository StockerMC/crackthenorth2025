import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuantityCounter } from "@/components/QuantityCounter";
import { supabase } from "@/lib/supabase";
import { ProductImages } from "@/components/ProductImages";

export default async function ProductPage({
                                              params,
                                          }: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params;

    const { data, error } = await supabase
        .from("youtube_shorts")
        .select("*")
        .eq("slug", slug)
        .single();

    if (error) {
        console.error("Error fetching product:", error);
        return <div className="text-8xl font-semibold">404 not found :3</div>;
    }

    return (
        <div className="min-h-screen w-full pt-12">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="grid lg:grid-cols-2 gap-12 items-start">
                    <div className="space-y-4">
                        <ProductImages data={data}/>
                    </div>

                    {/* Product Details */}
                    <div className="space-y-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-100 mb-2">{data.title}</h1>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex">
                                {/*TODO: Calculate real star rating from average of all products in bundle*/}
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star key={star} className="stroke-0 w-5 h-5 fill-amber-400"/>
                                ))}
                            </div>
                            <span className="font-medium text-gray-100">62 reviews</span>
                        </div>
                        {/*TODO: Get real price*/}
                        <h1 className="text-3xl font-semibold">$48.66</h1>
                        <QuantityCounter/>

                        {/* Description */}
                        <div className="space-y-4">
                            {/*TODO: Generate short line*/}
                            <h3 className="text-xl font-semibold text-gray-100">Tastes Like Matcha</h3>
                            <p className="text-gray-100 leading-relaxed">
                                {/*TODO: GPT generate description*/}
                                This matcha is bold, creamy, and umami-rich. With a deeper, more intense flavor profile
                                and a smooth finish, it’s ideal for those who enjoy a stronger matcha experience.
                                Perfect for usucha (thin tea), lattes, or even koicha (thick tea) when you’re looking
                                for a fuller body and lasting richness.
                            </p>
                        </div>

                        <Button
                            size="lg"
                            className="cursor-pointer w-full bg-[#e6e1c5] hover:bg-[#d9d4ba] text-gray-700 font-semibold py-4 text-lg"
                        >
                            Buy Now
                        </Button>

                        {/* Additional Info */}
                        <div className="pt-4 border-t border-border">
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>​</span>
                                <Badge variant="secondary"
                                       className="bg-muted font-medium text-sm text-muted-foreground">
                                    Free shipping
                                </Badge>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
