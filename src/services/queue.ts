import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { QueueService, QueueJob, JobPayload } from '../types';

export class BullMQService implements QueueService {
  private redis: Redis;
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
    });
  }

  private getQueue(name: string): Queue {
    if (!this.queues.has(name)) {
      const queue = new Queue(name, {
        connection: this.redis,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      });
      this.queues.set(name, queue);
    }
    return this.queues.get(name)!;
  }

  async addJob(name: string, data: JobPayload, options?: any): Promise<QueueJob> {
    const queue = this.getQueue(name);
    const job = await queue.add('process', data, options);
    
    return {
      id: job.id!,
      name: job.name,
      data: job.data as JobPayload,
      opts: job.opts,
      progress: typeof job.progress === 'number' ? job.progress : 0,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      timestamp: job.timestamp,
    };
  }

  async getJob(jobId: string): Promise<QueueJob | null> {
    // Search through all queues for the job
    for (const [, queue] of this.queues) {
      const job = await queue.getJob(jobId);
      if (job) {
        return {
          id: job.id!,
          name: job.name,
          data: job.data as JobPayload,
          opts: job.opts,
          progress: typeof job.progress === 'number' ? job.progress : 0,
          returnvalue: job.returnvalue,
          failedReason: job.failedReason,
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
          timestamp: job.timestamp,
        };
      }
    }
    return null;
  }

  async getJobStatus(jobId: string): Promise<'queued' | 'active' | 'completed' | 'failed'> {
    const job = await this.getJob(jobId);
    if (!job) return 'failed';

    if (job.failedReason) return 'failed';
    if (job.finishedOn) return 'completed';
    if (job.processedOn) return 'active';
    return 'queued';
  }

  processJob(name: string, processor: (job: QueueJob) => Promise<any>): void {
    this.getQueue(name); // Ensure queue exists
    
    const worker = new Worker(
      name,
      async (job: Job) => {
        const queueJob: QueueJob = {
          id: job.id!,
          name: job.name,
          data: job.data as JobPayload,
          opts: job.opts,
          progress: typeof job.progress === 'number' ? job.progress : 0,
          returnvalue: job.returnvalue,
          failedReason: job.failedReason,
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
          timestamp: job.timestamp,
        };
        
        return await processor(queueJob);
      },
      {
        connection: this.redis,
        concurrency: 5,
      }
    );

    this.workers.set(name, worker);

    worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed:`, err);
    });

    worker.on('error', (err) => {
      console.error(`Worker error:`, err);
    });
  }

  async close(): Promise<void> {
    // Close all workers
    for (const worker of this.workers.values()) {
      await worker.close();
    }
    
    // Close all queues
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    
    // Close Redis connection
    await this.redis.quit();
  }
}

// Singleton instance
let queueService: BullMQService | null = null;

export function getQueueService(): BullMQService {
  if (!queueService) {
    const redisUrl = process.env['REDIS_URL'] || 'redis://localhost:6379';
    queueService = new BullMQService(redisUrl);
  }
  return queueService;
}
