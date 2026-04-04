import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface SignaturePadProps {
  label: string;
  onSave: (signature: string) => void;
  existingSignature?: string;
}

export default function SignaturePad({
  label,
  onSave,
  existingSignature,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = 400 * ratio;
    canvas.height = 120 * ratio;
    ctx.scale(ratio, ratio);

    ctx.strokeStyle = "#1a56db";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (existingSignature) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = existingSignature;
      setIsEmpty(false);
      setSaved(true);
    }
  }, [existingSignature]);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pos = getPos(e, canvas);

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);

    setIsDrawing(true);
    setIsEmpty(false);
    setSaved(false);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pos = getPos(e, canvas);

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    setIsEmpty(true);
    setSaved(false);

    onSave("");
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;

    const dataUrl = canvas.toDataURL("image/png");

    onSave(dataUrl);
    setSaved(true);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground">{label}</p>

      <div className="border-2 border-dashed border-primary/40 rounded-xl overflow-hidden bg-white relative">
        <canvas
          ref={canvasRef}
          className="w-full h-[120px] touch-none cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-gray-300 text-sm">
              Signez ici avec le doigt...
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clear}
          className="flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          Effacer
        </Button>

        <Button
          type="button"
          size="sm"
          onClick={save}
          disabled={isEmpty || saved}
          className="bg-primary text-white"
        >
          {saved ? "✅ Signé" : "Valider la signature"}
        </Button>
      </div>
    </div>
  );
}
