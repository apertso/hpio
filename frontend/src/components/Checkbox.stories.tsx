import type { Meta, StoryObj } from "@storybook/react";
import Checkbox from "./Checkbox";
import { useState } from "react";

const meta: Meta<typeof Checkbox> = {
  title: "Components/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
  argTypes: {
    onChange: { action: "changed" },
    label: { control: "text" },
    disabled: { control: "boolean" },
  },
};

export default meta;

type Story = StoryObj<typeof Checkbox>;

const InteractiveCheckbox = () => {
  const [checked, setChecked] = useState(false);
  return (
    <Checkbox
      id="interactive-checkbox"
      label="Accept terms and conditions"
      checked={checked}
      onChange={(e) => setChecked(e.target.checked)}
    />
  );
};

const MultipleCheckboxes = () => {
  const [checkedItems, setCheckedItems] = useState({
    option1: false,
    option2: true,
    option3: false,
  });

  const handleChange = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-3">
      <Checkbox
        id="option1"
        label="Option 1"
        checked={checkedItems.option1}
        onChange={() => handleChange("option1")}
      />
      <Checkbox
        id="option2"
        label="Option 2"
        checked={checkedItems.option2}
        onChange={() => handleChange("option2")}
      />
      <Checkbox
        id="option3"
        label="Option 3"
        checked={checkedItems.option3}
        onChange={() => handleChange("option3")}
      />
    </div>
  );
};

export const Default: Story = {
  render: () => <InteractiveCheckbox />,
};

export const Unchecked: Story = {
  args: {
    id: "unchecked-checkbox",
    label: "Unchecked checkbox",
    checked: false,
  },
};

export const Checked: Story = {
  args: {
    id: "checked-checkbox",
    label: "Checked checkbox",
    checked: true,
  },
};

export const WithoutLabel: Story = {
  args: {
    id: "no-label-checkbox",
    checked: false,
  },
};

export const Disabled: Story = {
  args: {
    id: "disabled-checkbox",
    label: "Disabled checkbox",
    checked: false,
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    id: "disabled-checked-checkbox",
    label: "Disabled and checked",
    checked: true,
    disabled: true,
  },
};

export const Multiple: Story = {
  render: () => <MultipleCheckboxes />,
};

export const WithLongLabel: Story = {
  args: {
    id: "long-label-checkbox",
    label:
      "I accept the terms and conditions and privacy policy for this service",
    checked: false,
  },
};

export const DarkMode: Story = {
  render: () => <InteractiveCheckbox />,
  parameters: {
    backgrounds: { default: "dark" },
  },
  decorators: [
    (Story) => (
      <div className="dark bg-gray-900 p-8">
        <Story />
      </div>
    ),
  ],
};
