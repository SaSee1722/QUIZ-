# PHYJAX

A real-time, interactive physical science learning platform built with Next.js, Socket.io, and Supabase.

## Features

- **Real-time Interaction**: Live synchronization using Socket.io for collaborative learning.
- **Dynamic Physics Simulations**: Interactive modules for visualising complex physics concepts.
- **Premium UI**: Modern, responsive design with smooth animations using Framer Motion.
- **Supabase Integration**: Robust backend and authentication.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **Styling**: Tailwind CSS & Framer Motion
- **Real-time**: Socket.io
- **Database/Auth**: [Supabase](https://supabase.com/)
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js (Latest LTS)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/mithranduraii/PHYJAX.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables:
   Create a `.env.local` file with:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## License

MIT
