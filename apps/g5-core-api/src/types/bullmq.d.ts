import 'bullmq';

declare module 'bullmq' {
  interface Job<DataType = unknown> {
    id?: string | number | null;
    data: DataType;
  }
  interface Queue {
    getJobs(
      types: readonly ('waiting' | 'active' | 'completed' | 'failed' | 'delayed')[],
      start?: number,
      end?: number,
      asc?: boolean,
    ): Promise<Array<Job<unknown>>>;
  }
}
