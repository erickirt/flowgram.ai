/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { isNil } from 'lodash-es';
import {
  IState,
  IFlowValue,
  IFlowRefValue,
  IVariableParseResult,
  INode,
  WorkflowInputs,
  WorkflowOutputs,
  IVariableStore,
  WorkflowVariableType,
  IFlowTemplateValue,
  IJsonSchema,
} from '@flowgram.ai/runtime-interface';

import { uuid, WorkflowRuntimeType } from '@infra/utils';

export class WorkflowRuntimeState implements IState {
  public readonly id: string;

  private executedNodes: Set<string>;

  constructor(public readonly variableStore: IVariableStore) {
    this.id = uuid();
  }

  public init(): void {
    this.executedNodes = new Set();
  }

  public dispose(): void {
    this.executedNodes.clear();
  }

  public getNodeInputs(node: INode): WorkflowInputs {
    const inputsDeclare = node.declare.inputs;
    const inputsValues = node.declare.inputsValues;
    return this.parseInputs({
      values: inputsValues,
      declare: inputsDeclare,
    });
  }

  public setNodeOutputs(params: { node: INode; outputs: WorkflowOutputs }): void {
    const { node, outputs } = params;
    const outputsDeclare = node.declare.outputs;
    // TODO validation service type check, deeply compare input & schema
    if (!outputsDeclare) {
      return;
    }
    Object.entries(outputs).forEach(([key, value]) => {
      const typeInfo = outputsDeclare.properties?.[key];
      if (!typeInfo) {
        return;
      }
      const type = typeInfo.type as WorkflowVariableType;
      const itemsType = typeInfo.items?.type as WorkflowVariableType;
      // create variable
      this.variableStore.setVariable({
        nodeID: node.id,
        key,
        value,
        type,
        itemsType,
      });
    });
  }

  public parseInputs(params: {
    values?: Record<string, IFlowValue>;
    declare?: IJsonSchema;
  }): WorkflowInputs {
    const { values, declare } = params;
    if (!declare || !values) {
      return {};
    }
    return Object.entries(values).reduce((prev, [key, inputValue]) => {
      const typeInfo = declare.properties?.[key];
      if (!typeInfo) {
        return prev;
      }
      const expectType = typeInfo.type as WorkflowVariableType;
      // get value
      const result = this.parseValue(inputValue);
      if (!result) {
        return prev;
      }
      const { value, type } = result;
      if (!WorkflowRuntimeType.isTypeEqual(type, expectType)) {
        return prev;
      }
      prev[key] = value;
      return prev;
    }, {} as WorkflowInputs);
  }

  public parseRef<T = unknown>(ref: IFlowRefValue): IVariableParseResult<T> | null {
    if (ref?.type !== 'ref') {
      throw new Error(`Invalid ref value: ${ref}`);
    }
    if (!ref.content || ref.content.length < 2) {
      return null;
    }
    const [nodeID, variableKey, ...variablePath] = ref.content;
    const result = this.variableStore.getValue<T>({
      nodeID,
      variableKey,
      variablePath,
    });
    if (!result) {
      return null;
    }
    return result;
  }

  public parseTemplate(template: IFlowTemplateValue): IVariableParseResult<string> | null {
    if (template?.type !== 'template') {
      throw new Error(`Invalid template value: ${template}`);
    }
    if (!template.content) {
      return null;
    }
    const parsedValue = template.content.replace(
      /\{\{([^\}]+)\}\}/g,
      (match: string, pattern: string): string => {
        // 将路径分割成数组，如 'start_0.work.role' => ['start_0', 'work', 'role']
        const ref = pattern.trim().split('.');

        const variable = this.parseRef<string>({
          type: 'ref',
          content: ref,
        });

        if (!variable) {
          return '';
        }

        return variable.value;
      }
    );
    return {
      type: WorkflowVariableType.String,
      value: parsedValue,
    };
  }

  public parseValue<T = unknown>(flowValue: IFlowValue): IVariableParseResult<T> | null {
    if (!flowValue?.type) {
      throw new Error(`Invalid flow value type: ${(flowValue as any).type}`);
    }
    // constant
    if (flowValue.type === 'constant') {
      const value = flowValue.content as T;
      const type = WorkflowRuntimeType.getWorkflowType(value);
      if (isNil(value) || !type) {
        return null;
      }
      return {
        value,
        type,
      };
    }
    // ref
    if (flowValue.type === 'ref') {
      return this.parseRef<T>(flowValue);
    }
    // template
    if (flowValue.type === 'template') {
      return this.parseTemplate(flowValue) as IVariableParseResult<T> | null;
    }
    // unknown type
    throw new Error(`Unknown flow value type: ${(flowValue as any).type}`);
  }

  public isExecutedNode(node: INode): boolean {
    return this.executedNodes.has(node.id);
  }

  public addExecutedNode(node: INode): void {
    this.executedNodes.add(node.id);
  }
}
