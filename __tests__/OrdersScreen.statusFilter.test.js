const React = require("react");
const ReactTestRenderer = require("react-test-renderer");
const { act } = ReactTestRenderer;

const mockFetchOrders = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (effect) => require("react").useEffect(effect, [effect]),
}));

jest.mock("../src/services/ordersService", () => ({
  fetchOrders: (...args) => mockFetchOrders(...args),
}));

const OrdersScreen = require("../src/screens/OrdersScreen").default;

const orders = [
  { id: "placed-1", orderStatus: "placed", items: [] },
  { id: "shipped-1", orderStatus: "shipped", items: [] },
  { id: "delivered-1", orderStatus: "delivered", items: [] },
];

async function renderOrders(data = orders) {
  let tree;
  mockFetchOrders.mockResolvedValue(data);
  await act(async () => {
    tree = ReactTestRenderer.create(
      React.createElement(OrdersScreen, { navigation: { navigate: jest.fn() } })
    );
    await Promise.resolve();
    await Promise.resolve();
  });
  return tree;
}

function orderCardIds(tree) {
  return [...new Set(tree.root
    .findAll(
      (node) =>
        typeof node.props?.testID === "string" && node.props.testID.startsWith("order-card-")
    )
    .map((node) => node.props.testID))];
}

describe("OrdersScreen status filter", () => {
  beforeEach(() => {
    mockFetchOrders.mockReset();
  });

  it("AC-1: renders All, Placed, Shipped, and Delivered with All selected initially", async () => {
    const tree = await renderOrders();
    const labels = tree.root
      .findAllByType(require("react-native").Text)
      .map((node) => node.props.children)
      .filter((children) => ["All", "Placed", "Shipped", "Delivered"].includes(children));
    expect(labels).toEqual(["All", "Placed", "Shipped", "Delivered"]);
    expect(tree.root.findByProps({ testID: "status-filter-all" }).props.accessibilityState).toEqual({
      selected: true,
    });
  });

  it("AC-2: filters order cards by the selected status and restores all orders", async () => {
    const tree = await renderOrders();
    expect(orderCardIds(tree)).toEqual([
      "order-card-placed-1",
      "order-card-shipped-1",
      "order-card-delivered-1",
    ]);

    for (const [status, orderId] of [
      ["placed", "order-card-placed-1"],
      ["shipped", "order-card-shipped-1"],
      ["delivered", "order-card-delivered-1"],
    ]) {
      await act(async () => {
        tree.root.findByProps({ testID: `status-filter-${status}` }).props.onPress();
      });
      expect(orderCardIds(tree)).toEqual([orderId]);
    }

    await act(async () => {
      tree.root.findByProps({ testID: "status-filter-all" }).props.onPress();
    });
    expect(orderCardIds(tree)).toHaveLength(3);
  });

  it("AC-3: shows the empty status message without another status card", async () => {
    const tree = await renderOrders(orders.slice(0, 2));
    await act(async () => {
      tree.root.findByProps({ testID: "status-filter-delivered" }).props.onPress();
    });

    expect(orderCardIds(tree)).toEqual([]);
    expect(tree.root.findAllByProps({ children: "No orders with this status" }).length).toBeGreaterThan(0);
  });

  it("AC-4: keeps fetched order cards navigable from the All view", async () => {
    const navigate = jest.fn();
    let tree;
    await act(async () => {
      mockFetchOrders.mockResolvedValue(orders);
      tree = ReactTestRenderer.create(
        React.createElement(OrdersScreen, { navigation: { navigate } })
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    const card = tree.root.findByProps({ testID: "order-card-shipped-1" });
    act(() => card.props.onPress());
    expect(navigate).toHaveBeenCalledWith("OrderSummary", { order: orders[1] });
  });
});
