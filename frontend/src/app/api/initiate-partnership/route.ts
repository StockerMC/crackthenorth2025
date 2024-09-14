import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

function generatePartnershipLink(baseUrl: string, channelId: string, companyId: string, shortId: string, videoId?: string): string {
  const state = btoa(JSON.stringify({ channelId, companyId, shortId }));
  const videoParam = videoId ? `&videoId=${videoId}` : '';
  return `${baseUrl}/connect?state=${state}&channelId=${channelId}${videoParam}`;
}

export async function POST(req: NextRequest) {
  try {
    const { companyId, shortId, channelId, email } = await req.json();

    if (!companyId || !shortId || !channelId || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // // Get the YouTube video ID from the shorts table
    // const { data: shortData, error: shortError } = await supabaseAdmin
    //   .from('youtube_shorts')
    //   .select('youtube_id')
    //   .eq('id', shortId)
    //   .single();

    // if (shortError || !shortData) {
    //   console.error('Error fetching short data:', shortError);
    //   return NextResponse.json({ error: 'Short not found' }, { status: 404 });
    // }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const partnershipLink = generatePartnershipLink(baseUrl, channelId, companyId, shortId, shortId);
    console.log(email)
    console.log(partnershipLink)
    const result = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'Partnership Invitation',
      html: `<p>You have been invited to a partnership. Please click the link to confirm: <a href="${partnershipLink}">${partnershipLink}</a></p>`,
    });
    console.log(result)
    console.log(2)

    return NextResponse.json({ message: 'Partnership invitation sent successfully' });
  } catch (error) {
    console.error('Error initiating partnership:', error);
    return NextResponse.json({ error: 'Failed to initiate partnership' }, { status: 500 });
  }
}
