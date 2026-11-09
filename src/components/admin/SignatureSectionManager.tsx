import { Plus, Trash2, Star, Link as LinkIcon, Type, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImageUploader } from "@/components/admin/ImageUploader";
import type { SignatureSection } from "@/hooks/useStoreSettings";

interface SignatureSectionManagerProps {
  data: SignatureSection;
  onChange: (data: SignatureSection) => void;
}

export function SignatureSectionManager({ data, onChange }: SignatureSectionManagerProps) {
  const handleChange = (field: keyof SignatureSection, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const handleAddFeature = () => {
    handleChange("features", [...data.features, ""]);
  };

  const handleRemoveFeature = (index: number) => {
    handleChange("features", data.features.filter((_, i) => i !== index));
  };

  const handleUpdateFeature = (index: number, value: string) => {
    const updated = [...data.features];
    updated[index] = value;
    handleChange("features", updated);
  };

  return (
    <div className="space-y-6">
      {/* Enable Toggle */}
      <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div>
          <Label htmlFor="signature-enabled" className="font-medium">
            Show Signature Section
          </Label>
          <p className="text-sm text-muted-foreground">
            Display the featured product highlight on homepage
          </p>
        </div>
        <Switch
          id="signature-enabled"
          checked={data.isEnabled}
          onCheckedChange={(checked) => handleChange("isEnabled", checked)}
        />
      </div>

      {/* Image Upload */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Star className="h-4 w-4" />
          Product Image
        </Label>
        <ImageUploader
          bucket="signature"
          folder="signature-section"
          value={data.image ? [data.image] : []}
          onChange={(urls) => handleChange("image", urls[0] || "")}
          multiple={false}
          maxFiles={1}
        />
        <p className="text-xs text-muted-foreground">
          Recommended: 800x600px or similar aspect ratio
        </p>
      </div>

      {/* Badge & Title */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Badge Text</Label>
          <Input
            placeholder="e.g. Signature Drop"
            value={data.badge}
            onChange={(e) => handleChange("badge", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Price Display
          </Label>
          <Input
            placeholder="e.g. 12,999"
            value={data.price}
            onChange={(e) => handleChange("price", e.target.value)}
          />
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Type className="h-4 w-4" />
          Title
        </Label>
        <Input
          placeholder="e.g. The Classic Signature Watch"
          value={data.title}
          onChange={(e) => handleChange("title", e.target.value)}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          placeholder="Short description of the featured product..."
          value={data.desc}
          onChange={(e) => handleChange("desc", e.target.value)}
          rows={3}
        />
      </div>

      {/* Features List */}
      <div className="space-y-3">
        <Label>Features (Bullet Points)</Label>
        {data.features.map((feature, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              placeholder={`Feature ${index + 1}`}
              value={feature}
              onChange={(e) => handleUpdateFeature(index, e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveFeature(index)}
              disabled={data.features.length <= 1}
              className="text-destructive hover:text-destructive shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={handleAddFeature}>
          <Plus className="mr-2 h-4 w-4" />
          Add Feature
        </Button>
      </div>

      {/* Link */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <LinkIcon className="h-4 w-4" />
          Button Link
        </Label>
        <Input
          placeholder="e.g. /product/signature-watch"
          value={data.link}
          onChange={(e) => handleChange("link", e.target.value)}
        />
      </div>
    </div>
  );
}
