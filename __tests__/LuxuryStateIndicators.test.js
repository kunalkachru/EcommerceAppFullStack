const React = require('react');
const ReactTestRenderer = require('react-test-renderer');
const { act } = ReactTestRenderer;

const {
  LuxuryErrorBanner,
  LuxuryLoadingState,
  LuxurySuccessConfirmation,
  LuxuryEmptyState,
} = require('../src/components/LuxuryStateIndicators');

describe('LuxuryStateIndicators', () => {
  describe('LuxuryErrorBanner', () => {
    it('renders error title and message', async () => {
      let tree;
      await act(async () => {
        tree = ReactTestRenderer.create(
          <LuxuryErrorBanner
            title="Error"
            message="Something went wrong"
          />
        );
      });
      const root = tree.root;
      const texts = root.findAllByType(require('react-native').Text);
      const textContent = texts.map((t) => t.props.children).join(' ');
      expect(textContent).toContain('Error');
      expect(textContent).toContain('Something went wrong');
    });

    it('renders retry button when onRetry provided', async () => {
      const onRetry = jest.fn();
      let tree;
      await act(async () => {
        tree = ReactTestRenderer.create(
          <LuxuryErrorBanner
            title="Error"
            message="Failed"
            onRetry={onRetry}
          />
        );
      });
      const root = tree.root;
      const texts = root.findAllByType(require('react-native').Text);
      const textContent = texts.map((t) => t.props.children).join(' ');
      expect(textContent).toContain('Retry');
    });
  });

  describe('LuxuryLoadingState', () => {
    it('renders loading state container', async () => {
      let tree;
      await act(async () => {
        tree = ReactTestRenderer.create(
          <LuxuryLoadingState testID="loading-state" />
        );
      });
      expect(tree).toBeTruthy();
    });

    it('renders label when provided', async () => {
      let tree;
      await act(async () => {
        tree = ReactTestRenderer.create(
          <LuxuryLoadingState label="Loading products..." />
        );
      });
      const root = tree.root;
      const texts = root.findAllByType(require('react-native').Text);
      const textContent = texts.map((t) => t.props.children).join(' ');
      expect(textContent).toContain('Loading products...');
    });
  });

  describe('LuxurySuccessConfirmation', () => {
    it('renders success title and message', async () => {
      let tree;
      await act(async () => {
        tree = ReactTestRenderer.create(
          <LuxurySuccessConfirmation
            title="Success"
            message="Order placed"
          />
        );
      });
      const root = tree.root;
      const texts = root.findAllByType(require('react-native').Text);
      const textContent = texts.map((t) => t.props.children).join(' ');
      expect(textContent).toContain('Success');
      expect(textContent).toContain('Order placed');
    });

    it('renders action button when provided', async () => {
      const onPress = jest.fn();
      let tree;
      await act(async () => {
        tree = ReactTestRenderer.create(
          <LuxurySuccessConfirmation
            title="Success"
            message="Done"
            action={{ label: 'Continue', onPress }}
          />
        );
      });
      const root = tree.root;
      const texts = root.findAllByType(require('react-native').Text);
      const textContent = texts.map((t) => t.props.children).join(' ');
      expect(textContent).toContain('Continue');
    });
  });

  describe('LuxuryEmptyState', () => {
    it('renders icon, title, and message', async () => {
      let tree;
      await act(async () => {
        tree = ReactTestRenderer.create(
          <LuxuryEmptyState
            icon="cart-outline"
            title="No Items"
            message="Your cart is empty"
          />
        );
      });
      const root = tree.root;
      const texts = root.findAllByType(require('react-native').Text);
      const textContent = texts.map((t) => t.props.children).join(' ');
      expect(textContent).toContain('No Items');
      expect(textContent).toContain('Your cart is empty');
    });

    it('renders action button when provided', async () => {
      const onPress = jest.fn();
      let tree;
      await act(async () => {
        tree = ReactTestRenderer.create(
          <LuxuryEmptyState
            icon="cart-outline"
            title="No Items"
            message="Empty"
            action={{ label: 'Shop now', onPress }}
          />
        );
      });
      const root = tree.root;
      const texts = root.findAllByType(require('react-native').Text);
      const textContent = texts.map((t) => t.props.children).join(' ');
      expect(textContent).toContain('Shop now');
    });
  });
});
