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

        // Handle RunPod volume paths - download from S3 with authentication
        if (url.startsWith('/runpod-volume/')) {
            const SettingsService = (await import('@/lib/settingsService')).default;
            const S3Service = (await import('@/lib/s3Service')).default;
            const settingsService = new SettingsService();
            const { settings } = await settingsService.getSettings('user-with-settings');
            
            if (!settings.s3?.endpointUrl || !settings.s3?.accessKeyId || !settings.s3?.secretAccessKey || !settings.s3?.bucketName) {
                throw new Error('S3 settings not configured');
            }
            
            const s3Service = new S3Service({
                endpointUrl: settings.s3.endpointUrl,
                accessKeyId: settings.s3.accessKeyId,
                secretAccessKey: settings.s3.secretAccessKey,
                bucketName: settings.s3.bucketName,
                region: settings.s3.region || 'us-east-1',
            });
            
            // Extract the file path after /runpod-volume/
            const s3Key = url.replace('/runpod-volume/', '');
            console.log(`📁 Downloading from S3: ${s3Key}`);
            
            try {
                const fileBuffer = await s3Service.downloadFile(s3Key);
                fs.writeFileSync(filePath, fileBuffer);
                console.log(`✅ Downloaded from S3 to: ${filePath}`);
                
                return NextResponse.json({
                    success: true,
                    path: relativePath,
                    fullPath: filePath
                });
            } catch (s3Error: any) {
                console.error('S3 download error:', s3Error);
                throw new Error(`Failed to download from S3: ${s3Error.message}`);
            }
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
