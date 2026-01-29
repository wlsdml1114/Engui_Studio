# 🚀 EnguiStudio (은긔 스튜디오)

<div align="center">
  <img src="assets/banner.png" alt="EnguiStudio Banner" width="800" height="280">
  
  **A unified platform for easily using various open-source AI models with RunPod Serverless**
  
  *Pronunciation: Eun-gui Studio (/ɯnɡɯi ˈstjuːdioʊ/)*
</div>

### Join our discord!

[![demo](https://img.shields.io/discord/1418269259858968696?logo=discord)](https://discord.gg/8Xhq9f77fK)

## 🎯 Project Overview

EnguiStudio is a platform that enables easy access to various open-source AI models through a web interface using RunPod Serverless infrastructure. Experience cutting-edge AI technology without complex setup.

<div align="center">
  <a href="https://runpod.io?ref=wvzldlmr">
    <img src="https://cdn.prod.website-files.com/67d20fb9f56ff2ec6a7a657d/685b399e12c88ef52cbf1032_logo-white.svg" alt="RunPod" height="72" />
  </a>
</div>

## ✨ Key Features & Quick Deploy

- **🎬 Video Generation**: WAN 2.2 video generation model with LoRA support
  > [![Runpod](https://api.runpod.io/badge/wlsdml1114/generate_video)](https://console.runpod.io/hub/wlsdml1114/generate_video)
- **✨ FLUX KONTEXT**: Image transformation and styling model
  > [![Runpod](https://api.runpod.io/badge/wlsdml1114/Flux-tontext_Runpod_hub)](https://console.runpod.io/hub/wlsdml1114/Flux-tontext_Runpod_hub)
- **🎨 FLUX KREA**: Advanced image generation model with LoRA support
  > [![Runpod](https://api.runpod.io/badge/wlsdml1114/Flux-krea_Runpod_hub)](https://console.runpod.io/hub/wlsdml1114/Flux-krea_Runpod_hub)
- **✏️ Qwen Image Edit**: AI-powered image editing model
  > [![Runpod](https://api.runpod.io/badge/wlsdml1114/qwen_image_edit)](https://console.runpod.io/hub/wlsdml1114/qwen_image_edit)
- **🎤 MultiTalk**(not recommended): Audio 2 Video model
  > [![Runpod](https://api.runpod.io/badge/wlsdml1114/Multitalk_Runpod_hub)](https://console.runpod.io/hub/wlsdml1114/Multitalk_Runpod_hub)
- **🎭 Infinite Talk**(recommend): Talking video generation model combining images and audio
  > [![Runpod](https://api.runpod.io/badge/wlsdml1114/InfiniteTalk_Runpod_hub)](https://console.runpod.io/hub/wlsdml1114/InfiniteTalk_Runpod_hub)
- **🎬 WAN Animate**: Advanced image-to-video animation with precise control points
  > [![Runpod](https://api.runpod.io/badge/wlsdml1114/Wan_Animate_Runpod_hub)](https://console.runpod.io/hub/wlsdml1114/Wan_Animate_Runpod_hub)
- **📈 Video Upscale**: AI-powered video upscaling
  > [![Runpod](https://api.runpod.io/badge/wlsdml1114/upscale_interpolation_runpod_hub)](https://console.runpod.io/hub/wlsdml1114/upscale_interpolation_runpod_hub)
- **🖼️ Z-Image**: Fast image generation model with optional ControlNet support
  > [![Runpod](https://api.runpod.io/badge/wlsdml1114/Flux-krea_Runpod_hub)](https://console.runpod.io/hub/wlsdml1114/Flux-krea_Runpod_hub)
- **🔄 OneToAll**: Video-to-video transformation with image reference
  > [![Runpod](https://api.runpod.io/badge/wlsdml1114/Wan_Animate_Runpod_hub)](https://console.runpod.io/hub/wlsdml1114/Wan_Animate_Runpod_hub)
- **⚙️ Unified Settings**: Manage RunPod endpoints in one place
- **📚 Library**: Manage generated results
- **☁️ S3 Storage**: File management and storage


## 🚀 Quick Start

### You may need to run the script multiple times on your first launch due to AWS S3 and ffmpeg download/installation steps!

### 📺 YouTube Showcase
[![Video Label](http://img.youtube.com/vi/E9EJ7RfmaWE/0.jpg)](https://youtu.be/E9EJ7RfmaWE)

### 📺 Installation Tutorial
[![Video Label](http://img.youtube.com/vi/uTdejvGj__g/0.jpg)](https://youtu.be/uTdejvGj__g)

For Mac version installation, see [this video](https://youtu.be/vABLy-CAhJ0).

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

#### macOS/Linux Users
1. **Install Node.js**: 
   ```bash
   # macOS
   # if you don't have brew, install brew first using command below. and then install node
   # /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   brew install node
   
   # Linux (Ubuntu/Debian)
   sudo apt install nodejs npm
   ```
2. **Clone and run**:
   ```bash
   git clone https://github.com/wlsdml1114/Engui_Studio.git
   cd Engui_Studio
   sh ./start-macos.sh
   ```

**That's it!** The script will automatically:
- ✅ Check Node.js installation
- ✅ Install all dependencies
- ✅ Set up the database
- ✅ Build the production version
- ✅ Start the production server
- ✅ Open your browser to `http://localhost:3000`


## Initial Setup

#### 1. Access Settings Page
Navigate to `/settings` in your browser

#### 2. Configure RunPod
- Enter your RunPod API key
  - You can get your RunPod API key from [here](https://console.runpod.io/user/settings)
- Configure endpoint IDs for each model:
  - You can get your RunPod endpoint IDs from [here](https://console.runpod.io/serverless)
    - **Video Generation** (WAN 2.2)
    - **FLUX KONTEXT** (Image transformation)
    - **FLUX KREA** (Image generation)
    - **Qwen Image Edit** (Image editing)
    - **MultiTalk** (Audio 2 Video)
    - **Infinite Talk** (Talking video)
    - **WAN Animate** (Image-to-video animation)
    - **Video Upscale** (Video enhancement)
    - **Z-Image** (Fast image generation with or without ControlNet)
    - **OneToAll** (Video-to-video transformation)
    - **Example**
    ![image](assets/endpoint.png)

#### 3. Configure S3 Storage (Recommended)
- Set up S3-compatible storage for file management
- Configure endpoint URL, access keys, and bucket name in your network volume.
- Also you need to create s3 API key to generate access key id and secret access key.
- **In network volume**
![image](assets/network_volume.png)
- **In s3 API key**
![image](assets/create_s3_api_key.png)
![image](assets/s3_api_key.png)

#### 4. Save and Test
- Save all settings
- Test connections using the test buttons
- Verify all services are working correctly

## 🔒 Security Notes

- Enter API keys and secrets only through web interface and store safely
- Run locally only to protect personal information
- Recommend environment variable configuration for production

## 📄 License

This project is distributed under the Engui Studio License. See the [LICENSE](LICENSE) file for details.

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
