import { PythonWorkerRequest, PythonWorkerResponse, JobPayload } from '../types';

export class PythonWorkerClient {
  private workerUrl: string;
  private apiKey: string;

  constructor(workerUrl: string, apiKey: string) {
    this.workerUrl = workerUrl;
    this.apiKey = apiKey;
  }

  async processFile(jobPayload: JobPayload, callbackUrl: string): Promise<PythonWorkerResponse> {
    const request: PythonWorkerRequest = {
      jobId: jobPayload.jobId,
      s3Key: jobPayload.s3Key,
      mime: jobPayload.mime,
      originalName: jobPayload.originalName,
      userId: jobPayload.userId,
      callbackUrl,
      apiKey: this.apiKey,
    };

    try {
      const response = await fetch(`${this.workerUrl}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Python worker responded with status ${response.status}: ${response.statusText}`);
      }

      const result: PythonWorkerResponse = await response.json();
      return result;
    } catch (error) {
      console.error('Python worker request failed:', error);
      throw new Error(`Failed to communicate with Python worker: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getStatus(jobId: string): Promise<PythonWorkerResponse> {
    try {
      const response = await fetch(`${this.workerUrl}/status/${jobId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Python worker status check failed with status ${response.status}`);
      }

      const result: PythonWorkerResponse = await response.json();
      return result;
    } catch (error) {
      console.error('Python worker status check failed:', error);
      throw new Error(`Failed to check Python worker status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Singleton instance
let pythonWorkerClient: PythonWorkerClient | null = null;

export function getPythonWorkerClient(): PythonWorkerClient {
  if (!pythonWorkerClient) {
    const workerUrl = process.env['WORKER_URL'] || 'http://localhost:8000';
    const apiKey = process.env['INTERNAL_API_KEY'] || 'dev-key';
    pythonWorkerClient = new PythonWorkerClient(workerUrl, apiKey);
  }
  return pythonWorkerClient;
}
