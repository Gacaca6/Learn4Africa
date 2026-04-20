import React, { useEffect } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { L4A } from "./utils";
import { waitForFonts } from "./fonts";
import { SceneColdOpen } from "./scenes/ColdOpen";
import { SceneHero } from "./scenes/Hero";
import { SceneProblem } from "./scenes/Problem";
import { SceneMwalimu } from "./scenes/Mwalimu";
import { SceneSteps } from "./scenes/Steps";
import { SceneTracks } from "./scenes/Tracks";
import { SceneBuildPath } from "./scenes/BuildPath";
import { SceneAITutor } from "./scenes/AITutor";
import { ScenePortfolio } from "./scenes/Portfolio";
import { SceneClose } from "./scenes/Close";
import { ChapterHUD } from "./scenes/ChapterHUD";

export const Demo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  useEffect(() => {
    waitForFonts();
  }, []);

  return (
    <AbsoluteFill style={{ background: L4A.cream, overflow: "hidden" }}>
      <SceneColdOpen start={0} dur={10} time={time} />
      <SceneHero start={10} dur={18} time={time} />
      <SceneProblem start={28} dur={17} time={time} />
      <SceneMwalimu start={45} dur={20} time={time} />
      <SceneSteps start={65} dur={23} time={time} />
      <SceneTracks start={88} dur={24} time={time} />
      <SceneBuildPath start={112} dur={20} time={time} />
      <SceneAITutor start={132} dur={23} time={time} />
      <ScenePortfolio start={155} dur={17} time={time} />
      <SceneClose start={172} dur={8} time={time} />

      <ChapterHUD time={time} duration={180} />
    </AbsoluteFill>
  );
};

export type SceneProps = { start: number; dur: number; time: number };
