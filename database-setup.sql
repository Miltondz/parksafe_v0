-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table for user metadata and location tracking
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    location JSONB,
    last_active TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create groups table
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    recipient_id UUID REFERENCES auth.users(id),
    group_id UUID REFERENCES public.groups(id),
    content TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'normal',
    read_by JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_recipient CHECK (
        (recipient_id IS NOT NULL AND group_id IS NULL) OR
        (recipient_id IS NULL AND group_id IS NOT NULL) OR
        (type = 'emergency')
    )
);

-- Create emergency_alerts table
CREATE TABLE IF NOT EXISTS public.emergency_alerts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    type VARCHAR(50) NOT NULL,
    message TEXT,
    status VARCHAR(20) DEFAULT 'active',
    location JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view groups"
    ON public.groups FOR SELECT
    USING (true);

CREATE POLICY "Users can create groups"
    ON public.groups FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group members can view other members"
    ON public.group_members FOR SELECT
    USING (true);

CREATE POLICY "Users can manage their group memberships"
    ON public.group_members FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY "Users can read messages they're involved with"
    ON public.messages FOR SELECT
    USING (
        sender_id = auth.uid() OR
        recipient_id = auth.uid() OR
        type = 'emergency' OR
        (
            group_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM public.group_members
                WHERE group_id = messages.group_id
                AND user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can send messages"
    ON public.messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid() AND
        (
            recipient_id IS NOT NULL OR
            type = 'emergency' OR
            (
                group_id IS NOT NULL AND
                EXISTS (
                    SELECT 1 FROM public.group_members
                    WHERE group_id = messages.group_id
                    AND user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Everyone can view emergency alerts"
    ON public.emergency_alerts FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create emergency alerts"
    ON public.emergency_alerts FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.groups
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.emergency_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Create function to update user location (as a stored procedure)
CREATE OR REPLACE FUNCTION public.update_user_location(
    user_id UUID,
    lat double precision,
    lng double precision
) RETURNS void AS $$
BEGIN
    UPDATE public.profiles
    SET 
        location = jsonb_build_object(
            'lat', lat,
            'lng', lng,
            'timestamp', extract(epoch from now())
        ),
        last_active = NOW(),
        updated_at = NOW()
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;