import { nanoid } from 'nanoid';

import { FlowNodeRegistry } from '../../typings';
import iconIf from '../../assets/icon-if.png';
import { formMeta } from './form-meta';

let id = 2;
export const BlockNodeRegistry: FlowNodeRegistry = {
  type: 'block',
  meta: {
    copyDisable: true,
  },
  info: {
    icon: iconIf,
    description: 'Execute the branch when the condition is met.',
  },
  canAdd: () => false,
  canDelete: (ctx, node) => {
    if (node.originParent!.flowNodeType === 'tryCatch') {
      return node.parent!.blocks.length >= 2;
    }
    return node.parent!.blocks.length >= 3;
  },
  onAdd(ctx, from) {
    const isTryCatch = from.flowNodeType === 'tryCatch';
    return {
      id: `if_${nanoid(5)}`,
      type: isTryCatch ? 'catchBlock' : 'block',
      data: {
        title: isTryCatch ? `Catch Block ${id++}` : `If_${id++}`,
        inputs: {
          type: 'object',
          required: ['condition'],
          inputsValues: {
            condition: '',
          },
          properties: {
            condition: {
              type: 'string',
            },
          },
        },
      },
    };
  },
  formMeta,
};
