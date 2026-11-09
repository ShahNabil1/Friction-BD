import { useState, useEffect, useCallback } from "react";

export type PaperWidth = "58mm" | "80mm";

export interface ReceiptTermItem {
  id: string;
  text: string;
}

export interface POSSettings {
  // Paper & Logo
  paperWidth: PaperWidth;
  showLogo: boolean;
  logoUrl: string;
  
  // Mushak Configuration
  mushakLabel: string;
  showMushakLabel: boolean;
  
  // Government Headers
  govtHeader1: string;
  govtHeader2: string;
  
  // Company Info
  companyName: string;
  registeredAddress: string;
  vatRegNo: string;
  
  // Contact
  contactMobile: string;
  contactWebsite: string;
  
  // Terms & Conditions (multi-line list)
  termsAndConditions: ReceiptTermItem[];
  
  
  // Legacy fields (kept for backwards compat)
  storeName: string;
  storeAddress: string;
  storePhone: string;
  footerMessage: string;
}

const POS_SETTINGS_KEY = "pos_settings";
// Bump when brand-critical defaults change so stored settings are re-migrated.
const POS_SETTINGS_BRAND_VERSION = 2;
const POS_SETTINGS_VERSION_KEY = "pos_settings_brand_version";

const defaultTerms: ReceiptTermItem[] = [
  { id: "1", text: "** Thank you for shopping with us!" },
  { id: "2", text: "** If you need to make any changes, please do so within 3 days and present your receipt." },
  { id: "3", text: "** We are unable to accept returns or exchanges on sale or discounted items." },
  { id: "4", text: "** Cash refunds are not available." },
  { id: "5", text: "** Products with a warranty can be exchanged within the warranty period, provided there is a valid reason." },
];

const defaultSettings: POSSettings = {
  // Paper & Logo
  paperWidth: "80mm",
  showLogo: true,
  logoUrl: "",
  
  // Mushak Configuration
  mushakLabel: "Mushak 6.3",
  showMushakLabel: true,
  
  // Government Headers
  govtHeader1: "Government of the People's Republic of Bangladesh",
  govtHeader2: "National Board of Revenue",
  
  // Company Info
  companyName: "FRICTION",
  registeredAddress: "Registered Address: Shop No #02-03, Beside of Sena Cinema Hall, Nabinagar, Savar, Dhaka, Bangladesh, 1344",
  vatRegNo: "000005569-0205",
  
  // Contact
  contactMobile: "01929-110024",
  contactWebsite: "friction.com.bd",
  
  // Terms & Conditions
  termsAndConditions: defaultTerms,
  
  
  // Legacy fields
  storeName: "Friction",
  storeAddress: "Shop No #02-03, Beside of Sena Cinema Hall, Nabinagar, Savar, Dhaka, Bangladesh, 1344",
  storePhone: "01929-110024",
  footerMessage: "Thank you for shopping with us!",
};

// Brand fields that must always match the latest defaults — user cannot keep stale Bubu values.
const BRAND_LOCKED_FIELDS: (keyof POSSettings)[] = [
  "companyName",
  "registeredAddress",
  "contactMobile",
  "contactWebsite",
  "storeName",
  "storeAddress",
  "storePhone",
];

