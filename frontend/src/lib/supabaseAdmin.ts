import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Create a Supabase client with the service role key for admin operations
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Helper function to upsert (insert or update) creator tokens
export async function upsertCreatorTokens({
  channelId,
  email,
  accessToken,
  refreshToken,
  expiresAt,
}: {
  channelId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}) {
  const { data, error } = await supabaseAdmin
    .from('creator_tokens')
    .upsert(
      {
        channel_id: channelId,
        email: email,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt.toISOString(),
      },
      {
        onConflict: 'channel_id',
      }
    )
    .select('id')
    .single();

  if (error) {
    console.error('Error upserting creator tokens:', error);
    throw error;
  }
  return data;
}

// Helper function to create a partnership
export async function createPartnership({
  creatorId,
  companyId,
  shortId,
}: {
  creatorId: string;
  companyId: string;
  shortId: string;
}) {
  const { data, error } = await supabaseAdmin
    .from('partnerships')
    .insert({
      creator_id: creatorId,
      company_id: companyId,
      short_id: shortId,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating partnership:', error);
    // Handle potential duplicate partnership error gracefully
    if (error.code === '23505') { // unique_violation
        const { data: existingPartnership, error: fetchError } = await supabaseAdmin
            .from('partnerships')
            .select('id')
            .eq('creator_id', creatorId)
            .eq('company_id', companyId)
            .eq('short_id', shortId)
            .single();
        if (fetchError) {
            console.error('Error fetching existing partnership:', fetchError);
            throw fetchError;
        }
        return existingPartnership;
    }
    throw error;
  }

  return data;
}