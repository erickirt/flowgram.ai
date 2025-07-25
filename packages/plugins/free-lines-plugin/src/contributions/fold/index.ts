/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IPoint, Rectangle } from '@flowgram.ai/utils';
import {
  POINT_RADIUS,
  WorkflowLineEntity,
  WorkflowLineRenderContribution,
} from '@flowgram.ai/free-layout-core';
import { LineType } from '@flowgram.ai/free-layout-core';

import { LINE_PADDING } from '../../constants/lines';
import { FoldLine } from './fold-line';

export interface FoldData {
  points: IPoint[];
  path: string;
  bbox: Rectangle;
}

export class WorkflowFoldLineContribution implements WorkflowLineRenderContribution {
  public static type = LineType.LINE_CHART;

  public entity: WorkflowLineEntity;

  constructor(entity: WorkflowLineEntity) {
    this.entity = entity;
  }

  private data?: FoldData;

  public get path(): string {
    return this.data?.path ?? '';
  }

  public calcDistance(pos: IPoint): number {
    if (!this.data) {
      return Number.MAX_SAFE_INTEGER;
    }
    return FoldLine.getFoldLineToPointDistance(this.data.points, pos);
  }

  public get bounds(): Rectangle {
    if (!this.data) {
      return new Rectangle();
    }
    return this.data.bbox;
  }

  public update(params: { fromPos: IPoint; toPos: IPoint }): void {
    const { fromPos, toPos } = params;
    const { vertical } = this.entity;

    // 根据方向预先计算源点和目标点的偏移
    const sourceOffset = {
      x: vertical ? 0 : POINT_RADIUS,
      y: vertical ? POINT_RADIUS : 0,
    };
    const targetOffset = {
      x: vertical ? 0 : -POINT_RADIUS,
      y: vertical ? -POINT_RADIUS : 0,
    };

    const points = FoldLine.getPoints({
      source: {
        x: fromPos.x + sourceOffset.x,
        y: fromPos.y + sourceOffset.y,
      },
      target: {
        x: toPos.x + targetOffset.x,
        y: toPos.y + targetOffset.y,
      },
      vertical,
    });

    const bbox = FoldLine.getBounds(points);

    // 调整所有点到 SVG 视口坐标系
    const adjustedPoints = points.map((p) => ({
      x: p.x - bbox.x + LINE_PADDING,
      y: p.y - bbox.y + LINE_PADDING,
    }));

    const path = FoldLine.getSmoothStepPath(adjustedPoints);

    this.data = {
      points,
      path,
      bbox,
    };
  }
}
