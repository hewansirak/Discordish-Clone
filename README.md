# Discordish - Discord Clone

A modern, real-time Discord clone built with Next.js, Convex, and Clerk authentication.

![Discordish Demo](demo.gif)


## ✨ Features

- **Real-time Messaging** - Direct messages with instant delivery
- **Friend System** - Send requests, manage friends, see online status
- **Modern UI** - Dark theme with smooth animations
- **File Sharing** - Upload and share images in conversations
- **Typing Indicators** - Real-time typing status
- **Responsive Design** - Works on desktop and mobile

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Convex (Real-time database)
- **Authentication**: Clerk
- **Icons**: Lucide React
- **UI Components**: Radix UI

## 🚀 Quick Start

1. **Clone & Install**

   ```bash
   git clone https://github.com/yourusername/discordish-clone.git
   cd discordish-clone
   npm install
   ```

2. **Environment Variables**

   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_key
   CLERK_SECRET_KEY=your_secret
   NEXT_PUBLIC_CONVEX_URL=your_convex_url
   ```

3. **Run Development**
   ```bash
   npx convex dev
   npm run dev
   ```

## 📱 Usage

- **Sign up/login** with Clerk
- **Add friends** using the "Add Friend" button
- **Start DMs** by clicking "Start DM" on accepted friends
- **Send messages** and share images in conversations


**Built with Next.js, Convex & Clerk on December 2024**

## References

Convex Tour Guide - https://docs.convex.dev/get-started
Functions - https://docs.convex.dev/functions
Database - https://docs.convex.dev/database
Convex & Clerk - https://docs.convex.dev/auth/clerk
Clerk Webhooks - https://clerk.com/docs/integrations/webhooks/sync-data
Vercel Deployment - https://docs.convex.dev/production/hosting/vercel