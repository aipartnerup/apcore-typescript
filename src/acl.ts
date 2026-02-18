/**
 * ACL (Access Control List) types and implementation for apcore.
 */

import { readFileSync, existsSync } from 'node:fs';
import yaml from 'js-yaml';
import type { Context } from './context.js';
import { ACLRuleError, ConfigNotFoundError } from './errors.js';
import { matchPattern } from './utils/pattern.js';

export interface ACLRule {
  callers: string[];
  targets: string[];
  effect: string;
  description: string;
  conditions?: Record<string, unknown> | null;
}

function parseAclRule(rawRule: unknown, index: number): ACLRule {
  if (typeof rawRule !== 'object' || rawRule === null || Array.isArray(rawRule)) {
    throw new ACLRuleError(`Rule ${index} must be a mapping, got ${typeof rawRule}`);
  }

  const ruleObj = rawRule as Record<string, unknown>;
  for (const key of ['callers', 'targets', 'effect']) {
    if (!(key in ruleObj)) {
      throw new ACLRuleError(`Rule ${index} missing required key '${key}'`);
    }
  }

  const effect = ruleObj['effect'] as string;
  if (effect !== 'allow' && effect !== 'deny') {
    throw new ACLRuleError(`Rule ${index} has invalid effect '${effect}', must be 'allow' or 'deny'`);
  }

  const callers = ruleObj['callers'];
  if (!Array.isArray(callers)) {
    throw new ACLRuleError(`Rule ${index} 'callers' must be a list, got ${typeof callers}`);
  }

  const targets = ruleObj['targets'];
  if (!Array.isArray(targets)) {
    throw new ACLRuleError(`Rule ${index} 'targets' must be a list, got ${typeof targets}`);
  }

  return {
    callers: callers as string[],
    targets: targets as string[],
    effect,
    description: (ruleObj['description'] as string) ?? '',
    conditions: (ruleObj['conditions'] as Record<string, unknown>) ?? null,
  };
}

export class ACL {
  private _rules: ACLRule[];
  private _defaultEffect: string;
  private _yamlPath: string | null = null;
  debug: boolean = false;

  constructor(rules: ACLRule[], defaultEffect: string = 'deny') {
    this._rules = [...rules];
    this._defaultEffect = defaultEffect;
  }

  static load(yamlPath: string): ACL {
    if (!existsSync(yamlPath)) {
      throw new ConfigNotFoundError(yamlPath);
    }

    let data: unknown;
    try {
      const content = readFileSync(yamlPath, 'utf-8');
      data = yaml.load(content);
    } catch (e) {
      if (e instanceof ConfigNotFoundError) throw e;
      throw new ACLRuleError(`Invalid YAML in ${yamlPath}: ${e}`);
    }

    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      throw new ACLRuleError(`ACL config must be a mapping, got ${typeof data}`);
    }

    const dataObj = data as Record<string, unknown>;
    if (!('rules' in dataObj)) {
      throw new ACLRuleError("ACL config missing required 'rules' key");
    }

    const rawRules = dataObj['rules'];
    if (!Array.isArray(rawRules)) {
      throw new ACLRuleError(`'rules' must be a list, got ${typeof rawRules}`);
    }

    const defaultEffect = (dataObj['default_effect'] as string) ?? 'deny';
    const rules = rawRules.map((raw, i) => parseAclRule(raw, i));

    const acl = new ACL(rules, defaultEffect);
    acl._yamlPath = yamlPath;
    return acl;
  }

  check(callerId: string | null, targetId: string, context?: Context | null): boolean {
    const effectiveCaller = callerId === null ? '@external' : callerId;
    const rules = [...this._rules];
    const defaultEffect = this._defaultEffect;

    for (const rule of rules) {
      if (this._matchesRule(rule, effectiveCaller, targetId, context ?? null)) {
        return rule.effect === 'allow';
      }
    }

    return defaultEffect === 'allow';
  }

  private _matchPattern(pattern: string, value: string, context: Context | null): boolean {
    if (pattern === '@external') return value === '@external';
    if (pattern === '@system') {
      return context !== null && context.identity !== null && context.identity.type === 'system';
    }
    return matchPattern(pattern, value);
  }

  private _matchesRule(rule: ACLRule, caller: string, target: string, context: Context | null): boolean {
    const callerMatch = rule.callers.some((p) => this._matchPattern(p, caller, context));
    if (!callerMatch) return false;

    const targetMatch = rule.targets.some((p) => this._matchPattern(p, target, context));
    if (!targetMatch) return false;

    if (rule.conditions != null) {
      if (!this._checkConditions(rule.conditions, context)) return false;
    }

    return true;
  }

  private _checkConditions(conditions: Record<string, unknown>, context: Context | null): boolean {
    if (context === null) return false;

    if ('identity_types' in conditions) {
      const types = conditions['identity_types'] as string[];
      if (context.identity === null || !types.includes(context.identity.type)) return false;
    }

    if ('roles' in conditions) {
      const roles = conditions['roles'] as string[];
      if (context.identity === null) return false;
      const identityRoles = new Set(context.identity.roles);
      if (!roles.some((r) => identityRoles.has(r))) return false;
    }

    if ('max_call_depth' in conditions) {
      const maxDepth = conditions['max_call_depth'] as number;
      if (context.callChain.length > maxDepth) return false;
    }

    return true;
  }

  addRule(rule: ACLRule): void {
    this._rules.unshift(rule);
  }

  removeRule(callers: string[], targets: string[]): boolean {
    for (let i = 0; i < this._rules.length; i++) {
      const rule = this._rules[i];
      if (
        JSON.stringify(rule.callers) === JSON.stringify(callers) &&
        JSON.stringify(rule.targets) === JSON.stringify(targets)
      ) {
        this._rules.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  reload(): void {
    if (this._yamlPath === null) {
      throw new ACLRuleError('Cannot reload: ACL was not loaded from a YAML file');
    }
    const reloaded = ACL.load(this._yamlPath);
    this._rules = reloaded._rules;
    this._defaultEffect = reloaded._defaultEffect;
  }
}
