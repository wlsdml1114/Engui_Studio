import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const modelId = formData.get('modelId');
        const prompt = formData.get('prompt');

        // Read headers for RunPod config
        const runPodKey = request.headers.get('X-RunPod-Key');
        const endpointId = request.headers.get('X-RunPod-Endpoint-Id');

        console.log('RunPod API Request:', {
            modelId,
            endpointId,
            prompt: prompt?.toString().substring(0, 50) + '...',
            hasRunPodKey: !!runPodKey
        });

        if (!runPodKey || !endpointId) {
            return NextResponse.json({ success: false, error: 'Missing RunPod credentials or endpoint ID' }, { status: 400 });
        }

        // Construct payload dynamically from FormData
        const input: Record<string, any> = {};
        formData.forEach((value, key) => {
            if (key !== 'modelId' && key !== 'userId') {
                // Convert numeric strings to numbers if possible, except for specific keys like 'seed' if needed as string
                // For now, we'll keep it simple and cast common numeric fields
                if (!isNaN(Number(value)) && value !== '' && key !== 'prompt' && key !== 'negativePrompt') {
                    input[key] = Number(value);
                } else if (value === 'true') {
                    input[key] = true;
                } else if (value === 'false') {
                    input[key] = false;
                } else {
                    input[key] = value;
                }
            }
        });

        console.log('Sending payload to RunPod:', JSON.stringify({ input }, null, 2));

        const response = await fetch(`https://api.runpod.ai/v2/${endpointId}/run`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${runPodKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ input })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('RunPod API Error Response:', data);
            return NextResponse.json({ success: false, error: data.error || 'RunPod API request failed' }, { status: response.status });
        }

        console.log('RunPod Response:', data);

        return NextResponse.json({
            success: true,
            jobId: data.id,
            status: data.status,
            message: 'RunPod Generation started'
        });
    } catch (error) {
        console.error('RunPod API Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
