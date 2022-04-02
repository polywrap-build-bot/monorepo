import {
  CancelablePromise,
  createCancelablePromise
} from "../";

describe("CancelablePromise", () => {
  it("resolves", async () => {
    const promise = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 200);
    });
    const cancelable = createCancelablePromise(promise);
    const result = await cancelable;

    expect(result).toBe(true);
  });

  it("rejects", async () => {
    const promise = new Promise<boolean>((resolve, reject) => {
      setTimeout(() => {
        resolve(true);
      }, 400);
      setTimeout(() => {
        reject(new Error("rejection"));
      }, 200);
    });
    const cancelable = createCancelablePromise(promise);

    try {
      await cancelable;
    } catch (e) {
      expect(e.message).toBe("rejection");
      return;
    }

    expect("").toBe("should never reach here");
  });

  it("cancels", async () => {
    let result = false;
    const promise = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 200);
    });
    const cancelable = createCancelablePromise(promise);
    cancelable.then((value) => result = value);

    await new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 100);
    });

    cancelable.gracefulCancel();

    await new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 200);
    });

    expect(result).toBe(false);
  });

  it("calls onCancel", async () => {
    let result = false;
    let cancelValue = "foo";
    const promise = new CancelablePromise<boolean>(
      (resolve, reject, onCancel) => {
        onCancel(
          () => cancelValue = "bar"
        );
        setTimeout(() => {
          resolve(true);
        }, 200);
      },
    );
    promise.then((value) => result = value);
    promise.gracefulCancel();

    await new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 100);
    });

    expect(result).toBe(false);
    expect(cancelValue).toBe("bar");
  });

  it("Promise.all and Promise.race work", async () => {
    const createPromises = () => {
      return {
        promiseA: new CancelablePromise<string>(
          (resolve) => {
            setTimeout(() => {
              resolve("A");
            }, 200);
          }
        ),
        promiseB: new CancelablePromise<string>(
          (resolve) => {
            setTimeout(() => {
              resolve("B");
            }, 400);
          }
        )
      };
    };

    const race = createPromises();
    race.promiseA.gracefulCancel();

    const raceResult = await Promise.race([
      race.promiseA,
      race.promiseB
    ]);

    expect(raceResult).toBe("B");

    const all = createPromises();
    const allResult = await Promise.all([
      all.promiseA,
      all.promiseB
    ]);

    expect(allResult[0]).toBe("A");
    expect(allResult[1]).toBe("B");
  });

  it("doesn't execute sub-promises after cancel", async () => {
    const results: string[] = [];
    const sleep = (ms: number) => new CancelablePromise<void>((resolve) =>
      setTimeout(() => resolve(), ms)
    );

    const promise = sleep(200)
      .then(() => results.push("first"))
      .then(() => sleep(200))
      .then(() => results.push("second"))
      .then(() => sleep(200))
      .then(() => results.push("third"))
      .then(() => sleep(200))
      .then(() => results.push("fourth"));

    await sleep(300);
    promise.gracefulCancel();

    await sleep(1000);

    expect(results.length).toBe(1);
    expect(results[0]).toBe("first");
  });

  it("works when constructed with an async function", async () => {
    let result = undefined;
    const cancelable = new CancelablePromise<void>(async (resolve) => {
      result = await new Promise((resolve) => {
        setTimeout(() => {
          resolve("A");
        }, 200);
      });

      result = await new Promise((resolve) => {
        setTimeout(() => {
          resolve("B");
        }, 200);
      });

      resolve();
    });

    await cancelable;

    expect(result).toBe("B");
  });
});
