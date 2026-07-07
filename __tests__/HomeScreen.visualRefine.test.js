const React = require("react");
const ReactTestRenderer = require("react-test-renderer");
const { act } = ReactTestRenderer;
const { TouchableOpacity, Text } = require("react-native");

const mockNavigate = jest.fn();
const mockAnalyzeImageForProducts = jest.fn();
const mockPickPhotoAsset = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock("react-redux", () => ({
  useSelector: (selector) =>
    selector({
      auth: {
        user: {
          name: "Aria",
        },
      },
    }),
}));

jest.mock("../src/redux/api/catalogApi", () => ({
  useCatalogProducts: () => ({
    products: [
      {
        id: 11,
        title: "Linen Shirt",
        price: 89,
        image: "https://example.com/shirt.png",
        category: "mens-shirts",
      },
    ],
    catalogTotal: 394,
  }),
  getTopCategories: () => [],
}));

jest.mock("../src/services/visualSearchService", () => ({
  analyzeImageForProducts: mockAnalyzeImageForProducts,
}));

jest.mock("../src/utils/photoPicker", () => ({
  pickPhotoAsset: mockPickPhotoAsset,
}));

jest.mock("../src/components/CategoryFilterBar", () => {
  const ReactModule = require("react");
  const RN = require("react-native");
  return function CategoryFilterBarMock() {
    return ReactModule.createElement(RN.View, null);
  };
});

jest.mock("../src/components/VoiceSearchCard", () => {
  const ReactModule = require("react");
  const RN = require("react-native");
  return function VoiceSearchCardMock() {
    return ReactModule.createElement(RN.View, null);
  };
});

jest.mock("../src/components/VisualSearchCategoryPrompt", () => {
  const ReactModule = require("react");
  const RN = require("react-native");
  return function VisualSearchCategoryPromptMock({ onChange }) {
    return ReactModule.createElement(
      RN.TouchableOpacity,
      {
        testID: "refine-clothing",
        onPress: () => onChange("clothing"),
      },
      ReactModule.createElement(RN.Text, null, "Refine clothing")
    );
  };
});

const HomeScreen = require("../src/screens/HomeScreen").default;

describe("HomeScreen visual refine", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockAnalyzeImageForProducts.mockReset();
    mockPickPhotoAsset.mockReset();
  });

  it("reruns visual matching for the selected photo when narrow search changes", async () => {
    mockPickPhotoAsset.mockResolvedValue({
      uri: "file:///tmp/look.png",
      base64: "demo-base64",
    });
    mockAnalyzeImageForProducts.mockResolvedValue({
      labels: [],
      attributes: [],
      matches: [
        {
          id: 11,
          title: "Linen Shirt",
          price: 89,
          image: "https://example.com/shirt.png",
          matchScore: 0.95,
          matchPercent: 95,
        },
      ],
      searchQuery: "linen shirt",
      nearestMatch: null,
    });

    let tree;
    await act(async () => {
      tree = ReactTestRenderer.create(React.createElement(HomeScreen));
    });

    await act(async () => {
      tree.root.findByProps({ testID: "photo-gallery-button" }).props.onPress();
      await Promise.resolve();
    });

    expect(mockAnalyzeImageForProducts).toHaveBeenCalledTimes(1);
    expect(mockAnalyzeImageForProducts.mock.calls[0][3]).toEqual({
      categoryFilter: null,
    });

    await act(async () => {
      tree.root.findByProps({ testID: "refine-clothing" }).props.onPress();
      await Promise.resolve();
    });

    expect(mockAnalyzeImageForProducts).toHaveBeenCalledTimes(2);
    expect(mockAnalyzeImageForProducts.mock.calls[1][3]).toEqual({
      categoryFilter: "clothing",
    });
  });
});
