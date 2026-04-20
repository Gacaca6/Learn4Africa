import { Composition } from "remotion";
import { Demo } from "./Demo";

export const FPS = 30;
export const DURATION = 180; // seconds
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Demo"
        component={Demo}
        durationInFrames={FPS * DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
