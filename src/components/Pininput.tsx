import { useRef, useState, KeyboardEvent, ClipboardEvent } from "react";
import { cn } from "@/lib/utils";

interface PinInputProps {
  length?: number;
  onComplete: (pin: string) => void;
  onChange?: (pin: string) => void;
  disabled?: boolean;
  error?: boolean;
  shake?: boolean;
}

export default function PinInput({
  length = 4,
  onComplete,
  onChange,
  disabled = false,
  error = false,
  shake = false,
}: PinInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(""));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const focusAt = (index: number) => {
    const el = inputsRef.current[index];
    if (el) {
      el.focus();
      el.select();
    }
  };

  const handleChange = (index: number, value: string) => {
    // Accept only digits
    const digit = value.replace(/\D/g, "").slice(-1);
    const newValues = [...values];
    newValues[index] = digit;
    setValues(newValues);
    onChange?.(newValues.join(""));

    if (digit && index < length - 1) {
      focusAt(index + 1);
    }

    const pin = newValues.join("");
    if (pin.length === length && newValues.every((v) => v !== "")) {
      onComplete(pin);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (values[index]) {
        const newValues = [...values];
        newValues[index] = "";
        setValues(newValues);
        onChange?.(newValues.join(""));
      } else if (index > 0) {
        const newValues = [...values];
        newValues[index - 1] = "";
        setValues(newValues);
        onChange?.(newValues.join(""));
        focusAt(index - 1);
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && index > 0) {
      focusAt(index - 1);
    } else if (e.key === "ArrowRight" && index < length - 1) {
      focusAt(index + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    const newValues = [...values];
    for (let i = 0; i < pasted.length; i++) {
      newValues[i] = pasted[i];
    }
    setValues(newValues);
    onChange?.(newValues.join(""));
    const nextFocus = Math.min(pasted.length, length - 1);
    focusAt(nextFocus);
    if (pasted.length === length) {
      onComplete(pasted);
    }
  };

  const handleFocus = (index: number) => {
    inputsRef.current[index]?.select();
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-3",
        shake && "animate-[shake_0.4s_ease-in-out]"
      )}
      style={{
        // Define shake animation inline via CSS variable trick
      }}
    >
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(3px); }
        }
        .pin-shake { animation: shake 0.4s ease-in-out; }
        .pin-box {
          width: 60px;
          height: 68px;
          border-radius: 12px;
          border: 2px solid transparent;
          background: rgba(0,255,120,0.05);
          color: #00ff78;
          font-size: 1.75rem;
          font-weight: 700;
          text-align: center;
          font-family: 'Courier New', monospace;
          caret-color: transparent;
          outline: none;
          transition: all 0.2s cubic-bezier(0.4,0,0.2,1);
          box-shadow: 0 0 0 1px rgba(0,255,120,0.2), inset 0 2px 8px rgba(0,0,0,0.4);
          -webkit-text-security: disc;
        }
        .pin-box:focus {
          border-color: #00ff78;
          box-shadow: 0 0 0 1px #00ff78, 0 0 16px rgba(0,255,120,0.4), inset 0 2px 8px rgba(0,0,0,0.4);
          background: rgba(0,255,120,0.08);
          transform: translateY(-2px) scale(1.05);
        }
        .pin-box.has-value {
          border-color: rgba(0,255,120,0.5);
          box-shadow: 0 0 0 1px rgba(0,255,120,0.3), 0 0 10px rgba(0,255,120,0.2), inset 0 2px 8px rgba(0,0,0,0.4);
        }
        .pin-box.error {
          border-color: #ff4444;
          box-shadow: 0 0 0 1px #ff4444, 0 0 16px rgba(255,68,68,0.4), inset 0 2px 8px rgba(0,0,0,0.4);
          color: #ff4444;
        }
        .pin-box:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
      {values.map((val, i) => (
        <input
          key={i}
          ref={(el) => (inputsRef.current[i] = el)}
          className={cn(
            "pin-box",
            val && "has-value",
            error && "error",
            shake && "pin-shake"
          )}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={val ? "●" : ""}
          autoFocus={i === 0}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value.replace("●", ""))}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(i)}
          autoComplete="one-time-code"
        />
      ))}
    </div>
  );
}
