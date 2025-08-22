import { Module, Global } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';

// When queues are skipped (SKIP_QUEUES=true) we still need to satisfy DI
// for providers that inject Bull queues. These lightweight stubs expose
// minimal shape (add, addBulk, process, on, etc.) as no-op functions.

function createQueueStub(name: string) {
  const noop = async (..._args: any[]) => undefined;
  const noopSync = (..._args: any[]) => undefined;
  return {
    name,
    add: noop,
    addBulk: noop,
    process: noopSync,
    on: noopSync,
    pause: noop,
    resume: noop,
    getJob: noop,
    getJobs: noop,
    getWaiting: noop,
    getActive: noop,
    getDelayed: noop,
    getFailed: noop,
    getCompleted: noop,
    clean: noop,
    obliterate: noop,
    remove: noop,
    retryJobs: noop,
    count: async () => 0,
    getRepeatableJobs: async () => [],
  } as any;
}

const queueNames = ['webhooks', 'webhooks-dlq'];

const providers = queueNames.map((q) => ({
  provide: getQueueToken(q),
  useValue: createQueueStub(q),
}));

@Global()
@Module({
  providers,
  exports: providers,
})
export class QueueStubsModule {}
