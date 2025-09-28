const logger = require('./logger');

/**
 * Parallel Processing Engine with dependency management
 * Executes tasks concurrently while respecting dependencies
 */
class ParallelProcessingEngine {
    constructor(options = {}) {
        this.maxConcurrency = options.maxConcurrency || 5;
        this.timeoutMs = options.timeoutMs || 30000;
        this.retryAttempts = options.retryAttempts || 2;
        this.retryDelay = options.retryDelay || 1000;
    }

    /**
     * Process tasks concurrently with dependency management
     * @param {Array} tasks - Array of task objects with dependencies
     * @returns {Promise<Map>} Results map with task IDs as keys
     */
    async processConcurrently(tasks) {
        logger.info('PARALLEL_PROCESSOR', `Starting parallel processing of ${tasks.length} tasks`);
        
        const dependencyGraph = this.buildDependencyGraph(tasks);
        const executionPlan = this.topologicalSort(dependencyGraph);
        const results = new Map();
        const errors = new Map();
        
        logger.debug('PARALLEL_PROCESSOR', `Execution plan created with ${executionPlan.length} batches`);
        
        for (let batchIndex = 0; batchIndex < executionPlan.length; batchIndex++) {
            const batch = executionPlan[batchIndex];
            logger.debug('PARALLEL_PROCESSOR', `Processing batch ${batchIndex + 1}/${executionPlan.length} with ${batch.length} tasks`);
            
            // Process batch concurrently
            const batchPromises = batch.map(async (task) => {
                try {
                    const dependencies = this.getDependencies(task, results);
                    const result = await this.executeTaskWithRetry(task, dependencies);
                    return { taskId: task.id, result, success: true };
                } catch (error) {
                    logger.error('PARALLEL_PROCESSOR', `Task ${task.id} failed`, error);
                    return { taskId: task.id, error, success: false };
                }
            });
            
            // Wait for all tasks in batch to complete
            const batchResults = await Promise.allSettled(batchPromises);
            
            // Process results
            batchResults.forEach((promiseResult, index) => {
                if (promiseResult.status === 'fulfilled') {
                    const { taskId, result, success, error } = promiseResult.value;
                    if (success) {
                        results.set(taskId, result);
                    } else {
                        errors.set(taskId, error);
                    }
                } else {
                    const taskId = batch[index].id;
                    errors.set(taskId, promiseResult.reason);
                }
            });
            
            // Check if we have critical failures
            const criticalFailures = batch.filter(task => 
                task.critical && errors.has(task.id)
            );
            
            if (criticalFailures.length > 0) {
                logger.error('PARALLEL_PROCESSOR', `Critical tasks failed: ${criticalFailures.map(t => t.id).join(', ')}`);
                throw new Error(`Critical tasks failed: ${criticalFailures.map(t => t.id).join(', ')}`);
            }
        }
        
        logger.info('PARALLEL_PROCESSOR', `Parallel processing completed. Results: ${results.size}, Errors: ${errors.size}`);
        
        return {
            results,
            errors,
            stats: this.calculateStats(tasks, results, errors)
        };
    }

    /**
     * Build dependency graph from tasks
     */
    buildDependencyGraph(tasks) {
        const graph = new Map();
        
        tasks.forEach(task => {
            graph.set(task.id, {
                task,
                dependencies: task.dependencies || [],
                dependents: []
            });
        });
        
        // Build dependents list
        tasks.forEach(task => {
            const taskNode = graph.get(task.id);
            taskNode.dependencies.forEach(depId => {
                const depNode = graph.get(depId);
                if (depNode) {
                    depNode.dependents.push(task.id);
                }
            });
        });
        
        return graph;
    }

