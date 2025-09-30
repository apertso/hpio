import type { Meta, StoryObj } from "@storybook/react";
import BottomNavigationBar from "./BottomNavigationBar";

const meta: Meta<typeof BottomNavigationBar> = {
  title: "Components/BottomNavigationBar",
  component: BottomNavigationBar,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div className="h-screen flex flex-col bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <p>Content Area</p>
            <p className="text-sm mt-2">The bottom navigation appears below</p>
          </div>
        </div>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    activeTab: {
      control: { type: "select" },
      options: ["login", "register"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const LoginActive: Story = {
  args: {
    activeTab: "login",
    onTabChange: () => {},
  },
};

export const RegisterActive: Story = {
  args: {
    activeTab: "register",
    onTabChange: () => {},
  },
};
