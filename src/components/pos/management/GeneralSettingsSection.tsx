import { useState } from "react";
import { 
  Store, FileText, Image as ImageIcon, Phone, Globe, Building2, 
  FileCheck, Plus, Trash2, GripVertical, RotateCcw, ChevronDown, ChevronUp,
  Hash, BadgeCheck
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { BDPhoneInput } from "@/components/ui/bd-phone-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { usePOSSettings } from "@/hooks/usePOSSettings";
import { ReceiptPreview } from "./ReceiptPreview";

export function GeneralSettingsSection() {
  const posSettings = usePOSSettings();
  const [newTerm, setNewTerm] = useState("");
  const [headerOpen, setHeaderOpen] = useState(true);
  const [companyOpen, setCompanyOpen] = useState(true);
  const [footerOpen, setFooterOpen] = useState(true);

  // Extract just the POSSettings values for the preview
  const settingsForPreview = {
    paperWidth: posSettings.paperWidth,
    showLogo: posSettings.showLogo,
    logoUrl: posSettings.logoUrl,
    mushakLabel: posSettings.mushakLabel,
    showMushakLabel: posSettings.showMushakLabel,
    govtHeader1: posSettings.govtHeader1,
    govtHeader2: posSettings.govtHeader2,
    companyName: posSettings.companyName,
    registeredAddress: posSettings.registeredAddress,
    vatRegNo: posSettings.vatRegNo,
    contactMobile: posSettings.contactMobile,
    contactWebsite: posSettings.contactWebsite,
    termsAndConditions: posSettings.termsAndConditions,
    storeName: posSettings.storeName,
    storeAddress: posSettings.storeAddress,
    storePhone: posSettings.storePhone,
    footerMessage: posSettings.footerMessage,
  };

  const handleAddTerm = () => {
    if (newTerm.trim()) {
      posSettings.addTerm(newTerm.trim());
      setNewTerm("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddTerm();
    }
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Receipt Configuration</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Customize every element of your Mushak 6.3 thermal receipt
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Settings Form */}
        <div className="space-y-4">
          
          {/* Header Configuration */}
          <Collapsible open={headerOpen} onOpenChange={setHeaderOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileCheck className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Header Configuration</CardTitle>
                        <CardDescription className="text-xs">
                          Logo, Mushak label, government headers
                        </CardDescription>
                      </div>
                    </div>
                    {headerOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4 pt-0">
                  {/* Logo Toggle */}
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      <Label className="text-sm font-medium">Show Logo</Label>
                    </div>
                    <Switch
                      checked={posSettings.showLogo}
                      onCheckedChange={posSettings.setShowLogo}
                    />
                  </div>

                  {/* Mushak Label */}
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="h-4 w-4 text-primary" />
                      <Label className="text-sm font-medium">Show Mushak Label</Label>
                    </div>
                    <Switch
                      checked={posSettings.showMushakLabel}
                      onCheckedChange={posSettings.setShowMushakLabel}
                    />
                  </div>

                  {posSettings.showMushakLabel && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Mushak Label Text</Label>
                      <Input
                        value={posSettings.mushakLabel}
                        onChange={(e) => posSettings.setMushakLabel(e.target.value)}
                        placeholder="e.g., Mushak 6.3"
                      />
                    </div>
                  )}

                  {/* Government Headers */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Government Header Line 1</Label>
                    <Input
                      value={posSettings.govtHeader1}
                      onChange={(e) => posSettings.setGovtHeader1(e.target.value)}
                      placeholder="Government of the People's Republic of Bangladesh"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Government Header Line 2</Label>
                    <Input
                      value={posSettings.govtHeader2}
                      onChange={(e) => posSettings.setGovtHeader2(e.target.value)}
                      placeholder="National Board of Revenue"
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Company Info */}
          <Collapsible open={companyOpen} onOpenChange={setCompanyOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10">
                        <Building2 className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Company Information</CardTitle>
                        <CardDescription className="text-xs">
                          Name, address, VAT, contact
                        </CardDescription>
                      </div>
                    </div>
                    {companyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4 pt-0">
                  {/* Company Name */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-primary" />
                      <Label className="text-sm font-medium">Company Name</Label>
                    </div>
                    <Input
                      value={posSettings.companyName}
                      onChange={(e) => posSettings.setCompanyName(e.target.value)}
                      placeholder="FRICTION"
                    />
                  </div>

                  {/* Registered Address */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Registered Address</Label>
                    <Textarea
                      value={posSettings.registeredAddress}
                      onChange={(e) => posSettings.setRegisteredAddress(e.target.value)}
                      placeholder="Registered Address: Ground Floor, House-92..."
                      rows={2}
                      className="resize-none"
                    />
                  </div>

                  {/* VAT Registration */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-primary" />
                      <Label className="text-sm font-medium">Central VAT Reg. No.</Label>
                    </div>
                    <Input
                      value={posSettings.vatRegNo}
                      onChange={(e) => posSettings.setVatRegNo(e.target.value)}
                      placeholder="000005569-0205"
                    />
                  </div>

                  {/* Contact Mobile */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-primary" />
                      <Label className="text-sm font-medium">Contact Mobile</Label>
                    </div>
                    <BDPhoneInput
                      value={posSettings.contactMobile}
                      onChange={(v) => posSettings.setContactMobile(v)}
                      placeholder="01XXXXXXXXX"
                    />
                  </div>

                  {/* Website */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-primary" />
                      <Label className="text-sm font-medium">Website</Label>
                    </div>
                    <Input
                      value={posSettings.contactWebsite}
                      onChange={(e) => posSettings.setContactWebsite(e.target.value)}
                      placeholder="bubu.com.bd"
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Footer & Terms */}
          <Collapsible open={footerOpen} onOpenChange={setFooterOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/10">
                        <FileText className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Terms & Footer</CardTitle>
                        <CardDescription className="text-xs">
                          Return policy, warranty terms
                        </CardDescription>
                      </div>
                    </div>
                    {footerOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4 pt-0">
                  {/* Terms List */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Terms & Conditions</Label>
                    <p className="text-xs text-muted-foreground">
                      Add, edit, or reorder the terms shown on receipts
                    </p>
                    
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {posSettings.termsAndConditions.map((term) => (
                        <div 
                          key={term.id} 
                          className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg group"
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground mt-1.5 shrink-0 cursor-grab" />
                          <Textarea
                            value={term.text}
                            onChange={(e) => posSettings.updateTerm(term.id, e.target.value)}
                            className="flex-1 min-h-[36px] text-xs resize-none"
                            rows={1}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                            onClick={() => posSettings.removeTerm(term.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* Add New Term */}
                    <div className="flex gap-2">
                      <Input
                        value={newTerm}
                        onChange={(e) => setNewTerm(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Add new term (e.g., ** No returns after 7 days)"
                        className="text-sm"
                      />
                      <Button 
                        size="icon" 
                        variant="outline"
                        onClick={handleAddTerm}
                        disabled={!newTerm.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Reset Button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={posSettings.resetToDefaults}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Settings are saved automatically as you make changes.
          </p>
        </div>

        {/* Live Preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Live WYSIWYG Preview
            </h3>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              80mm
            </span>
          </div>

          <div className="flex justify-center p-4 rounded-lg bg-muted/30 min-h-[500px] overflow-auto">
            <ReceiptPreview settings={settingsForPreview} />
          </div>

          <p className="text-xs text-center text-muted-foreground">
            This preview shows exactly how your receipt will appear on thermal paper
          </p>
        </div>
      </div>
    </div>
  );
}
