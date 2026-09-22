import { BellAlertIcon, PlusIcon } from "@heroicons/react/24/outline";
import { fn } from "@storybook/test";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { Tooltip, TooltipProvider } from "./Tooltip";

const meta = {
  title: "Components/Actions/Button",
  component: Button,
  args: { children: "Find a table", onClick: fn() },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "accent", "ghost", "subtle", "danger"],
    },
    size: { control: "select", options: ["sm", "md", "lg", "xl"] },
  },
};

export default meta;

export const Playground = { args: { variant: "primary", size: "md" } };

export const ContentAlignment = {
  render: () => (
    <div className="grid w-72 gap-3">
      <Button><PlusIcon className="h-5 w-5" /><span>Default centered</span></Button>
      <Button variant="secondary" className="justify-start"><PlusIcon className="h-5 w-5" /><span>Start aligned</span></Button>
      <Button variant="secondary" className="justify-end"><PlusIcon className="h-5 w-5" /><span>End aligned</span></Button>
      <Button variant="secondary" className="justify-between"><PlusIcon className="h-5 w-5" /><span>Space between</span></Button>
    </div>
  ),
};

export const ProductionVariants = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {["primary", "secondary", "accent", "ghost", "subtle", "danger"].map((variant) => (
        <Button key={variant} variant={variant}>{variant}</Button>
      ))}
    </div>
  ),
};

export const DisabledAndSheen = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button disabled>Pending</Button>
      <Button variant="accent" sheen>Play online</Button>
    </div>
  ),
};

export const IconButtons = {
  render: () => (
    <TooltipProvider>
      <div className="flex gap-3">
        <Tooltip label="Enable match alerts">
          <IconButton aria-label="Enable match alerts"><BellAlertIcon /></IconButton>
        </Tooltip>
        <IconButton aria-label="Add player" variant="secondary"><PlusIcon /></IconButton>
      </div>
    </TooltipProvider>
  ),
};
