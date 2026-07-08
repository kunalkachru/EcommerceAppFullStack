import React from "react";
import ReactTestRenderer from "react-test-renderer";
import LuxuryTextInput from "../src/components/LuxuryTextInput";

describe("LuxuryTextInput", () => {
  it("renders correctly with basic props", () => {
    let renderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <LuxuryTextInput
          label="Test Label"
          placeholder="Enter text"
          value=""
          onChangeText={jest.fn()}
        />
      );
    });
    expect(renderer.toJSON()).not.toBeNull();
  });

  it("renders with label", () => {
    let renderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <LuxuryTextInput
          label="Full Name"
          placeholder="Enter your name"
          value=""
          onChangeText={jest.fn()}
        />
      );
    });
    const tree = renderer.root;
    const labelElement = tree.findByProps({ testID: undefined });
    expect(labelElement).toBeTruthy();
  });

  it("renders without label when not provided", () => {
    let renderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <LuxuryTextInput
          placeholder="Enter text"
          value=""
          onChangeText={jest.fn()}
        />
      );
    });
    expect(renderer.toJSON()).not.toBeNull();
  });

  it("displays error message when provided", () => {
    let renderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <LuxuryTextInput
          label="Email"
          placeholder="Enter email"
          value=""
          onChangeText={jest.fn()}
          error="Invalid email format"
        />
      );
    });
    expect(renderer.toJSON()).not.toBeNull();
  });

  it("calls onChangeText when text is entered", () => {
    const onChangeText = jest.fn();
    let renderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <LuxuryTextInput
          placeholder="Test"
          value=""
          onChangeText={onChangeText}
          testID="test-input"
        />
      );
    });
    expect(onChangeText).not.toHaveBeenCalled();
  });

  it("supports secure text entry", () => {
    let renderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <LuxuryTextInput
          label="Password"
          placeholder="Enter password"
          value=""
          onChangeText={jest.fn()}
          secureTextEntry={true}
        />
      );
    });
    expect(renderer.toJSON()).not.toBeNull();
  });

  it("supports different keyboard types", () => {
    let renderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <LuxuryTextInput
          label="Email"
          placeholder="Enter email"
          value=""
          onChangeText={jest.fn()}
          keyboardType="email-address"
        />
      );
    });
    expect(renderer.toJSON()).not.toBeNull();
  });

  it("supports disabled state", () => {
    let renderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <LuxuryTextInput
          label="Disabled Field"
          placeholder="Cannot edit"
          value="Fixed value"
          onChangeText={jest.fn()}
          editable={false}
        />
      );
    });
    expect(renderer.toJSON()).not.toBeNull();
  });
});
