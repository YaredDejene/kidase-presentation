export class RuleEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuleEngineError';
  }
}

export class ValidationError extends RuleEngineError {
  constructor(message: string, public readonly issues: { path: string; message: string }[] = []) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NormalizationError extends RuleEngineError {
  constructor(message: string) {
    super(message);
    this.name = 'NormalizationError';
  }
}

export class ResolutionError extends RuleEngineError {
  constructor(message: string, public readonly path: string) {
    super(message);
    this.name = 'ResolutionError';
  }
}

export class EvaluationError extends RuleEngineError {
  constructor(message: string, public readonly ruleId?: string) {
    super(message);
    this.name = 'EvaluationError';
  }
}

export class UnknownOperatorError extends RuleEngineError {
  constructor(public readonly operator: string) {
    super(`Unknown operator: ${operator}`);
    this.name = 'UnknownOperatorError';
  }
}
