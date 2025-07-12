import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";
import { ArrowRightIcon } from "@heroicons/react/24/solid";

const meta: Meta<typeof Button> = {
  title: "Components/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    onClick: { action: "clicked" },
    variant: {
      control: "select",
      options: ["default", "small", "icon"],
    },
    label: { control: "text" },
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    label: "Default Button",
    variant: "default",
  },
};

export const Small: Story = {
  args: {
    label: "Small Button",
    variant: "small",
  },
};

export const WithIcon: Story = {
  args: {
    label: "Button with Icon",
    icon: <ArrowRightIcon className="w-4 h-4" />,
  },
};

export const IconOnly: Story = {
  args: {
    icon: <ArrowRightIcon className="w-5 h-5" />,
    variant: "icon",
    "aria-label": "Icon Button",
  },
};

export const Disabled: Story = {
  args: {
    label: "Disabled",
    disabled: true,
  },
};
