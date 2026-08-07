export type Solution = {
  id: string;
  problemId: string;
  title: string;
  contentMarkdown: string;
  createdAt: string;
  updatedAt: string;
};

export type Problem = {
  id: string;
  title: string;
  problemMarkdown: string;
  difficulty: number;
  tags: string[];
  solved: boolean;
  createdAt: string;
  updatedAt: string;
  solutions: Solution[];
};

export type ProblemInput = Pick<Problem, "title" | "problemMarkdown" | "difficulty" | "tags">;
