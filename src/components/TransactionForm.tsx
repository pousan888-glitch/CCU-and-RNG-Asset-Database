/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Asset, AssetType, AssetStatus, Transaction, TransactionType } from "../types";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Tv, 
  Search, 
  CalendarDays, 
  Anchor, 
  Compass, 
  Building, 
  FileText, 
  CheckCircle, 
  Activity,
  ScanLine,
  Camera,
  X,
  Plus
} from "lucide-react";

const normalizeSerial = (val: string): string => {
  return val.replace(/[\s\-_/\\.:]/g, "").toUpperCase();
};

const getLevenshteinDistance = (a: string, b: string): number => {
  const tmpA = a.toUpperCase();
  const tmpB = b.toUpperCase();
  const matrix: number[][] = [];
  for (let i = 0; i <= tmpB.length; i++) matrix[i] = [i];
  for (let j = 0; j <= tmpA.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= tmpB.length; i++) {
    matrix[i] = [i];
    for (let j = 1; j <= tmpA.length; j++) {
      if (tmpB.charAt(i - 1) === tmpA.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[tmpB.length][tmpA.length];
};

interface SimilarityMatch {
  type: "exact" | "normalized" | "similar";
  asset: Asset;
  reason: string;
}

const getSimilarityDetails = (input: string, assets: Asset[]): SimilarityMatch | null => {
  const cleanInput = input.trim().toUpperCase();
  if (!cleanInput) return null;

  // 1. Exact match
  const exactMatch = assets.find(a => a.ccuNumber.toUpperCase() === cleanInput);
  if (exactMatch) {
    return {
      type: "exact",
      asset: exactMatch,
      reason: "Exact match found."
    };
  }

  // 2. Normalized match (ignoring spaces, dashes, dots, etc.)
  const normalizedInput = normalizeSerial(cleanInput);
  const normalizedMatch = assets.find(a => normalizeSerial(a.ccuNumber) === normalizedInput);
  if (normalizedMatch) {
    return {
      type: "normalized",
      asset: normalizedMatch,
      reason: `Found registered CCU "${normalizedMatch.ccuNumber}" which is identical but had different spacing/dashes.`
    };
  }

  // 3. Similar match using Levenshtein distance
  const similarities = assets
    .map(a => {
      const dist = getLevenshteinDistance(normalizedInput, normalizeSerial(a.ccuNumber));
      return { asset: a, dist };
    })
    .filter(item => item.dist > 0 && item.dist <= 2)
    .sort((a, b) => a.dist - b.dist);

  if (similarities.length > 0) {
    const best = similarities[0].asset;
    return {
      type: "similar",
      asset: best,
      reason: `Found highly similar registered S/N: "${best.ccuNumber}".`
    };
  }

  return null;
};

interface TransactionFormProps {
  assets: Asset[];
  transactions: Transaction[];
  onAddTransaction: (tx: Omit<Transaction, "id"> | Omit<Transaction, "id">[]) => void;
  vessels?: string[];
  rigs?: string[];
}

export default function TransactionForm({ 
  assets, 
  transactions, 
  onAddTransaction,
  vessels,
  rigs
}: TransactionFormProps) {
  const vesselsList = vessels && vessels.length > 0 ? vessels : ["HD-38", "HD-29", "HD-68", "TMS Andaman"];
  const rigsList = rigs && rigs.length > 0 ? rigs : ["GHTH", "SKL", "FREE ZONE", "RNG PORT"];

  const [txType, setTxType] = useState<TransactionType>(TransactionType.LOAD_OUT);
  const [entryMode, setEntryMode] = useState<"single" | "batch">("single");
  const [ccuNumber, setCcuNumber] = useState("");
  const [batchCcus, setBatchCcus] = useState<string[]>([]);
  const [bulkText, setBulkText] = useState("");
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [date, setDate] = useState("2026-06-10");
  const [vessel, setVessel] = useState(vesselsList[0] || "HD-38");
  const [rig, setRig] = useState(rigsList[0] || "GHTH");

  React.useEffect(() => {
    if (vesselsList.length > 0 && !vesselsList.includes(vessel)) {
      setVessel(vesselsList[0]);
    }
  }, [vesselsList, vessel]);

  React.useEffect(() => {
    if (rigsList.length > 0 && !rigsList.includes(rig)) {
      setRig(rigsList[0]);
    }
  }, [rigsList, rig]);

  const [segment, setSegment] = useState("CMT");
  const [remark, setRemark] = useState("");
  const [requiresRepair, setRequiresRepair] = useState(false);

  // QR/Barcode Simulator Modal State
  const [showScanner, setShowScanner] = useState(false);
  const [scanning, setScanning] = useState(false);

  // CCU Search suggestions
  const [showSuggestions, setShowSuggestions] = useState(false);

  // filter suggestable CCU Numbers using normalized and fuzzy matches
  const filteredSuggestions = assets.filter(a => {
    const inputClean = ccuNumber.toLowerCase().trim();
    if (!inputClean) return false;
    const normInput = normalizeSerial(inputClean);
    const normAsset = normalizeSerial(a.ccuNumber);
    return (
      a.ccuNumber.toLowerCase().includes(inputClean) ||
      normAsset.includes(normInput)
    );
  }).slice(0, 5);

  const matchedAsset = assets.find(a => a.ccuNumber.toLowerCase() === ccuNumber.toLowerCase().trim());
  const singleSimilarityInfo = getSimilarityDetails(ccuNumber, assets);

  const handleAddToBatch = (ccuToInsert?: string) => {
    const rawVal = ccuToInsert || ccuNumber;
    const clean = rawVal.toUpperCase().trim();
    if (!clean) return;
    
    if (batchCcus.includes(clean)) {
      alert(`CCU "${clean}" is already in the batch list.`);
      return;
    }
    
    setBatchCcus(prev => [...prev, clean]);
    
    // Auto-detect segment owner if exists
    const matched = assets.find(a => a.ccuNumber.toUpperCase() === clean);
    if (matched) {
      setSegment(matched.owner);
    }
    
    setCcuNumber(""); // Clear the input field for next search string
  };

  const handleCcuInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (entryMode === "batch") {
        handleAddToBatch();
      }
    }
  };

  const handleParseBulkText = () => {
    const lines = bulkText.split(/[\n, ]+/);
    const validTokens: string[] = [];
    
    lines.forEach(line => {
      const clean = line.trim().toUpperCase();
      if (clean && !validTokens.includes(clean)) {
        validTokens.push(clean);
      }
    });

    if (validTokens.length === 0) {
      alert("No valid CCU serials found in text.");
      return;
    }

    const newTokens = validTokens.filter(t => !batchCcus.includes(t));
    if (newTokens.length === 0) {
      alert("All entered CCU serials are already in the batch list.");
      return;
    }

    setBatchCcus(prev => [...prev, ...newTokens]);
    
    // Auto detect segment from the first matching asset
    for (const token of newTokens) {
      const matched = assets.find(a => a.ccuNumber.toUpperCase() === token);
      if (matched) {
        setSegment(matched.owner);
        break;
      }
    }

    setBulkText("");
    setShowBulkInput(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (entryMode === "single") {
      if (!ccuNumber.trim()) {
        alert("Please select or scan a CCU Number first.");
        return;
      }

      onAddTransaction({
        type: txType,
        date: new Date(date).toISOString(),
        ccuNumber: ccuNumber.toUpperCase().trim(),
        assetType: matchedAsset ? matchedAsset.type : AssetType.PALLET_CARRIER,
        vessel: vessel.trim(),
        rig: rig.trim(),
        segment: segment.toUpperCase().trim(),
        remark: txType === TransactionType.BACK_LOAD && (requiresRepair || remark) ? remark : undefined
      });

      // Reset fields
      setCcuNumber("");
      setRemark("");
      setRequiresRepair(false);
    } else {
      // Batch Mode
      if (batchCcus.length === 0) {
        alert("Please add at least one CCU to the batch list first.");
        return;
      }

      const txs = batchCcus.map(ccu => {
        const itemAsset = assets.find(a => a.ccuNumber.toLowerCase() === ccu.toLowerCase().trim());
        return {
          type: txType,
          date: new Date(date).toISOString(),
          ccuNumber: ccu.toUpperCase().trim(),
          assetType: itemAsset ? itemAsset.type : AssetType.PALLET_CARRIER,
          vessel: vessel.trim(),
          rig: rig.trim(),
          segment: segment.toUpperCase().trim(),
          remark: txType === TransactionType.BACK_LOAD && (requiresRepair || remark) ? remark : undefined
        };
      });

      onAddTransaction(txs);

      // Reset fields
      setBatchCcus([]);
      setBulkText("");
      setRemark("");
      setRequiresRepair(false);
    }
  };

  // Simulate scanning of S/N
  const handleTriggerMockScan = () => {
    setScanning(true);
    setTimeout(() => {
      // Pick a random asset S/N from registered database
      let scannedNum = "TXP-TTC-AAA-015";
      let scannedOwner = "CMT";
      if (assets.length > 0) {
        const randIdx = Math.floor(Math.random() * assets.length);
        const randomCcu = assets[randIdx];
        scannedNum = randomCcu.ccuNumber;
        scannedOwner = randomCcu.owner;
      }
      
      if (entryMode === "batch") {
        if (!batchCcus.includes(scannedNum)) {
          setBatchCcus(prev => [...prev, scannedNum]);
        }
        setSegment(scannedOwner);
      } else {
        setCcuNumber(scannedNum);
        setSegment(scannedOwner);
      }
      setScanning(false);
      setShowScanner(false);
    }, 1800); // Wait for mock scan line animation
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="transaction-manager">
      {/* 1. Transaction Entry Form */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-6 lg:col-span-1" id="form-card">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <span>Record CCU Transaction</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Log dispatch and returns to dynamically balance asset ledger statuses.
          </p>
        </div>

        {/* Transaction Type Tabs */}
        <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-100" id="transaction-type-tabs">
          <button
            type="button"
            onClick={() => setTxType(TransactionType.LOAD_OUT)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              txType === TransactionType.LOAD_OUT
                ? "bg-amber-500 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Load Out (IN TO OUT)</span>
          </button>
          <button
            type="button"
            onClick={() => setTxType(TransactionType.BACK_LOAD)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              txType === TransactionType.BACK_LOAD
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Back Load (OUT TO IN)</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* S/N Mode Entry Toggle */}
          <div className="space-y-1 relative">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wide">
                {entryMode === "batch" ? "Add to Batch (CCU S/N)" : "CCU Number (Serial S/N) *"}
              </label>
              <div className="flex bg-slate-100 p-0.5 rounded-md border border-slate-200">
                <button
                  type="button"
                  onClick={() => setEntryMode("single")}
                  className={`px-2 py-0.5 text-[9px] font-bold rounded-sm cursor-pointer transition-all ${
                    entryMode === "single"
                      ? "bg-white text-slate-800 shadow-3xs"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Single S/N
                </button>
                <button
                  type="button"
                  onClick={() => setEntryMode("batch")}
                  className={`px-2 py-0.5 text-[9px] font-bold rounded-sm cursor-pointer transition-all ${
                    entryMode === "batch"
                      ? "bg-white text-slate-800 shadow-3xs"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                  id="btn-mode-batch"
                >
                  Batch (Multi)
                </button>
              </div>
            </div>

            <div className="flex space-x-2">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-3.5 w-3.5 text-slate-400" />
                </span>
                <input
                  type="text"
                  required={entryMode === "single"}
                  placeholder={entryMode === "batch" ? "Type and press + or Enter..." : "Type CCU Number..."}
                  value={ccuNumber}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  onChange={(e) => setCcuNumber(e.target.value)}
                  onKeyDown={handleCcuInputKeyDown}
                  className="w-full pl-9 pr-3 py-2 border border-slate-250 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-500 uppercase"
                  id="tx-ccu-input"
                />

                {/* Autocomplete Suggestions */}
                {showSuggestions && ccuNumber && filteredSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-25 max-h-48 overflow-y-auto">
                    {filteredSuggestions.map(s => (
                      <button
                        key={s.ccuNumber}
                        type="button"
                        onClick={() => {
                          if (entryMode === "batch") {
                            handleAddToBatch(s.ccuNumber);
                          } else {
                            setCcuNumber(s.ccuNumber);
                            setSegment(s.owner);
                          }
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-slate-50 flex items-center justify-between"
                      >
                        <span className="font-bold text-slate-700">{s.ccuNumber}</span>
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1 rounded">{s.type}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {entryMode === "batch" && (
                <button
                  type="button"
                  onClick={() => handleAddToBatch()}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-3 py-2 text-xs rounded-lg border border-blue-200 shrink-0 flex items-center justify-center transition-colors cursor-pointer"
                  title="Add S/N to Queue"
                >
                  <Plus className="w-4 h-4 mr-0.5" />
                  <span>Add</span>
                </button>
              )}

              {/* QR Button (Feature D) */}
              <button
                type="button"
                onClick={() => {
                  setShowScanner(true);
                  handleTriggerMockScan();
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-lg border border-slate-200 shrink-0 flex items-center justify-center hover:text-blue-600 transition-colors cursor-pointer"
                title="Scan QR/Barcode using Camera"
                id="btn-scan-qr"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Single Mode: Similar S/N verification alert */}
            {entryMode === "single" && singleSimilarityInfo && singleSimilarityInfo.type !== "exact" && (
              <div className="bg-amber-50 border border-amber-200/80 p-3.5 rounded-xl mt-2.5 animate-fade-in flex flex-col space-y-2 shadow-3xs">
                <div className="flex items-center space-x-1.5 text-amber-800 font-bold text-xs">
                  <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
                  <span>Similar S/N detected in Database</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  You typed <span className="font-mono bg-white px-1.5 py-0.5 border border-slate-200 rounded font-bold text-slate-800">{ccuNumber}</span>, but we found a registered match with spacing or dashes: <strong className="text-amber-900 font-extrabold font-mono text-xs">"{singleSimilarityInfo.asset.ccuNumber}"</strong> ({singleSimilarityInfo.asset.type})
                </p>
                <div className="flex items-center space-x-3 pt-1 font-bold text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      setCcuNumber(singleSimilarityInfo.asset.ccuNumber);
                      setSegment(singleSimilarityInfo.asset.owner);
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded-lg cursor-pointer transition-colors shadow-3xs"
                  >
                    Use registered S/N: "{singleSimilarityInfo.asset.ccuNumber}"
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Discard / keep current entered
                    }}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                  >
                    Keep as typed
                  </button>
                </div>
              </div>
            )}

            {/* Single Mode: Matched CCU Badge display */}
            {entryMode === "single" && matchedAsset && (
              <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-150 text-[11px] gap-2 grid grid-cols-3 mt-1 animate-fade-in">
                <div>
                  <p className="text-slate-400 font-semibold mb-0.5">Auto-Detected Type</p>
                  <span className="font-bold text-slate-700 block truncate" title={matchedAsset.type}>{matchedAsset.type}</span>
                </div>
                <div className="text-center px-1 border-x border-slate-200">
                  <p className="text-slate-400 font-semibold mb-0.5">Registered Area/Zone</p>
                  <span className="font-bold text-emerald-700 block truncate" title={matchedAsset.area || "-"}>{matchedAsset.area || "-"}</span>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 font-semibold mb-0.5">Owner/Segment</p>
                  <span className="font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] inline-block max-w-full truncate" title={matchedAsset.owner}>{matchedAsset.owner}</span>
                </div>
              </div>
            )}

            {/* Batch List Queue Display */}
            {entryMode === "batch" && (
              <div className="space-y-2 mt-3 p-3 bg-slate-50/70 border border-slate-150 rounded-xl max-h-52 overflow-y-auto">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Batch Queue ({batchCcus.length} units)
                  </span>
                  {batchCcus.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setBatchCcus([])}
                      className="text-[10px] font-bold text-red-500 hover:text-red-700 cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                
                {batchCcus.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-4 italic">
                    Queue is empty. Type above or paste a list from Excel below.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {batchCcus.map((ccu, idx) => {
                      const assetDetails = assets.find(a => a.ccuNumber.toUpperCase() === ccu.toUpperCase());
                      const simDetails = !assetDetails ? getSimilarityDetails(ccu, assets) : null;
                      
                      return (
                        <div 
                          key={`${ccu}-${idx}`}
                          className="flex flex-col p-2.5 bg-white border border-slate-150 rounded-xl shadow-3xs gap-1.5 transition-all"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-1.5 min-w-0">
                                <span className="font-bold text-slate-800 text-xs truncate uppercase">{ccu}</span>
                                {assetDetails ? (
                                  <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1 rounded truncate font-semibold">
                                    {assetDetails.type}
                                  </span>
                                ) : (
                                  <span className="text-[8px] bg-red-50 text-red-700 border border-red-150 font-bold px-1 rounded shrink-0">
                                    Unregistered
                                  </span>
                                )}
                              </div>
                              {assetDetails && (
                                <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                                  Zone: <span className="text-emerald-700 font-semibold">{assetDetails.area || "-"}</span> | Dept: <span className="text-blue-700 font-bold">{assetDetails.owner}</span>
                                </p>
                              )}
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => setBatchCcus(prev => prev.filter((_, i) => i !== idx))}
                              className="text-slate-400 hover:text-red-500 p-1 rounded-sm shrink-0 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* verification alert block inside the batch card */}
                          {simDetails && simDetails.type !== "exact" && (
                            <div className="bg-amber-50/80 border border-amber-200/80 rounded-lg p-2.5 space-y-1.5 animate-fade-in text-[10px] text-slate-700 font-medium">
                              <div className="flex items-center space-x-1 text-amber-800 font-bold text-[10.5px]">
                                <span>⚠️ Similar Registered S/N Found</span>
                              </div>
                              <p className="leading-relaxed text-slate-600">
                                Did you mean the registered item <strong className="text-slate-800 font-extrabold font-mono">"{simDetails.asset.ccuNumber}"</strong>?
                              </p>
                              <div className="flex items-center space-x-2 pt-1 font-bold">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBatchCcus(prev => {
                                      const next = [...prev];
                                      next[idx] = simDetails.asset.ccuNumber.toUpperCase();
                                      return next;
                                    });
                                    setSegment(simDetails.asset.owner);
                                  }}
                                  className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-2 py-0.5 rounded cursor-pointer text-[9px] transition-colors shadow-3xs"
                                >
                                  Yes, update S/N
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Keep as entered
                                  }}
                                  className="bg-slate-200 hover:bg-slate-300 text-slate-600 px-2 py-0.5 rounded text-[9px] cursor-pointer font-bold"
                                >
                                  Keep entered
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Collapsible Bulk Paste Section */}
            {entryMode === "batch" && (
              <div className="mt-2">
                {!showBulkInput ? (
                  <button
                    type="button"
                    onClick={() => setShowBulkInput(true)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center space-x-1 cursor-pointer transition-all"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Need to paste list of CCUs from Excel?</span>
                  </button>
                ) : (
                  <div className="bg-blue-50/30 border border-blue-100 rounded-xl p-3 mt-1.5 space-y-2 animate-fade-in text-[11px]">
                    <div className="flex justify-between items-center text-blue-800 font-bold">
                      <span>Paste Excel Column or Serials</span>
                      <button
                        type="button"
                        onClick={() => setShowBulkInput(false)}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="text-slate-500 text-[10px]">
                      Paste multiple serials separated by space, comma or newlines.
                    </p>
                    <textarea
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      placeholder="e.g.&#10;TXP-TTC-AAA-015&#10;TXP-TTC-AAA-016"
                      className="w-full h-24 border border-blue-200 rounded-lg p-2 font-mono text-xs focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white text-slate-700"
                    />
                    <button
                      type="button"
                      onClick={handleParseBulkText}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 rounded-lg text-xs cursor-pointer"
                    >
                      Clean & Add to Batch
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Transaction Date */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Log Date</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CalendarDays className="h-4 w-4 text-slate-400" />
              </span>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-250 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Vessel name */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">VESSEL Name</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Anchor className="h-4 w-4 text-slate-400" />
              </span>
              <select
                value={vesselsList.includes(vessel) ? vessel : vesselsList[0] || ""}
                onChange={(e) => setVessel(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-250 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-slate-800 bg-white cursor-pointer"
              >
                {vesselsList.map((v) => (
                  <option key={v} value={v} className="bg-white text-slate-900">
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Rig coordinates */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">RIG Location</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Compass className="h-4 w-4 text-slate-400" />
              </span>
              <select
                value={rigsList.includes(rig) ? rig : rigsList[0] || ""}
                onChange={(e) => setRig(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-250 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-slate-800 bg-white cursor-pointer"
              >
                {rigsList.map((r) => (
                  <option key={r} value={r} className="bg-white text-slate-900">
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Segment owner */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Operational SEGMENT Department</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Building className="h-4 w-4 text-slate-400" />
              </span>
              <input
                type="text"
                required
                placeholder="e.g. CMT, WL, Slickline"
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-250 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-500 uppercase"
              />
            </div>
          </div>

          {/* BACK LOAD SERVICE STATUS (FEATURE A & B) */}
          {txType === TransactionType.BACK_LOAD && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requiresRepair}
                  onChange={(e) => setRequiresRepair(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 border-slate-300"
                  id="flag-requires-service"
                />
                <span className="text-xs font-bold text-red-600">Unit requires Service / Repair (Service IN)?</span>
              </label>

              {(requiresRepair || remark.length > 0) && (
                <div className="animate-fade-in space-y-1">
                  <label className="block text-xs font-bold text-slate-500">Defect Symptoms / Repair Remark *</label>
                  <textarea
                    required={requiresRepair}
                    placeholder="e.g. Tank lid gasket leak, visual certificate expired, or mechanical structural damage description"
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    className="w-full border border-red-200 bg-red-50/10 rounded-lg p-2 text-xs h-20 resize-none focus:outline-hidden focus:ring-1 focus:ring-red-500 text-slate-700"
                    id="tx-remark-input"
                  />
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center space-x-2 shadow-xs transition-colors cursor-pointer"
            id="btn-save-transaction"
          >
            <span>
              {entryMode === "single"
                ? "Record Transaction Entry"
                : `Record ${batchCcus.length} Transaction${batchCcus.length === 1 ? "" : "s"} Entry`}
            </span>
          </button>
        </form>
      </div>

      {/* 2. Chronological Transactions Historical Ledger */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs lg:col-span-2 space-y-4" id="ledger-card">
        <div>
          <h2 className="text-base font-bold text-slate-800">Operational Log Ledger History</h2>
          <p className="text-xs text-slate-500 mt-1">
            Displaying real-time transactional logs of equipment dispatches and returns across vessels.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full text-xs text-left" id="transactions-log-table">
            <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
              <tr>
                <th className="p-3">Log S/N</th>
                <th className="p-3">Date</th>
                <th className="p-3">CCU S/N</th>
                <th className="p-3">Type</th>
                <th className="p-3">VESSEL</th>
                <th className="p-3">RIG</th>
                <th className="p-3">SEGMENT</th>
                <th className="p-3">Symptom Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-650">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No transactions registered in ledger yet.
                  </td>
                </tr>
              ) : (
                transactions.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 font-semibold text-slate-500">{t.id}</td>
                    <td className="p-3 font-medium">
                      {new Date(t.date).toLocaleDateString("en-GB")}{" "}
                      <span className="text-[10px] text-slate-400">
                        {new Date(t.date).toLocaleTimeString("en-GB", { hour: "numeric", minute: "numeric" })}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-800">{t.ccuNumber}</td>
                    <td className="p-3 font-semibold">
                      <span className={`inline-flex px-2 py-0.2 rounded font-bold ${
                        t.type === TransactionType.LOAD_OUT 
                          ? "bg-amber-100 text-amber-800" 
                          : "bg-indigo-100 text-indigo-800"
                      }`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="p-3 text-slate-700 font-medium">{t.vessel}</td>
                    <td className="p-3 font-medium">{t.rig}</td>
                    <td className="p-3 font-bold text-slate-700">{t.segment}</td>
                    <td className="p-3 text-[11px] max-w-xs truncate text-red-700 font-semibold">
                      {t.remark ? (
                        <span className="bg-red-50 px-1 py-0.2 rounded border border-red-100/50">
                          {t.remark}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Barcode Cam Scanner Mock Modal (Feature D) */}
      {showScanner && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="mock-scanner-modal">
          <div className="bg-slate-800 text-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-700 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center space-x-2">
                <ScanLine className="w-5 h-5 text-blue-400 animate-bounce" />
                <h3 className="text-sm font-bold">Scanning QR / Barcode Laser ...</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowScanner(false)} 
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video bg-black/90 rounded-2xl relative border border-slate-700 flex flex-col items-center justify-center overflow-hidden">
              {scanning ? (
                <>
                  {/* Glowing Laser line animation */}
                  <div className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_15px_#ef4444] animate-pulse top-1/2"></div>
                  <ScanLine className="w-12 h-12 text-slate-300 animate-pulse" />
                  <p className="text-xs text-slate-400 mt-4 animate-pulse">Analyzing barcode identifiers...</p>
                </>
              ) : (
                <>
                  <Camera className="w-10 h-10 text-slate-600" />
                  <p className="text-xs text-slate-400 mt-2">Active Laser Mock Feed</p>
                </>
              )}
            </div>

            <div className="text-xs text-slate-400 text-center">
              Currently simulating a real QR scan. Clicking the button below chooses a random CCU Number from the master list.
            </div>

            <button
              type="button"
              disabled={scanning}
              onClick={handleTriggerMockScan}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold py-2.5 rounded-xl cursor-pointer text-xs"
              id="btn-simulate-scanner-feed"
            >
              {scanning ? "Processing Barcode..." : "Simulate Barcode Trigger"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
