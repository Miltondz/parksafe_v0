# ParkSafe App

A safety application for national park visitors and employees.

## Environment Setup

Before running the application, create a `.env` file in the root directory with the following variables:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

Replace the placeholder values with your actual:
1. Supabase project URL
2. Supabase anonymous key
3. Google Maps API key

## Development

```bash
npm install
npm run dev
```