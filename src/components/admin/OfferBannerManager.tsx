import { Sparkles, Link as LinkIcon, Type, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImageUploader } from "@/components/admin/ImageUploader";
import type { OfferBanner } from "@/hooks/useStoreSettings";

interface OfferBannerManagerProps {
  data: OfferBanner;
  onChange: (data: OfferBanner) => void;
}

export function OfferBannerManager({ data, onChange }: OfferBannerManagerProps) {
  const handleChange = (field: keyof OfferBanner, value: any) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Enable Toggle */}
      <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div>
          <Label htmlFor="banner-enabled" className="font-medium">
            Show Promotional Banner
          </Label>
          <p className="text-sm text-muted-foreground">
            Display the seasonal offer banner on homepage
          </p>
        </div>
        <Switch
          id="banner-enabled"
          checked={data.isEnabled}
          onCheckedChange={(checked) => handleChange("isEnabled", checked)}
        />
      </div>

      {/* Background Image */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          Background Image (Optional)
        </Label>
        <ImageUploader
          bucket="banner"
          folder="offer-banner"
          value={data.image ? [data.image] : []}
          onChange={(urls) => handleChange("image", urls[0] || "")}
          multiple={false}
          maxFiles={1}
        />
        <p className="text-xs text-muted-foreground">
          Optional: Will overlay on the gradient background. Recommended: 1920x400px
        </p>
      </div>

      {/* Badge */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Badge Text
        </Label>
        <Input
          placeholder="e.g. Seasonal Collection"
          value={data.badge}
          onChange={(e) => handleChange("badge", e.target.value)}
        />
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Type className="h-4 w-4" />
          Main Title
        </Label>
        <Input
          placeholder="e.g. Exclusive Season Offer"
          value={data.title}
          onChange={(e) => handleChange("title", e.target.value)}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label>Subtitle / Description</Label>
        <Textarea
          placeholder="e.g. Get up to 30% off on selected items this season."
          value={data.desc}
          onChange={(e) => handleChange("desc", e.target.value)}
          rows={2}
        />
      </div>

      {/* Button */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Button Text</Label>
          <Input
            placeholder="e.g. Shop Offers"
            value={data.btnText}
            onChange={(e) => handleChange("btnText", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Button Link
          </Label>
          <Input
            placeholder="e.g. /offers or #deals"
            value={data.link}
            onChange={(e) => handleChange("link", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
