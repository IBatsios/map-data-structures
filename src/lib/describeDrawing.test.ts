import { describe, expect, it } from 'vitest';

import { describeDrawing } from './describeDrawing';
import type { Design } from './design.types';
import { layoutDesign } from './layout';

const orderIntake: Design = {
  title: 'Order intake',
  nodes: [
    { id: 'api', label: 'Public API', type: 'service' },
    { id: 'queue', label: 'Order queue', type: 'queue' },
  ],
  edges: [{ from: 'api', to: 'queue', label: 'publishes order' }],
};

describe('describeDrawing', () => {
  it('opens with the design title', () => {
    expect(describeDrawing(layoutDesign(orderIntake))).toMatch(/^Order intake\./);
  });

  it('names every node, with its kind', () => {
    const description = describeDrawing(layoutDesign(orderIntake));

    expect(description).toContain('Public API, a service');
    expect(description).toContain('Order queue, a queue');
    expect(description).toContain('2 nodes');
  });

  it('reads every edge in the direction its arrow points', () => {
    const description = describeDrawing(layoutDesign(orderIntake));

    expect(description).toContain('Public API publishes order Order queue');
    expect(description).toContain('1 edge');
  });

  it('names nodes by label rather than by id, which the reader never sees', () => {
    expect(describeDrawing(layoutDesign(orderIntake))).not.toContain('api');
  });

  it('says so plainly when a design holds nothing', () => {
    const description = describeDrawing(
      layoutDesign({ title: 'Nothing yet', nodes: [], edges: [] }),
    );

    expect(description).toBe('Nothing yet. No nodes. No edges.');
  });

  it('describes a node whose type it does not recognise by that type', () => {
    const description = describeDrawing(
      layoutDesign({
        title: 'Unknown kinds',
        nodes: [{ id: 'w', label: 'Widget factory', type: 'widget-factory' }],
        edges: [],
      }),
    );

    expect(description).toContain('Widget factory, a widget-factory');
  });

  it('leaves out no node, whatever its label says', () => {
    const description = describeDrawing(
      layoutDesign({
        title: 'Blank labels',
        nodes: [
          { id: 'a', label: '   ', type: 'service' },
          { id: 'b', label: 'Beta', type: 'service' },
        ],
        edges: [],
      }),
    );

    expect(description).toContain('2 nodes');
    expect(description).toContain('Beta, a service');
  });
});
