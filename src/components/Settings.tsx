/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import * as xlsx from "xlsx";
import { Asset, AssetType, AssetStatus } from "../types";
import { 
  Trash2, 
  FileUp, 
  AlertTriangle, 
  Check, 
  X, 
  Layers, 
  Server,
  Database,
  ArrowRight,
  ShieldAlert,
  Anchor,
  Compass,
  Plus
} from "lucide-react";

interface SettingsProps {
  onRefreshData: () => Promise<void>;
  existingAssetsCount: number;
  vessels?: string[];
  rigs?: string[];
  onUpdateVessels?: (updatedVessels: string[]) => Promise<void>;
  onUpdateRigs?: (updatedRigs: string[]) => Promise<void>;
  isStandalone?: boolean;
}

export default function Settings({ 
  onRefreshData, 
  existingAssetsCount,
  vessels,
  rigs,
  onUpdateVessels,
  onUpdateRigs,
  isStandalone
}: SettingsProps) {
  const vesselsList = vessels && vessels.length > 0 ? vessels : ["HD-38", "HD-29", "HD-68", "TMS Andaman"];
  const rigsList = rigs && rigs.length > 0 ? rigs : ["GHTH", "SKL", "FREE ZONE", "RNG PORT"];

  const [newVessel, setNewVessel] = useState("");
  const [newRig, setNewRig] = useState("");

  const handleAddVessel = async () => {
    if (!newVessel.trim()) return;
    const name = newVessel.trim();
    if (vesselsList.includes(name)) {
      alert("This vessel is already in the list!");
      return;
    }
    const updated = [...vesselsList, name];
    if (onUpdateVessels) {
      await onUpdateVessels(updated);
      setNewVessel("");
    }
  };

  const handleRemoveVessel = async (vesselName: string) => {
    const updated = vesselsList.filter(v => v !== vesselName);
    if (onUpdateVessels) {
      await onUpdateVessels(updated);
    }
  };

  const handleAddRig = async () => {
    if (!newRig.trim()) return;
    const name = newRig.trim();
    if (rigsList.includes(name)) {
      alert("This rig location is already in the list!");
      return;
    }
    const updated = [...rigsList, name];
    if (onUpdateRigs) {
      await onUpdateRigs(updated);
      setNewRig("");
    }
  };

  const handleRemoveRig = async (rigName: string) => {
    const updated = rigsList.filter(r => r !== rigName);
    if (onUpdateRigs) {
      await onUpdateRigs(updated);
    }
  };

  // Clear State
  const [confirmInput, setConfirmInput] = useState("");
  const [clearing, setClearing] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);

  // Import Excel State
  const [fileData, setFileData] = useState<Asset[]>([]);
  const [fileName, setFileName] = useState("");
  const [importMode, setImportMode] = useState<"merge" | "wipe">("merge");
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; count: number } | null>(null);
  const [mappingFeedbacks, setMappingFeedbacks] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Multi-sheets handling state
  const [workbook, setWorkbook] = useState<xlsx.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");

  // Function to rewrite the parsed database list from a targeted worksheet
  const parseSheetData = (wb: xlsx.WorkBook, sheetName: string) => {
    try {
      const worksheet = wb.Sheets[sheetName];
      if (!worksheet) return;

      const rows = xlsx.utils.sheet_to_json<Record<string, any>>(worksheet);

      if (rows.length === 0) {
        setFileData([]);
        setMappingFeedbacks([`⚠️ The worksheet "${sheetName}" has no data rows.`]);
        return;
      }

      // Map columns dynamically
      const parsedAssets: Asset[] = [];
      const feedbacks: string[] = [];

      // Identify headers normalized
      const sampleRow = rows[0];
      const originalHeaders = Object.keys(sampleRow);
      
      // Helper to find mapped header (exact match prioritized, then falls back to partial match)
      const findHeader = (aliases: string[]): string | undefined => {
        const normalizedAliases = aliases.map(a => a.toLowerCase().replace(/[^a-z0-9]/g, ""));
        
        // 1. Try exact matches first
        const exactMatch = originalHeaders.find(h => {
          const normalized = h.toLowerCase().replace(/[^a-z0-9]/g, "");
          return normalizedAliases.includes(normalized);
        });
        if (exactMatch) return exactMatch;

        // 2. Try partial match as fallback
        return originalHeaders.find(h => {
          const normalized = h.toLowerCase().replace(/[^a-z0-9]/g, "");
          return normalizedAliases.some(alias => normalized.includes(alias) || alias.includes(normalized));
        });
      };

      const ccuHeader = findHeader(["ccunumber", "sn", "serial", "ccu number", "sno", "ccusn"]);
      const typeHeader = findHeader(["type", "ccu type", "asset type", "ccutype"]);
      const ownerHeader = findHeader(["owner", "segment", "dept", "department", "ownersegment"]);
      const areaHeader = findHeader(["area", "location", "zone", "warehouse", "warehousearea"]);
      const statusHeader = findHeader(["status", "state", "asset status"]);
      const visualHeader = findHeader(["visualexpiry", "visual", "visualexpiradate", "visual expiry"]);
      const mpiHeader = findHeader(["mpiexpiry", "mpi", "mpiexpiradate", "mpi expiry"]);
      const remarkHeader = findHeader(["remark", "remarks", "defect", "symptom"]);
      const chemicalsHeader = findHeader(["chemicals", "chemical", "chemicalscode"]);
      const lengthHeader = findHeader(["length", "len", "lengthcm"]);
      const widthHeader = findHeader(["width", "wide", "widthcm", "widecm"]);
      const heightHeader = findHeader(["height", "high", "heightcm", "highcm"]);
      const tareHeader = findHeader(["tare", "tareweight", "tareweightkg", "tare weight"]);
      const payloadHeader = findHeader(["payload", "payloadkg", "payload weight"]);
      const grossHeader = findHeader(["gross", "grossweight", "grossweightkg", "gross weight"]);

      // Unhidden Lifting Gear and Load Test Columns
      const ltUnitHeader = findHeader(["ltunit", "loadtestunit", "lt unit", "load test unit", "unitloadtest"]);
      const ltSlingHeader = findHeader(["ltsling", "loadtestsling", "lt sling", "load test sling", "slingloadtest"]);
      const slingIdHeader = findHeader(["slingid", "sling id", "slingno", "sling s/n", "sling serial"]);
      const ltShackleHeader = findHeader(["ltshackle", "loadtestshackle", "lt shackle", "load test shackle", "shackleloadtest"]);
      const shackleIdHeader = findHeader(["shackleid", "shackle id", "shackleno", "shackle s/n", "shackle serial"]);

      if (ccuHeader) feedbacks.push(`✅ S/N (CCU Number) mapped to column: "${ccuHeader}"`);
      else feedbacks.push(`⚠️ S/N column not matched. Defaulting to first column: "${originalHeaders[0]}"`);

      if (typeHeader) feedbacks.push(`✅ CCU Type mapped to column: "${typeHeader}"`);
      else feedbacks.push(`ℹ️ CCU Type column not found. Defaulting fallback to "Pallet Carrier"`);

      if (ownerHeader) feedbacks.push(`✅ Owner Dept mapped to column: "${ownerHeader}"`);
      else feedbacks.push(`ℹ️ Owner Dept column not found. Defaulting to "CMT"`);

      if (lengthHeader) feedbacks.push(`✅ Length mapped to column: "${lengthHeader}"`);
      else feedbacks.push(`⚠️ Length column not mapped.`);

      if (widthHeader) feedbacks.push(`✅ Width mapped to column: "${widthHeader}"`);
      else feedbacks.push(`⚠️ Width column not mapped.`);

      if (heightHeader) feedbacks.push(`✅ Height mapped to column: "${heightHeader}"`);
      else feedbacks.push(`⚠️ Height column not mapped.`);

      if (tareHeader) feedbacks.push(`✅ Tare Weight mapped to column: "${tareHeader}"`);
      if (payloadHeader) feedbacks.push(`✅ Payload mapped to column: "${payloadHeader}"`);
      if (grossHeader) feedbacks.push(`✅ Gross Weight mapped to column: "${grossHeader}"`);

      // Lifting gear mapping feedbacks
      if (ltUnitHeader) feedbacks.push(`✅ LT Unit (Load Test Unit) mapped to column: "${ltUnitHeader}"`);
      if (ltSlingHeader) feedbacks.push(`✅ LT Sling (Load Test Sling) mapped to column: "${ltSlingHeader}"`);
      if (slingIdHeader) feedbacks.push(`✅ Sling ID mapped to column: "${slingIdHeader}"`);
      if (ltShackleHeader) feedbacks.push(`✅ LT Shackle (Load Test Shackle) mapped to column: "${ltShackleHeader}"`);
      if (shackleIdHeader) feedbacks.push(`✅ Shackle ID mapped to column: "${shackleIdHeader}"`);

      setMappingFeedbacks(feedbacks);

      const parseNumericValue = (val: any): number | undefined => {
        if (val === null || val === undefined || val === "") return undefined;
        if (typeof val === "number") return Math.round(val);
        const cleaned = String(val).replace(/,/g, "").replace(/[^0-9.-]/g, "").trim();
        const num = parseInt(cleaned, 10);
        return isNaN(num) ? undefined : num;
      };

      rows.forEach((row) => {
        // Fallback Serial Number index
        const sNoVal = String(row[ccuHeader || originalHeaders[0]] || "").trim().toUpperCase();
        
        // Skip empty rows, general definitions blocks, or total text headers
        if (!sNoVal || sNoVal === "TOTAL" || sNoVal === "S/N" || sNoVal.includes("DEFINITIONS")) return;

        // Parse and normalize CCU Type enum
        let typeVal: AssetType = AssetType.PALLET_CARRIER;
        const typedValStr = String(row[typeHeader || ""] || "").toUpperCase();
        if (typedValStr.includes("BASKET") || typedValStr.includes("HH") || typedValStr.includes("HALF")) {
          typeVal = AssetType.BASKET;
        } else if (typedValStr.includes("TOOL") || typedValStr.includes("BOX")) {
          typeVal = AssetType.TOOL_BOX;
        } else if (typedValStr.includes("SKID")) {
          typeVal = AssetType.SKID;
        } else if (typedValStr.includes("CONTAINER") || typedValStr.includes("SKIP") || typedValStr.includes("OFFSHORE")) {
          typeVal = AssetType.CONTAINER;
        } else if (typedValStr.includes("TOTE") || typedValStr.includes("TANK") || typedValStr.includes("GAS") || typedValStr.includes("CYLINDER")) {
          typeVal = AssetType.TOTE_TANK;
        } else if (typedValStr.includes("PALLET")) {
          typeVal = AssetType.PALLET_CARRIER;
        }

        // Normalize Status
        let statusVal: AssetStatus = AssetStatus.READY;
        const statusValStr = String(row[statusHeader || ""] || "").toUpperCase();
        if (statusValStr.includes("SERVICE") || statusValStr.includes("REPAIR")) {
          statusVal = AssetStatus.SERVICE;
        } else if (statusValStr.includes("PLAN") || statusValStr.includes("BOOK")) {
          statusVal = AssetStatus.IN_PLAN;
        } else if (statusValStr.includes("OUT") || statusValStr.includes("GOING")) {
          statusVal = AssetStatus.OUT_GOING;
        } else if (statusValStr.includes("BACK") || statusValStr.includes("LOAD")) {
          statusVal = AssetStatus.UNDERGOING_BACKLOAD;
        }

        // Parse specs/weights ensuring they are numbers
        const lengthVal = parseNumericValue(row[lengthHeader || ""]);
        const widthVal = parseNumericValue(row[widthHeader || ""]);
        const heightVal = parseNumericValue(row[heightHeader || ""]);
        const tareVal = parseNumericValue(row[tareHeader || ""]);
        const payloadVal = parseNumericValue(row[payloadHeader || ""]);
        const grossVal = parseNumericValue(row[grossHeader || ""]);

        parsedAssets.push({
          ccuNumber: sNoVal,
          type: typeVal,
          owner: String(row[ownerHeader || ""] || "CMT").trim().toUpperCase(),
          area: String(row[areaHeader || ""] || "FREE ZONE").trim(),
          status: statusVal,
          visualExpiraDate: String(row[visualHeader || ""] || "2026-12-15").trim(),
          mpiExpiraDate: String(row[mpiHeader || ""] || "2026-12-15").trim(),
          remark: row[remarkHeader || ""] ? String(row[remarkHeader || ""]).trim() : undefined,
          chemicals: row[chemicalsHeader || ""] ? String(row[chemicalsHeader || ""]).trim() : undefined,
          lengthCm: lengthVal,
          widthCm: widthVal,
          heightCm: heightVal,
          tareWeightKg: tareVal,
          payloadKg: payloadVal,
          grossWeightKg: grossVal,
          
          // Set new parsed lifting gear parameters
          ltUnit: row[ltUnitHeader || ""] ? String(row[ltUnitHeader || ""]).trim() : undefined,
          ltSling: row[ltSlingHeader || ""] ? String(row[ltSlingHeader || ""]).trim() : undefined,
          slingId: row[slingIdHeader || ""] ? String(row[slingIdHeader || ""]).trim() : undefined,
          ltShackle: row[ltShackleHeader || ""] ? String(row[ltShackleHeader || ""]).trim() : undefined,
          shackleId: row[shackleIdHeader || ""] ? String(row[shackleIdHeader || ""]).trim() : undefined
        });
      });

      setFileData(parsedAssets);
      setImportResult(null);
    } catch (err: any) {
      alert("Error parsing spreadsheets sheet: " + err.message);
    }
  };

  // Standard CCU values mapper function
  const parseExcelOrCsv = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) return;

        const wb = xlsx.read(data, { type: "binary" });
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
        setFileName(file.name);

        // Smart selector: find a worksheet matching "DATA BASE" or "DATABASE" (case & space insensitive)
        let defaultSheet = wb.SheetNames[0];
        const foundDbSheet = wb.SheetNames.find((s: string) => {
          const norm = s.toLowerCase().replace(/[^a-z0-9]/g, "");
          return norm.includes("database") || norm.includes("datacmt") || norm.includes("cmtdata");
        });
        if (foundDbSheet) {
          defaultSheet = foundDbSheet;
        }

        setSelectedSheet(defaultSheet);
        parseSheetData(wb, defaultSheet);
      } catch (err: any) {
        alert("Error parsing spreadsheets: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const clearFile = () => {
    setFileData([]);
    setFileName("");
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet("");
    setImportResult(null);
    setMappingFeedbacks([]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      parseExcelOrCsv(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      parseExcelOrCsv(e.target.files[0]);
    }
  };

  // Submit parsed data to back-end
  const handleProceedImport = async () => {
    if (fileData.length === 0) return;
    try {
      setImportLoading(true);
      const clearFirst = importMode === "wipe";
      
      if (isStandalone) {
        const { ClientDbStore } = await import("../utils/localStorageStore");
        ClientDbStore.bulkImport(fileData, clearFirst);
        setImportResult({ success: true, count: fileData.length });
        clearFile();
        await onRefreshData();
        return;
      }
      
      const res = await fetch("/api/assets/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          assets: fileData, 
          clearFirst 
        })
      });

      if (!res.ok) {
        throw new Error("Bulk upload failed on RNG server.");
      }

      const bodyData = await res.json();
      setImportResult({ success: true, count: bodyData.count });
      clearFile();
      
      // Refresh Global App State
      await onRefreshData();
    } catch (err: any) {
      alert("Error executing bulk import: " + err.message);
    } finally {
      setImportLoading(false);
    }
  };

  // Trigger Clear Database API
  const handleClearDatabase = async () => {
    if (confirmInput !== "CONFIRM CLEAR") {
      alert("Please key in CONFIRM CLEAR explicitly to unlock.");
      return;
    }

    try {
      setClearing(true);
      
      if (isStandalone) {
        const { ClientDbStore } = await import("../utils/localStorageStore");
        ClientDbStore.clearAllData();
        setClearSuccess(true);
        setConfirmInput("");
        await onRefreshData();
        setTimeout(() => {
          setClearSuccess(false);
        }, 5000);
        return;
      }
      
      const res = await fetch("/api/clear", { method: "POST" });
      if (!res.ok) throw new Error("Clear command rejected by RNG service.");

      setClearSuccess(true);
      setConfirmInput("");
      
      // Sync Global State
      await onRefreshData();
      
      setTimeout(() => {
        setClearSuccess(false);
      }, 5000);
    } catch (err: any) {
      alert("Error wiping data: " + err.message);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6" id="settings-stage">
      
      {/* Overview Head section */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6 flex items-center space-x-4">
        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
          <Database className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">System Settings & Operations</h2>
          <p className="text-xs text-slate-400 mt-1">
            Perform administrative tasking, load historical database backups, or recycle system memory securely.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Excel Uploader */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-100 p-6 space-y-6 text-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <FileUp className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Upload Old CCU Database (Excel / CSV)</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Supports .xlsx, .xls and .csv columns mapping automatically. Upload your legacy database tables.
            </p>
          </div>

          {/* Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-105 transition-transform mb-3">
              <FileUp className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-slate-700">Drag & drop your Excel file here, or click to browse</p>
            <p className="text-[10px] text-slate-400 mt-1">Accepts Excel Spreadsheet (.xlsx, .xls) & comma-separated values (.csv)</p>
          </div>

          {/* Import Results Notification */}
          {importResult && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start space-x-3 text-emerald-800">
              <div className="bg-emerald-600 text-white rounded-full p-1 mt-0.5">
                <Check className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-bold">Import Completed Successfully!</p>
                <p className="text-[11px] text-emerald-600 mt-1">
                  Successfully mapped and ingested <strong>{importResult.count}</strong> cargo carrying units into RNG Database.
                </p>
              </div>
            </div>
          )}

          {/* Parsed spreadsheet preview / actions */}
          {(fileData.length > 0 || sheetNames.length > 0) && (
            <div className="space-y-4 bg-slate-50 border border-slate-150 p-4 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800 truncate max-w-xs">{fileName}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Parsed <strong className="text-emerald-700">{fileData.length} entries</strong> from sheet <strong className="text-blue-700">"{selectedSheet}"</strong>.
                  </p>
                </div>
                <button 
                  onClick={clearFile}
                  className="p-1 hover:bg-slate-200 rounded text-slate-400 cursor-pointer"
                  title="Remove spreadsheet"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* WORKSHEET DROPDOWN SELECTOR INTEGRATION */}
              {sheetNames.length > 0 && (
                <div className="space-y-1.5 bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                  <label className="block text-[11px] font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                    Select Database Sheet (เลือกชีทข้อมูล):
                  </label>
                  <select
                    value={selectedSheet}
                    onChange={(e) => {
                      const newSheet = e.target.value;
                      setSelectedSheet(newSheet);
                      if (workbook) {
                        parseSheetData(workbook, newSheet);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-blue-400 text-slate-800 text-xs font-bold px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer outline-none transition-colors"
                  >
                    {sheetNames.map((name) => {
                      const isDbSheetCandidate = name.toLowerCase().includes("database") || name.toLowerCase().includes("data base") || name.toLowerCase().includes("cmt data");
                      return (
                        <option key={name} value={name}>
                          {name} {isDbSheetCandidate ? "⭐ (แนะนำ - แหล่งข้อมูล)" : ""}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    💡 ระบบกำลังโหลดแถวข้อมูลจากชีท <strong className="text-slate-700">"{selectedSheet}"</strong>. คุณสามารถเปลี่ยนชีทเป็นชีทอื่น เช่น <strong className="text-slate-700">"DATA BASE"</strong> ได้ทันทีทางด้านบนเพื่อดึงข้อมูล CCU จริงทั้งหมด
                  </p>
                </div>
              )}

              {/* Mapping diagnostics */}
              <div className="space-y-1 bg-white border border-slate-200 rounded-xl p-3 text-[10px] text-slate-600 font-mono">
                <p className="font-bold text-slate-700 uppercase border-b border-slate-100 pb-1 mb-1.5">Column Map Integrity</p>
                {mappingFeedbacks.map((m, idx) => (
                  <p key={idx}>{m}</p>
                ))}
              </div>

              {/* Choose Mode */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-600">Choose Database Ingestion Policy</label>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setImportMode("merge")}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      importMode === "merge" 
                        ? "border-emerald-500 bg-emerald-50/20 text-emerald-800 font-bold shadow-xs" 
                        : "border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <p className="font-semibold">Merge Assets</p>
                    <p className="text-[9px] text-slate-400 font-normal mt-0.5">Overwrites matching CCU serial numbers, keeps existing database intact.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode("wipe")}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      importMode === "wipe" 
                        ? "border-emerald-500 bg-emerald-50/20 text-emerald-800 font-bold shadow-xs" 
                        : "border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <p className="font-semibold">Replace Database</p>
                    <p className="text-[9px] text-slate-400 font-normal mt-0.5">Wipes database clean first to only host newly uploaded file items.</p>
                  </button>
                </div>
              </div>

              {/* Confirm Import button */}
              <button
                type="button"
                onClick={handleProceedImport}
                disabled={importLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center space-x-2 cursor-pointer shadow-md shadow-emerald-600/10 disabled:opacity-50"
              >
                {importLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Import {fileData.length} Equipment Entries</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Quick spreadsheet table templates info */}
          <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
            <h4 className="text-xs font-bold text-blue-800 flex items-center gap-1">
              <span className="text-base">💡</span> Supported column mapping headers:
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[10px] text-blue-700/80 mt-2 font-semibold">
              <p>CCU Number / SN</p>
              <p>Type / CCU Type</p>
              <p>Owner / Segment</p>
              <p>Area / Location</p>
              <p>Status</p>
              <p>Visual / MPI Expiry</p>
              <p>Width / Length / Height</p>
              <p>Tare / Payload</p>
              <p>Remark / Defect</p>
              <p>LT Unit / LT Sling</p>
              <p>Sling ID / LT Shackle</p>
              <p>Shackle ID</p>
            </div>
          </div>

        </div>

        {/* Right Side: Maintenance & Memory Cleansing */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Status Monitor Card */}
          <div className="bg-slate-950 rounded-3xl border border-slate-800 p-6 space-y-4 text-slate-200">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
              <Server className="w-4 h-4 text-blue-500" />
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Storage Diagnostics</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800/60 p-3.5 rounded-2xl">
                <p className="text-[10px] font-semibold text-slate-500 uppercase leading-none">Database size</p>
                <p className="text-lg font-bold text-white mt-1.5">{existingAssetsCount} Assets</p>
              </div>
              <div className="bg-slate-900 border border-slate-800/60 p-3.5 rounded-2xl">
                <p className="text-[10px] font-semibold text-slate-500 uppercase leading-none">Storage Type</p>
                <p className="text-lg font-bold text-blue-400 mt-1.5">JSON Express</p>
              </div>
            </div>
          </div>

          {/* Custom parameter management section (Vessels and Rigs) */}
          <div className="bg-slate-950 rounded-3xl border border-slate-800 p-6 space-y-6">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-850">
              <Compass className="w-4 h-4 text-blue-500" />
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Configure Vessels & Rigs (จัดการเรือและพิกัด)</h3>
            </div>

            {/* Vessel list manager */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 flex items-center justify-between">
                <span>🚢 VESSEL Name Options ({vesselsList.length})</span>
                <span className="text-[10px] font-normal text-slate-500">คลิก ✕ เพื่อลบ</span>
              </h4>
              
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                {vesselsList.map((v) => (
                  <div key={v} className="flex justify-between items-center bg-slate-900 px-3 py-2 rounded-xl border border-slate-800/60 text-xs">
                    <span className="font-semibold text-slate-200">{v}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveVessel(v)}
                      className="text-slate-500 hover:text-red-400 transition-colors cursor-pointer p-0.5"
                      title="Remove Vessel option"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="เช่น HD-99 (New Vessel)"
                  value={newVessel}
                  onChange={(e) => setNewVessel(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 text-xs rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddVessel();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddVessel}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center"
                >
                  <Plus className="w-3.5 h-3.5 mr-0.5" />
                  <span>เพิ่ม</span>
                </button>
              </div>
            </div>

            {/* Rig list manager */}
            <div className="space-y-3 pt-5 border-t border-slate-900">
              <h4 className="text-xs font-bold text-slate-400 flex items-center justify-between">
                <span>📍 RIG / Location Options ({rigsList.length})</span>
                <span className="text-[10px] font-normal text-slate-550">คลิก ✕ เพื่อลบ</span>
              </h4>
              
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                {rigsList.map((r) => (
                  <div key={r} className="flex justify-between items-center bg-slate-900 px-3 py-2 rounded-xl border border-slate-800/60 text-xs">
                    <span className="font-semibold text-slate-200">{r}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRig(r)}
                      className="text-slate-500 hover:text-red-400 transition-colors cursor-pointer p-0.5"
                      title="Remove Rig option"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="เช่น PATRA (New Rig)"
                  value={newRig}
                  onChange={(e) => setNewRig(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 text-xs rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddRig();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddRig}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center"
                >
                  <Plus className="w-3.5 h-3.5 mr-0.5" />
                  <span>เพิ่ม</span>
                </button>
              </div>
            </div>
          </div>

          {/* High Danger Clearance Area */}
          <div className="bg-slate-950 rounded-3xl border border-red-950 p-6 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-red-500">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Danger Maintenance Area</h3>
              </div>
              <p className="text-xs font-bold text-slate-100">Wipe Database Clean & Reset</p>
              <p className="text-[11px] text-slate-400">
                Wipes all assets and transactions in inventory records. Data will be unrecoverable. 
              </p>
            </div>

            {clearSuccess && (
              <div className="bg-red-950/40 border border-red-900 text-red-200 rounded-2xl p-3.5 text-xs text-center font-semibold">
                💥 Database cleared successfully. Seeding arrays empty.
              </div>
            )}

            <div className="space-y-3.5 pt-2 border-t border-slate-900">
              <div>
                <label className="block text-[10.5px] font-bold text-red-300 mb-1.5 uppercase tracking-wider">
                  Type "CONFIRM CLEAR" below to unlock button:
                </label>
                <input
                  type="text"
                  placeholder="CONFIRM CLEAR"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 hover:border-red-900 rounded-xl px-3 py-2.5 text-xs font-bold text-center text-red-400 focus:outline-none focus:ring-1 focus:ring-red-500 uppercase tracking-widest placeholder:text-slate-650"
                  id="unlock-clear-input"
                />
              </div>

              <button
                type="button"
                disabled={confirmInput !== "CONFIRM CLEAR" || clearing}
                onClick={handleClearDatabase}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-slate-900 disabled:text-slate-600 font-bold text-xs py-3 rounded-xl flex items-center justify-center space-x-2 shadow-md hover:shadow-red-500/10 transition-all cursor-pointer disabled:cursor-not-allowed"
                id="btn-confirm-clear-database"
              >
                <Trash2 className="w-4 h-4" />
                <span>{clearing ? "Clearing database ledger..." : "Confirm & Clear Database"}</span>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
