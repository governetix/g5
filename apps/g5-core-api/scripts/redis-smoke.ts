import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { randomUUID } from 'crypto';

(async () => {
  const host = process.env.REDIS_HOST || 'localhost';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);
  const connection = { host, port } as const;
  console.log('[redis:smoke] connecting', { host, port });
  const legacy = new IORedis({ host, port, lazyConnect: false });
  legacy.on('error', (e) => console.error('[redis:smoke] client error', e));
  const ping = await legacy.ping();
  console.log('[redis:smoke] PING =', ping);

  const key = `smoke:${randomUUID()}`;
  await legacy.set(key, 'ok', 'EX', 30);
  const val = await legacy.get(key);
  console.log('[redis:smoke] set/get =>', val);

  // BullMQ queue test
  const queueName = 'smokeQueue';
  const queue = new Queue(queueName, { connection });
  const queueEvents = new QueueEvents(queueName, { connection });
  await queueEvents.waitUntilReady();
  const results: string[] = [];
  const worker = new Worker(queueName, async (job: Job) => {
    results.push(job.data.message);
    return { received: job.data.message };
  }, { connection });
  worker.on('failed', (job, err) => console.error('[redis:smoke] job failed', job?.id, err));

  const job = await queue.add('test', { message: 'hello-bullmq' });
  console.log('[redis:smoke] job added', job.id);

  // Wait for completion
  const completed = await job.waitUntilFinished(queueEvents, 5000).catch((e) => {
    console.error('[redis:smoke] wait error', e);
    return null;
  });
  console.log('[redis:smoke] job result', completed);

  await worker.close();
  await queue.close();
  await queueEvents.close();
  await legacy.quit();
  console.log('[redis:smoke] DONE');
})();
