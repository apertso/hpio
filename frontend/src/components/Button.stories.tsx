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
      options: ["primary", "secondary", "destructive", "link", "ghost"],
    },
    size: {
      control: "select",
      options: ["default", "small", "large"],
    },
    layout: {
      control: "select",
      options: ["default", "icon-only", "text-only"],
    },
    label: { control: "text" },
    disabled: { control: "boolean" },
    loading: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    label: "Primary Button",
    variant: "primary",
  },
};

export const Secondary: Story = {
  args: {
    label: "Secondary Button",
    variant: "secondary",
  },
};

export const Destructive: Story = {
  args: {
    label: "Delete",
    variant: "destructive",
  },
};

export const Link: Story = {
  args: {
    label: "Link Button",
    variant: "link",
  },
};

export const Ghost: Story = {
  args: {
    label: "Ghost Button",
    variant: "ghost",
  },
};

export const Small: Story = {
  args: {
    label: "Small Button",
    variant: "primary",
    size: "small",
  },
};

export const Large: Story = {
  args: {
    label: "Large Button",
    variant: "primary",
    size: "large",
  },
};

export const WithIcon: Story = {
  args: {
    label: "Button with Icon",
    icon: <ArrowRightIcon className="w-4 h-4" />,
    variant: "primary",
  },
};

export const IconOnly: Story = {
  args: {
    icon: <ArrowRightIcon className="w-5 h-5" />,
    variant: "primary",
    layout: "icon-only",
    "aria-label": "Icon Button",
  },
};

export const TextOnly: Story = {
  args: {
    label: "Text Only",
    variant: "secondary",
    layout: "text-only",
  },
};

export const Disabled: Story = {
  args: {
    label: "Disabled",
    variant: "primary",
    disabled: true,
  },
};

export const Loading: Story = {
  args: {
    label: "Loading",
    variant: "primary",
    loading: true,
  },
};
