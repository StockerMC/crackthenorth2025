import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: partnershipId } = await params;

  if (!partnershipId) {
    return NextResponse.json({ error: 'Partnership ID is required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('partnerships')
    .select(`
      id,
      status,
      company:companies(shop_name),
      short:youtube_shorts(title)
    `)
    .eq('id', partnershipId)
    .single();

  if (error) {
    console.error('Error fetching partnership:', error);
    return NextResponse.json({ error: 'Partnership not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}
