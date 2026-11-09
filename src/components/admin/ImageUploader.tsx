import { useCallback, useMemo, useRef, useState } from "react";
import { Upload, X, Crop as CropIcon, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getThumbnail } from "@/lib/cloudinary";
import { ImageCropDialog } from "@/components/admin/ImageCropDialog";

// Cloudinary configuration for Friction
const CLOUDINARY_CLOUD_NAME = "dmzuspsja";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
const CLOUDINARY_UPLOAD_PRESET = "Bubu_lifestyle";

type Props = {
  bucket: string;
  folder: string;
  value: string[];
  onChange: (next: string[]) => void;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  /** Show the product image size guideline (default: true) */
  showSizeHint?: boolean;
};

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

async function uploadToCloudinary(file: File | Blob, folder: string, baseName = "image"): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  const cloudinaryFolder = folder?.trim()?.replace(/^\/+/, "").replace(/\/+$/, "");
  if (cloudinaryFolder) form.append("folder", cloudinaryFolder);
  const clean = baseName.replace(/\.[^/.]+$/, "") || "image";
  form.append("public_id", `${Date.now()}-${Math.random().toString(16).slice(2)}-${safeFileName(clean)}`);

  const res = await fetch(CLOUDINARY_UPLOAD_URL, { method: "POST", body: form });
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || `Cloudinary upload failed (${res.status})`);
  const json = (await res.json().catch(() => null)) as any;
  if (!json?.secure_url) throw new Error("Cloudinary did not return secure_url");
  return json.secure_url as string;
}

export function ImageUploader({
  bucket: _bucket,
  folder,
  value,
  onChange,
  accept = "image/*",
  multiple = true,
  maxFiles = 10,
  showSizeHint = true,
}: Props) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [cropTarget, setCropTarget] = useState<string | null>(null);

  const canAddMore = useMemo(
    () => (multiple ? value.length < maxFiles : value.length === 0),
    [multiple, value.length, maxFiles]
  );

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!files || (Array.isArray(files) ? files.length === 0 : files.length === 0)) return;

      const fileArray = Array.isArray(files) ? files : Array.from(files);
      const limited = fileArray.slice(0, Math.max(0, maxFiles - value.length));
      if (limited.length === 0) return;

      setIsUploading(true);
      setUploadingCount(limited.length);

      try {
        const uploadedUrls: string[] = [];
        for (const file of limited) {
          const url = await uploadToCloudinary(file, folder, file.name);
          uploadedUrls.push(url);
          setUploadingCount((c) => Math.max(0, c - 1));
        }
        onChange(multiple ? [...value, ...uploadedUrls] : uploadedUrls.slice(0, 1));
      } catch (e: any) {
        toast({
          title: "Upload failed",
          description: e?.message || "Unable to upload image(s)",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
        setUploadingCount(0);
      }
    },
    [folder, maxFiles, multiple, onChange, toast, value]
  );

  const handleCroppedBlob = useCallback(
    async (blob: Blob) => {
      if (!cropTarget) return;
      try {
        const newUrl = await uploadToCloudinary(blob, folder, "cropped");
        onChange(value.map((u) => (u === cropTarget ? newUrl : u)));
        toast({ title: "Image cropped", description: "The cropped version replaced the original." });
      } catch (e: any) {
        toast({
          title: "Crop upload failed",
          description: e?.message || "Could not save the cropped image",
          variant: "destructive",
        });
      }
    },
    [cropTarget, folder, onChange, toast, value]
  );

  const onPick = () => inputRef.current?.click();

  return (
    <div className="space-y-3">
      {showSizeHint && (
        <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="space-y-0.5">
            <p className="font-medium text-foreground">
              Ideal product image: <span className="text-primary">1000 × 1000 px</span> (1:1 square)
            </p>
            <p className="text-muted-foreground">
              Use JPG / PNG / WebP under 2 MB. After upload, click the <CropIcon className="inline h-3 w-3" /> button on any image to crop it to a perfect ratio for responsive display across all devices.
            </p>
          </div>
        </div>
      )}

      <div
        className={cn(
          "rounded-lg border border-dashed p-4",
          "bg-card",
          "transition-colors",
          canAddMore ? "hover:bg-muted/40" : "opacity-60"
        )}
        onDragOver={(e) => {
          if (!canAddMore) return;
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          if (!canAddMore) return;
          e.preventDefault();
          e.stopPropagation();
          void uploadFiles(e.dataTransfer.files);
        }}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Upload className="h-5 w-5" />
          </div>
          <div className="text-sm">
            <p className="font-medium text-foreground">Drag & drop images here</p>
            <p className="text-muted-foreground">or</p>
          </div>
          <Button type="button" variant="secondary" onClick={onPick} disabled={!canAddMore || isUploading}>
            {isUploading ? `Uploading…${uploadingCount ? ` (${uploadingCount})` : ""}` : "Click to upload"}
          </Button>
          <p className="text-xs text-muted-foreground">
            {multiple ? `Up to ${maxFiles} images` : "Single image"}
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => {
            const files = e.target.files;
            if (files) void uploadFiles(files);
            e.currentTarget.value = "";
          }}
        />
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {value.map((url) => (
            <div key={url} className="group relative overflow-hidden rounded-md border bg-muted/20">
              <img
                src={getThumbnail(url, 200)}
                alt="Uploaded"
                className="h-24 w-full object-cover"
                loading="lazy"
              />
              <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <button
                  type="button"
                  onClick={() => setCropTarget(url)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
                  aria-label="Crop image"
                  title="Crop & resize"
                >
                  <CropIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((u) => u !== url))}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm hover:bg-destructive hover:text-destructive-foreground"
                  aria-label="Remove image"
                  title="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {cropTarget && (
        <ImageCropDialog
          open={!!cropTarget}
          imageUrl={cropTarget}
          onClose={() => setCropTarget(null)}
          onCropped={handleCroppedBlob}
          defaultAspect={1}
        />
      )}
    </div>
  );
}
