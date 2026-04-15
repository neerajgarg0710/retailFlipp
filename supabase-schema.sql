-- Supabase schema for Retail Flipp

-- Drop dependent objects first so the file can be rerun safely
DROP TABLE IF EXISTS coupon_stats;
DROP TABLE IF EXISTS coupon_categories;
DROP TABLE IF EXISTS coupons;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS stores;
DROP TYPE IF EXISTS discount_type;
DROP TYPE IF EXISTS coupon_status;

DROP POLICY IF EXISTS "Public can view logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can update logos" ON storage.objects;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'logos') THEN
    UPDATE storage.buckets
    SET
      name = 'logos',
      public = TRUE,
      file_size_limit = 5242880,
      allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp']
    WHERE id = 'logos';
  ELSE
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'logos',
      'logos',
      TRUE,
      5242880,
      ARRAY['image/png', 'image/jpeg', 'image/webp']
    );
  END IF;
END $$;

-- Create enum types for coupon discount and status
CREATE TYPE discount_type AS ENUM ('PERCENT', 'FIXED', 'FREE_SHIPPING', 'CASHBACK');
CREATE TYPE coupon_status AS ENUM ('ACTIVE', 'EXPIRED', 'DISABLED');

-- Stores table
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  slug VARCHAR UNIQUE NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  country_code CHAR(2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table with parent category support
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  slug VARCHAR UNIQUE NOT NULL,
  parent_id UUID NULL REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coupons table
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  title VARCHAR NOT NULL,
  description TEXT,
  coupon_code VARCHAR,
  discount_type discount_type,
  discount_value DECIMAL,
  url TEXT,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  is_exclusive BOOLEAN DEFAULT FALSE,
  status coupon_status DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction table for coupon categories
CREATE TABLE coupon_categories (
  coupon_id UUID REFERENCES coupons(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (coupon_id, category_id)
);

-- Coupon stats table
CREATE TABLE coupon_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID REFERENCES coupons(id) ON DELETE CASCADE,
  views INTEGER DEFAULT 0,
  uses INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE POLICY "Public can view logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'logos');

CREATE POLICY "Public can upload logos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'logos');

CREATE POLICY "Public can update logos"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'logos')
WITH CHECK (bucket_id = 'logos');
