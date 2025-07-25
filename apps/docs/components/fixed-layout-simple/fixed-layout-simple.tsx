/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

// https://github.com/web-infra-dev/rspress/issues/553
const FixedLayoutSimple = React.lazy(() =>
  import('@flowgram.ai/demo-fixed-layout-simple').then((module) => ({
    default: module.DemoFixedLayout,
  }))
);

export { FixedLayoutSimple };
