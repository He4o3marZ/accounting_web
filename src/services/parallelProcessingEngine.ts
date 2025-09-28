import { logger } from './logger';

interface Task {
    id: string;
    func: Function;
    args: any[];
    dependencies: string[];
    critical: boolean;
    timeout?: number;
    retryAttempts?: number;
}

interface ProcessingResult {
    success: boolean;
    data?: any;
    error?: string;
    executionTime?: number;
    retries?: number;
}

interface ProcessingResults {
    results: Map<string, ProcessingResult>;
    errors: Map<string, ProcessingResult>;
    totalTime: number;
}

interface EngineConfig {
    maxConcurrency: number;
    timeoutMs: number;
    retryAttempts: number;
}

/**
 * Parallel Processing Engine for concurrent AI task execution
 */
export class ParallelProcessingEngine {
    private config: EngineConfig;
    private tasks: Map<string, Task>;
    private stats: any;

    constructor(config: Partial<EngineConfig> = {}) {
        this.config = {
            maxConcurrency: 5,
            timeoutMs: 30000,
            retryAttempts: 2,
            ...config
        };
        
        this.tasks = new Map();
        this.stats = {
            totalTasks: 0,
            successfulTasks: 0,
            failedTasks: 0,
            totalExecutionTime: 0,
            averageExecutionTime: 0
        };
    }

    /**
     * Create a task for processing
     */
    static createTask(
        id: string, 
        func: Function, 
        dependencies: string[] = [], 
        critical: boolean = false,
        timeout?: number,
        retryAttempts?: number
    ): Task {
        return {
            id,
            func,
            args: dependencies, // Set dependencies as arguments
            dependencies,
            critical,
            timeout,
            retryAttempts
        };
    }

    /**
     * Add a task to the processing engine
     */
    addTask(task: Task): void {
        this.tasks.set(task.id, task);
        this.stats.totalTasks++;
        logger.debug('PARALLEL_PROCESSOR', `Added task: ${task.id}`, {
            dependencies: task.dependencies,
            critical: task.critical
        });
    }

    /**
     * Process all tasks concurrently with dependency management
     */
    async processConcurrently(tasks: Task[]): Promise<ProcessingResults> {
        const startTime = Date.now();
        const results = new Map<string, ProcessingResult>();
        const errors = new Map<string, ProcessingResult>();
        const completedTasks = new Set<string>();
        
        // Add all tasks
        tasks.forEach(task => this.addTask(task));
        
        logger.info('PARALLEL_PROCESSOR', `Starting concurrent processing of ${tasks.length} tasks`, {
            maxConcurrency: this.config.maxConcurrency
        });

        // Process tasks in dependency order
        while (completedTasks.size < this.tasks.size) {
            const executableTasks = this.getExecutableTasks(completedTasks);
            
            if (executableTasks.length === 0) {
                // Check for circular dependencies or deadlocks
                const remainingTasks = Array.from(this.tasks.keys()).filter(id => !completedTasks.has(id));
                if (remainingTasks.length > 0) {
                    logger.error('PARALLEL_PROCESSOR', 'Circular dependency detected', { remainingTasks });
                    remainingTasks.forEach(taskId => {
                        errors.set(taskId, {
                            success: false,
                            error: 'Circular dependency detected'
                        });
                        completedTasks.add(taskId);
                    });
                }
                break;
            }

            // Execute tasks in parallel (respecting concurrency limit)
            const batchSize = Math.min(executableTasks.length, this.config.maxConcurrency);
            const currentBatch = executableTasks.slice(0, batchSize);
            
            logger.debug('PARALLEL_PROCESSOR', `Executing batch of ${currentBatch.length} tasks`, {
                taskIds: currentBatch.map(t => t.id)
            });

            const batchPromises = currentBatch.map(async (task) => {
                const taskStartTime = Date.now();
                let retries = 0;
                const maxRetries = task.retryAttempts || this.config.retryAttempts;
                
                while (retries <= maxRetries) {
                    try {
                        // Resolve dependencies
                        const resolvedArgs = await this.resolveDependencies(task, results);
                        
                        // Execute task with timeout
                        const timeout = task.timeout || this.config.timeoutMs;
                        const taskPromise = task.func(...resolvedArgs);
                        const timeoutPromise = new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Task timeout')), timeout)
                        );
                        
                        const taskResult = await Promise.race([taskPromise, timeoutPromise]);
                        const executionTime = Date.now() - taskStartTime;
                        
                        const result: ProcessingResult = {
                            success: true,
                            data: taskResult,
                            executionTime,
                            retries
                        };
                        
                        results.set(task.id, result);
                        this.stats.successfulTasks++;
                        this.updateExecutionTimeStats(executionTime);
                        
                        logger.debug('PARALLEL_PROCESSOR', `Task ${task.id} completed successfully`, {
                            executionTime,
                            retries
                        });
                        
                        break; // Success, exit retry loop
                        
                    } catch (error) {
                        retries++;
                        logger.warn('PARALLEL_PROCESSOR', `Task ${task.id} failed (attempt ${retries})`, {
                            error: error.message,
                            retries,
                            maxRetries
                        });
                        
                        if (retries > maxRetries) {
                            const executionTime = Date.now() - taskStartTime;
                            const errorResult: ProcessingResult = {
                                success: false,
                                error: error.message,
                                executionTime,
                                retries
                            };
                            
                            if (task.critical) {
                                errors.set(task.id, errorResult);
                                this.stats.failedTasks++;
                                logger.error('PARALLEL_PROCESSOR', `Critical task ${task.id} failed`, errorResult);
                            } else {
                                results.set(task.id, errorResult);
                                this.stats.failedTasks++;
                                logger.warn('PARALLEL_PROCESSOR', `Non-critical task ${task.id} failed`, errorResult);
                            }
                            break;
                        }
                        
                        // Wait before retry (exponential backoff)
                        await this.delay(Math.pow(2, retries) * 1000);
                    }
                }
                
                completedTasks.add(task.id);
            });

            await Promise.all(batchPromises);
        }

