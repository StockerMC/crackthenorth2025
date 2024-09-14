CREATE TABLE youtube_shorts (
    id UUID PRIMARY KEY,
    youtube_id TEXT NOT NULL,
    title TEXT,
    showcase_images TEXT,
    products JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    main_image_url TEXT
);

CREATE TABLE partnerships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES auth.users(id),
    company_id UUID REFERENCES companies(id),
    short_id UUID REFERENCES youtube_shorts(id),
    status TEXT DEFAULT 'pending', -- e.g., pending, confirmed, rejected
    created_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    UNIQUE(creator_id, company_id, short_id)
);
