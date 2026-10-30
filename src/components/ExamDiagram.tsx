import { ExamFilm } from "./ExamFilm";

const STAGES = [
  {
    title: "Read the chart",
    body: "Your prompt is classified into a task type, a difficulty from 1 to 5, and what it needs: live web data, images, long inputs, speed.",
  },
  {
    title: "Fit the lens",
    body: "Every model in the case is scored for that task. Hard tasks weigh quality; easy ones weigh speed and price, so you never over-prescribe.",
  },
  {
    title: "Write the prescription",
    body: "You get the model, its effort setting on that vendor's own scale, a cheaper spare pair, and which subscription covers it.",
  },
];

/** The exam on film, then its three stages. */
export function ExamDiagram() {
  return (
    <div>
      <ExamFilm />

      <ol className="mt-8 grid gap-8 sm:grid-cols-3 sm:gap-10">
        {STAGES.map((s) => (
          <li key={s.title} className="border-t border-ink pt-4">
            <h3 className="display text-[1.3rem]">{s.title}</h3>
            <p className="mt-2 max-w-[38ch] text-ink-2">{s.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
