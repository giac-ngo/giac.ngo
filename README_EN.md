# Giác Ngộ — AI-Powered Spiritual Practice & Community Platform

[English](README_EN.md) | [Tiếng Việt](README.md)

**Giác Ngộ** is a comprehensive web platform merging authentic spiritual traditions with modern Artificial Intelligence. Each "Practice Space" is an independent community where practitioners access sacred sutras, Dharma discourses, guided meditations, contextual AI companions, and vibrant social interactions.

🌐 **Live:** [giac.ngo](https://giac.ngo)  
📦 **GitHub:** [github.com/giac-ngo/giac.ngo](https://github.com/giac-ngo/giac.ngo)

---

## 🚀 User Features

### 🧘 Dedicated Practice Spaces
- Autonomous multi-tenant practice communities (Giác Ngộ, Plum Village, Tathata, etc.)
- Tailored branding, custom logos, visual themes, and dedicated custom domains
- Seamless switching between **Chat**, **Library**, and **Community Social Feed**

### 🤖 Intelligent AI Companion
- **Context-Aware Retrieval-Augmented Generation (RAG):** AI retrieves and reasons over teachings, sutras, and Q&A collections of each specific Space.
- **Multi-Model Orchestration:** Google Gemini 2.5 Flash / Pro, OpenAI GPT-4o, and Grok.
- **Intelligent OCR (PDF & Image Processing):**
  - High-precision text extraction from uploaded images (PNG, JPG, WebP) and PDF documents (including scanned pages).
  - Deep optical recognition supporting Classical Chinese (Hán), Sino-Vietnamese (Nôm), Vietnamese, and English.
  - Interactive document analysis: practitioners can attach photos or scanned PDFs directly in the chat window for instant translation, explanation, and Q&A.
- **Multimodal Document Upload & Vector Indexing:** PDF, DOCX, and TXT files are automatically parsed, summarized, and vectorized into the Weaviate Vector Database for precise context retrieval.
- **Speech-to-Text (STT):** High-accuracy voice input supporting Vietnamese and English.
- **Natural Text-to-Speech (TTS):** Expressive voice output with multiple natural voices (Kore, Puck, Echo, Fenrir, Aoede).
- **Conversation Management:** Real-time stream responses, session history, renaming, and granular feedback (Like/Dislike).

### 🎙️ Real-Time Voice Chat
- Interactive spoken dialogues with AI companions with sub-second latency.
- Full session audio recording and instant download upon completion.
- Adaptive bilingual responses in Vietnamese and English.

### 📚 Dharma Library
- **Dharma Discourses:** High-fidelity audio and YouTube playback with saved listening progression.
- **Guided Meditation:** Integrated meditation timer, ambient background bells & music, and guided mindfulness sessions.
- **Canonical Sutras & Books:** Full-featured reader with automatic table of contents, pagination, and fast keyword search.
- **Categorization:** Categorized by Master/Author, Category, Topic, and custom Tags.

### 🌐 Community Social Feed
- **Post Sharing:** Share real-time insights, spiritual realizations, attached photos, and mood tags.
- **Reposts & Threads:** Repost community entries with reflections and engage in nested hierarchical comments.
- **AI Conversation Sharing:** Publish profound question-and-answer exchanges with AI directly to the feed.
- **Practitioner Profiles:** Dedicated user profile walls, follow/unfollow mechanisms, and follower/following statistics.
- **Persistent Routing:** Clean URL slugs for profiles (`?profile=123`) surviving page reloads.

### 💰 Merit System & Marketplace
- **Merit Tokens:** Merit ledger system granting access to premium AI computing and fine-tuned models.
- **AI Marketplace:** Discover and activate specialized Buddhist AI agents.
- **Donations & Offerings:** Integrated payment gateways via Stripe (Credit/Debit cards, Apple Pay, Google Pay).
- **Financial Ledger:** Transparent user donation records and merit balance tracking at `/finance`.

---

## 🛠 Administration & Space Management

### 📊 System & Space Analytics Dashboard
- Comprehensive metrics: total practitioners, active sessions, AI token consumption, and contributions.
- Real-time event monitoring and per-member quota utilization.
- Role-scoped dashboards for Global Administrators, Space Owners, and Secondary Space Admins.

### 👥 Multi-Admin Space & Role-Based Access Control (RBAC)
- **Multi-Admin Space Architecture:** Supports primary Space Owners alongside multiple designated secondary Space Admins (`space_admins`).
- **Strict Tenant Isolation:** Space admins possess full managerial authority within their space while being strictly isolated from other tenant spaces.
- **Granular Permissions:** Specific assignment for roles (`files`, `roles`, `cms_write`, `cms_approve`, `social-moderate`, `notifications`, `pricing`, `space-billing`).
- **Batch Space Admin Invitation:** Onboard multiple administrators simultaneously via email.

### 🧠 AI Model Management & Fine-Tuning
- Full LLM parameter tuning: model version, temperature, maximum tokens, and thinking budget.
- **Knowledge Base Ingestion:** Document chunking, library sutra synchronization, and vector indexing.
- **Curated Q&A Datasets:** Few-shot examples and Chain-of-Thought (CoT) training dataset authoring.
- **Live Test Chat & Promotion:** Real-time testing playground with 1-click addition into training sets.
- **Fine-Tuning Pipelines:** Export curated Q&A pairs for custom model fine-tuning.

### 📂 Content CMS & Automated OCR
- Rich text editor with instant bidirectional Vietnamese ↔ English translation.
- **Automated PDF & Image OCR:** Seamlessly extract sacred texts from scanned Buddhist scriptures and PDFs into editable articles.
- High-definition audio generation via Text-to-Speech engines.
- Domain and visual branding management: Space name, custom slug, color scheme, favicon, and custom domain mapping.

### 💳 Financial Operations & Stripe Connect
- **Stripe Connect Express Integration:** Space Owners connect verified bank accounts to receive direct donations.
- Multi-step withdrawal workflows: Pending → Approved / Rejected with automatic transfers.

---

## 💻 Technical Architecture

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **Backend** | Node.js, Express.js (ESM), TypeScript (`tsx`) |
| **Primary Database** | PostgreSQL (Relational data, Users, Roles, Spaces, Social Feed) |
| **Vector Engine** | Weaviate Vector Database (Semantic search & RAG embeddings) |
| **AI Models** | Google Gemini 2.5 Flash / Pro, OpenAI GPT-4o, Grok |
| **OCR & Vision** | Gemini Vision Engine, PDF Text Extractor |
| **Payments** | Stripe API, Stripe Connect Express |
| **Security & Auth** | JWT, Strict Multi-Tenant RBAC Policy Engine |

---

## 📡 API Endpoints Summary

### Authentication (`/api/auth`)
- `POST /login` — User authentication
- `POST /register` — Registration & space assignment
- `POST /forgot-password` / `POST /reset-password`
- `GET /me` — Current authenticated practitioner profile & permissions

### Space Management (`/api/spaces`)
- `GET /` / `GET /:slug` — Space catalog & details
- `POST /` / `PUT /:id` — Space creation and branding configuration
- `POST /:id/admins` — Batch space admin assignment
- `DELETE /:id/admins/:userId` — Revoke space admin privileges

### AI Conversations (`/api/conversations`)
- `POST /chat/stream` — Streaming LLM completions with RAG
- `GET /` — Conversation history
- `POST /:conversationId/messages/:messageId/feedback` — Like/Dislike ratings

### Library & OCR Processing (`/api/documents`)
- `GET /library/documents` — Search canonical scriptures
- `POST /documents/extract-text` — OCR & text extraction from uploaded PDF and image files
- `POST /documents` / `PUT /:id` / `DELETE /:id` — Content lifecycle management

---

## ⚡ Local Development Setup

### 1. Clone the Repository
```bash
git clone https://github.com/giac-ngo/giac.ngo.git
cd giac.ngo
```

### 2. Install Dependencies
```bash
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..
```

### 3. Environment Variables
Create `.env` inside `server/` with your configuration:
```env
PORT=3002
DATABASE_URL=postgres://user:password@localhost:5432/giacngo
JWT_SECRET=your_super_secret_jwt_key
GEMINI_API_KEY=your_gemini_api_key
STRIPE_SECRET_KEY=your_stripe_secret_key
WEAVIATE_HOST=localhost:8080
```

### 4. Run the Development Servers
```bash
npm run dev
```
- Client runs at: `http://localhost:5173`
- Backend API runs at: `http://localhost:3002`

---

## 📄 License
© 2024–2026 Giác Ngộ. All rights reserved.
