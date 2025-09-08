# 🚀 EnguiStudio

<div align="center">
  <img src="assets/banner.png" alt="EnguiStudio Banner" width="800" height="280">
  
  **A unified platform for easily using various open-source AI models with RunPod Serverless**
  
  *Pronunciation: Eun-gui Studio (/ɯnɡɯi ˈstjuːdioʊ/)*
</div>

## 🎯 Project Overview

EnguiStudio is a platform that enables easy access to various open-source AI models through a web interface using RunPod Serverless infrastructure. Experience cutting-edge AI technology without complex setup.

## ✨ Key Features

- **🎬 Video Generation**: WAN 2.2 video generation model
- **✨ FLUX KONTEXT**: Image transformation and styling model
- **🎤 MultiTalk**: Audio 2 Video model
- **🎭 Infinite Talk**: Talking video generation model combining images and audio
- **⚙️ Unified Settings**: Manage RunPod endpoints in one place
- **📚 Library**: Manage generated results

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: SQLite (development)
- **AI Infrastructure**: RunPod Serverless API
- **Storage**: S3-compatible storage (optional)
- **Authentication**: NextAuth.js (ready)

## 🚀 Quick Start

### 1. Clone the Project
```bash
git clone https://github.com/wlsdml1114/Engui_Studio.git
cd Engui_Studio
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Initialize Database
```bash
npx prisma generate
npx prisma db push
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Access in Browser
```
http://localhost:3000
```

### 6. Initial Setup
1. **Access Settings Page**: Navigate to `/settings`
2. **Configure RunPod**: Enter API key and endpoint IDs for each model
3. **Configure S3**: Set up S3-compatible storage for file storage (optional)
4. **Save Settings**: Save all settings and test connections

## 🔧 RunPod Serverless Configuration

### Required Endpoints
- **Video Generation**: WAN 2.2, AnimateDiff, etc.
- **FLUX KONTEXT**: Image transformation model
- **MultiTalk**: Audio 2 Video model
- **Infinite Talk**: Talking video generation model combining images and audio
- **Other Custom Models**: Add any open-source model you want

### Setup Method
1. Create Serverless endpoints for desired models on [RunPod](https://runpod.io/)
2. Enter each endpoint ID in the settings page
3. Verify normal operation with connection tests

## 🛠️ Troubleshooting

### Settings Not Loading
1. **Initialize Database**: Click "🗑️ Database Reset" button on settings page
2. **Restart Server**: Run `npm run dev` again
3. **Re-enter Settings**: Enter RunPod and S3 settings again

### RunPod Connection Failure
1. **Verify API Key**: Check if API key is correct in RunPod dashboard
2. **Verify Endpoint IDs**: Ensure endpoint IDs for each service are accurate
3. **Test Connection**: Check connection status with "Test" button on settings page

### Encryption Error
1. **Initialize Database**: Clean up existing encrypted data
2. **Restart Server**: Restart server after changing environment variables
3. **Re-enter Settings**: Enter all settings again

## 📋 Requirements

- **Node.js**: 18.x or higher
- **npm**: 8.x or higher
- **RunPod Account**: Required for AI model usage
- **S3-compatible Storage**: Required for file storage (optional)

## 🔒 Security Notes

- Enter API keys and secrets only through web interface and store safely
- Run locally only to protect personal information
- Recommend environment variable configuration for production

## 🚀 Production Deployment

To run in production mode locally:
```bash
npm run build
npm start
```

## 🤝 Contributing

1. **Fork** this project
2. **Create Feature Branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit** changes (`git commit -m 'Add some AmazingFeature'`)
4. **Push** branch (`git push origin feature/AmazingFeature`)
5. **Create Pull Request**

## 📞 Support

If issues occur:
1. Use "🗑️ Database Reset" button on settings page
2. Restart development server
3. Re-enter settings and test connections

## 📄 License

This project is distributed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [RunPod](https://runpod.io/) - AI infrastructure service
- [Prisma](https://www.prisma.io/) - Database ORM
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- **Open Source AI Model Community** - Providing various AI models

## 🌐 Language Support

- [English](README.md) (Current)
- [한국어](README.kr.md)

## 🔗 Use Our Banner

Want to link to EnguiStudio from your project? Use our banner:

```markdown
[![EnguiStudio](https://raw.githubusercontent.com/wlsdml1114/Engui_Studio/main/assets/banner.png)](https://github.com/wlsdml1114/Engui_Studio)
```

### Different Sizes:
- **Small**: `width="400" height="140"`
- **Medium**: `width="600" height="210"`
- **Large**: `width="800" height="280"` (original)