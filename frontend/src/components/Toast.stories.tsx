import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";
import { ToastProvider, useToast } from "../context/ToastContext";

const meta: Meta<typeof Button> = {
  title: "Components/Toast",
  component: Button,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
};

export default meta;

const ToastExample: React.FC = () => {
  const { showToast } = useToast();

  return (
    <div className="flex gap-4">
      <Button
        onClick={() => showToast("This is a success message!", "success")}
      >
        Show Success
      </Button>
      <Button onClick={() => showToast("This is an error message!", "error")}>
        Show Error
      </Button>
      <Button onClick={() => showToast("This is an info message.", "info")}>
        Show Info
      </Button>
    </div>
  );
};

export const Default: StoryObj = {
  render: () => <ToastExample />,
};
