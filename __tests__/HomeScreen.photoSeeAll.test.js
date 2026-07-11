const React = require("react");
const ReactTestRenderer = require("react-test-renderer");
const { act } = ReactTestRenderer;

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
      {
        id: 12,
        title: "Resort Shirt",
        price: 99,
        image: "https://example.com/resort.png",
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
  return function VisualSearchCategoryPromptMock() {
    return ReactModule.createElement(RN.View, null);
  };
});

const HomeScreen = require("../src/screens/HomeScreen").default;

describe("HomeScreen photo see-all handoff", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockAnalyzeImageForProducts.mockReset();
    mockPickPhotoAsset.mockReset();
  });

  it("navigates to the product list with visual match context when see-all is pressed", async () => {
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
        {
          id: 12,
          title: "Resort Shirt",
          price: 99,
          image: "https://example.com/resort.png",
          matchScore: 0.91,
          matchPercent: 91,
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

    await act(async () => {
      tree.root.findByProps({ testID: "photo-see-all-results" }).props.onPress();
    });

    expect(mockNavigate).toHaveBeenCalledWith("Products", {
      screen: "ProductList",
      params: {
        voiceQuery: "linen shirt",
        voiceProductIds: ["11", "12"],
        matchSource: "visual",
        resetSearch: true,
      },
    });
  });
});
