import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

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
        .update({ status: 'rejected', confirmed_at: new Date().toISOString() })
        .eq('id', partnershipId);

    if (updateError) {
        return NextResponse.json({ error: 'Failed to reject partnership' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Partnership rejected successfully' });
}