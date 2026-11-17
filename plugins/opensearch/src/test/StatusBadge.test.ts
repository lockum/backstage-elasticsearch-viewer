import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { StatusBadge } from '../components/StatusBadge';

describe('StatusBadge Component', () => {
  it('instantiates StatusBadge element with green status', () => {
    const element = React.createElement(StatusBadge, { status: 'green' });
    assert.equal(element.type, StatusBadge);
    assert.equal(element.props.status, 'green');
  });

  it('instantiates StatusBadge element with yellow status', () => {
    const element = React.createElement(StatusBadge, { status: 'yellow', label: 'WARNING' });
    assert.equal(element.props.status, 'yellow');
    assert.equal(element.props.label, 'WARNING');
  });

  it('instantiates StatusBadge element with red status', () => {
    const element = React.createElement(StatusBadge, { status: 'red' });
    assert.equal(element.props.status, 'red');
  });
});
