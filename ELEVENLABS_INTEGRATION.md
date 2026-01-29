# Eleven Labs Integration

This document describes the Eleven Labs integration added to Engui Studio for Text-to-Speech (TTS) and Music generation capabilities.

## Features

### Text-to-Speech (TTS)
- High-quality natural voice synthesis
- Multiple voice options
- Customizable voice parameters (stability, similarity, style)
- Support for multiple languages (Multilingual V2 model)
- Streaming support for real-time generation

### Music Generation
- AI-powered music creation from text prompts
- Customizable music parameters (genre, tempo, instrumentation, structure)
- Duration control (30 seconds to 5 minutes)
- Support for multiple music models

## Configuration

### API Key Setup
1. Get your API key from [Eleven Labs Console](https://elevenlabs.io/dashboard)
2. Navigate to Settings → Eleven Labs Configuration
3. Enter your API key in the provided field
4. Click "Test Connection" to verify

### Voice Selection
- **Voice ID**: The specific voice to use for TTS
- Default: `EXAVITQu4vr4xnSDxMaL`
- Find available voices in the Eleven Labs dashboard

### Model Options
**TTS Models:**
- `eleven_multilingual_v2` - Multilingual support (default)
- `eleven_english_v2` - English optimized
- `eleven_turbo_v2` - Fast generation
- `eleven_monolingual_v1` - Legacy monolingual model

**Music Models:**
- `music_generator_v2` - Latest music generation (default)
- `music_generator` - Legacy music model

### Voice Parameters
- **Stability** (0-1): Controls voice stability and consistency
- **Similarity** (0-1): How similar to the original voice
- **Style** (0-1): Amount of style variation
- **Use Streaming**: Enable for real-time generation

## Usage

### TTS Generation
1. Select "Eleven Labs TTS" from the model dropdown
2. Enter your text in the prompt field
3. Configure voice parameters as needed
4. Click "Generate" to create audio

### Music Generation
1. Select "Eleven Labs Music" from the model dropdown
2. Enter your music description/prompt
3. Configure music parameters (genre, tempo, etc.)
4. Set duration (30-300 seconds)
5. Click "Generate" to create music

## API Integration

The integration uses Eleven Labs REST API with the following endpoints:

- TTS: `POST /api/elevenlabs/generate`
- Music: `POST /api/elevenlabs/generate`
- Voice listing: `GET /api/elevenlabs/voices`
- Model listing: `GET /api/elevenlabs/models`

## Error Handling

Common error codes and solutions:

### 401 Unauthorized
- **Cause**: Invalid API key
- **Solution**: Check API key in settings

### 400 Bad Request
- **Cause**: Invalid parameters or missing required fields
- **Solution**: Check all required parameters are provided

### 429 Too Many Requests
- **Cause**: API rate limit exceeded
- **Solution**: Wait and retry or upgrade plan

### 500 Internal Server Error
- **Cause**: Server-side error
- **Solution**: Contact support or try again later

## File Storage

Generated audio files are stored:
1. Locally in `/public/results/audio/`
2. Optionally uploaded to S3 if configured
3. Database entries track all generated content

## Performance Considerations

- TTS typically takes 1-5 seconds for short texts
- Music generation takes 10-60 seconds depending on duration
- Streaming mode reduces latency but may have quality trade-offs
- Larger files may require longer processing times

## Troubleshooting

### Connection Issues
1. Verify API key is correct
2. Check internet connection
3. Ensure Eleven Labs service is operational

### Quality Issues
1. Adjust stability and similarity parameters
2. Try different voices
3. Update to latest model if available

### Generation Failures
1. Check text length limits
2. Verify parameter ranges
3. Ensure sufficient API quota

## Future Enhancements

- Voice cloning capabilities
- Advanced music customization
- Batch processing
- Real-time streaming UI
- Voice modulation controls

## Support

For issues related to Eleven Labs integration:
1. Check [Eleven Labs Documentation](https://elevenlabs.io/docs)
2. Verify API key status in dashboard
3. Contact support@elevenlabs.io for API issues