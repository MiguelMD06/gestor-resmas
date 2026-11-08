/**
 * Ensures asynchronous tasks are executed sequentially in FIFO order.
 * A failing task does not block or reject subsequent queued tasks.
 */
export class SerialQueue {
  private tail: Promise<unknown> = Promise.resolve();

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = async (): Promise<T> => {
      return await task();
    };

    const result = this.tail.then(run, run);
    this.tail = result.then(
      () => {},
      () => {},
    );
    return result;
  }
}
