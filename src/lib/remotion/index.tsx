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
          const durationInFrames = Math.ceil((props.project.duration / 1000) * FPS);
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
