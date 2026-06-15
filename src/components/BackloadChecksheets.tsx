import React, { useState, useEffect } from "react";
import { BackloadChecksheet, ChecklistCcuCol, Asset, AssetType } from "../types";
// @ts-ignore
import html2pdf from "html2pdf.js";
import { 
  ClipboardCheck, 
  Plus, 
  Trash2, 
  Save, 
  Printer, 
  RefreshCw, 
  Search, 
  Layers, 
  FileText, 
  Check, 
  AlertTriangle,
  User,
  Calendar,
  Layers as LayersIcon,
  Download,
  FileDown
} from "lucide-react";

interface BackloadChecksheetsProps {
  assets: Asset[];
  onRefreshDatabase: () => void;
  isStandalone?: boolean;
}

export default function BackloadChecksheets({ assets, onRefreshDatabase, isStandalone }: BackloadChecksheetsProps) {
  const [checksheets, setChecksheets] = useState<BackloadChecksheet[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Custom UI Notifications and Modals
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showPrintGuide, setShowPrintGuide] = useState(false);

  // Search filter for list
  const [searchTerm, setSearchTerm] = useState("");

  const selectedSheet = checksheets.find(s => s.id === selectedSheetId) || null;

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => prev && prev.message === message ? null : prev);
    }, 4500);
  };

  // Fetch checksheets from backend
  const fetchChecksheets = async () => {
    try {
      setLoading(true);
      
      if (isStandalone) {
        const { ClientDbStore } = await import("../utils/localStorageStore");
        const data = ClientDbStore.getChecksheets();
        setChecksheets(data);
        if (data.length > 0 && !selectedSheetId) {
          setSelectedSheetId(data[0].id);
        }
        return;
      }
      
      const res = await fetch("/api/checksheets");
      if (res.ok) {
        const data = await res.json();
        setChecksheets(data);
        if (data.length > 0 && !selectedSheetId) {
          setSelectedSheetId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load backload checksheets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecksheets();
  }, [isStandalone]);

  const handleSaveSheet = async (sheetToSave: BackloadChecksheet) => {
    try {
      setSaving(true);
      
      if (isStandalone) {
        const { ClientDbStore } = await import("../utils/localStorageStore");
        const updated = ClientDbStore.saveChecksheet(sheetToSave);
        setChecksheets(prev => prev.map(s => s.id === updated.id ? updated : s));
        onRefreshDatabase();
        showToast(`บันทึกข้อมูล Checksheet ${updated.id} ไปยังฐานข้อมูลเบราว์เซอร์เรียบร้อยแล้ว!`, "success");
        return;
      }
      
      const res = await fetch("/api/checksheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sheetToSave)
      });
      if (res.ok) {
        const updated = await res.json();
        setChecksheets(prev => prev.map(s => s.id === updated.id ? updated : s));
        onRefreshDatabase(); // Update parent assets in case changes to status or remarks were triggered
        showToast(`บันทึกข้อมูล Checksheet ${updated.id} ไปยังฐานข้อมูลเรียบร้อยแล้ว!`, "success");
      } else {
        const err = await res.json();
        throw new Error(err.error || "Failed to save checklist.");
      }
    } catch (e: any) {
      showToast("ไม่สามารถเซฟข้อมูลได้: " + e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSheet = async (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setDeleteConfirmId(null);

    try {
      if (isStandalone) {
        const { ClientDbStore } = await import("../utils/localStorageStore");
        ClientDbStore.deleteChecksheet(id);
        setChecksheets(prev => prev.filter(s => s.id !== id));
        if (selectedSheetId === id) {
          setSelectedSheetId(null);
        }
        showToast(`ลบข้อมูล Checksheet ${id} เรียบร้อยแล้ว`, "success");
        return;
      }
      
      const res = await fetch(`/api/checksheets/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setChecksheets(prev => prev.filter(s => s.id !== id));
        if (selectedSheetId === id) {
          setSelectedSheetId(null);
        }
        showToast(`ลบข้อมูล Checksheet ${id} เรียบร้อยแล้ว`, "success");
      }
    } catch (e: any) {
      showToast("ลบข้อมูลไม่สำเร็จ: " + e.message, "error");
    }
  };

  const handleCreateManualSheet = () => {
    const defaultDate = new Date().toISOString().split("T")[0];
    const newId = `TAT-BL-MAN-${Date.now().toString().slice(-4)}`;
    
    const newSheet: BackloadChecksheet = {
      id: newId,
      date: defaultDate,
      workOrderId: `WO-BL-${Date.now().toString().slice(-4)}`,
      qaqcInspector: "Pousan Yangok (QAQC)",
      ccus: [
        {
          ccuNumber: "",
          qrCode: "Yes",
          loadTest: false,
          visualInspection3rd: false,
          ndt: false,
          slingNo: "",
          shackle1No: "",
          shackle2No: "",
          shackle3No: "",
          shackle4No: "",
          ccuNamePassed: "Yes",
          dimensionPassed: "Yes",
          weightPassed: "Yes",
          conditionSlingPassed: "Yes",
          colorCodePassed: "Yes",
          lightPaintingPassed: "Yes",
          colorCoatingsEdgesPassed: "Yes",
          namePlatePassed: "Yes",
          tagLinePassed: "Yes",
          cleaningPassed: "Yes",
          lockingDevicePassed: "Yes",
          rackSupportPassed: "Yes",
          structuralRepairPassed: "Yes",
          fullBodyPaintingPassed: "Yes",
          replaceSlingPassed: "Yes",
          legSupportPassed: "Yes",
          remark: ""
        }
      ]
    };

    setChecksheets(prev => [newSheet, ...prev]);
    setSelectedSheetId(newSheet.id);
  };

  const handleAddCcuColumn = () => {
    if (!selectedSheet) return;
    if (selectedSheet.ccus.length >= 5) {
      showToast("A Good Inward Process CheckSheet can have a maximum of 5 CCU Columns according to specification (TAT-BL Rev.00).", "info");
      return;
    }

    const nextCcu: ChecklistCcuCol = {
      ccuNumber: "",
      qrCode: "Yes",
      loadTest: false,
      visualInspection3rd: false,
      ndt: false,
      slingNo: "",
      shackle1No: "",
      shackle2No: "",
      shackle3No: "",
      shackle4No: "",
      ccuNamePassed: "Yes",
      dimensionPassed: "Yes",
      weightPassed: "Yes",
      conditionSlingPassed: "Yes",
      colorCodePassed: "Yes",
      lightPaintingPassed: "Yes",
      colorCoatingsEdgesPassed: "Yes",
      namePlatePassed: "Yes",
      tagLinePassed: "Yes",
      cleaningPassed: "Yes",
      lockingDevicePassed: "Yes",
      rackSupportPassed: "Yes",
      structuralRepairPassed: "Yes",
      fullBodyPaintingPassed: "Yes",
      replaceSlingPassed: "Yes",
      legSupportPassed: "Yes",
      remark: ""
    };

    const updated = {
      ...selectedSheet,
      ccus: [...selectedSheet.ccus, nextCcu]
    };

    setChecksheets(prev => prev.map(s => s.id === selectedSheet.id ? updated : s));
  };

  const handleRemoveCcuColumn = (index: number) => {
    if (!selectedSheet) return;
    if (selectedSheet.ccus.length <= 1) {
      showToast("A checksheet must contain at least 1 CCU No.", "info");
      return;
    }

    const updated = {
      ...selectedSheet,
      ccus: selectedSheet.ccus.filter((_, i) => i !== index)
    };

    setChecksheets(prev => prev.map(s => s.id === selectedSheet.id ? updated : s));
  };

  const updateSelectedSheetField = (field: string, value: any) => {
    if (!selectedSheet) return;
    const updated = {
      ...selectedSheet,
      [field]: value
    };
    setChecksheets(prev => prev.map(s => s.id === selectedSheet.id ? updated : s));
  };

  const updateCcuField = <K extends keyof ChecklistCcuCol>(index: number, key: K, value: ChecklistCcuCol[K]) => {
    if (!selectedSheet) return;
    const updatedCcus = [...selectedSheet.ccus];
    updatedCcus[index] = {
      ...updatedCcus[index],
      [key]: value
    };
    const updated = {
      ...selectedSheet,
      ccus: updatedCcus
    };
    setChecksheets(prev => prev.map(s => s.id === selectedSheet.id ? updated : s));
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch (err) {
      console.warn("Print action caught within sandboxed iframe environment", err);
    }
    // Set visibility of print/PDF instructions guide modal
    setShowPrintGuide(true);
  };

  const handleDownloadPDF = async () => {
    if (!selectedSheet) return;
    
    const targetElement = document.getElementById("printable-template");
    if (!targetElement) {
      showToast("ไม่พบข้อมูลเอกสารต้นฉบับสำหรับการแปลงเป็น PDF", "error");
      return;
    }
    
    setSaving(true);
    showToast("ระบบกำลังจัดโครงสร้างและแปลงไฟล์เป็น PDF ความละเอียดสูง...", "info");

    const originalStyles: { element: HTMLStyleElement; originalText: string }[] = [];
    const originalLinks: { element: HTMLLinkElement; disabled: boolean }[] = [];
    const temporaryStyles: HTMLStyleElement[] = [];

    const restoreStylesheets = () => {
      // Restore style tags
      for (const item of originalStyles) {
        item.element.textContent = item.originalText;
      }
      // Restore link tags
      for (const item of originalLinks) {
        item.element.disabled = item.disabled;
      }
      // Remove temporary styles
      for (const tag of temporaryStyles) {
        tag.remove();
      }
    };

    try {
      // 1. Process all local <style> tags to replace oklch color notation
      const styleTags = Array.from(document.getElementsByTagName("style"));
      for (const tag of styleTags) {
        const text = tag.textContent || "";
        if (text.includes("oklch")) {
          originalStyles.push({ element: tag, originalText: text });
          const cleanText = text.replace(/oklch\([^)]+\)/g, "rgb(71, 85, 105)");
          tag.textContent = cleanText;
        }
      }

      // 2. Process all external link stylesheets
      const linkTags = Array.from(document.querySelectorAll("link[rel='stylesheet']")) as HTMLLinkElement[];
      for (const link of linkTags) {
        originalLinks.push({ element: link, disabled: link.disabled });
        link.disabled = true; // disable temporarily to bypass html2canvas oklch crash
        
        // Fetch and sanitize the CSS rules locally to preserve non-oklch styles
        try {
          const response = await fetch(link.href);
          if (response.ok) {
            const text = await response.text();
            const cleanText = text.replace(/oklch\([^)]+\)/g, "rgb(71, 85, 105)");
            const tempStyle = document.createElement("style");
            tempStyle.textContent = cleanText;
            tempStyle.setAttribute("data-temp-pdf-style", "true");
            document.head.appendChild(tempStyle);
            temporaryStyles.push(tempStyle);
          }
        } catch (fetchErr) {
          console.warn("Failed to fetch link stylesheet for PDF sanitization:", fetchErr);
        }
      }

      // Create a deep clone of the checksheet layout for a clean, non-shadow A4 report
      const clone = targetElement.cloneNode(true) as HTMLElement;
      
      // Remove preview layout borders/cards/scroll styles to make it look like an official document
      clone.classList.remove(
        "shadow-2xl",
        "rounded-3xl",
        "border",
        "border-slate-300",
        "p-6",
        "bg-white",
        "overflow-x-auto"
      );
      
      // Setup pristine styles for crisp PDF layout
      clone.style.width = "790px";
      clone.style.padding = "0px";
      clone.style.margin = "0px";
      clone.style.background = "white";
      clone.style.color = "black";

      // Configure PDF & Canvas options
      const opt = {
        margin:       [8, 6, 8, 6] as [number, number, number, number], // top, left, bottom, right in mm
        filename:     `Checksheet-TAT-BL-${selectedSheet.id}.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { 
          scale: 2.2, // Ultra crisp vector & text resolution
          useCORS: true, 
          logging: false,
          letterRendering: true,
          windowWidth: 830 // Force clean widescreen viewport layout so columns fit beautifully
        },
        jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };

      // Export directly from the cloned A4 element using our bundled html2pdf
      await html2pdf().set(opt).from(clone).save();
      
      showToast(`เซฟและดาวน์โหลดไฟล์ PDF (${selectedSheet.id}) เรียบร้อยแล้ว!`, "success");
    } catch (err: any) {
      console.error("PDF Export error:", err);
      showToast("ไม่สามารถเซฟ PDF ได้: " + err.message, "error");
    } finally {
      restoreStylesheets();
      setSaving(false);
    }
  };

  // Filter list of checksheets based on search
  const filteredSheets = checksheets.filter(sheet => {
    const q1 = sheet.id.toLowerCase().includes(searchTerm.toLowerCase());
    const q2 = sheet.workOrderId.toLowerCase().includes(searchTerm.toLowerCase());
    const q3 = sheet.qaqcInspector.toLowerCase().includes(searchTerm.toLowerCase());
    const q4 = sheet.ccus.some(c => c.ccuNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    return q1 || q2 || q3 || q4;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="checksheets-workspace">
      
      {/* LEFT SIDEBAR: List of checksheets */}
      <div className="lg:col-span-3 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ClipboardCheck className="w-5 h-5 text-blue-500" />
            <h3 className="font-bold text-sm text-white">TAT-BL Index</h3>
          </div>
          <button 
            onClick={fetchChecksheets}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Create Manual Sheet Button */}
        <button
          onClick={handleCreateManualSheet}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center space-x-1.5 shadow-md shadow-blue-500/10 cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Checksheet</span>
        </button>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search checksheet, S/N..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
        </div>

        {/* Checksheets list */}
        <div className="flex-1 space-y-2 overflow-y-auto max-h-[480px] pr-1">
          {loading ? (
            <div className="text-center py-8 text-xs text-slate-500">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Loading checksheets...
            </div>
          ) : filteredSheets.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No sheets found. Add backload transactions to automatically seed!
            </div>
          ) : (
            filteredSheets.map(sheet => {
              const isSelected = sheet.id === selectedSheetId;
              return (
                <div
                  key={sheet.id}
                  onClick={() => setSelectedSheetId(sheet.id)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected 
                      ? "bg-blue-500/15 border-blue-500/50 shadow-md shadow-blue-500/5" 
                      : "bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-white uppercase flex items-center space-x-1 bg-slate-850 px-1.5 py-0.5 rounded border border-slate-700">
                      <FileText className="w-3" />
                      <span>{sheet.id}</span>
                    </span>
                    <span className="text-slate-400 text-[10px]">{sheet.date}</span>
                  </div>

                  <p className="text-[11px] text-slate-400 truncate">
                    WO: <strong className="text-slate-300 font-bold">{sheet.workOrderId}</strong>
                  </p>

                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {sheet.ccus.map((c, i) => (
                      <span 
                        key={i} 
                        className="text-[9px] font-semibold bg-slate-800 border border-slate-750 text-emerald-400 px-1.5 py-0.5 rounded uppercase"
                        title={c.ccuNumber}
                      >
                        {c.ccuNumber || "Blank"}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CORE WORKSPACE: Interactive Edit Forms & Physical Print Sheet Mock */}
      <div className="lg:col-span-9 flex flex-col space-y-6">
        
        {selectedSheet ? (
          <>
            {/* ACTION & TOP INFO CARDS */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
              <div>
                <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
                  <span>Backload Good Inward Process</span>
                  <span>•</span>
                  <span>Interactive Editor</span>
                </div>
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <span className="text-blue-500 font-mono tracking-wide">{selectedSheet.id}</span>
                  <span className="text-slate-500">|</span>
                  <span className="text-xs text-slate-300 font-normal">Work Order: #{selectedSheet.workOrderId}</span>
                </h2>
              </div>

              {/* Manipulation Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleSaveSheet(selectedSheet)}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3.5 rounded-xl flex items-center space-x-1.5 shadow-md shadow-emerald-500/10 cursor-pointer transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? "Saving..." : "Save Database"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-3.5 rounded-xl flex items-center space-x-1.5 shadow-md shadow-blue-500/10 cursor-pointer transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Save PDF (เซฟเป็นไฟล์ PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="bg-slate-800 hover:bg-slate-705 text-slate-200 hover:text-white text-xs font-bold py-2 px-3.5 rounded-xl flex items-center space-x-1.5 border border-slate-700 hover:border-slate-650 shadow-md shadow-slate-900/10 cursor-pointer transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Checksheet (สั่งพิมพ์ด่วน)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteSheet(selectedSheet.id)}
                  className="bg-red-500/15 hover:bg-red-505 border border-red-500/20 hover:border-red-600 text-red-400 hover:text-white text-xs font-bold p-2 rounded-xl cursor-pointer transition-all"
                  title="Delete checksheet"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* INTERACTIVE FORM EDITOR FOR SHEET METADATA & DATA SECTION */}
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-6">
              
              <div className="border-b border-slate-800 pb-4">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                  <span>1. Document Identifiers</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Sheet Date</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={selectedSheet.date}
                        onChange={e => updateSelectedSheetField("date", e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3.5 pl-10 text-xs text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-semibold"
                      />
                      <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Work Order ID / Backload Ref</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={selectedSheet.workOrderId}
                        onChange={e => updateSelectedSheetField("workOrderId", e.target.value)}
                        placeholder="e.g. WO-BL-8495"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3.5 pl-10 text-xs text-white uppercase focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono font-bold"
                      />
                      <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">QA & QC Inspector</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={selectedSheet.qaqcInspector}
                        onChange={e => updateSelectedSheetField("qaqcInspector", e.target.value)}
                        placeholder="Inspector Name"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3.5 pl-10 text-xs text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-semibold"
                      />
                      <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* CCU Columns Interactive details */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center space-x-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                    <span>2. CCUs Tested ({selectedSheet.ccus.length}/5)</span>
                  </h4>
                  {selectedSheet.ccus.length < 5 && (
                    <button
                      type="button"
                      onClick={handleAddCcuColumn}
                      className="bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 text-xs py-1 px-3 border border-slate-700 rounded-lg flex items-center space-x-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add CCU Col</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {selectedSheet.ccus.map((ccuCol, idx) => {
                    // Match with master database details for contextual verification
                    const matchedAsset = assets.find(a => a.ccuNumber.toUpperCase() === ccuCol.ccuNumber.toUpperCase());
                    
                    return (
                      <div 
                        key={idx} 
                        className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col space-y-3.5 relative shadow-xs"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-blue-500 text-xs font-mono">CCU Column #{idx + 1}</span>
                          {selectedSheet.ccus.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCcuColumn(idx)}
                              className="text-slate-500 hover:text-red-400 p-0.5 rounded cursor-pointer transition-colors"
                              title="Delete Col"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* CCU No */}
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">CCU Number (S/N)</label>
                          <input
                            type="text"
                            value={ccuCol.ccuNumber}
                            onChange={e => updateCcuField(idx, "ccuNumber", e.target.value.toUpperCase())}
                            className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-2 text-xs font-bold text-white uppercase font-mono tracking-wider focus:outline-none focus:border-blue-500"
                            placeholder="e.g. SL-112"
                          />
                          {matchedAsset ? (
                            <span className="text-[8.5px] text-emerald-400 font-semibold mt-1 block truncate">
                              ✓ Registered ({matchedAsset.type})
                            </span>
                          ) : ccuCol.ccuNumber ? (
                            <span className="text-[8.5px] text-amber-500 font-bold mt-1 block flex items-center space-x-0.5">
                              <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">Unregistered S/N</span>
                            </span>
                          ) : null}
                        </div>

                        {/* QR Code */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">QR Code</label>
                            <select
                              value={ccuCol.qrCode}
                              onChange={e => updateCcuField(idx, "qrCode", e.target.value as any)}
                              className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1 px-1.5 text-xs text-slate-200"
                            >
                              <option value="Yes">Yes (มี/พ่น)</option>
                              <option value="No">No (ไม่มี)</option>
                            </select>
                          </div>

                          {/* Lifting Certificate checkboxes */}
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Lifting Cert</label>
                            <div className="space-y-1 mt-1 text-[9px] text-slate-400 font-bold">
                              <label className="flex items-center space-x-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={ccuCol.loadTest}
                                  onChange={e => updateCcuField(idx, "loadTest", e.target.checked)}
                                  className="rounded border-slate-850 bg-slate-950 text-blue-500 focus:ring-0"
                                />
                                <span title="Load test (ทดสอบน้ำหนัก)">Load Test</span>
                              </label>
                              <label className="flex items-center space-x-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={ccuCol.visualInspection3rd}
                                  onChange={e => updateCcuField(idx, "visualInspection3rd", e.target.checked)}
                                  className="rounded border-slate-850 bg-slate-950 text-blue-500 focus:ring-0"
                                />
                                <span title="3rd Visual inspection">3rd Visual</span>
                              </label>
                              <label className="flex items-center space-x-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={ccuCol.ndt}
                                  onChange={e => updateCcuField(idx, "ndt", e.target.checked)}
                                  className="rounded border-slate-850 bg-slate-950 text-blue-500 focus:ring-0"
                                />
                                <span title="NDT (MPI, PT, etc.)">NDT</span>
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Lifting Gear Details */}
                        <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-850 space-y-1 text-[9px]">
                          <span className="font-bold text-slate-500 uppercase tracking-widest text-[8px] block mb-1">Lifting Gear Details</span>
                          
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-slate-400 font-medium shrink-0">Sling S/N:</span>
                            <input
                              type="text"
                              value={ccuCol.slingNo}
                              onChange={e => updateCcuField(idx, "slingNo", e.target.value)}
                              placeholder="Sling No"
                              className="w-full text-right bg-transparent border-b border-slate-800 hover:border-slate-700 py-0.5 text-xs text-white focus:outline-none"
                            />
                          </div>
                          
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-slate-400 font-medium shrink-0">Shackle 1:</span>
                            <input
                              type="text"
                              value={ccuCol.shackle1No}
                              onChange={e => updateCcuField(idx, "shackle1No", e.target.value)}
                              placeholder="S/N"
                              className="w-full text-right bg-transparent border-b border-slate-800 hover:border-slate-700 py-0.5 text-xs text-white focus:outline-none"
                            />
                          </div>
                          
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-slate-400 font-medium shrink-0">Shackle 2:</span>
                            <input
                              type="text"
                              value={ccuCol.shackle2No}
                              onChange={e => updateCcuField(idx, "shackle2No", e.target.value)}
                              placeholder="S/N"
                              className="w-full text-right bg-transparent border-b border-slate-800 hover:border-slate-700 py-0.5 text-xs text-white focus:outline-none"
                            />
                          </div>
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-slate-400 font-medium shrink-0">Shackle 3:</span>
                            <input
                              type="text"
                              value={ccuCol.shackle3No}
                              onChange={e => updateCcuField(idx, "shackle3No", e.target.value)}
                              placeholder="S/N"
                              className="w-full text-right bg-transparent border-b border-slate-800 hover:border-slate-700 py-0.5 text-xs text-white focus:outline-none"
                            />
                          </div>
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-slate-400 font-medium shrink-0">Shackle 4:</span>
                            <input
                              type="text"
                              value={ccuCol.shackle4No}
                              onChange={e => updateCcuField(idx, "shackle4No", e.target.value)}
                              placeholder="S/N"
                              className="w-full text-right bg-transparent border-b border-slate-800 hover:border-slate-700 py-0.5 text-xs text-white focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Remarks */}
                        <div>
                          <label className="block text-[8.5px] font-bold text-slate-400 uppercase mb-0.5">Remarks / defects</label>
                          <input
                            type="text"
                            value={ccuCol.remark || ""}
                            onChange={e => updateCcuField(idx, "remark", e.target.value)}
                            placeholder="OK / No damage"
                            className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1 px-1.5 text-[10px] text-slate-200 focus:outline-none"
                          />
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CRITICAL 3. CHECK BOX CATEGORY DETAILS (MINOR & MAJOR TRIPLE SELECTIONS) */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                  <span>3. Inspection Criteria check sheets (Yes=Pass, No=Fail/Repair)</span>
                </h4>

                <div className="overflow-x-auto border border-slate-850 rounded-xl bg-slate-900/40">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-850">
                        <th className="p-3 font-bold text-slate-300 text-[10.5px] tracking-wide uppercase min-w-[240px]">Inspection Category / Category Item</th>
                        {selectedSheet.ccus.map((c, i) => (
                          <th key={i} className="p-3 text-center min-w-[120px]">
                            <p className="font-extrabold text-blue-500 font-mono">Col #{i + 1}</p>
                            <p className="text-[10px] text-slate-300 truncate font-mono uppercase font-bold mt-0.5">
                              {c.ccuNumber || "(no text)"}
                            </p>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/65 font-medium text-slate-300 text-[11px]">
                      
                      {/* --- MINOR SERVICE WORK SECTIONS (งานซ่อมเบา) --- */}
                      <tr className="bg-slate-950/80">
                        <td colSpan={selectedSheet.ccus.length + 1} className="p-2 px-3 font-extrabold text-xs text-amber-400 uppercase tracking-wide">
                          Minor Service Work (งานซ่อมเบา)
                        </td>
                      </tr>

                      <tr>
                        <td className="p-2.5 px-3">
                          <p className="font-bold">CCU Re-Marking (พ่นข้อความบนภาชนะ) - CCU Name</p>
                          <p className="text-[9.5px] text-slate-500">ชื่อภาชนะชัดเจน</p>
                        </td>
                        {selectedSheet.ccus.map((c, idx) => (
                          <td key={idx} className="p-2.5 text-center">
                            <select
                              value={c.ccuNamePassed}
                              onChange={e => updateCcuField(idx, "ccuNamePassed", e.target.value as any)}
                              className={`rounded py-1 px-2 text-xs font-bold ${
                                c.ccuNamePassed === "Yes" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" :
                                c.ccuNamePassed === "No" ? "bg-red-500/10 text-red-400 border border-red-500/25" :
                                "bg-slate-950 text-slate-400"
                              }`}
                            >
                              <option value="Yes">Yes (ผ่าน)</option>
                              <option value="No">No (ไม่ผ่าน)</option>
                            </select>
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="p-2.5 px-3">
                          <p className="font-bold">- CCU Dimensions</p>
                          <p className="text-[9.5px] text-slate-500">ขนาด มิติกว้างยาวระบุถูกต้อง</p>
                        </td>
                        {selectedSheet.ccus.map((c, idx) => (
                          <td key={idx} className="p-2.5 text-center">
                            <select
                              value={c.dimensionPassed}
                              onChange={e => updateCcuField(idx, "dimensionPassed", e.target.value as any)}
                              className={`rounded py-1 px-2 text-xs font-bold ${
                                c.dimensionPassed === "Yes" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" :
                                c.dimensionPassed === "No" ? "bg-red-500/10 text-red-400 border border-red-500/25" :
                                "bg-slate-950 text-slate-400"
                              }`}
                            >
                              <option value="Yes">Yes (ผ่าน)</option>
                              <option value="No">No (ไม่ผ่าน)</option>
                            </select>
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="p-2.5 px-3">
                          <p className="font-bold">- Weights stencil (T/W, N/W, MGW)</p>
                          <p className="text-[9.5px] text-slate-500">ตัวอักษรน้ำหนักชัดเจน</p>
                        </td>
                        {selectedSheet.ccus.map((c, idx) => (
                          <td key={idx} className="p-2.5 text-center">
                            <select
                              value={c.weightPassed}
                              onChange={e => updateCcuField(idx, "weightPassed", e.target.value as any)}
                              className={`rounded py-1 px-2 text-xs font-bold ${
                                c.weightPassed === "Yes" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" :
                                c.weightPassed === "No" ? "bg-red-500/10 text-red-400 border border-red-500/25" :
                                "bg-slate-950 text-slate-400"
                              }`}
                            >
                              <option value="Yes">Yes (ผ่าน)</option>
                              <option value="No">No (ไม่ผ่าน)</option>
                            </select>
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="p-2.5 px-3">
                          <p className="font-bold">Condition Sling (สภาพโดยรวมและน้ำสลิง)</p>
                          <p className="text-[9.5px] text-slate-500">สภาพสลิง ย้ำปลอกครบถ้วน</p>
                        </td>
                        {selectedSheet.ccus.map((c, idx) => (
                          <td key={idx} className="p-2.5 text-center">
                            <select
                              value={c.conditionSlingPassed}
                              onChange={e => updateCcuField(idx, "conditionSlingPassed", e.target.value as any)}
                              className={`rounded py-1 px-2 text-xs font-bold ${
                                c.conditionSlingPassed === "Yes" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" :
                                c.conditionSlingPassed === "No" ? "bg-red-500/10 text-red-400 border border-red-500/25" :
                                "bg-slate-950 text-slate-400"
                              }`}
                            >
                              <option value="Yes">Yes (ผ่าน)</option>
                              <option value="No">No (ไม่ผ่าน)</option>
                            </select>
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="p-2.5 px-3">
                          <p className="font-bold">Color code (รหัสสีประจำปี)</p>
                          <p className="text-[9.5px] text-slate-500">ทาสีแถบสีประจำปีครบ</p>
                        </td>
                        {selectedSheet.ccus.map((c, idx) => (
                          <td key={idx} className="p-2.5 text-center">
                            <select
                              value={c.colorCodePassed}
                              onChange={e => updateCcuField(idx, "colorCodePassed", e.target.value as any)}
                              className={`rounded py-1 px-2 text-xs font-bold ${
                                c.colorCodePassed === "Yes" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" :
                                c.colorCodePassed === "No" ? "bg-red-500/10 text-red-400 border border-red-500/25" :
                                "bg-slate-950 text-slate-400"
                              }`}
                            >
                              <option value="Yes">Yes (ผ่าน)</option>
                              <option value="No">No (ไม่ผ่าน)</option>
                            </select>
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="p-2.5 px-3">
                          <p className="font-bold">Light Painting (ทาสีบางจุด)</p>
                          <p className="text-[9.5px] text-slate-500">เก็บสีจุดขึ้นสนิมเล็กน้อย</p>
                        </td>
                        {selectedSheet.ccus.map((c, idx) => (
                          <td key={idx} className="p-2.5 text-center">
                            <select
                              value={c.lightPaintingPassed}
                              onChange={e => updateCcuField(idx, "lightPaintingPassed", e.target.value as any)}
                              className={`rounded py-1 px-2 text-xs font-bold ${
                                c.lightPaintingPassed === "Yes" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" :
                                c.lightPaintingPassed === "No" ? "bg-red-500/10 text-red-400 border border-red-500/25" :
                                "bg-slate-950 text-slate-400"
                              }`}
                            >
                              <option value="Yes">Yes (ผ่าน)</option>
                              <option value="No">No (ไม่ผ่าน)</option>
                            </select>
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="p-2.5 px-3">
                          <p className="font-bold">Color Coatings the edges (สีคัดขอบบนภาชนะ) Ref: DNV</p>
                          <p className="text-[9.5px] text-slate-500">พ่นสีสะท้อนแสงสีเหลืองที่โครงขอบ</p>
                        </td>
                        {selectedSheet.ccus.map((c, idx) => (
                          <td key={idx} className="p-2.5 text-center">
                            <select
                              value={c.colorCoatingsEdgesPassed}
                              onChange={e => updateCcuField(idx, "colorCoatingsEdgesPassed", e.target.value as any)}
                              className={`rounded py-1 px-2 text-xs font-bold ${
                                c.colorCoatingsEdgesPassed === "Yes" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" :
                                c.colorCoatingsEdgesPassed === "No" ? "bg-red-500/10 text-red-400 border border-red-500/25" :
                                "bg-slate-950 text-slate-400"
                              }`}
                            >
                              <option value="Yes">Yes (ผ่าน)</option>
                              <option value="No">No (ไม่ผ่าน)</option>
                            </select>
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="p-2.5 px-3">
                          <p className="font-bold">Name plate replacement / Update (เปลี่ยนแผ่นใหม่/สถานะล่าสุด)</p>
                          <p className="text-[9.5px] text-slate-500">เพลทเหล็กและข้อมูลใบเซอร์ครบ</p>
                        </td>
                        {selectedSheet.ccus.map((c, idx) => (
                          <td key={idx} className="p-2.5 text-center">
                            <select
                              value={c.namePlatePassed}
                              onChange={e => updateCcuField(idx, "namePlatePassed", e.target.value as any)}
                              className={`rounded py-1 px-2 text-xs font-bold ${
                                c.namePlatePassed === "Yes" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" :
                                c.namePlatePassed === "No" ? "bg-red-500/10 text-red-400 border border-red-500/25" :
                                "bg-slate-950 text-slate-400"
                              }`}
                            >
                              <option value="Yes">Yes (ผ่าน)</option>
                              <option value="No">No (ไม่ผ่าน)</option>
                            </select>
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="p-2.5 px-3">
                          <p className="font-bold">Tag line (เชือกเลี้ยง : ขนาด, ความยาว และการแตก)</p>
                          <p className="text-[9.5px] text-slate-500">สภาพเชือกช่วยดึงดี</p>
                        </td>
                        {selectedSheet.ccus.map((c, idx) => (
                          <td key={idx} className="p-2.5 text-center">
                            <select
                              value={c.tagLinePassed}
                              onChange={e => updateCcuField(idx, "tagLinePassed", e.target.value as any)}
                              className={`rounded py-1 px-2 text-xs font-bold ${
                                c.tagLinePassed === "Yes" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" :
                                c.tagLinePassed === "No" ? "bg-red-500/10 text-red-400 border border-red-500/25" :
                                "bg-slate-950 text-slate-400"
                              }`}
                            >
                              <option value="Yes">Yes (ผ่าน)</option>
                              <option value="No">No (ไม่ผ่าน)</option>
                            </select>
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="p-2.5 px-3">
                          <p className="font-bold">Cleaning (งานที่ต้องล้างทำความสะอาดก่อนการใช้งาน)</p>
                          <p className="text-[9.5px] text-slate-500">ล้างคราบสกปรก คราบดินทราย น้ำมัน</p>
                        </td>
                        {selectedSheet.ccus.map((c, idx) => (
                          <td key={idx} className="p-2.5 text-center">
                            <select
                              value={c.cleaningPassed}
                              onChange={e => updateCcuField(idx, "cleaningPassed", e.target.value as any)}
                              className={`rounded py-1 px-2 text-xs font-bold ${
                                c.cleaningPassed === "Yes" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" :
                                c.cleaningPassed === "No" ? "bg-red-500/10 text-red-400 border border-red-500/25" :
                                "bg-slate-950 text-slate-400"
                              }`}
                            >
                              <option value="Yes">Yes (ผ่าน)</option>
                              <option value="No">No (ไม่ผ่าน)</option>
                            </select>
                          </td>
                        ))}
                      </tr>

                      {/* --- MAJOR REPAIR SERVICE SECTIONS (งานซ่อมหนัก) --- */}
                      <tr className="bg-slate-955/80">
                        <td colSpan={selectedSheet.ccus.length + 1} className="p-2 px-3 font-extrabold text-xs text-red-400 uppercase tracking-wide">
                          Major repair Service (งานซ่อมหนัก)
                        </td>
                      </tr>

                      <tr>
                        <td className="p-2.5 px-3">
                          <p className="font-bold">Locking device (ชุดล็อคแต่ละจุด)</p>
                          <p className="text-[9.5px] text-slate-500">สลักล็อค บานพับประตู ตรวจเข็มขัด</p>
                        </td>
                        {selectedSheet.ccus.map((c, idx) => (
                          <td key={idx} className="p-2.5 text-center">
                            <select
                              value={c.lockingDevicePassed}
                              onChange={e => updateCcuField(idx, "lockingDevicePassed", e.target.value as any)}
                              className={`rounded py-1 px-2 text-xs font-bold ${
                                c.lockingDevicePassed === "Yes" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" :
                                c.lockingDevicePassed === "No" ? "bg-red-500/10 text-red-400 border border-red-500/25" :
                                "bg-slate-950 text-slate-400"
                              }`}
                            >
                              <option value="Yes">Yes (ดี)</option>
                              <option value="No">No (ต้องซ่อม)</option>
                            </select>
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="p-2.5 px-3">
                          <p className="font-bold">Rack Support (ตัวรองอุปกรณ์ด้านใน)</p>
                          <p className="text-[9.5px] text-slate-500">เสารองเหล็กประคอง แป้นยึด</p>
                        </td>
                        {selectedSheet.ccus.map((c, idx) => (
                          <td key={idx} className="p-2.5 text-center">
                            <select
                              value={c.rackSupportPassed}
                              onChange={e => updateCcuField(idx, "rackSupportPassed", e.target.value as any)}
                              className={`rounded py-1 px-2 text-xs font-bold ${
                                c.rackSupportPassed === "Yes" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" :
                                c.rackSupportPassed === "No" ? "bg-red-500/10 text-red-400 border border-red-500/25" :
                                "bg-slate-950 text-slate-400"
                              }`}
                            >
                              <option value="Yes">Yes (ดี)</option>
                              <option value="No">No (ต้องซ่อม)</option>
                            </select>
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="p-2.5 px-3">
                          <p className="font-bold">Structural repair Main / Secondary (การตรวจโครงสร้างหลัก/รอง)</p>
                          <p className="text-[9.5px] text-slate-500">ตัดปะผุ ดัด ดึง โครงเหล็กหลักยึดบิดงอไหม</p>
                        </td>
                        {selectedSheet.ccus.map((c, idx) => (
                          <td key={idx} className="p-2.5 text-center">
                            <select
                              value={c.structuralRepairPassed}
                              onChange={e => updateCcuField(idx, "structuralRepairPassed", e.target.value as any)}
                              className={`rounded py-1 px-2 text-xs font-bold ${
                                c.structuralRepairPassed === "Yes" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" :
                                c.structuralRepairPassed === "No" ? "bg-red-500/10 text-red-400 border border-red-500/25" :
                                "bg-slate-950 text-slate-400"
                              }`}
                            >
                              <option value="Yes">Yes (ดี)</option>
                              <option value="No">No (ต้องซ่อม)</option>
                            </select>
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="p-2.5 px-3">
                          <p className="font-bold">Full body Painting (ทาสีทั้งตัว)</p>
                          <p className="text-[9.5px] text-slate-500">พ่นสีเคลือบใหม่ตลอดทั้งจุดบอดโครงสร้าง</p>
                        </td>
                        {selectedSheet.ccus.map((c, idx) => (
                          <td key={idx} className="p-2.5 text-center">
                            <select
                              value={c.fullBodyPaintingPassed}
                              onChange={e => updateCcuField(idx, "fullBodyPaintingPassed", e.target.value as any)}
                              className={`rounded py-1 px-2 text-xs font-bold ${
                                c.fullBodyPaintingPassed === "Yes" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" :
                                c.fullBodyPaintingPassed === "No" ? "bg-red-500/10 text-red-400 border border-red-500/25" :
                                "bg-slate-950 text-slate-400"
                              }`}
                            >
                              <option value="Yes">Yes (ดี)</option>
                              <option value="No">No (ต้องซ่อม)</option>
                            </select>
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="p-2.5 px-3">
                          <p className="font-bold">Replace Sling (เปลี่ยนสลิงใหม่)</p>
                          <p className="text-[9.5px] text-slate-500">กรณีสายลวดแตก บิดงอ ชำรุดพัง</p>
                        </td>
                        {selectedSheet.ccus.map((c, idx) => (
                          <td key={idx} className="p-2.5 text-center">
                            <select
                              value={c.replaceSlingPassed}
                              onChange={e => updateCcuField(idx, "replaceSlingPassed", e.target.value as any)}
                              className={`rounded py-1 px-2 text-xs font-bold ${
                                c.replaceSlingPassed === "Yes" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" :
                                c.replaceSlingPassed === "No" ? "bg-red-500/10 text-red-400 border border-red-500/25" :
                                "bg-slate-950 text-slate-400"
                              }`}
                            >
                              <option value="Yes">Yes (ดี)</option>
                              <option value="No">No (ต้องซ่อม)</option>
                            </select>
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="p-2.5 px-3">
                          <p className="font-bold">Leg & Leg Support (ขาและตัวรองขา)</p>
                          <p className="text-[9.5px] text-slate-500">ตรวจเหล็กประคองจุดรับน้ำหนักใต้ฐาน</p>
                        </td>
                        {selectedSheet.ccus.map((c, idx) => (
                          <td key={idx} className="p-2.5 text-center">
                            <select
                              value={c.legSupportPassed}
                              onChange={e => updateCcuField(idx, "legSupportPassed", e.target.value as any)}
                              className={`rounded py-1 px-2 text-xs font-bold ${
                                c.legSupportPassed === "Yes" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" :
                                c.legSupportPassed === "No" ? "bg-red-500/10 text-red-400 border border-red-500/25" :
                                "bg-slate-950 text-slate-400"
                              }`}
                            >
                              <option value="Yes">Yes (ดี)</option>
                              <option value="No">No (ต้องซ่อม)</option>
                            </select>
                          </td>
                        ))}
                      </tr>

                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* LIVE PHYSICAL DOCUMENT PREVIEW AREA (STYLIZED PRINTABLE TAT-BL BOARD) */}
            <div className="bg-white text-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-300 overflow-x-auto" id="printable-template">
              
              {/* PRINT STYLE OVERRIDES */}
              <style dangerouslySetInnerHTML={{__html: `
                @media print {
                  body {
                    background: white !important;
                    color: black !important;
                  }
                  #applet-layout, #main-navigation-header, #tabs-navigation-panel, #primary-stage-view > *:not(#printable-template), footer {
                    display: none !important;
                  }
                  #primary-stage-view {
                    padding: 0 !important;
                    margin: 0 !important;
                    max-width: 100% !important;
                  }
                  #printable-template {
                    display: block !important;
                    border: none !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    overflow: visible !important;
                  }
                  table, tr, td, th {
                    border-color: #475569 !important;
                  }
                }
              `}} />

              {/* Genuine replica heading of TAT-BL */}
              <div className="w-full flex flex-col border border-slate-600 font-sans min-w-[760px]">
                
                {/* BLUE BRAND HEADER */}
                <div className="bg-[#0b5394] text-white p-3 font-extrabold text-base border-b border-slate-600 flex justify-between items-center px-4 tracking-wide">
                  <span>Good Inward Process CheckSheet</span>
                  <span className="text-[10px] bg-white/20 text-white font-normal px-2 py-0.5 rounded uppercase font-mono">CCU Logistical Audit</span>
                </div>

                {/* HEADER FIELDS */}
                <div className="grid grid-cols-2 border-b border-slate-600 text-xs">
                  <div className="p-2 border-r border-slate-600 flex items-center space-x-2">
                    <span className="font-bold uppercase text-slate-700">Date:</span>
                    <span className="font-semibold text-slate-900 border-b border-dotted border-slate-400 flex-1 px-1 font-mono">{selectedSheet.date}</span>
                  </div>
                  <div className="p-2 flex flex-col space-y-1 justify-center">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold uppercase text-slate-700">Backload work order ID number:</span>
                      <span className="font-bold text-slate-900 border-b border-dotted border-slate-400 flex-1 px-1 font-mono uppercase text-right">{selectedSheet.workOrderId}</span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="font-bold uppercase text-slate-600 text-[10px]">QA&QC Inspector:</span>
                      <span className="font-semibold text-slate-900 text-[10px] border-b border-dotted border-slate-400 flex-1 px-1 text-right">{selectedSheet.qaqcInspector}</span>
                    </div>
                  </div>
                </div>

                {/* CCU NUMBERS HEADER ROW */}
                <div className="grid grid-cols-12 text-xs border-b border-slate-600 font-bold bg-slate-50">
                  <div className="col-span-3 p-2.5 border-r border-slate-600 flex flex-col justify-center text-center">
                    <span className="text-slate-800 text-[11px] leading-tight">Critical Services Inventory to</span>
                    <span className="text-slate-500 font-medium text-[9.5px]">Maintenance order catalog</span>
                  </div>
                  
                  {/* Generate 5 CCU Slots */}
                  {Array.from({ length: 5 }).map((_, colIdx) => {
                    const ccu = selectedSheet.ccus[colIdx];
                    return (
                      <div key={colIdx} className="col-span-1.8 border-r border-slate-600 last:border-r-0 p-2 text-[11px] flex flex-col space-y-1.5 items-center justify-between">
                        <div className="w-full text-center border-b border-slate-300 pb-1">
                          <span className="text-slate-500 text-[9px] block">Col {colIdx + 1}</span>
                          <span className="font-extrabold text-slate-900 font-mono block uppercase truncate mt-0.5" title={ccu?.ccuNumber || "Vacant"}>
                            {ccu?.ccuNumber || "-"}
                          </span>
                        </div>
                        
                        {/* QR Code selection box */}
                        {ccu ? (
                          <div className="flex flex-col items-center w-full">
                            <span className="text-[8px] text-slate-500 leading-none">QR Code</span>
                            <div className="flex items-center space-x-1 mt-1 text-[9px]">
                              <span className={`w-3.5 h-3.5 border rounded-sm flex items-center justify-center font-bold ${ccu.qrCode === "Yes" ? "bg-slate-200 border-slate-800 text-slate-900" : "border-slate-400 text-transparent"}`}>Y</span>
                              <span className="text-slate-500 font-medium scale-[0.9]">Yes</span>
                              <span className={`ml-1.5 w-3.5 h-3.5 border rounded-sm flex items-center justify-center font-bold ${ccu.qrCode === "No" ? "bg-slate-200 border-slate-800 text-slate-900" : "border-slate-400 text-transparent"}`}>N</span>
                              <span className="text-slate-500 font-medium scale-[0.9]">No</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-[9px] italic">Vacant</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* CERTIFICATE & LIFTING CHASSIS */}
                <div className="grid grid-cols-12 text-[10.5px] border-b border-slate-600 font-semibold text-slate-800">
                  <div className="col-span-3 p-2.5 border-r border-slate-600 bg-slate-50/50 flex flex-col justify-center">
                    <span>Certificate and Lifting serial number</span>
                  </div>
                  
                  {Array.from({ length: 5 }).map((_, colIdx) => {
                    const ccu = selectedSheet.ccus[colIdx];
                    return (
                      <div key={colIdx} className="col-span-1.8 border-r border-slate-600 last:border-r-0 flex flex-col justify-between text-[9px] divide-y divide-slate-300 font-medium">
                        
                        {/* Load Test */}
                        <div className="p-1 px-1.5 flex items-center justify-between">
                          <span className="text-slate-500 truncate leading-none">Load test (ทดสอบน้ำหนัก)</span>
                          <span className="font-extrabold text-[#0b5394] font-mono leading-none">
                            {ccu && ccu.loadTest ? "[✓]" : "[ ]"}
                          </span>
                        </div>

                        {/* 3rd Visual */}
                        <div className="p-1 px-1.5 flex items-center justify-between">
                          <span className="text-slate-500 truncate leading-none">3rd Visual Inspection</span>
                          <span className="font-extrabold text-[#0b5394] font-mono leading-none">
                            {ccu && ccu.visualInspection3rd ? "[✓]" : "[ ]"}
                          </span>
                        </div>

                        {/* NDT */}
                        <div className="p-1 px-1.5 flex items-center justify-between">
                          <span className="text-slate-500 truncate leading-none">NDT (MPI, PT, ect)</span>
                          <span className="font-extrabold text-[#0b5394] font-mono leading-none">
                            {ccu && ccu.ndt ? "[✓]" : "[ ]"}
                          </span>
                        </div>
                        
                      </div>
                    );
                  })}
                </div>

                {/* LIFTING GEAR DETAIL */}
                <div className="grid grid-cols-12 text-[10px] border-b border-slate-600 font-semibold bg-slate-50">
                  <div className="col-span-3 p-2.5 border-r border-slate-600 flex items-center text-center justify-center font-bold text-slate-800">
                    <span>Lifting Gear Detail</span>
                  </div>
                  <div className="col-span-9 p-1"></div>
                </div>

                {/* SLING & SHACKLES DATA */}
                {/* Sling */}
                <div className="grid grid-cols-12 text-[10px] border-b border-slate-300 font-medium">
                  <div className="col-span-3 p-1 px-3 border-r border-slate-600 text-slate-700 font-bold bg-slate-50/20">
                    Sling No :
                  </div>
                  {Array.from({ length: 5 }).map((_, colIdx) => {
                    const ccu = selectedSheet.ccus[colIdx];
                    return (
                      <div key={colIdx} className="col-span-1.8 border-r border-slate-600 last:border-r-0 p-1 text-center font-bold text-slate-900 truncate font-mono">
                        {ccu ? ccu.slingNo || "-" : ""}
                      </div>
                    );
                  })}
                </div>

                {/* Shackle 1 */}
                <div className="grid grid-cols-12 text-[10px] border-b border-slate-300 font-medium">
                  <div className="col-span-3 p-1 px-3 border-r border-slate-600 text-slate-700 font-bold bg-slate-50/20">
                    Shackle 1 No. :
                  </div>
                  {Array.from({ length: 5 }).map((_, colIdx) => {
                    const ccu = selectedSheet.ccus[colIdx];
                    return (
                      <div key={colIdx} className="col-span-1.8 border-r border-slate-600 last:border-r-0 p-1 text-center font-bold text-slate-900 truncate font-mono">
                        {ccu ? ccu.shackle1No || "-" : ""}
                      </div>
                    );
                  })}
                </div>

                {/* Shackle 2 */}
                <div className="grid grid-cols-12 text-[10px] border-b border-slate-300 font-medium">
                  <div className="col-span-3 p-1 px-3 border-r border-slate-600 text-slate-700 font-bold bg-slate-50/20">
                    Shackle 2 No. :
                  </div>
                  {Array.from({ length: 5 }).map((_, colIdx) => {
                    const ccu = selectedSheet.ccus[colIdx];
                    return (
                      <div key={colIdx} className="col-span-1.8 border-r border-slate-600 last:border-r-0 p-1 text-center font-bold text-slate-900 truncate font-mono">
                        {ccu ? ccu.shackle2No || "-" : ""}
                      </div>
                    );
                  })}
                </div>

                {/* Shackle 3 */}
                <div className="grid grid-cols-12 text-[10px] border-b border-slate-300 font-medium">
                  <div className="col-span-3 p-1 px-3 border-r border-slate-600 text-slate-700 font-bold bg-slate-50/20">
                    Shackle 3 No. :
                  </div>
                  {Array.from({ length: 5 }).map((_, colIdx) => {
                    const ccu = selectedSheet.ccus[colIdx];
                    return (
                      <div key={colIdx} className="col-span-1.8 border-r border-slate-600 last:border-r-0 p-1 text-center font-bold text-slate-900 truncate font-mono">
                        {ccu ? ccu.shackle3No || "-" : ""}
                      </div>
                    );
                  })}
                </div>

                {/* Shackle 4 */}
                <div className="grid grid-cols-12 text-[10px] border-b border-slate-650 font-medium">
                  <div className="col-span-3 p-1 px-3 border-r border-slate-600 text-slate-700 font-bold bg-slate-50/20">
                    Shackle 4 No. :
                  </div>
                  {Array.from({ length: 5 }).map((_, colIdx) => {
                    const ccu = selectedSheet.ccus[colIdx];
                    return (
                      <div key={colIdx} className="col-span-1.8 border-r border-slate-600 last:border-r-0 p-1 text-center font-bold text-slate-900 truncate font-mono">
                        {ccu ? ccu.shackle4No || "-" : ""}
                      </div>
                    );
                  })}
                </div>

                {/* CATEGORY LEGEND BAR */}
                <div className="bg-[#ccffcc] border-b border-slate-600 py-1 flex items-center justify-center text-[10.5px] font-bold text-slate-800 space-x-12 px-4 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
                  <span>Check box category :</span>
                  <span className="flex items-center space-x-1.5 font-bold text-emerald-800 bg-white/60 px-2 py-0.5 rounded border border-emerald-300">
                    <span className="bg-emerald-600 text-white rounded px-1.5 text-[9px] font-extrabold uppercase py-0.2 select-none">Yes</span>
                    <span>= ผ่านการตรวจสอบ พร้อมใช้ ไม่ต้องซ่อมบำรุง</span>
                  </span>
                  <span className="flex items-center space-x-1.5 font-bold text-red-800 bg-white/60 px-2 py-0.5 rounded border border-red-300">
                    <span className="bg-red-600 text-white rounded px-1.5 text-[9px] font-extrabold uppercase py-0.2 select-none">No</span>
                    <span>= ไม่ผ่านการตรวจสอบ ต้องซ่อมบำรุง</span>
                  </span>
                </div>

                {/* MINOR SERVICE TITLE SLATE */}
                <div className="bg-[#ffffcc] border-b border-slate-600 py-1.5 text-center text-xs font-black uppercase text-slate-800 tracking-wider">
                  Minor Service Work (งานซ่อมเบา)
                </div>

                {/* GENUINE GRID ITEMS FOR MINOR CRITERIA */}
                {/* CCU Name */}
                <div className="grid grid-cols-12 text-[10px] border-b border-slate-300 font-medium">
                  <div className="col-span-3 p-1.5 px-3 border-r border-slate-600 text-slate-800 text-[10px]">
                    <span className="font-bold">CCU Re-Marking (พ่นข้อความบนภาชนะ)</span>
                    <span className="block text-[9px] text-slate-500">-CCU Name ชื่อภาชนะ</span>
                  </div>
                  {Array.from({ length: 5 }).map((_, colIdx) => {
                    const ccu = selectedSheet.ccus[colIdx];
                    return (
                      <div key={colIdx} className="col-span-1.8 border-r border-slate-600 last:border-r-0 flex items-center justify-center font-bold">
                        {ccu ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] ${ccu.ccuNamePassed === "Yes" ? "text-emerald-700 bg-emerald-50 border border-emerald-200" : ccu.ccuNamePassed === "No" ? "text-red-700 bg-red-50 border border-red-200" : "text-slate-400"}`}>
                            {ccu.ccuNamePassed || "-"}
                          </span>
                        ) : ""}
                      </div>
                    );
                  })}
                </div>

                {/* Dimensions */}
                <div className="grid grid-cols-12 text-[10px] border-b border-slate-300 font-medium">
                  <div className="col-span-3 p-1.5 px-3 border-r border-slate-600 text-slate-800 text-[10px]">
                    <span className="block text-[9px] text-slate-500">-Dimension ขนาด มิติ</span>
                  </div>
                  {Array.from({ length: 5 }).map((_, colIdx) => {
                    const ccu = selectedSheet.ccus[colIdx];
                    return (
                      <div key={colIdx} className="col-span-1.8 border-r border-slate-600 last:border-r-0 flex items-center justify-center font-bold">
                        {ccu ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] ${ccu.dimensionPassed === "Yes" ? "text-emerald-700 bg-emerald-50 border border-emerald-200" : ccu.dimensionPassed === "No" ? "text-red-700 bg-red-50 border border-red-200" : "text-slate-400"}`}>
                            {ccu.dimensionPassed || "-"}
                          </span>
                        ) : ""}
                      </div>
                    );
                  })}
                </div>

                {/* Stencil weight */}
                <div className="grid grid-cols-12 text-[10px] border-b border-slate-300 font-medium">
                  <div className="col-span-3 p-1.5 px-3 border-r border-slate-600 text-slate-800 text-[10px]">
                    <span className="block text-[9px] text-slate-500">-T/W, N/W, MGW น้ำหนัก</span>
                  </div>
                  {Array.from({ length: 5 }).map((_, colIdx) => {
                    const ccu = selectedSheet.ccus[colIdx];
                    return (
                      <div key={colIdx} className="col-span-1.8 border-r border-slate-600 last:border-r-0 flex items-center justify-center font-bold">
                        {ccu ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] ${ccu.weightPassed === "Yes" ? "text-emerald-700 bg-emerald-50 border border-emerald-200" : ccu.weightPassed === "No" ? "text-red-700 bg-red-50 border border-red-200" : "text-slate-400"}`}>
                            {ccu.weightPassed || "-"}
                          </span>
                        ) : ""}
                      </div>
                    );
                  })}
                </div>

                {/* Condition Sling */}
                <div className="grid grid-cols-12 text-[10px] border-b border-slate-300 font-medium">
                  <div className="col-span-3 p-1.5 px-3 border-r border-slate-600 text-slate-800 text-[10px]">
                    <span className="font-bold">Condition Sling</span>
                    <span className="block text-[9px] text-slate-505">(สภาพโดยรวมและน้ำสลิง)</span>
                  </div>
                  {Array.from({ length: 5 }).map((_, colIdx) => {
                    const ccu = selectedSheet.ccus[colIdx];
                    return (
                      <div key={colIdx} className="col-span-1.8 border-r border-slate-600 last:border-r-0 flex items-center justify-center font-bold">
                        {ccu ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] ${ccu.conditionSlingPassed === "Yes" ? "text-emerald-700 bg-emerald-50 border border-emerald-200" : ccu.conditionSlingPassed === "No" ? "text-red-700 bg-red-50 border border-red-200" : "text-slate-400"}`}>
                            {ccu.conditionSlingPassed || "-"}
                          </span>
                        ) : ""}
                      </div>
                    );
                  })}
                </div>

                {/* Color Code */}
                <div className="grid grid-cols-12 text-[10px] border-b border-slate-300 font-medium">
                  <div className="col-span-3 p-1.5 px-3 border-r border-slate-600 text-slate-800 text-[10px]">
                    <span className="font-bold">Color code (รหัสสีประจำปี)</span>
                  </div>
                  {Array.from({ length: 5 }).map((_, colIdx) => {
                    const ccu = selectedSheet.ccus[colIdx];
                    return (
                      <div key={colIdx} className="col-span-1.8 border-r border-slate-600 last:border-r-0 flex items-center justify-center font-bold">
                        {ccu ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] ${ccu.colorCodePassed === "Yes" ? "text-emerald-700 bg-emerald-50 border border-emerald-200" : ccu.colorCodePassed === "No" ? "text-red-700 bg-red-50 border border-red-200" : "text-slate-400"}`}>
                            {ccu.colorCodePassed || "-"}
                          </span>
                        ) : ""}
                      </div>
                    );
                  })}
                </div>

                {/* Light Painting */}
                <div className="grid grid-cols-12 text-[10px] border-b border-slate-300 font-medium">
                  <div className="col-span-3 p-1.5 px-3 border-r border-slate-600 text-slate-800 text-[10px]">
                    <span className="font-bold">Light Painting (ทาสีบางจุด)</span>
                  </div>
                  {Array.from({ length: 5 }).map((_, colIdx) => {
                    const ccu = selectedSheet.ccus[colIdx];
                    return (
                      <div key={colIdx} className="col-span-1.8 border-r border-slate-600 last:border-r-0 flex items-center justify-center font-bold">
                        {ccu ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] ${ccu.lightPaintingPassed === "Yes" ? "text-emerald-700 bg-emerald-50 border border-emerald-200" : ccu.lightPaintingPassed === "No" ? "text-red-700 bg-red-50 border border-red-200" : "text-slate-400"}`}>
                            {ccu.lightPaintingPassed || "-"}
                          </span>
                        ) : ""}
                      </div>
                    );
                  })}
                </div>

                {/* Color Coatings upper edge */}
                <div className="grid grid-cols-12 text-[10px] border-b border-slate-300 font-medium">
                  <div className="col-span-3 p-1.5 px-3 border-r border-slate-600 text-slate-800 text-[10px]">
                    <span className="font-bold">Color Coatings the edges</span>
                    <span className="block text-[9px] text-slate-500">(สีคัดขอบบนภาชนะ) Ref: DNV</span>
                  </div>
                  {Array.from({ length: 5 }).map((_, colIdx) => {
                    const ccu = selectedSheet.ccus[colIdx];
                    return (
                      <div key={colIdx} className="col-span-1.8 border-r border-slate-600 last:border-r-0 flex items-center justify-center font-bold">
                        {ccu ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] ${ccu.colorCoatingsEdgesPassed === "Yes" ? "text-emerald-700 bg-emerald-50 border border-emerald-200" : ccu.colorCoatingsEdgesPassed === "No" ? "text-red-700 bg-red-50 border border-red-200" : "text-slate-400"}`}>
                            {ccu.colorCoatingsEdgesPassed || "-"}
                          </span>
                        ) : ""}
                      </div>
                    );
                  })}
                </div>

                {/* Nameplate */}
                <div className="grid grid-cols-12 text-[10px] border-b border-slate-300 font-medium">
                  <div className="col-span-3 p-1.5 px-3 border-r border-slate-600 text-slate-800 text-[10px]">
                    <span className="font-bold">Name plate replacement / Update</span>
                    <span className="block text-[9px] text-slate-505">(เปลี่ยนแผ่นใหม่/สถานะล่าสุด)</span>
                  </div>
                  {Array.from({ length: 5 }).map((_, colIdx) => {
                    const ccu = selectedSheet.ccus[colIdx];
                    return (
                      <div key={colIdx} className="col-span-1.8 border-r border-slate-600 last:border-r-0 flex items-center justify-center font-bold">
                        {ccu ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] ${ccu.namePlatePassed === "Yes" ? "text-emerald-700 bg-emerald-50 border border-emerald-200" : ccu.namePlatePassed === "No" ? "text-red-700 bg-red-50 border border-red-200" : "text-slate-400"}`}>
                            {ccu.namePlatePassed || "-"}
                          </span>
                        ) : ""}
                      </div>
                    );
                  })}
                </div>

                {/* Tag Line */}
                <div className="grid grid-cols-12 text-[10px] border-b border-slate-300 font-medium">
                  <div className="col-span-3 p-1.5 px-3 border-r border-slate-600 text-slate-800 text-[10px]">
                    <span className="font-bold">Tag line</span>
                    <span className="block text-[9px] text-slate-500">(เชือกเลี้ยง : ขนาด, ความยาว และการแตก)</span>
                  </div>
                  {Array.from({ length: 5 }).map((_, colIdx) => {
                    const ccu = selectedSheet.ccus[colIdx];
                    return (
                      <div key={colIdx} className="col-span-1.8 border-r border-slate-600 last:border-r-0 flex items-center justify-center font-bold">
                        {ccu ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] ${ccu.tagLinePassed === "Yes" ? "text-emerald-700 bg-emerald-50 border border-emerald-200" : ccu.tagLinePassed === "No" ? "text-red-700 bg-red-50 border border-red-200" : "text-slate-400"}`}>
                            {ccu.tagLinePassed || "-"}
                          </span>
                        ) : ""}
                      </div>
                    );
                  })}
                </div>

                {/* Cleaning */}
                <div className="grid grid-cols-12 text-[10px] border-b border-slate-650 font-medium">
                  <div className="col-span-3 p-1.5 px-3 border-r border-slate-600 text-slate-800 text-[10px]">
                    <span className="font-bold">Cleaning (งานที่ต้องล้างทำความสะอาดก่อนการใช้งาน)</span>
                  </div>
                  {Array.from({ length: 5 }).map((_, colIdx) => {
                    const ccu = selectedSheet.ccus[colIdx];
                    return (
                      <div key={colIdx} className="col-span-1.8 border-r border-slate-600 last:border-r-0 flex items-center justify-center font-bold">
                        {ccu ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] ${ccu.cleaningPassed === "Yes" ? "text-emerald-700 bg-emerald-50 border border-emerald-200" : ccu.cleaningPassed === "No" ? "text-red-700 bg-red-50 border border-red-200" : "text-slate-400"}`}>
                            {ccu.cleaningPassed || "-"}
                          </span>
                        ) : ""}
                      </div>
                    );
                  })}
                </div>

                {/* MAJOR REPAIR SERVICE TITLE SLATE */}
                <div className="bg-[#ffebcd] border-b border-slate-600 py-1.5 text-center text-xs font-black uppercase text-slate-805 tracking-wider">
                  Major repair Service (งานซ่อมหนัก)
                </div>

                {/* MAJOR REPAIR ITEMS */}
                {/* Locking devices */}
                <div className="grid grid-cols-12 text-[10px] border-b border-slate-300 font-medium">
                  <div className="col-span-3 p-1.5 px-3 border-r border-slate-600 text-slate-800 text-[10px]">
                    <span className="font-bold">Locking device (ชุดล็อคแต่ละจุด)</span>
                  </div>
                  {Array.from({ length: 5 }).map((_, colIdx) => {
                    const ccu = selectedSheet.ccus[colIdx];
                    return (
                      <div key={colIdx} className="col-span-1.8 border-r border-slate-600 last:border-r-0 flex items-center justify-center font-bold">
                        {ccu ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] ${ccu.lockingDevicePassed === "Yes" ? "text-emerald-700 bg-[#e2f0d9] border border-emerald-300" : ccu.lockingDevicePassed === "No" ? "text-red-700 bg-red-50 border border-red-200" : "text-slate-400"}`}>
                            {ccu.lockingDevicePassed === "Yes" ? "Yes" : ccu.lockingDevicePassed || "-"}
                          </span>
                        ) : ""}
                      </div>
                    );
                  })}
                </div>

                {/* Rack support */}
                <div className="grid grid-cols-12 text-[10px] border-b border-slate-300 font-medium">
                  <div className="col-span-3 p-1.5 px-3 border-r border-slate-600 text-slate-800 text-[10px]">
                    <span className="font-bold">Rack Support (ตัวรองอุปกรณ์ด้านใน)</span>
                  </div>
                  {Array.from({ length: 5 }).map((_, colIdx) => {
                    const ccu = selectedSheet.ccus[colIdx];
                    return (
                      <div key={colIdx} className="col-span-1.8 border-r border-slate-600 last:border-r-0 flex items-center justify-center font-bold">
                        {ccu ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] ${ccu.rackSupportPassed === "Yes" ? "text-emerald-700 bg-[#e2f0d9] border border-emerald-300" : ccu.rackSupportPassed === "No" ? "text-red-700 bg-red-50 border border-red-200" : "text-slate-400"}`}>
                            {ccu.rackSupportPassed === "Yes" ? "Yes" : ccu.rackSupportPassed || "-"}
                          </span>
                        ) : ""}
                      </div>
                    );
                  })}
                </div>

                {/* Structural repair */}
                <div className="grid grid-cols-12 text-[10px] border-b border-slate-300 font-medium">
                  <div className="col-span-3 p-1.5 px-3 border-r border-slate-600 text-slate-800 text-[10px]">
                    <span className="font-bold">Structural repair Main/Secondary</span>
                    <span className="block text-[9px] text-slate-500">(การตรวจโครงสร้างหลัก/รอง)</span>
                  </div>
                  {Array.from({ length: 5 }).map((_, colIdx) => {
                    const ccu = selectedSheet.ccus[colIdx];
                    return (
                      <div key={colIdx} className="col-span-1.8 border-r border-slate-600 last:border-r-0 flex items-center justify-center font-bold">
                        {ccu ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] ${ccu.structuralRepairPassed === "Yes" ? "text-emerald-700 bg-[#e2f0d9] border border-emerald-300" : ccu.structuralRepairPassed === "No" ? "text-red-700 bg-red-50 border border-red-200" : "text-slate-400"}`}>
                            {ccu.structuralRepairPassed === "Yes" ? "Yes" : ccu.structuralRepairPassed || "-"}
                          </span>
                        ) : ""}
                      </div>
                    );
                  })}
                </div>

                {/* Full body painting */}
                <div className="grid grid-cols-12 text-[10px] border-b border-slate-300 font-medium">
                  <div className="col-span-3 p-1.5 px-3 border-r border-slate-600 text-slate-800 text-[10px]">
                    <span className="font-bold">Full body Painting (ทาสีทั้งตัว)</span>
                  </div>
                  {Array.from({ length: 5 }).map((_, colIdx) => {
                    const ccu = selectedSheet.ccus[colIdx];
                    return (
                      <div key={colIdx} className="col-span-1.8 border-r border-slate-600 last:border-r-0 flex items-center justify-center font-bold">
                        {ccu ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] ${ccu.fullBodyPaintingPassed === "Yes" ? "text-emerald-700 bg-[#e2f0d9] border border-emerald-300" : ccu.fullBodyPaintingPassed === "No" ? "text-red-700 bg-red-50 border border-red-200" : "text-slate-400"}`}>
                            {ccu.fullBodyPaintingPassed === "Yes" ? "Yes" : ccu.fullBodyPaintingPassed || "-"}
                          </span>
                        ) : ""}
                      </div>
                    );
                  })}
                </div>

                {/* Replace sling */}
                <div className="grid grid-cols-12 text-[10px] border-b border-slate-300 font-medium">
                  <div className="col-span-3 p-1.5 px-3 border-r border-slate-600 text-slate-800 text-[10px]">
                    <span className="font-bold">Replace Sling (เปลี่ยนสลิงใหม่)</span>
                  </div>
                  {Array.from({ length: 5 }).map((_, colIdx) => {
                    const ccu = selectedSheet.ccus[colIdx];
                    return (
                      <div key={colIdx} className="col-span-1.8 border-r border-slate-600 last:border-r-0 flex items-center justify-center font-bold">
                        {ccu ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] ${ccu.replaceSlingPassed === "Yes" ? "text-emerald-700 bg-[#e2f0d9] border border-[#a2b292]" : ccu.replaceSlingPassed === "No" ? "text-red-700 bg-red-50 border border-red-200" : "text-slate-400"}`}>
                            {ccu.replaceSlingPassed === "Yes" ? "Yes" : ccu.replaceSlingPassed || "-"}
                          </span>
                        ) : ""}
                      </div>
                    );
                  })}
                </div>

                {/* Leg & Support */}
                <div className="grid grid-cols-12 text-[10px] border-b border-slate-600 font-medium">
                  <div className="col-span-3 p-1.5 px-3 border-r border-slate-600 text-slate-800 text-[10px]">
                    <span className="font-bold">Leg & Leg Support (ขาและตัวรองขา)</span>
                  </div>
                  {Array.from({ length: 5 }).map((_, colIdx) => {
                    const ccu = selectedSheet.ccus[colIdx];
                    return (
                      <div key={colIdx} className="col-span-1.8 border-r border-slate-600 last:border-r-0 flex items-center justify-center font-bold">
                        {ccu ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] ${ccu.legSupportPassed === "Yes" ? "text-emerald-700 bg-[#e2f0d9] border border-[#a2b292]" : ccu.legSupportPassed === "No" ? "text-red-700 bg-red-50 border border-red-200" : "text-slate-400"}`}>
                            {ccu.legSupportPassed === "Yes" ? "Yes" : ccu.legSupportPassed || "-"}
                          </span>
                        ) : ""}
                      </div>
                    );
                  })}
                </div>

                {/* HISTORICAL REMARKS ACCUMULATION SECTION */}
                <div className="p-3 bg-slate-50 border-b border-slate-600 text-xs">
                  <p className="font-bold uppercase text-slate-700 mb-1">Remark of Column Defect Findings:</p>
                  <div className="grid grid-cols-5 gap-3.5 mt-1.5">
                    {Array.from({ length: 5 }).map((_, colIdx) => {
                      const ccu = selectedSheet.ccus[colIdx];
                      return (
                        <div key={colIdx} className="text-[10px] border-r border-slate-300 last:border-none pr-2">
                          <p className="font-bold text-slate-500 font-mono text-[9px]">Col #{colIdx + 1} {ccu?.ccuNumber ? `(${ccu.ccuNumber})` : ""}:</p>
                          <p className="text-slate-900 italic font-semibold mt-0.5 leading-tight">{ccu?.remark || "None / OK"}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* OFFCIAL REVISION NUMBER FOOTER BAR */}
                <div className="p-2 py-1.5 select-none bg-slate-100 flex items-center justify-between text-[10.5px] font-bold text-slate-500 font-mono tracking-wider">
                  <span>RNG OILFIELD SERVICES CO., LTD.</span>
                  <span>TAT-BL Rev.00</span>
                </div>

              </div>
              
            </div>
          </>
        ) : (
          <div className="bg-slate-950 border border-slate-800 rounded-3xl py-24 text-center px-6">
            <ClipboardCheck className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-sm font-bold text-slate-300">No Checksheet Selected</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Select an existing checksheet from the sidebar or record a new Back Load transaction to automatically generate a prefilled sheet.
            </p>
          </div>
        )}

      </div>

      {/* Modern UI Toast and Modal Dialogs to Bypassing Browser iFrame Sandbox restrictions */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-2xl shadow-2xl flex items-center space-x-3 border animate-in fade-in slide-in-from-bottom-5 duration-300 ${
          toast.type === "success" ? "bg-emerald-950/95 border-emerald-500/35 text-emerald-300" :
          toast.type === "error" ? "bg-red-950/95 border-red-500/35 text-red-300" :
          "bg-slate-900/95 border-blue-500/35 text-blue-300"
        }`}>
          <span className="text-base font-bold">
            {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "ℹ"}
          </span>
          <span className="text-xs font-bold font-sans text-slate-100">{toast.message}</span>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-slate-150 font-bold text-sm text-slate-100">ยืนยันการลบ Checksheet</h3>
            <p className="text-slate-300 text-xs">
              คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูล Checksheet <strong className="text-red-400 font-mono">{deleteConfirmId}</strong>? ขั้นตอนนี้ไม่สามารถย้อนกลับคืนได้
            </p>
            <div className="flex justify-end space-x-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                ยืนยันลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {showPrintGuide && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-blue-600/10 text-blue-400 rounded-xl">
                  <Printer className="w-5 h-5" />
                </div>
                <h3 className="text-slate-100 font-bold text-sm">การจัดพิมพ์เอกสาร / บันทึก PDF</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPrintGuide(false)}
                className="text-slate-500 hover:text-slate-300 text-sm p-1"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed">
              <p className="bg-blue-950/40 border border-blue-900/40 p-3.1 rounded-xl text-blue-300/90 flex items-start space-x-2 font-medium">
                <span className="text-base shrink-0 mt-0.5">💡</span>
                <span>
                  เนื่องจากหน้าเว็บแสดงผลกำลังทำงานอยู่ภายใต้ระบบ iFrame Sandbox ของเครื่องมือพรีวิว ระบบพิมพ์บางกรณีในหน้าต่างย่อยนี้จึงถูกควบคุมหรือบล็อกจากเบราว์เซอร์ได้
                </span>
              </p>
              
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2.5">
                <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px] block">คำแนะนำเพื่อสิทธิการเซฟและสั่งพิมพ์ที่สมบูรณ์แบบ:</span>
                
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 font-medium ml-1">
                  <li>มองหาปุ่ม <strong className="text-blue-400 font-bold">"Open in a new tab" ↗</strong> ที่แถบเมนูสีน้ำเงินบนสุดของแถบขวา</li>
                  <li>คลิกเพื่อเปิดระบบ RNG & CCU Matrix ในแถบเบราว์เซอร์หลักแบบเต็มหน้าจอ</li>
                  <li>ไปที่หัวข้อ <strong className="text-amber-400 font-bold">Backload Checksheets (TAT-BL)</strong> แล้วเลือกงานที่ต้องการ</li>
                  <li>กดปุ่ม <strong className="text-emerald-400 font-bold">"Print/PDF Checksheet"</strong> ระบบจะเชื่อมโยงคำสั่งเครื่องพิมพ์ทันที</li>
                  <li>เลือกปลายทางเป็น <strong className="text-blue-400 font-semibold">"Save as PDF"</strong> เพื่อบันทึกเป็นไฟล์เอกสารลงเครื่อง</li>
                </ol>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowPrintGuide(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 cursor-pointer transition-colors"
              >
                ตกลงและดำเนินการต่อ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
