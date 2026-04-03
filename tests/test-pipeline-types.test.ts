/**
 * Tests for pipeline types: Step, StepResult, PipelineContext, ExecutionStrategy, errors.
 */

import { describe, it, expect } from 'vitest';
import {
  ExecutionStrategy,
  PipelineEngine,
  PipelineAbortError,
  StepNotFoundError,
  StepNotRemovableError,
  StepNotReplaceableError,
  StepNameDuplicateError,
  StrategyNotFoundError,
  ModuleError,
} from '../src/index.js';
import type {
  Step,
  StepResult,
  PipelineContext,
  StepTrace,
  PipelineTrace,
  StrategyInfo,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStep(
  name: string,
  opts: { removable?: boolean; replaceable?: boolean } = {},
): Step {
  return {
    name,
    description: `Step ${name}`,
    removable: opts.removable ?? true,
    replaceable: opts.replaceable ?? true,
    execute: async (): Promise<StepResult> => ({ action: 'continue' }),
  };
}

function makeStrategy(
  name: string = 'test',
  steps?: Step[],
): ExecutionStrategy {
  return new ExecutionStrategy(
    name,
    steps ?? [makeStep('a'), makeStep('b'), makeStep('c')],
  );
}

// ---------------------------------------------------------------------------
// StepResult interface shape
// ---------------------------------------------------------------------------

describe('StepResult', () => {
  it('supports continue action with no optional fields', () => {
    const result: StepResult = { action: 'continue' };
    expect(result.action).toBe('continue');
    expect(result.skipTo).toBeUndefined();
  });

  it('supports skip_to action with target', () => {
    const result: StepResult = { action: 'skip_to', skipTo: 'execute' };
    expect(result.action).toBe('skip_to');
    expect(result.skipTo).toBe('execute');
  });

  it('supports abort action with explanation and alternatives', () => {
    const result: StepResult = {
      action: 'abort',
      explanation: 'denied',
      alternatives: ['mod_b'],
      confidence: 0.95,
    };
    expect(result.action).toBe('abort');
    expect(result.explanation).toBe('denied');
    expect(result.alternatives).toEqual(['mod_b']);
    expect(result.confidence).toBe(0.95);
  });
});

// ---------------------------------------------------------------------------
// ExecutionStrategy
// ---------------------------------------------------------------------------

describe('ExecutionStrategy', () => {
  it('creates a strategy with correct name and steps', () => {
    const strategy = makeStrategy('default');
    expect(strategy.name).toBe('default');
    expect(strategy.steps).toHaveLength(3);
    expect(strategy.stepNames()).toEqual(['a', 'b', 'c']);
  });

  it('returns a readonly steps array', () => {
    const strategy = makeStrategy();
    const steps = strategy.steps;
    // readonly prevents push at compile time; verify steps is frozen-like
    expect(Array.isArray(steps)).toBe(true);
    expect(steps).toHaveLength(3);
  });

  it('rejects duplicate step names in constructor', () => {
    expect(
      () => new ExecutionStrategy('dup', [makeStep('a'), makeStep('a')]),
    ).toThrow(StepNameDuplicateError);
  });

  describe('insertAfter', () => {
    it('inserts a step after the anchor', () => {
      const strategy = makeStrategy();
      strategy.insertAfter('a', makeStep('x'));
      expect(strategy.stepNames()).toEqual(['a', 'x', 'b', 'c']);
    });

    it('inserts after the last step', () => {
      const strategy = makeStrategy();
      strategy.insertAfter('c', makeStep('z'));
      expect(strategy.stepNames()).toEqual(['a', 'b', 'c', 'z']);
    });

    it('throws StepNotFoundError when anchor does not exist', () => {
      const strategy = makeStrategy();
      expect(() => strategy.insertAfter('missing', makeStep('x'))).toThrow(
        StepNotFoundError,
      );
    });

    it('throws StepNameDuplicateError when step name already exists', () => {
      const strategy = makeStrategy();
      expect(() => strategy.insertAfter('a', makeStep('b'))).toThrow(
        StepNameDuplicateError,
      );
    });
  });

  describe('insertBefore', () => {
    it('inserts a step before the anchor', () => {
      const strategy = makeStrategy();
      strategy.insertBefore('b', makeStep('x'));
      expect(strategy.stepNames()).toEqual(['a', 'x', 'b', 'c']);
    });

    it('inserts before the first step', () => {
      const strategy = makeStrategy();
      strategy.insertBefore('a', makeStep('z'));
      expect(strategy.stepNames()).toEqual(['z', 'a', 'b', 'c']);
    });

    it('throws StepNotFoundError when anchor does not exist', () => {
      const strategy = makeStrategy();
      expect(() => strategy.insertBefore('missing', makeStep('x'))).toThrow(
        StepNotFoundError,
      );
    });

    it('throws StepNameDuplicateError when step name already exists', () => {
      const strategy = makeStrategy();
      expect(() => strategy.insertBefore('a', makeStep('c'))).toThrow(
        StepNameDuplicateError,
      );
    });
  });

  describe('remove', () => {
    it('removes a removable step', () => {
      const strategy = makeStrategy();
      strategy.remove('b');
      expect(strategy.stepNames()).toEqual(['a', 'c']);
    });

    it('throws StepNotRemovableError for non-removable step', () => {
      const strategy = new ExecutionStrategy('locked', [
        makeStep('core', { removable: false }),
        makeStep('opt'),
      ]);
      expect(() => strategy.remove('core')).toThrow(StepNotRemovableError);
    });

    it('throws StepNotFoundError when step does not exist', () => {
      const strategy = makeStrategy();
      expect(() => strategy.remove('missing')).toThrow(StepNotFoundError);
    });
  });

  describe('replace', () => {
    it('replaces a replaceable step', () => {
      const strategy = makeStrategy();
      const replacement = makeStep('b');
      (replacement as { description: string }).description = 'New B';
      strategy.replace('b', replacement);
      expect(strategy.steps[1].description).toBe('New B');
    });

    it('throws StepNotReplaceableError for non-replaceable step', () => {
      const strategy = new ExecutionStrategy('locked', [
        makeStep('core', { replaceable: false }),
        makeStep('opt'),
      ]);
      expect(() => strategy.replace('core', makeStep('core'))).toThrow(
        StepNotReplaceableError,
      );
    });

    it('throws StepNotFoundError when step does not exist', () => {
      const strategy = makeStrategy();
      expect(() => strategy.replace('missing', makeStep('x'))).toThrow(
        StepNotFoundError,
      );
    });
  });

  describe('info', () => {
    it('returns correct StrategyInfo', () => {
      const strategy = makeStrategy('myStrategy');
      const info: StrategyInfo = strategy.info();
      expect(info.name).toBe('myStrategy');
      expect(info.stepCount).toBe(3);
      expect(info.stepNames).toEqual(['a', 'b', 'c']);
      expect(info.description).toBe('a \u2192 b \u2192 c');
    });

    it('returns empty description for empty strategy', () => {
      const strategy = new ExecutionStrategy('empty', []);
      const info = strategy.info();
      expect(info.stepCount).toBe(0);
      expect(info.stepNames).toEqual([]);
      expect(info.description).toBe('');
    });
  });
});

// ---------------------------------------------------------------------------
// Step execute contract
// ---------------------------------------------------------------------------

describe('Step execute', () => {
  it('execute returns a StepResult', async () => {
    const step = makeStep('test_step');
    const result = await step.execute({} as PipelineContext);
    expect(result.action).toBe('continue');
  });
});

// ---------------------------------------------------------------------------
// PipelineTrace and StepTrace shapes
// ---------------------------------------------------------------------------

describe('PipelineTrace', () => {
  it('satisfies the interface shape', () => {
    const stepTrace: StepTrace = {
      name: 'acl_check',
      durationMs: 1.5,
      result: { action: 'continue', explanation: 'ACL passed' },
      skipped: false,
      decisionPoint: false,
    };

    const trace: PipelineTrace = {
      moduleId: 'my.module',
      strategyName: 'default',
      steps: [stepTrace],
      totalDurationMs: 10.2,
      success: true,
    };

    expect(trace.moduleId).toBe('my.module');
    expect(trace.steps).toHaveLength(1);
    expect(trace.steps[0].name).toBe('acl_check');
    expect(trace.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

describe('PipelineAbortError', () => {
  it('extends ModuleError', () => {
    const err = new PipelineAbortError('acl_check', 'Access denied');
    expect(err).toBeInstanceOf(ModuleError);
    expect(err).toBeInstanceOf(PipelineAbortError);
  });

  it('has correct code and message', () => {
    const err = new PipelineAbortError('acl_check', 'Access denied', [
      'alt_module',
    ]);
    expect(err.code).toBe('PIPELINE_ABORT');
    expect(err.message).toContain('acl_check');
    expect(err.message).toContain('Access denied');
    expect(err.step).toBe('acl_check');
    expect(err.explanation).toBe('Access denied');
    expect(err.alternatives).toEqual(['alt_module']);
  });

  it('has default null fields', () => {
    const err = new PipelineAbortError('step1');
    expect(err.explanation).toBeNull();
    expect(err.alternatives).toBeNull();
    expect(err.pipelineTrace).toBeNull();
  });

  it('carries pipeline trace', () => {
    const trace: PipelineTrace = {
      moduleId: 'mod',
      strategyName: 'default',
      steps: [],
      totalDurationMs: 0,
      success: false,
    };
    const err = new PipelineAbortError('step1', 'fail', null, trace);
    expect(err.pipelineTrace).toBe(trace);
  });

  it('has DEFAULT_RETRYABLE set to false', () => {
    expect(PipelineAbortError.DEFAULT_RETRYABLE).toBe(false);
  });
});

describe('StepNotFoundError', () => {
  it('extends ModuleError with correct code', () => {
    const err = new StepNotFoundError('Step x not found');
    expect(err).toBeInstanceOf(ModuleError);
    expect(err.code).toBe('STEP_NOT_FOUND');
    expect(err.message).toBe('Step x not found');
  });
});

describe('StepNotRemovableError', () => {
  it('extends ModuleError with correct code', () => {
    const err = new StepNotRemovableError('cannot remove');
    expect(err).toBeInstanceOf(ModuleError);
    expect(err.code).toBe('STEP_NOT_REMOVABLE');
  });
});

describe('StepNotReplaceableError', () => {
  it('extends ModuleError with correct code', () => {
    const err = new StepNotReplaceableError('cannot replace');
    expect(err).toBeInstanceOf(ModuleError);
    expect(err.code).toBe('STEP_NOT_REPLACEABLE');
  });
});

describe('StepNameDuplicateError', () => {
  it('extends ModuleError with correct code', () => {
    const err = new StepNameDuplicateError('dup name');
    expect(err).toBeInstanceOf(ModuleError);
    expect(err.code).toBe('STEP_NAME_DUPLICATE');
  });
});

describe('StrategyNotFoundError', () => {
  it('extends ModuleError with correct code', () => {
    const err = new StrategyNotFoundError('no strategy');
    expect(err).toBeInstanceOf(ModuleError);
    expect(err.code).toBe('STRATEGY_NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// PipelineEngine
// ---------------------------------------------------------------------------

function makePipelineContext(moduleId: string = 'test.mod'): PipelineContext {
  return {
    moduleId,
    inputs: {},
    context: {} as any,
  };
}

function makeStepWithResult(
  name: string,
  result: StepResult,
): Step {
  return {
    name,
    description: `Step ${name}`,
    removable: true,
    replaceable: true,
    execute: async (): Promise<StepResult> => result,
  };
}

describe('PipelineEngine', () => {
  it('runs all steps in order and returns success trace', async () => {
    const executed: string[] = [];
    const steps: Step[] = ['s1', 's2', 's3'].map((n) => ({
      name: n,
      description: `Step ${n}`,
      removable: true,
      replaceable: true,
      execute: async (ctx: PipelineContext): Promise<StepResult> => {
        executed.push(n);
        if (n === 's3') ctx.output = { value: 42 };
        return { action: 'continue' };
      },
    }));
    const strategy = new ExecutionStrategy('default', steps);
    const ctx = makePipelineContext();
    const engine = new PipelineEngine();

    const [output, trace] = await engine.run(strategy, ctx);

    expect(executed).toEqual(['s1', 's2', 's3']);
    expect(trace.success).toBe(true);
    expect(trace.steps).toHaveLength(3);
    expect(trace.strategyName).toBe('default');
    expect((output as Record<string, unknown>).value).toBe(42);
  });

  it('handles skip_to by jumping to the target step', async () => {
    const executed: string[] = [];
    const steps: Step[] = [
      {
        name: 'first',
        description: 'First',
        removable: true,
        replaceable: true,
        execute: async (): Promise<StepResult> => {
          executed.push('first');
          return { action: 'skip_to', skipTo: 'last' };
        },
      },
      {
        name: 'middle',
        description: 'Middle',
        removable: true,
        replaceable: true,
        execute: async (): Promise<StepResult> => {
          executed.push('middle');
          return { action: 'continue' };
        },
      },
      {
        name: 'last',
        description: 'Last',
        removable: true,
        replaceable: true,
        execute: async (): Promise<StepResult> => {
          executed.push('last');
          return { action: 'continue' };
        },
      },
    ];
    const strategy = new ExecutionStrategy('skip', steps);
    const ctx = makePipelineContext();
    const engine = new PipelineEngine();

    const [, trace] = await engine.run(strategy, ctx);

    expect(executed).toEqual(['first', 'last']);
    expect(trace.success).toBe(true);
    // trace should contain: first (executed), middle (skipped), last (executed)
    expect(trace.steps).toHaveLength(3);
    expect(trace.steps[0].skipped).toBe(false);
    expect(trace.steps[1].skipped).toBe(true);
    expect(trace.steps[1].name).toBe('middle');
    expect(trace.steps[2].skipped).toBe(false);
  });

  it('throws PipelineAbortError when a step aborts', async () => {
    const steps: Step[] = [
      makeStepWithResult('ok', { action: 'continue' }),
      makeStepWithResult('fail', {
        action: 'abort',
        explanation: 'denied',
        alternatives: ['alt_mod'],
      }),
      makeStepWithResult('never', { action: 'continue' }),
    ];
    const strategy = new ExecutionStrategy('abort_test', steps);
    const ctx = makePipelineContext();
    const engine = new PipelineEngine();

    await expect(engine.run(strategy, ctx)).rejects.toThrow(PipelineAbortError);
    try {
      await engine.run(strategy, makePipelineContext());
    } catch (e) {
      const err = e as PipelineAbortError;
      expect(err.step).toBe('fail');
      expect(err.explanation).toBe('denied');
      expect(err.alternatives).toEqual(['alt_mod']);
      expect(err.pipelineTrace).toBeDefined();
      expect(err.pipelineTrace!.success).toBe(false);
    }
  });

  it('throws StepNotFoundError when skip_to target does not exist', async () => {
    const steps: Step[] = [
      makeStepWithResult('s1', { action: 'skip_to', skipTo: 'nonexistent' }),
      makeStepWithResult('s2', { action: 'continue' }),
    ];
    const strategy = new ExecutionStrategy('bad_skip', steps);
    const ctx = makePipelineContext();
    const engine = new PipelineEngine();

    await expect(engine.run(strategy, ctx)).rejects.toThrow(StepNotFoundError);
  });

  it('accumulates trace with correct timing for each step', async () => {
    const steps: Step[] = [
      makeStepWithResult('fast', { action: 'continue' }),
      makeStepWithResult('also_fast', { action: 'continue' }),
    ];
    const strategy = new ExecutionStrategy('timing', steps);
    const ctx = makePipelineContext();
    const engine = new PipelineEngine();

    const [, trace] = await engine.run(strategy, ctx);

    expect(trace.steps).toHaveLength(2);
    for (const st of trace.steps) {
      expect(st.durationMs).toBeGreaterThanOrEqual(0);
      expect(st.name).toBeTruthy();
    }
    expect(trace.totalDurationMs).toBeGreaterThanOrEqual(0);
    expect(trace.moduleId).toBe('test.mod');
  });
});
