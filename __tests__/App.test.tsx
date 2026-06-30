/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import App from '../App';

afterEach(async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});

test('renders correctly', async () => {
  let tree;
  await act(async () => {
    tree = ReactTestRenderer.create(<App />);
  });
  expect(tree).toBeTruthy();
  tree.unmount();
});
