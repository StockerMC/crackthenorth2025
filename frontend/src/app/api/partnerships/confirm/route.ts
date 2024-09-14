import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

async function postComment(channelId: string, videoId: string, text: string) {
    const { data: tokenData, error: tokenError } = await supabaseAdmin
        .from('creator_tokens')
        .select('access_token')
        .eq('channel_id', channelId)
        .single();

    if (tokenError || !tokenData) {
        throw new Error('Could not retrieve access token for creator.');
    }

    const response = await fetch('https://www.googleapis.com/youtube/v3/commentThreads', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            snippet: {
                videoId: videoId,
                topLevelComment: {
                    snippet: {
                        textOriginal: text,
                    },
                },
            },
        }),
    });

    const responseData = await response.json();
    if (!response.ok) {
        console.error('Failed to post comment:', responseData);
        throw new Error('Failed to post comment to YouTube.');
    }
    return responseData;
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { partnershipId } = await req.json();

    if (!partnershipId) {
        return NextResponse.json({ error: 'Partnership ID is required' }, { status: 400 });
    }

    const { data: partnership, error: fetchError } = await supabaseAdmin
        .from('partnerships')
        .select(`
            id,
            status,
            creator_id,
            company:companies(shop_name),
            short:youtube_shorts(youtube_id, title)
        `)
        .eq('id', partnershipId)
        .single();

    if (fetchError || !partnership) {
        return NextResponse.json({ error: 'Partnership not found' }, { status: 404 });
    }

    if (partnership.creator_id !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error: updateError } = await supabaseAdmin
        .from('partnerships')
        .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
        .eq('id', partnershipId);

    if (updateError) {
        return NextResponse.json({ error: 'Failed to confirm partnership' }, { status: 500 });
    }

    // Comment posting is now handled separately via the /api/video_comment route
    // which calls the backend /comments/update API directly
    
    return NextResponse.json({ message: 'Partnership confirmed successfully' });
}
