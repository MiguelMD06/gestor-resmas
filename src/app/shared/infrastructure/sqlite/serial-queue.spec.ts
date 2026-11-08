import { describe, expect, it } from 'vitest';

import { SerialQueue } from './serial-queue';

describe('SerialQueue', () => {
  it('executes tasks in call order even if earlier tasks take longer', async () => {
    const queue = new SerialQueue();
    const executed: number[] = [];

    const task1 = queue.enqueue(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      executed.push(1);
      return 1;
    });

    const task2 = queue.enqueue(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      executed.push(2);
      return 2;
    });

    const task3 = queue.enqueue(async () => {
      executed.push(3);
      return 3;
    });

    const results = await Promise.all([task1, task2, task3]);
    expect(results).toEqual([1, 2, 3]);
    expect(executed).toEqual([1, 2, 3]);
  });

  it('continues executing subsequent tasks when a previous task fails', async () => {
    const queue = new SerialQueue();
    const executed: number[] = [];
    const expectedError = new Error('Task 1 failed');

    const task1 = queue.enqueue(async () => {
      executed.push(1);
      throw expectedError;
    });

    const task2 = queue.enqueue(async () => {
      executed.push(2);
      return 'task2-ok';
    });

    await expect(task1).rejects.toThrow('Task 1 failed');
    await expect(task2).resolves.toBe('task2-ok');
    expect(executed).toEqual([1, 2]);
  });
});
