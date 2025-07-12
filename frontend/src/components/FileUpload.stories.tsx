import type { Meta, StoryObj } from "@storybook/react";
import FileUpload from "./FileUpload";

const meta: Meta<typeof FileUpload> = {
  title: "Components/FileUpload",
  component: FileUpload,
  tags: ["autodocs"],
  argTypes: {
    onFileUploadSuccess: { action: "onFileUploadSuccess" },
    onFileDeleteSuccess: { action: "onFileDeleteSuccess" },
    onError: { action: "onError" },
  },
};

export default meta;
type Story = StoryObj<typeof FileUpload>;

export const Default: Story = {
  args: {
    paymentId: "mock-payment-id",
  },
};

export const Disabled: Story = {
  name: "Disabled (No Payment ID)",
  args: {
    paymentId: undefined,
  },
};

export const FileAttached: Story = {
  args: {
    paymentId: "mock-payment-id",
    initialFile: {
      filePath: "/uploads/some-file.pdf",
      fileName: "Invoice_December_2024.pdf",
    },
  },
};

export const Submitting: Story = {
  name: "Form is Submitting",
  args: {
    paymentId: "mock-payment-id",
    isSubmitting: true,
  },
};

export const Deleting: Story = {
  name: "File is Deleting",
  args: {
    paymentId: "mock-payment-id",
    initialFile: {
      filePath: "/uploads/some-file.pdf",
      fileName: "Invoice_December_2024.pdf",
    },
    // This state would be controlled by the hook, we simulate it
    // In a real story, you might mock the useFileDeletionLogic hook
  },
  // We can't easily simulate the isDeleting state without complex mocks
  // This story mainly shows the component with a file, which is the prerequisite for deletion.
};
