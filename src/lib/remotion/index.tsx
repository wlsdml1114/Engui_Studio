import { Composition, registerRoot } from 'remotion';
import { MainComposition, getAspectRatioDimensions, FPS } from '@/components/video-editor/VideoComposition';

// Remotion Root component for rendering
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MainComposition"
        component={MainComposition}
        durationInFrames={30 * FPS} // Default 30 seconds, will be overridden by inputProps
        fps={FPS}
        width={1024}
        height={576}
        defaultProps={{
          project: {
            id: 'default',
            title: 'Untitled',
            description: '',
            aspectRatio: '16:9' as const,
            duration: 30000,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          tracks: [],
          keyframes: {},
        }}
        calculateMetadata={async ({ props }) => {
          // Use project's width and height if available, otherwise fall back to aspect ratio calculation
          const { width, height } = props.project.width && props.project.height
            ? { width: props.project.width, height: props.project.height }
            : getAspectRatioDimensions(props.project.aspectRatio);
          
          // Calculate actual duration from keyframes (find the latest end time)
          let maxEndTimeMs = 0;
          
          for (const trackKeyframes of Object.values(props.keyframes || {})) {
            for (const kf of trackKeyframes as any[]) {
              // For audio, use originalDuration if available (actual audio length)
              const keyframeDuration = kf.data?.originalDuration || kf.duration || 0;
              const endTime = (kf.timestamp || 0) + keyframeDuration;
              if (endTime > maxEndTimeMs) {
                maxEndTimeMs = endTime;
              }
            }
          }
          
          // If keyframes exist, use keyframe-based duration; otherwise fall back to project.duration
          // This ensures the video ends when the last keyframe ends, not at an arbitrary project duration
          const effectiveDurationMs = maxEndTimeMs > 0 ? maxEndTimeMs : (props.project.duration || 30000);
          const durationInFrames = Math.ceil((effectiveDurationMs / 1000) * FPS);
          
          console.log(`📐 Remotion calculateMetadata: maxEndTime=${maxEndTimeMs}ms, projectDuration=${props.project.duration}ms, effective=${effectiveDurationMs}ms, frames=${durationInFrames}`);
          
          return {
            width,
            height,
            durationInFrames: Math.max(durationInFrames, 1),
          };
        }}
      />
    </>
  );
};

registerRoot(RemotionRoot);
