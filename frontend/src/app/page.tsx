import Gradient from "@/components/Gradient"
import PhoneComponent from "@/components/Phone";
import PhoneImageScroller from "@/components/PhoneImageScroller";
import { ShortScroller } from "@/components/ShortScroller";
import SquigglyUnderlineText from "@/components/SquigglyUnderlineText";
import Link from "next/link";

export default function Home() {
    return (
        <div className="flex items-center justify-center w-full h-full overflow-hidden">

            <div
                className="flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-20 max-w-7xl w-full mx-auto z-10">
                {/* Hero Text */}
                <div className="text-center lg:text-left w-[60%]">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-white mb-6 drop-shadow-2xl text-balance leading-20">
                        Tie your content to the right sponsors with{" "}
                        <SquigglyUnderlineText>Maatchaa</SquigglyUnderlineText>
                    </h1>
                    <p className="text-lg md:text-xl text-white drop-shadow-lg max-w-2xl mx-auto lg:mx-0 font-light mb-8">
                        Connect authentic creators with brands through seamless collaboration and engagement
                    </p>
                    {/* Should open a questionnaire popup */}
                    <Link
                        href="/stores"
                        className="bg-[#e6e1c5] hover:bg-[#d9d4ba] text-gray-900 font-semibold py-4 px-8 rounded-full text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center w-fit"
                    >
                        Get Started
                    </Link>
                </div>

                <div className="flex justify-center items-center w-[40%]">
                    <PhoneComponent/>
                </div>
            </div>
        </div>
    );
}
