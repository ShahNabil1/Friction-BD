import { useState } from "react";
import { Plus, Trash2, GripVertical, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { cn } from "@/lib/utils";

export interface HeroSlide {
  id: string;
  image: string;
  // Legacy fields - kept for backward compatibility but not used in UI
  title?: string;
  subtitle?: string;
  buttonText?: string;
  link?: string;
}

interface HeroSliderManagerProps {
  slides: HeroSlide[];
  onChange: (slides: HeroSlide[]) => void;
}

const MIN_SLIDES = 1;
const MAX_SLIDES = 8;

export function HeroSliderManager({ slides, onChange }: HeroSliderManagerProps) {
  const [expandedSlide, setExpandedSlide] = useState<string | null>(null);

  const canDelete = slides.length > MIN_SLIDES;
  const canAdd = slides.length < MAX_SLIDES;

  const generateId = () => `slide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const handleAddSlide = () => {
    if (!canAdd) return;
    const newSlide: HeroSlide = {
      id: generateId(),
      image: "",
    };
    onChange([...slides, newSlide]);
    setExpandedSlide(newSlide.id);
  };

  const handleDeleteSlide = (id: string) => {
    if (!canDelete) return;
    onChange(slides.filter((s) => s.id !== id));
    if (expandedSlide === id) {
      setExpandedSlide(null);
    }
  };

  const handleImageChange = (id: string, urls: string[]) => {
    onChange(slides.map((s) => (s.id === id ? { ...s, image: urls[0] || "" } : s)));
  };

  // Move slide up in order
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newSlides = [...slides];
    [newSlides[index - 1], newSlides[index]] = [newSlides[index], newSlides[index - 1]];
    onChange(newSlides);
  };

  // Move slide down in order
  const handleMoveDown = (index: number) => {
    if (index === slides.length - 1) return;
    const newSlides = [...slides];
    [newSlides[index], newSlides[index + 1]] = [newSlides[index + 1], newSlides[index]];
    onChange(newSlides);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upload banner images for your homepage slider. Recommended size: 1920×600px (16:3 aspect ratio).
      </p>

      {/* Slide List */}
      <div className="space-y-3">
        {slides.map((slide, index) => {
          const isExpanded = expandedSlide === slide.id;

          return (
            <Card
              key={slide.id}
              className={cn(
                "border-border/50 transition-all",
                isExpanded && "ring-2 ring-primary/20"
              )}
            >
              <CardContent className="p-4">
                {/* Header Row */}
                <div className="flex items-center gap-3">
                  {/* Sort Controls */}
                  <div className="flex flex-col gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                    >
                      <span className="text-xs">▲</span>
                    </Button>
                    <div className="flex h-6 w-6 items-center justify-center text-xs text-muted-foreground font-medium">
                      {index + 1}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === slides.length - 1}
                    >
                      <span className="text-xs">▼</span>
                    </Button>
                  </div>

                  {/* Thumbnail */}
                  <div className="h-16 w-28 flex-shrink-0 overflow-hidden rounded border bg-muted">
                    {slide.image ? (
                      <img
                        src={slide.image.replace("/upload/", "/upload/w_224,h_128,c_fill,f_auto,q_auto/")}
                        alt={`Slide ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">
                      Banner {index + 1}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {slide.image ? "Image uploaded" : "No image yet"}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedSlide(isExpanded ? null : slide.id)}
                    >
                      {isExpanded ? "Collapse" : slide.image ? "Change" : "Upload"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteSlide(slide.id)}
                      disabled={!canDelete}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Expanded Image Upload */}
                {isExpanded && (
                  <div className="mt-4 space-y-3 border-t pt-4">
                    <ImageUploader
                      bucket="hero"
                      folder="hero-slides"
                      value={slide.image ? [slide.image] : []}
                      onChange={(urls) => handleImageChange(slide.id, urls)}
                      multiple={false}
                      maxFiles={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Recommended: 1920×600px or similar wide banner ratio. The image will be displayed full-width.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Button */}
      {canAdd && (
        <Button type="button" variant="outline" onClick={handleAddSlide} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Add Banner ({slides.length}/{MAX_SLIDES})
        </Button>
      )}

      {!canAdd && (
        <p className="text-center text-sm text-muted-foreground">
          Maximum {MAX_SLIDES} banners reached
        </p>
      )}
    </div>
  );
}
