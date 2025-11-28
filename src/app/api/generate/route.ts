import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const modelId = formData.get('modelId');
    const prompt = formData.get('prompt');

    // Read headers for API keys
    const openAIKey = request.headers.get('X-OpenAI-Key');
    const googleKey = request.headers.get('X-Google-Key');
    const klingKey = request.headers.get('X-Kling-Key');

    console.log('Generic API Request:', {
      modelId,
      prompt: prompt?.toString().substring(0, 50) + '...',
      hasOpenAIKey: !!openAIKey,
      hasGoogleKey: !!googleKey,
      hasKlingKey: !!klingKey
    });

    // Mock delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    return NextResponse.json({
      success: true,
      jobId: `job-${Date.now()}`,
      message: 'Generation started (Mock)'
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