export function usePOSSettings() {
  const [settings, setSettings] = useState<POSSettings>(() => {
    if (typeof window === "undefined") return defaultSettings;
    try {
      const storedVersion = Number(localStorage.getItem(POS_SETTINGS_VERSION_KEY) || "0");
      const stored = localStorage.getItem(POS_SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const merged = { ...defaultSettings, ...parsed };
        // Force-refresh brand fields when the version is older than the current brand version
        if (storedVersion < POS_SETTINGS_BRAND_VERSION) {
          for (const key of BRAND_LOCKED_FIELDS) {
            (merged as unknown as Record<string, unknown>)[key] = (defaultSettings as unknown as Record<string, unknown>)[key];
          }
          localStorage.setItem(POS_SETTINGS_VERSION_KEY, String(POS_SETTINGS_BRAND_VERSION));
        }
        return merged;
      }
      localStorage.setItem(POS_SETTINGS_VERSION_KEY, String(POS_SETTINGS_BRAND_VERSION));
      return defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(POS_SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage errors
    }
  }, [settings]);

  // Generic setter
  const updateSetting = useCallback(<K extends keyof POSSettings>(key: K, value: POSSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Specific setters for convenience
  const setPaperWidth = useCallback((width: PaperWidth) => {
    updateSetting("paperWidth", width);
  }, [updateSetting]);

  const setShowLogo = useCallback((show: boolean) => {
    updateSetting("showLogo", show);
  }, [updateSetting]);

  const setLogoUrl = useCallback((url: string) => {
    updateSetting("logoUrl", url);
  }, [updateSetting]);

  const setMushakLabel = useCallback((label: string) => {
    updateSetting("mushakLabel", label);
  }, [updateSetting]);

  const setShowMushakLabel = useCallback((show: boolean) => {
    updateSetting("showMushakLabel", show);
  }, [updateSetting]);

  const setGovtHeader1 = useCallback((header: string) => {
    updateSetting("govtHeader1", header);
  }, [updateSetting]);

  const setGovtHeader2 = useCallback((header: string) => {
    updateSetting("govtHeader2", header);
  }, [updateSetting]);

  const setCompanyName = useCallback((name: string) => {
    updateSetting("companyName", name);
  }, [updateSetting]);

  const setRegisteredAddress = useCallback((address: string) => {
    updateSetting("registeredAddress", address);
  }, [updateSetting]);

  const setVatRegNo = useCallback((vatNo: string) => {
    updateSetting("vatRegNo", vatNo);
  }, [updateSetting]);

  const setContactMobile = useCallback((mobile: string) => {
    updateSetting("contactMobile", mobile);
  }, [updateSetting]);

  const setContactWebsite = useCallback((website: string) => {
    updateSetting("contactWebsite", website);
  }, [updateSetting]);

  const setTermsAndConditions = useCallback((terms: ReceiptTermItem[]) => {
    updateSetting("termsAndConditions", terms);
  }, [updateSetting]);

  const addTerm = useCallback((text: string) => {
    const newTerm: ReceiptTermItem = {
      id: Date.now().toString(),
      text,
    };
    setSettings((prev) => ({
      ...prev,
      termsAndConditions: [...prev.termsAndConditions, newTerm],
    }));
  }, []);

  const updateTerm = useCallback((id: string, text: string) => {
    setSettings((prev) => ({
      ...prev,
      termsAndConditions: prev.termsAndConditions.map((term) =>
        term.id === id ? { ...term, text } : term
      ),
    }));
  }, []);

  const removeTerm = useCallback((id: string) => {
    setSettings((prev) => ({
      ...prev,
      termsAndConditions: prev.termsAndConditions.filter((term) => term.id !== id),
    }));
  }, []);

  const reorderTerms = useCallback((fromIndex: number, toIndex: number) => {
    setSettings((prev) => {
      const newTerms = [...prev.termsAndConditions];
      const [removed] = newTerms.splice(fromIndex, 1);
      newTerms.splice(toIndex, 0, removed);
      return { ...prev, termsAndConditions: newTerms };
    });
  }, []);


  // Legacy setters
  const setStoreName = useCallback((name: string) => {
    updateSetting("storeName", name);
  }, [updateSetting]);

  const setStoreAddress = useCallback((address: string) => {
    updateSetting("storeAddress", address);
  }, [updateSetting]);

  const setStorePhone = useCallback((phone: string) => {
    updateSetting("storePhone", phone);
  }, [updateSetting]);

  const setFooterMessage = useCallback((message: string) => {
    updateSetting("footerMessage", message);
  }, [updateSetting]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  return {
    ...settings,
    updateSetting,
    setPaperWidth,
    setShowLogo,
    setLogoUrl,
    setMushakLabel,
    setShowMushakLabel,
    setGovtHeader1,
    setGovtHeader2,
    setCompanyName,
    setRegisteredAddress,
    setVatRegNo,
    setContactMobile,
    setContactWebsite,
    setTermsAndConditions,
    addTerm,
    updateTerm,
    removeTerm,
    reorderTerms,
    setStoreName,
    setStoreAddress,
    setStorePhone,
    setFooterMessage,
    resetToDefaults,
  };
}