        const totalTime = Date.now() - startTime;
        this.stats.totalExecutionTime += totalTime;
        
        logger.info('PARALLEL_PROCESSOR', 'Concurrent processing completed', {
            totalTime,
            successfulTasks: this.stats.successfulTasks,
            failedTasks: this.stats.failedTasks,
            resultsCount: results.size,
            errorsCount: errors.size
        });

        return {
            results,
            errors,
            totalTime
        };
    }

    /**
     * Get tasks that can be executed (dependencies satisfied)
     */
    private getExecutableTasks(completedTasks: Set<string>): Task[] {
        const executable = Array.from(this.tasks.values()).filter(task => 
            !completedTasks.has(task.id) &&
            task.dependencies.every(depId => completedTasks.has(depId))
        );
        
        logger.debug('PARALLEL_PROCESSOR', 'Getting executable tasks', {
            completedTasks: Array.from(completedTasks),
            allTasks: Array.from(this.tasks.keys()),
            executableTasks: executable.map(t => ({ id: t.id, dependencies: t.dependencies }))
        });
        
        return executable;
    }

    /**
     * Resolve task dependencies
     */
    private async resolveDependencies(task: Task, results: Map<string, ProcessingResult>): Promise<any[]> {
        return Promise.all(task.args.map(async (arg) => {
            if (typeof arg === 'string' && results.has(arg)) {
                const result = results.get(arg);
                logger.debug('PARALLEL_PROCESSOR', `Resolving dependency ${arg} for task ${task.id}`, {
                    hasResult: !!result,
                    success: result?.success,
                    hasData: !!result?.data,
                    dataType: typeof result?.data
                });
                
                if (result?.success) {
                    // If the result has a data property, return it; otherwise return the whole result
                    const resolvedData = result.data !== undefined ? result.data : result;
                    logger.debug('PARALLEL_PROCESSOR', `Resolved dependency ${arg}`, {
                        resolvedDataType: typeof resolvedData,
                        resolvedDataKeys: resolvedData && typeof resolvedData === 'object' ? Object.keys(resolvedData) : 'N/A'
                    });
                    return resolvedData;
                } else {
                    // If dependency failed, provide a fallback or skip the task
                    logger.warn('PARALLEL_PROCESSOR', `Dependency ${arg} failed, providing fallback`, {
                        error: result?.error,
                        taskId: task.id
                    });
                    return null; // Return null instead of throwing error
                }
            }
            return arg;
        }));
    }

    /**
     * Delay execution
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Update execution time statistics
     */
    private updateExecutionTimeStats(executionTime: number): void {
        const totalTasks = this.stats.successfulTasks + this.stats.failedTasks;
        this.stats.averageExecutionTime = 
            (this.stats.averageExecutionTime * (totalTasks - 1) + executionTime) / totalTasks;
    }

    /**
     * Get processing statistics
     */
    getStats(): any {
        return {
            ...this.stats,
            successRate: this.stats.totalTasks > 0 ? 
                (this.stats.successfulTasks / this.stats.totalTasks) * 100 : 0,
            averageExecutionTime: Math.round(this.stats.averageExecutionTime)
        };
    }

    /**
     * Clear all tasks
     */
    clearTasks(): void {
        this.tasks.clear();
        logger.debug('PARALLEL_PROCESSOR', 'Cleared all tasks');
    }

    /**
     * Get task status
     */
    getTaskStatus(taskId: string): any {
        const task = this.tasks.get(taskId);
        if (!task) {
            return { status: 'not_found' };
        }
        
        return {
            status: 'pending',
            id: task.id,
            dependencies: task.dependencies,
            critical: task.critical
        };
    }
}
