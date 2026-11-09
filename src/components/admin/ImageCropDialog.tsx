import { useCallback, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Loader2, Crop as CropIcon } from "lucide-react";

interface Props {
  open: boolean;
  imageUrl: string;
  onClose: () => void;
  onCropped: (blob: Blob) => void | Promise<void>;
  defaultAspect?: number;
}

const ASPECTS: { label: string; value: number }[] = [
  { label: "1:1 (Square — Recommended)", value: 1 },
  { label: "4:5 (Portrait)", value: 4 / 5 },
  { label: "3:4 (Portrait)", value: 3 / 4 },
  { label: "16:9 (Wide)", value: 16 / 9 },
];

async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  // Render at native pixel size of the crop, capped at 2000px for safety
  const maxDim = 2000;
  const scale = Math.min(1, maxDim / Math.max(pixelCrop.width, pixelCrop.height));
  const outW = Math.round(pixelCrop.width * scale);
  const outH = Math.round(pixelCrop.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, outW, outH
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      0.92
    );
  });
}

export function ImageCropDialog({ open, imageUrl, onClose, onCropped, defaultAspect = 1 }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState(defaultAspect);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  const handleSave = async () => {
    if (!croppedArea) return;
    setSaving(true);
    try {
      const blob = await getCroppedBlob(imageUrl, croppedArea);
      await onCropped(blob);
      onClose();
    } catch (e) {
      console.error("Crop failed", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !saving && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CropIcon className="h-5 w-5" /> Crop & Resize Image
          </DialogTitle>
          <DialogDescription>
            Pick an aspect ratio, drag to position, and zoom for the perfect frame.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {ASPECTS.map((a) => (
              <Button
                key={a.label}
                type="button"
                size="sm"
                variant={aspect === a.value ? "default" : "outline"}
                onClick={() => setAspect(a.value)}
              >
                {a.label}
              </Button>
            ))}
          </div>

          <div className="relative h-[420px] w-full overflow-hidden rounded-md bg-black">
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              objectFit="contain"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Zoom</Label>
            <Slider
              min={1}
              max={4}
              step={0.05}
              value={[zoom]}
              onValueChange={(v) => setZoom(v[0])}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !croppedArea}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CropIcon className="mr-2 h-4 w-4" />}
            Apply Crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
