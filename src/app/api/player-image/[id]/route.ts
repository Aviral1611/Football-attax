import { NextRequest, NextResponse } from 'next/server';

// Proxy route to fetch FIFA player images (bypasses CORS)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    if (!id) {
        return NextResponse.json({ error: 'Player ID required' }, { status: 400 });
    }

    // Construct SoFIFA CDN URL
    // Format: first 3 digits / remaining digits
    const firstPart = id.slice(0, 3);
    const secondPart = id.slice(3);
    const imageUrl = `https://cdn.sofifa.net/players/${firstPart}/${secondPart}/24_120.png`;

    try {
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://sofifa.com/',
            },
        });

        if (!response.ok) {
            // Return a placeholder if image not found
            return new NextResponse(null, {
                status: 404,
                headers: { 'Cache-Control': 'public, max-age=86400' }
            });
        }

        const imageBuffer = await response.arrayBuffer();

        return new NextResponse(imageBuffer, {
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=604800', // Cache for 7 days
            },
        });
    } catch (error) {
        console.error('Error fetching player image:', error);
        return new NextResponse(null, { status: 500 });
    }
}
