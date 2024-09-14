"use client";

import { ReactNode, useEffect, useRef } from "react";

interface SquigglyUnderlineTextProps {
    children: ReactNode;
}

export default function SquigglyUnderlineText({ children }: SquigglyUnderlineTextProps) {
    const underlineRef = useRef<SVGPathElement>(null);

    useEffect(() => {
        if (underlineRef.current) {
            const length = underlineRef.current.getTotalLength();
            underlineRef.current.style.strokeDasharray = length.toString();
            underlineRef.current.style.strokeDashoffset = length.toString();
            const path = underlineRef.current;
            setTimeout(() => {
                if (path) {
                    path.style.transition = "stroke-dashoffset 2.2s cubic-bezier(0.77,0,0.175,1)";
                    path.style.strokeDashoffset = "0";
                }
            }, 300);
        }
    }, []);

    return (
        <span className="relative inline-block">
            <span className="text-[#d0ffa1] font-bold font-serif relative z-10">{children}</span>
            <svg
                className="absolute pt-1 left-0 bottom-[-6px] w-full h-[32px] z-0"
                viewBox="0 0 300 22"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ pointerEvents: "none" }}
            >
                <path
                    ref={underlineRef}
                    d="M5 15 Q40 5, 80 15 Q120 25, 155 10"
                    stroke="#b1d989"
                    strokeWidth="4"
                    fill="none"
                    transform="scale(2,1)"
                />
            </svg>
        </span>
    );
}