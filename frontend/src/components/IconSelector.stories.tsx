import type { Meta, StoryObj } from "@storybook/react";
import IconSelector, { IconSelectorProps } from "./IconSelector";
import { useState } from "react";
import { BuiltinIcon } from "../utils/builtinIcons";

const meta: Meta<typeof IconSelector> = {
  title: "Components/IconSelector",
  component: IconSelector,
  tags: ["autodocs"],
  argTypes: {
    isFormSubmitting: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof IconSelector>;

const InteractiveIconSelector = ({ isFormSubmitting = false }) => {
  const [icon, setIcon] = useState<BuiltinIcon | null>("credit-card");
  return (
    <IconSelector
      selectedIconName={icon}
      onIconChange={setIcon}
      isFormSubmitting={isFormSubmitting}
    />
  );
};

export const Default: Story = {
  render: (args) => <InteractiveIconSelector {...args} />,
};

const NoIconSelectedComponent = (args: Partial<IconSelectorProps>) => {
  const [icon, setIcon] = useState<BuiltinIcon | null>(null);
  return (
    <IconSelector {...args} selectedIconName={icon} onIconChange={setIcon} />
  );
};

export const NoIconSelected: Story = {
  render: (args) => <NoIconSelectedComponent {...args} />,
};

export const Disabled: Story = {
  args: {
    isFormSubmitting: true,
  },
  render: (args) => <InteractiveIconSelector {...args} />,
};
