# 🚀 EnguiStudio (은긔 스튜디오)

<div align="center">
  <img src="assets/banner.png" alt="EnguiStudio Banner" width="800" height="280">
  
  **A unified platform for easily using various open-source AI models with RunPod Serverless**
  
  *Pronunciation: Eun-gui Studio (/ɯnɡɯi ˈstjuːdioʊ/)*
</div>

## 🎯 Project Overview

EnguiStudio is a platform that enables easy access to various open-source AI models through a web interface using RunPod Serverless infrastructure. Experience cutting-edge AI technology without complex setup.

## ✨ Key Features & Quick Deploy

- **🎬 Video Generation**: WAN 2.2 video generation model with LoRA support
  > [![Runpod](https://api.runpod.io/badge/wlsdml1114/generate_video)](https://console.runpod.io/hub/wlsdml1114/generate_video)
- **✨ FLUX KONTEXT**: Image transformation and styling model
  > [![Runpod](https://api.runpod.io/badge/wlsdml1114/Flux-tontext_Runpod_hub)](https://console.runpod.io/hub/wlsdml1114/Flux-tontext_Runpod_hub)
- **🎨 FLUX KREA**: Advanced image generation model with LoRA support
  > [![Runpod](https://api.runpod.io/badge/wlsdml1114/Flux-krea_Runpod_hub)](https://console.runpod.io/hub/wlsdml1114/Flux-krea_Runpod_hub)
- **🎤 MultiTalk**(not recommended): Audio 2 Video model
  > [![Runpod](https://api.runpod.io/badge/wlsdml1114/Multitalk_Runpod_hub)](https://console.runpod.io/hub/wlsdml1114/Multitalk_Runpod_hub)
- **🎭 Infinite Talk**(recommend): Talking video generation model combining images and audio
  > [![Runpod](https://api.runpod.io/badge/wlsdml1114/InfiniteTalk_Runpod_hub)](https://console.runpod.io/hub/wlsdml1114/InfiniteTalk_Runpod_hub)
- **📈 Video Upscale**: AI-powered video upscaling
  > [![Runpod](https://api.runpod.io/badge/wlsdml1114/upscale_interpolation_runpod_hub)](https://console.runpod.io/hub/wlsdml1114/upscale_interpolation_runpod_hub)
- **⚙️ Unified Settings**: Manage RunPod endpoints in one place
- **📚 Library**: Manage generated results
- **☁️ S3 Storage**: File management and storage


## 🚀 Quick Start

### 📺 Youtube Tutorial
[![Video Label](http://img.youtube.com/vi/-0LYseEEx4M/0.jpg)](https://youtu.be/-0LYseEEx4M)

### ⚡ Super Easy Installation (Recommended)

The easiest way to get started with EnguiStudio:

#### Windows Users
1. **Download Node.js**: Get it from [nodejs.org](https://nodejs.org/) (LTS version)
2. **Clone the project**: 
   ```bash
   git clone https://github.com/wlsdml1114/Engui_Studio.git
   cd Engui_Studio
   ```
3. **Run the setup script**: Double-click `start-windows.bat`
   - The script will automatically handle everything!
   - If Korean text appears garbled, use `start-windows-safe.bat` instead

#### macOS/Linux Users
1. **Install Node.js**: 
   ```bash
   # macOS
   brew install node
   
   # Linux (Ubuntu/Debian)
   sudo apt install nodejs npm
   ```
2. **Clone and run**:
   ```bash
   git clone https://github.com/wlsdml1114/Engui_Studio.git
   cd Engui_Studio
   ./start-macos.sh
   ```

**That's it!** The script will automatically:
- ✅ Check Node.js installation
- ✅ Install all dependencies
- ✅ Set up the database
- ✅ Build the production version
- ✅ Start the production server
- ✅ Open your browser to `http://localhost:3000`

---

### 📋 Manual Installation (Advanced Users)

If you prefer manual setup or need to customize the installation:

#### Prerequisites

Before starting, make sure you have the following installed:

##### 1. Install Node.js
- **Windows**: Download from [nodejs.org](https://nodejs.org/) (LTS version recommended)
- **macOS**: Use Homebrew: `brew install node`
- **Linux**: Use package manager: `sudo apt install nodejs npm` (Ubuntu/Debian)

Verify installation:
```bash
node --version  # Should be 18.x or higher
npm --version   # Should be 8.x or higher
```

##### 2. Install Package Manager (Optional)
We recommend using `pnpm` for faster and more efficient package management:
```bash
npm install -g pnpm
```

#### Installation Steps

##### 1. Clone the Project
```bash
git clone https://github.com/wlsdml1114/Engui_Studio.git
cd Engui_Studio
```

##### 2. Install Dependencies
```bash
# Using npm
npm install

# Using yarn
yarn install

# Using pnpm (recommended)
pnpm install
```

##### 3. Initialize Database
```bash
npx prisma generate
npx prisma db push
```

##### 4. Build and Start Production Server
```bash
# Build the production version
npm run build

# Start the production server
npm start

# Or using pnpm
pnpm build
pnpm start
```

##### 5. Access in Browser
Open your browser and navigate to:
```
http://localhost:3000
```

### Initial Setup

#### 1. Access Settings Page
Navigate to `/settings` in your browser

#### 2. Configure RunPod
- Enter your RunPod API key
- Configure endpoint IDs for each model:
  - **Video Generation** (WAN 2.2)
  - **FLUX KONTEXT** (Image transformation)
  - **FLUX KREA** (Image generation)
  - **MultiTalk** (Audio 2 Video)
  - **Infinite Talk** (Talking video)
  - **Video Upscale** (Video enhancement)

#### 3. Configure S3 Storage (Optional)
- Set up S3-compatible storage for file management
- Configure endpoint URL, access keys, and bucket name

#### 4. Save and Test
- Save all settings
- Test connections using the test buttons
- Verify all services are working correctly

## 🔧 RunPod Serverless Configuration

### Required Endpoints
- **Video Generation**: WAN 2.2, AnimateDiff, etc.
- **FLUX KONTEXT**: Image transformation model
- **FLUX KREA**: Advanced image generation model
- **MultiTalk**: Audio 2 Video model
- **Infinite Talk**: Talking video generation model combining images and audio
- **Video Upscale**: AI-powered video enhancement
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

## 🎯 Available Features

### 🎬 Video Generation (WAN 2.2)
- Generate high-quality videos from text prompts
- Support for LoRA models for style customization
- Configurable parameters: width, height, seed, CFG, length, steps
- Real-time generation progress tracking

### ✨ FLUX KONTEXT
- Transform and style existing images
- Advanced image manipulation capabilities
- Support for various artistic styles

### 🎨 FLUX KREA
- Generate images from text prompts
- Support for LoRA models
- High-quality image generation with customizable parameters

### 🎤 MultiTalk
- Convert audio to video
- Create talking head videos from audio input
- Support for various audio formats

### 🎭 Infinite Talk
- Combine images and audio to create talking videos
- Generate realistic talking head animations
- Support for custom character creation

### 📈 Video Upscale
- Enhance video quality using AI
- Upscale videos to higher resolutions
- Improve video clarity and detail

### 🎛️ Presets Management
- Save and reuse generation settings
- Create custom presets for different use cases
- Share presets with other users

### 💳 Credit Activity
- Track usage and credits
- Monitor API usage and costs
- Detailed activity logs

### ☁️ S3 Storage
- File management and storage
- Upload and download files
- Organize files in folders
- Support for various file types

## 📋 Requirements

- **Node.js**: 18.x or higher
- **npm**: 8.x or higher
- **RunPod Account**: Required for AI model usage
- **S3-compatible Storage**: Required for file storage (optional)

## 🔒 Security Notes

- Enter API keys and secrets only through web interface and store safely
- Run locally only to protect personal information
- Recommend environment variable configuration for production

## 🚀 Development Environment

This application is designed to run in development mode for optimal performance and ease of use:

```bash
npm run dev
```

**Note**: This application uses development mode for the best user experience with static file serving and real-time updates.

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