import type { Meta, StoryObj } from "@storybook/react";
import ConfirmModal from "./ConfirmModal";
import { useState } from "react";
import { Button } from "./Button";

const meta: Meta<typeof ConfirmModal> = {
  title: "Components/ConfirmModal",
  component: ConfirmModal,
  tags: ["autodocs"],
  argTypes: {
    onClose: { action: "closed" },
    onConfirm: { action: "confirmed" },
  },
};

export default meta;
type Story = StoryObj<typeof ConfirmModal>;

const InteractiveConfirmModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Confirmation</Button>
      <ConfirmModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={() => {
          setIsOpen(false);
        }}
        title="Delete Item"
        message="Are you sure you want to delete this item? This action cannot be undone."
        confirmText="Yes, Delete"
      />
    </>
  );
};

export const Default: Story = {
  render: () => <InteractiveConfirmModal />,
};