    /**
     * Topological sort to determine execution order
     */
    topologicalSort(dependencyGraph) {
        const inDegree = new Map();
        const queue = [];
        const result = [];
        
        // Calculate in-degrees
        for (const [taskId, node] of dependencyGraph.entries()) {
            inDegree.set(taskId, node.dependencies.length);
            if (node.dependencies.length === 0) {
                queue.push(taskId);
            }
        }
        
        // Process nodes with no dependencies
        while (queue.length > 0) {
            const batch = [];
            const batchSize = Math.min(queue.length, this.maxConcurrency);
            
            for (let i = 0; i < batchSize; i++) {
                const taskId = queue.shift();
                batch.push(dependencyGraph.get(taskId).task);
                
                // Update dependents
                const node = dependencyGraph.get(taskId);
                node.dependents.forEach(dependentId => {
                    const newInDegree = inDegree.get(dependentId) - 1;
                    inDegree.set(dependentId, newInDegree);
                    
                    if (newInDegree === 0) {
                        queue.push(dependentId);
                    }
                });
            }
            
            if (batch.length > 0) {
                result.push(batch);
            }
        }
        
        // Check for circular dependencies
        const remainingTasks = Array.from(dependencyGraph.keys()).filter(
            taskId => inDegree.get(taskId) > 0
        );
        
        if (remainingTasks.length > 0) {
            throw new Error(`Circular dependency detected involving tasks: ${remainingTasks.join(', ')}`);
        }
        
        return result;
    }

    /**
     * Get dependencies for a task
     */
    getDependencies(task, results) {
        const dependencies = {};
        
        if (task.dependencies) {
            task.dependencies.forEach(depId => {
                if (results.has(depId)) {
                    dependencies[depId] = results.get(depId);
                } else {
                    throw new Error(`Dependency ${depId} not found for task ${task.id}`);
                }
            });
        }
        
        return dependencies;
    }

    /**
     * Execute task with retry logic
     */
    async executeTaskWithRetry(task, dependencies) {
        let lastError;
        
        for (let attempt = 0; attempt <= this.retryAttempts; attempt++) {
            try {
                if (attempt > 0) {
                    logger.debug('PARALLEL_PROCESSOR', `Retrying task ${task.id} (attempt ${attempt + 1})`);
                    await this.delay(this.retryDelay * attempt);
                }
                
                return await this.executeTask(task, dependencies);
            } catch (error) {
                lastError = error;
                
                if (attempt === this.retryAttempts) {
                    throw error;
                }
                
                // Check if error is retryable
                if (!this.isRetryableError(error)) {
                    throw error;
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Execute a single task
     */
    async executeTask(task, dependencies) {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Task ${task.id} timed out`)), this.timeoutMs);
        });
        
        const taskPromise = task.execute(dependencies);
        
        return Promise.race([taskPromise, timeoutPromise]);
    }

    /**
     * Check if error is retryable
     */
    isRetryableError(error) {
        const retryableErrors = [
            'ECONNRESET',
            'ETIMEDOUT',
            'ENOTFOUND',
            'ECONNREFUSED',
            'timeout'
        ];
        
        const errorMessage = error.message.toLowerCase();
        return retryableErrors.some(retryableError => 
            errorMessage.includes(retryableError.toLowerCase())
        );
    }

    /**
     * Calculate processing statistics
     */
    calculateStats(tasks, results, errors) {
        const totalTasks = tasks.length;
        const successfulTasks = results.size;
        const failedTasks = errors.size;
        const successRate = totalTasks > 0 ? (successfulTasks / totalTasks) * 100 : 0;
        
        return {
            totalTasks,
            successfulTasks,
            failedTasks,
            successRate: Math.round(successRate * 100) / 100,
            criticalFailures: tasks.filter(t => t.critical && errors.has(t.id)).length
        };
    }

    /**
     * Utility function for delays
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Create a simple task object
     */
    static createTask(id, executeFunction, dependencies = [], critical = false) {
        return {
            id,
            execute: executeFunction,
            dependencies,
            critical
        };
    }

    /**
     * Create a batch of independent tasks
     */
    static createIndependentTasks(taskDefinitions) {
        return taskDefinitions.map((def, index) => 
            this.createTask(def.id || `task_${index}`, def.execute, [], def.critical)
        );
    }

    /**
     * Create a sequential task chain
     */
    static createSequentialTasks(taskDefinitions) {
        const tasks = [];
        
        taskDefinitions.forEach((def, index) => {
            const dependencies = index > 0 ? [tasks[index - 1].id] : [];
            const task = this.createTask(def.id || `task_${index}`, def.execute, dependencies, def.critical);
            tasks.push(task);
        });
        
        return tasks;
    }
}

module.exports = ParallelProcessingEngine;


