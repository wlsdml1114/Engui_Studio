import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';

const streamPipeline = promisify(pipeline);

export async function POST(request: Request) {
    try {
        const { url, filename, folder } = await request.json();

        if (!url) {
            return NextResponse.json({ success: false, error: 'Missing URL' }, { status: 400 });
        }

        // Determine filename
        let finalFilename = filename;
        if (!finalFilename) {
            const urlObj = new URL(url);
            finalFilename = path.basename(urlObj.pathname);
            if (!finalFilename || finalFilename.length === 0) {
                finalFilename = `download-${Date.now()}.bin`;
            }
        }

        // Ensure extension
        if (!path.extname(finalFilename)) {
            // Try to guess from content-type if possible, but for now just default or leave as is
            // If the original URL had an extension, it's likely preserved.
            // If it's a base64 data URI, we should handle that differently, but this route is mainly for remote URLs.
            if (url.startsWith('data:image/png')) finalFilename += '.png';
            else if (url.startsWith('data:image/jpeg')) finalFilename += '.jpg';
            else if (url.startsWith('data:video/mp4')) finalFilename += '.mp4';
        }

        // Target directory
        const targetFolder = folder || 'generations';
        const publicDir = path.join(process.cwd(), 'public');
        const saveDir = path.join(publicDir, targetFolder);

        if (!fs.existsSync(saveDir)) {
            fs.mkdirSync(saveDir, { recursive: true });
        }

        const filePath = path.join(saveDir, finalFilename);
        const relativePath = `/${targetFolder}/${finalFilename}`;

        // Handle Data URIs
        if (url.startsWith('data:')) {
            const base64Data = url.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            fs.writeFileSync(filePath, buffer);
            return NextResponse.json({
                success: true,
                path: relativePath,
                fullPath: filePath
            });
        }

        // Handle Remote URLs
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.statusText}`);
        }

        if (!response.body) {
            throw new Error('No response body');
        }

        // @ts-ignore - node-fetch types vs web streams
        await streamPipeline(response.body, fs.createWriteStream(filePath));

        return NextResponse.json({
            success: true,
            path: relativePath,
            fullPath: filePath
        });

    } catch (error) {
        console.error('Download Error:', error);
        return NextResponse.json({ success: false, error: 'Download failed' }, { status: 500 });
    }
}
