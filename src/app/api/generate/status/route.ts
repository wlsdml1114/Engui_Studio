import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const jobId = searchParams.get('jobId');
        const endpointId = request.headers.get('X-RunPod-Endpoint-Id');
        const runPodKey = request.headers.get('X-RunPod-Key');

        if (!jobId || !endpointId || !runPodKey) {
            return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
        }

        const response = await fetch(`https://api.runpod.ai/v2/${endpointId}/status/${jobId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${runPodKey}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json({ success: false, error: data.error || 'Failed to check status' }, { status: response.status });
        }

        return NextResponse.json({
            success: true,
            status: data.status,
            output: data.output,
            error: data.error
        });

    } catch (error) {
        console.error('Status Check Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
