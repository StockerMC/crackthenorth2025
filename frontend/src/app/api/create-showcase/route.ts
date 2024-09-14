import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const res = await fetch(`${process.env.BACKEND_URL}/create-showcase`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body)
            });

        if (!res.ok) {
            throw new Error(`Backend responded with status: ${res.status}`);
        }

        const responseData = await res.json();

        return NextResponse.json(
            {
                message: "Showcase created successfully",
                showcase: responseData?.slug
            },
            { status: 201 }
        );

    } catch (error) {
        console.error("Error creating showcase:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
