# ToxiQ AI - Setup Guide

## Step-by-Step Setup Instructions

### 1. Install Dependencies
Open a terminal in this folder and run:
```bash
npm install
```

### 2. Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and create a free account
2. Click **New Project**, give it a name (e.g., "ToxiQ AI")
3. Set a secure database password and select a region close to you
4. Wait for the project to be created

### 3. Get Supabase Keys
1. In your Supabase project, go to **Settings** → **API**
2. Copy the **Project URL** and paste it as `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`
3. Copy the **anon/public** key and paste it as `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`

### 4. Run the Database Schema
1. In Supabase, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase-schema.sql` and paste it
4. Click **Run** to create all tables, indexes, and policies

### 5. Enable Email Authentication
1. In Supabase, go to **Authentication** → **Providers**
2. Make sure **Email** is enabled
3. Go to **Authentication** → **URL Configuration**
4. Set **Site URL** to `http://localhost:3000`
5. Add `http://localhost:3000/auth/callback` to **Redirect URLs**

### 6. Configure Email Templates (Optional)
1. Go to **Authentication** → **Email Templates**
2. Customize the **Confirm signup** template if you want

### 7. Get AI API Keys
- **OpenAI**: Go to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys) and create an API key
- **Google Gemini**: Go to [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey) and create an API key

Add them to `.env.local`:
```
OPENAI_API_KEY=sk-your-key-here
GOOGLE_GEMINI_API_KEY=your-gemini-key-here
```

### 8. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### 9. Create Your Admin Account
1. Go to `http://localhost:3000/register` and create an account
2. Verify your email (check inbox for the verification link)
3. Go to Supabase → **Table Editor** → **profiles**
4. Find your user and set `is_admin` to `true`
5. Refresh the page — you'll now see the **Admin** tab in the navbar

### 10. Grant AI Access to Users
1. Go to the **Admin** panel → **Users** tab
2. Click on a user
3. Click the green buttons to grant access to AI models
4. Set prompt limits as needed

---

## Features
- **Beautiful Apple-style UI** with dark blue/black theme and 60+ animations
- **Multiple AI Models**: ChatGPT-4o, GPT-4o Mini, Gemini Pro, Gemini Flash, DALL-E 3
- **Full Auth System**: Register with email verification, login, password change
- **Real-time Chat**: Messages stream and save to Supabase in real-time
- **Voice Messages**: Record voice → transcribe with Whisper → type in chat
- **Image Upload**: Send images to vision-capable AI models
- **Image Generation**: Generate images with DALL-E 3
- **Code Blocks**: Syntax-highlighted code with language detection, copy button, and auto-naming
- **Admin Panel**: Dashboard, user management, AI agent config, statistics, settings
- **Access Control**: Per-user AI access with prompt limits
- **Everything Saved**: All chats, messages, conversations saved to Supabase

## Project Structure
```
cld-ai/
├── .env.local              # API keys (Supabase, OpenAI, Gemini)
├── package.json            # Dependencies
├── supabase-schema.sql     # Database schema (run in Supabase SQL Editor)
├── public/agents/          # AI agent icons
├── src/
│   ├── app/
│   │   ├── layout.js       # Root layout with auth, navbar, background
│   │   ├── page.js         # Homepage
│   │   ├── login/          # Login page
│   │   ├── register/       # Register page
│   │   ├── chat/           # AI Chat interface
│   │   ├── admin/          # Admin panel (users, agents, stats, settings)
│   │   ├── settings/       # User settings
│   │   ├── auth/callback/  # Auth callback handler
│   │   └── api/
│   │       ├── chat/       # AI chat API (OpenAI + Gemini)
│   │       ├── image/      # Image generation API
│   │       └── transcribe/ # Voice transcription API
│   ├── components/
│   │   ├── AnimatedBackground.js  # Canvas particle animation
│   │   ├── AuthProvider.js        # Auth context
│   │   ├── ChatMessage.js         # Message with markdown + code blocks
│   │   ├── CodeBlock.js           # Syntax highlighted code
│   │   ├── Navbar.js              # Navigation bar
│   │   └── VoiceRecorder.js       # Voice recording + transcription
│   ├── lib/
│   │   ├── supabase-browser.js    # Browser Supabase client
│   │   └── supabase-server.js     # Server Supabase client
│   └── middleware.js              # Auth middleware (route protection)
```
