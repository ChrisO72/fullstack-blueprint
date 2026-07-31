export const exampleJobName = "example" as const;

export type ExampleJobData = {
  message: string;
};

export async function handleExampleJob(data: ExampleJobData) {
  console.log(`[Worker] Example job: ${data.message}`);
}
