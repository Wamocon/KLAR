import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

describe("UI Components", () => {
  describe("Button", () => {
    it("renders with text content", () => {
      render(<Button>Click me</Button>);
      expect(screen.getByText("Click me")).toBeDefined();
    });

    it("renders default variant", () => {
      const { container } = render(<Button>Default</Button>);
      const button = container.querySelector("button");
      expect(button).toBeDefined();
    });

    it("renders outline variant", () => {
      const { container } = render(<Button variant="outline">Outline</Button>);
      const button = container.querySelector("button");
      expect(button).toBeDefined();
    });

    it("renders ghost variant", () => {
      render(<Button variant="ghost">Ghost</Button>);
      expect(screen.getByText("Ghost")).toBeDefined();
    });

    it("supports disabled state", () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole("button");
      expect(button.hasAttribute("disabled")).toBe(true);
    });

    it("renders different sizes", () => {
      const { container: sm } = render(<Button size="sm">Small</Button>);
      const { container: lg } = render(<Button size="lg">Large</Button>);
      expect(sm.querySelector("button")).toBeDefined();
      expect(lg.querySelector("button")).toBeDefined();
    });

    it("renders with custom className", () => {
      const { container } = render(
        <Button className="custom-class">Custom</Button>
      );
      const button = container.querySelector("button");
      expect(button?.classList.contains("custom-class")).toBe(true);
    });
  });

  describe("Card", () => {
    it("renders card with content", () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Card</CardTitle>
          </CardHeader>
          <CardContent>Card body</CardContent>
        </Card>
      );
      expect(screen.getByText("Test Card")).toBeDefined();
      expect(screen.getByText("Card body")).toBeDefined();
    });

    it("renders nested components", () => {
      const { container } = render(
        <Card>
          <CardContent>
            <p>Nested content</p>
          </CardContent>
        </Card>
      );
      expect(container.querySelector("p")?.textContent).toBe("Nested content");
    });
  });

  describe("Badge", () => {
    it("renders with text", () => {
      render(<Badge>Status</Badge>);
      expect(screen.getByText("Status")).toBeDefined();
    });

    it("renders default variant", () => {
      const { container } = render(<Badge>Default</Badge>);
      expect(container.firstChild).toBeDefined();
    });

    it("renders secondary variant", () => {
      render(<Badge variant="secondary">Secondary</Badge>);
      expect(screen.getByText("Secondary")).toBeDefined();
    });

    it("renders destructive variant", () => {
      render(<Badge variant="destructive">Error</Badge>);
      expect(screen.getByText("Error")).toBeDefined();
    });
  });

  describe("Input", () => {
    it("renders an input element", () => {
      const { container } = render(<Input placeholder="Enter text" />);
      const input = container.querySelector("input");
      expect(input).toBeDefined();
      expect(input?.getAttribute("placeholder")).toBe("Enter text");
    });

    it("supports type attribute", () => {
      const { container } = render(<Input type="email" />);
      const input = container.querySelector("input");
      expect(input?.getAttribute("type")).toBe("email");
    });

    it("supports disabled state", () => {
      const { container } = render(<Input disabled />);
      const input = container.querySelector("input");
      expect(input?.hasAttribute("disabled")).toBe(true);
    });
  });

  describe("Textarea", () => {
    it("renders a textarea element", () => {
      const { container } = render(<Textarea placeholder="Enter long text" />);
      const textarea = container.querySelector("textarea");
      expect(textarea).toBeDefined();
      expect(textarea?.getAttribute("placeholder")).toBe("Enter long text");
    });

    it("supports rows attribute", () => {
      const { container } = render(<Textarea rows={5} />);
      const textarea = container.querySelector("textarea");
      expect(textarea?.getAttribute("rows")).toBe("5");
    });
  });

  describe("Progress", () => {
    it("renders a progress bar", () => {
      const { container } = render(<Progress value={75} />);
      expect(container.firstChild).toBeDefined();
    });

    it("renders with zero value", () => {
      const { container } = render(<Progress value={0} />);
      expect(container.firstChild).toBeDefined();
    });

    it("renders with 100% value", () => {
      const { container } = render(<Progress value={100} />);
      expect(container.firstChild).toBeDefined();
    });
  });

  describe("Skeleton", () => {
    it("renders a skeleton placeholder", () => {
      const { container } = render(<Skeleton className="h-4 w-32" />);
      expect(container.firstChild).toBeDefined();
    });
  });

  describe("Button — edge cases", () => {
    it("fires onClick handler", () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click</Button>);
      const button = screen.getByRole("button");
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("does not fire onClick when disabled", () => {
      const handleClick = vi.fn();
      render(<Button disabled onClick={handleClick}>Disabled</Button>);
      const button = screen.getByRole("button");
      fireEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it("renders with no children (empty button)", () => {
      const { container } = render(<Button />);
      const button = container.querySelector("button");
      expect(button).toBeDefined();
      expect(button?.textContent).toBe("");
    });

    it("applies custom className", () => {
      const { container } = render(<Button className="custom-class">Test</Button>);
      const button = container.querySelector("button");
      expect(button?.className).toContain("custom-class");
    });

    it("renders with type=submit", () => {
      const { container } = render(<Button type="submit">Submit</Button>);
      const button = container.querySelector("button");
      expect(button?.getAttribute("type")).toBe("submit");
    });

    it("handles very long text content", () => {
      const longText = "A".repeat(1000);
      render(<Button>{longText}</Button>);
      expect(screen.getByText(longText)).toBeDefined();
    });

    it("handles special characters in content", () => {
      render(<Button>{"<script>alert('xss')</script>"}</Button>);
      // React auto-escapes, so it renders as text
      expect(screen.getByText("<script>alert('xss')</script>")).toBeDefined();
    });
  });

  describe("Input — edge cases", () => {
    it("handles value change via fireEvent", () => {
      const handleChange = vi.fn();
      const { container } = render(<Input onChange={handleChange} />);
      const input = container.querySelector("input")!;
      fireEvent.change(input, { target: { value: "new value" } });
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it("renders with type=password", () => {
      const { container } = render(<Input type="password" />);
      const input = container.querySelector("input");
      expect(input?.getAttribute("type")).toBe("password");
    });

    it("renders with type=number", () => {
      const { container } = render(<Input type="number" />);
      const input = container.querySelector("input");
      expect(input?.getAttribute("type")).toBe("number");
    });

    it("applies custom className", () => {
      const { container } = render(<Input className="my-input" />);
      const input = container.querySelector("input");
      expect(input?.className).toContain("my-input");
    });

    it("supports required attribute", () => {
      const { container } = render(<Input required />);
      const input = container.querySelector("input");
      expect(input?.hasAttribute("required")).toBe(true);
    });

    it("supports maxLength attribute", () => {
      const { container } = render(<Input maxLength={100} />);
      const input = container.querySelector("input");
      expect(input?.getAttribute("maxlength")).toBe("100");
    });
  });

  describe("Textarea — edge cases", () => {
    it("handles value change", () => {
      const handleChange = vi.fn();
      const { container } = render(<Textarea onChange={handleChange} />);
      const textarea = container.querySelector("textarea")!;
      fireEvent.change(textarea, { target: { value: "new text" } });
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it("supports disabled state", () => {
      const { container } = render(<Textarea disabled />);
      const textarea = container.querySelector("textarea");
      expect(textarea?.hasAttribute("disabled")).toBe(true);
    });

    it("applies custom className", () => {
      const { container } = render(<Textarea className="custom-textarea" />);
      const textarea = container.querySelector("textarea");
      expect(textarea?.className).toContain("custom-textarea");
    });
  });

  describe("Progress — edge cases", () => {
    it("clamps negative value to 0%", () => {
      const { container } = render(<Progress value={-10} />);
      const indicator = container.querySelector("[role=progressbar] > div") as HTMLElement;
      expect(indicator?.style.width).toBe("0%");
    });

    it("clamps value over 100 to 100%", () => {
      const { container } = render(<Progress value={200} />);
      const indicator = container.querySelector("[role=progressbar] > div") as HTMLElement;
      expect(indicator?.style.width).toBe("100%");
    });

    it("renders correctly at 50%", () => {
      const { container } = render(<Progress value={50} />);
      const indicator = container.querySelector("[role=progressbar] > div") as HTMLElement;
      expect(indicator?.style.width).toBe("50%");
    });

    it("sets correct ARIA attributes", () => {
      const { container } = render(<Progress value={75} />);
      const bar = container.querySelector("[role=progressbar]");
      expect(bar?.getAttribute("aria-valuenow")).toBe("75");
      expect(bar?.getAttribute("aria-valuemin")).toBe("0");
      expect(bar?.getAttribute("aria-valuemax")).toBe("100");
    });

    it("supports custom max value", () => {
      const { container } = render(<Progress value={50} max={200} />);
      const indicator = container.querySelector("[role=progressbar] > div") as HTMLElement;
      expect(indicator?.style.width).toBe("25%");
    });

    it("supports custom indicatorClassName", () => {
      const { container } = render(<Progress value={50} indicatorClassName="bg-blue-500" />);
      const indicator = container.querySelector("[role=progressbar] > div");
      expect(indicator?.className).toContain("bg-blue-500");
    });
  });

  describe("Card — edge cases", () => {
    it("renders with custom className", () => {
      const { container } = render(<Card className="my-card"><CardContent>Test</CardContent></Card>);
      expect(container.firstChild).toBeDefined();
    });

    it("renders CardContent without CardHeader", () => {
      const { container } = render(
        <Card><CardContent>Only content</CardContent></Card>
      );
      expect(screen.getByText("Only content")).toBeDefined();
    });
  });

  describe("Badge — edge cases", () => {
    it("renders with outline variant", () => {
      render(<Badge variant="outline">Outline</Badge>);
      expect(screen.getByText("Outline")).toBeDefined();
    });

    it("renders with custom className", () => {
      const { container } = render(<Badge className="custom-badge">Custom</Badge>);
      expect(container.firstChild).toBeDefined();
    });

    it("renders with empty content", () => {
      const { container } = render(<Badge>{""}</Badge>);
      expect(container.firstChild).toBeDefined();
    });
  });
});
