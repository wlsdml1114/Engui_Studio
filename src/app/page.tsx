import Image from 'next/image';

export default function HomePage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-4xl mx-auto text-center">
        {/* Main Title */}
        <div className="mb-16">
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold mb-6 text-balance bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent leading-none pb-4">
            EnguiStudio
          </h1>
          <p className="text-foreground/70 text-xl sm:text-2xl max-w-2xl mx-auto">
            Your creative co-pilot, powered by AI
          </p>
        </div>

        {/* Banner/Logo Area */}
        <div className="mb-16">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-3xl p-8 sm:p-12 border border-border/50 shadow-2xl">
            <div className="relative w-full max-w-2xl mx-auto mb-6">
              <Image
                src="/banner.png"
                alt="EnguiStudio Banner"
                width={800}
                height={400}
                className="w-full h-auto rounded-2xl shadow-lg"
                priority
              />
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold mb-4 text-foreground">
              AI-Powered Creative Studio
            </h2>
            <p className="text-foreground/60 text-lg max-w-xl mx-auto">
              Generate stunning images, create engaging videos, and bring your creative visions to life with cutting-edge AI technology.
            </p>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-secondary/50 rounded-xl p-6 border border-border/50">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <span className="text-2xl">🎨</span>
            </div>
            <h3 className="font-semibold text-lg mb-2">Image Generation</h3>
            <p className="text-foreground/60 text-sm">
              Create beautiful images from text descriptions using advanced AI models.
            </p>
          </div>
          
          <div className="bg-secondary/50 rounded-xl p-6 border border-border/50">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <span className="text-2xl">🎬</span>
            </div>
            <h3 className="font-semibold text-lg mb-2">Video Creation</h3>
            <p className="text-foreground/60 text-sm">
              Generate dynamic videos and upscale existing content with AI-powered tools.
            </p>
          </div>
          
          <div className="bg-secondary/50 rounded-xl p-6 border border-border/50">
            <div className="w-12 h-12 bg-pink-500/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <span className="text-2xl">🎭</span>
            </div>
            <h3 className="font-semibold text-lg mb-2">Multitalk</h3>
            <p className="text-foreground/60 text-sm">
              Create engaging conversations and interactions with AI-powered characters.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}