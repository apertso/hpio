// frontend/src/components/Select.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import Select, { SelectOption } from "./Select";
import { useState } from "react";

const meta: Meta<typeof Select> = {
  title: "Components/Select",
  component: Select,
  tags: ["autodocs"],
  argTypes: {
    label: { control: "text" },
    placeholder: { control: "text" },
    error: { control: "text" },
    disabled: { control: "boolean" },
    onChange: { action: "changed" },
  },
  decorators: [
    (Story) => (
      <div style={{ height: "250px" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Select>;

const options: SelectOption[] = [
  { value: "cat1", label: "Category 1" },
  { value: "cat2", label: "Category 2" },
  { value: "cat3", label: "Category 3" },
  { value: "cat4", label: "A very long category name to test wrapping" },
];

const InteractiveSelect = (args: React.ComponentProps<typeof Select>) => {
  const [value, setValue] = useState<string | null>(args.value || null);
  return <Select {...args} value={value} onChange={setValue} />;
};

export const Default: Story = {
  args: {
    label: "Category",
    placeholder: "Select a category",
    options,
  },
  render: InteractiveSelect,
};

export const WithValue: Story = {
  args: {
    label: "Category",
    placeholder: "Select a category",
    options,
    value: "cat2",
  },
  render: InteractiveSelect,
};

export const WithError: Story = {
  args: {
    label: "Category",
    placeholder: "Select a category",
    options,
    error: "This field is required",
  },
  render: InteractiveSelect,
};

export const Disabled: Story = {
  args: {
    label: "Category",
    placeholder: "Select a category",
    options,
    value: "cat1",
    disabled: true,
  },
  render: InteractiveSelect,
};
