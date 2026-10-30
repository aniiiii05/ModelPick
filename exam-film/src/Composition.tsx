import { Composition } from "remotion";
import { ExamLoop } from "./ExamLoop";

/** The exam, as a looping stop-motion film for the "How the exam works" section. */
export const MyComposition = () => {
  return <Composition id="ExamLoop" component={ExamLoop} durationInFrames={216} fps={24} width={1200} height={600} />;
};
