import { useState, useCallback } from "react";
import { X, Delete } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface POSCalculatorProps {
  onClose: () => void;
}

export function POSCalculator({ onClose }: POSCalculatorProps) {
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputDigit = useCallback((digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? digit : display + digit);
    }
  }, [display, waitingForOperand]);

  const inputDecimal = useCallback(() => {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
    } else if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  }, [display, waitingForOperand]);

  const clear = useCallback(() => {
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  }, []);

  const backspace = useCallback(() => {
    if (waitingForOperand) return;
    if (display.length === 1 || (display.length === 2 && display.startsWith("-"))) {
      setDisplay("0");
    } else {
      setDisplay(display.slice(0, -1));
    }
  }, [display, waitingForOperand]);

  const toggleSign = useCallback(() => {
    const value = parseFloat(display);
    if (value !== 0) {
      setDisplay(String(-value));
    }
  }, [display]);

  const percentage = useCallback(() => {
    const value = parseFloat(display);
    if (previousValue !== null && operation) {
      // Calculate percentage of the previous value
      const percentValue = (previousValue * value) / 100;
      setDisplay(String(percentValue));
    } else {
      // Just divide by 100
      setDisplay(String(value / 100));
    }
  }, [display, previousValue, operation]);

  const performOperation = useCallback((nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const result = calculate(previousValue, inputValue, operation);
      setDisplay(String(result));
      setPreviousValue(result);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  }, [display, previousValue, operation]);

  const calculate = (left: number, right: number, op: string): number => {
    switch (op) {
      case "+":
        return left + right;
      case "-":
        return left - right;
      case "*":
        return left * right;
      case "/":
        return right !== 0 ? left / right : 0;
      default:
        return right;
    }
  };

  const equals = useCallback(() => {
    if (previousValue === null || operation === null) return;

    const inputValue = parseFloat(display);
    const result = calculate(previousValue, inputValue, operation);

    // Format result to avoid floating point issues
    const formattedResult = parseFloat(result.toFixed(10));
    setDisplay(String(formattedResult));
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(true);
  }, [display, previousValue, operation]);

  const CalcButton = ({
    children,
    onClick,
    className,
    variant = "default",
  }: {
    children: React.ReactNode;
    onClick: () => void;
    className?: string;
    variant?: "default" | "operator" | "action" | "equals";
  }) => {
    const baseClasses = "h-14 text-lg font-semibold rounded-xl transition-all duration-150 active:scale-95";
    const variantClasses = {
      default: "bg-muted hover:bg-muted/80 text-foreground",
      operator: "bg-primary/20 hover:bg-primary/30 text-primary font-bold",
      action: "bg-destructive/10 hover:bg-destructive/20 text-destructive",
      equals: "bg-primary hover:bg-primary/90 text-primary-foreground",
    };

    return (
      <button
        onClick={onClick}
        className={cn(baseClasses, variantClasses[variant], className)}
      >
        {children}
      </button>
    );
  };

  return (
    <div className="w-72 bg-background border rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b">
        <span className="text-sm font-medium text-muted-foreground">Calculator</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Display */}
      <div className="px-4 py-4 bg-muted/30">
        <div className="text-right text-3xl font-mono font-bold text-foreground truncate">
          {display}
        </div>
        {operation && previousValue !== null && (
          <div className="text-right text-sm text-muted-foreground mt-1">
            {previousValue} {operation}
          </div>
        )}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-4 gap-2 p-3">
        {/* Row 1 */}
        <CalcButton onClick={clear} variant="action">C</CalcButton>
        <CalcButton onClick={toggleSign} variant="action">±</CalcButton>
        <CalcButton onClick={percentage} variant="action">%</CalcButton>
        <CalcButton onClick={() => performOperation("/")} variant="operator">÷</CalcButton>

        {/* Row 2 */}
        <CalcButton onClick={() => inputDigit("7")}>7</CalcButton>
        <CalcButton onClick={() => inputDigit("8")}>8</CalcButton>
        <CalcButton onClick={() => inputDigit("9")}>9</CalcButton>
        <CalcButton onClick={() => performOperation("*")} variant="operator">×</CalcButton>

        {/* Row 3 */}
        <CalcButton onClick={() => inputDigit("4")}>4</CalcButton>
        <CalcButton onClick={() => inputDigit("5")}>5</CalcButton>
        <CalcButton onClick={() => inputDigit("6")}>6</CalcButton>
        <CalcButton onClick={() => performOperation("-")} variant="operator">−</CalcButton>

        {/* Row 4 */}
        <CalcButton onClick={() => inputDigit("1")}>1</CalcButton>
        <CalcButton onClick={() => inputDigit("2")}>2</CalcButton>
        <CalcButton onClick={() => inputDigit("3")}>3</CalcButton>
        <CalcButton onClick={() => performOperation("+")} variant="operator">+</CalcButton>

        {/* Row 5 */}
        <CalcButton onClick={() => inputDigit("0")} className="col-span-1">0</CalcButton>
        <CalcButton onClick={() => inputDigit("00")}>00</CalcButton>
        <CalcButton onClick={inputDecimal}>.</CalcButton>
        <CalcButton onClick={equals} variant="equals">=</CalcButton>

        {/* Backspace row */}
        <CalcButton onClick={backspace} className="col-span-4 h-10" variant="action">
          <Delete className="h-4 w-4 mx-auto" />
        </CalcButton>
      </div>
    </div>
  );
}
