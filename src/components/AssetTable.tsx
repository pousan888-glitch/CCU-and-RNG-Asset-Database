/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Asset, AssetType, AssetStatus } from "../types";
import { 
  Search, 
  MapPin, 
  Tag, 
  AlertTriangle, 
  Info, 
  Plus, 
  Database,
  Filter,
  Check,
  Package,
  Scale,
  CalendarDays,
  X
} from "lucide-react";
import { parseDate, displayDate, displayExpiryDate, getRemainingDays, checkCertExpiryStatus, sortAreas } from "../utils/dateUtils";
import MultiSelect from "./MultiSelect";

interface AssetTableProps {
  assets: Asset[];
  onAddAsset: (asset: Asset) => void;
}

export default function AssetTable({ assets, onAddAsset }: AssetTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [areaFilters, setAreaFilters] = useState<string[]>([]);
  const [alertFilter, setAlertFilter] = useState(""); // expired, warning, healthy
  const [showAddForm, setShowAddForm] = useState(false);

  // Remarks inline-editing state
  const [editingCcu, setEditingCcu] = useState<string | null>(null);
  const [tempRemark, setTempRemark] = useState("");
  const [selectedDetailedAsset, setSelectedDetailedAsset] = useState<Asset | null>(null);

  const handleSaveRemark = (asset: Asset) => {
    const updatedAsset: Asset = {
      ...asset,
      remark: tempRemark.trim() || undefined
    };
    onAddAsset(updatedAsset);
    setEditingCcu(null);
  };

  // New Asset Form State
  const [newSNo, setNewSNo] = useState("");
  const [newType, setNewType] = useState<AssetType>(AssetType.PALLET_CARRIER);
  const [newOwner, setNewOwner] = useState("CMT");
  const [newArea, setNewArea] = useState("FREE ZONE");
  const [newStatus, setNewStatus] = useState<AssetStatus>(AssetStatus.READY);
  const [newVisualDate, setNewVisualDate] = useState("2026-12-15");
  const [newMpiDate, setNewMpiDate] = useState("2026-12-15");
  const [newRemark, setNewRemark] = useState("");
  const [newChemicals, setNewChemicals] = useState("");
  const [newLength, setNewLength] = useState<number>(155);
  const [newWidth, setNewWidth] = useState<number>(155);
  const [newHeight, setNewHeight] = useState<number>(30);
  const [newTare, setNewTare] = useState<number>(250);
  const [newPayload, setNewPayload] = useState<number>(2400);
  const [newGross, setNewGross] = useState<number>(2650);

  // New Lifting Gear State Fields
  const [newLtUnit, setNewLtUnit] = useState("");
  const [newLtSling, setNewLtSling] = useState("");
  const [newSlingId, setNewSlingId] = useState("");
  const [newLtShackle, setNewLtShackle] = useState("");
  const [newShackleId, setNewShackleId] = useState("");

  // Date threshold parsing relative to June 10, 2026
  const todayMs = new Date("2026-06-10").getTime();

  const checkExpiryStatus = (dateStr: string) => {
    return checkCertExpiryStatus(dateStr, todayMs);
  };

  const getAlertStatusStr = (asset: Asset) => {
    const vStatus = checkExpiryStatus(asset.visualExpiraDate);
    const mStatus = checkExpiryStatus(asset.mpiExpiraDate);
    if (vStatus === "expired" || mStatus === "expired" || asset.status === AssetStatus.SERVICE || asset.remark?.toUpperCase().includes("NEED TO RE-CERT")) {
      return "expired";
    }
    if (vStatus === "warning" || mStatus === "warning") {
      return "warning";
    }
    return "healthy";
  };

  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSNo.trim()) {
      alert("Please provide asset S/N.");
      return;
    }

    const assetToSave: Asset = {
      ccuNumber: newSNo.toUpperCase().trim(),
      type: newType,
      owner: newOwner.toUpperCase().trim(),
      area: newArea,
      status: newStatus,
      visualExpiraDate: newVisualDate,
      mpiExpiraDate: newMpiDate,
      remark: newRemark || undefined,
      chemicals: newChemicals || undefined,
      lengthCm: newLength || undefined,
      widthCm: newWidth || undefined,
      heightCm: newHeight || undefined,
      tareWeightKg: newTare || undefined,
      payloadKg: newPayload || undefined,
      grossWeightKg: newGross || undefined,
      
      // Set manual lifting gear inputs
      ltUnit: newLtUnit || undefined,
      ltSling: newLtSling || undefined,
      slingId: newSlingId || undefined,
      ltShackle: newLtShackle || undefined,
      shackleId: newShackleId || undefined
    };

    onAddAsset(assetToSave);
    setShowAddForm(false);
    // Reset fields
    setNewSNo("");
    setNewRemark("");
    setNewLtUnit("");
    setNewLtSling("");
    setNewSlingId("");
    setNewLtShackle("");
    setNewShackleId("");
  };

  // Filter list
  const filteredAssets = assets.filter(a => {
    const sMatch = !searchTerm || a.ccuNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const tMatch = !typeFilter || a.type === typeFilter;
    const oMatch = !ownerFilter || a.owner.toLowerCase() === ownerFilter.toLowerCase();
    const stMatch = !statusFilter || a.status === statusFilter;
    const arMatch = areaFilters.length === 0 || (a.area && areaFilters.some(f => f.toLowerCase() === a.area.trim().toLowerCase()));
    
    // Alert Filter logic
    let alertLabel = getAlertStatusStr(a);
    const alMatch = !alertFilter || alertLabel === alertFilter;

    return sMatch && tMatch && oMatch && stMatch && arMatch && alMatch;
  });

  const owners = Array.from(new Set(assets.map(a => a.owner).filter(Boolean)));
  const areas = sortAreas(Array.from(new Set(assets.map(a => a.area).filter(Boolean).map(x => x.trim()))));

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-6 space-y-6" id="master-asset-ledger">
      {/* Table Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-800">Master Equipment Database</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Displaying {filteredAssets.length} of {assets.length} cargo carrying units & equipment list.
          </p>
        </div>

        <button 
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center space-x-2 shadow-xs transition-all cursor-pointer"
          id="btn-add-unit"
        >
          <Plus className="w-4 h-4" />
          <span>Register Cargo Unit</span>
        </button>
      </div>

      {/* Interactive Filters Grid */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-wrap gap-3 items-center" id="filter-controls">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 h-4 text-slate-400" />
          </span>
          <input
            type="text"
            placeholder="Search S/N..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-700"
            id="search-ccu-table"
          />
        </div>

        {/* CCU Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          id="filter-type"
        >
          <option value="">-- All Types --</option>
          {Object.values(AssetType).map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* Owner Segment Filter */}
        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          id="filter-segment"
        >
          <option value="">-- All Departments --</option>
          {owners.map(o => (
            <option key={o} value={o}>{o.toUpperCase()}</option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          id="filter-status"
        >
          <option value="">-- All Statuses --</option>
          {Object.values(AssetStatus).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Area (Zone) Filter */}
        <MultiSelect
          options={areas}
          selectedValues={areaFilters}
          onChange={(values) => setAreaFilters(values)}
          placeholder="-- All Areas / Zones --"
          icon={<MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
          className="relative min-w-[200px]"
        />

        {/* Expiry Alerts Filter */}
        <select
          value={alertFilter}
          onChange={(e) => setAlertFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          id="filter-alerts"
        >
          <option value="">-- Certification Status --</option>
          <option value="expired">Expired / Service Required</option>
          <option value="warning">Due Soon (45 Days)</option>
          <option value="healthy">Active & Certified</option>
        </select>

        {/* Clear Filter Indicator */}
        {(searchTerm || typeFilter || ownerFilter || statusFilter || areaFilters.length > 0 || alertFilter) && (
          <button
            onClick={() => {
              setSearchTerm("");
              setTypeFilter("");
              setOwnerFilter("");
              setStatusFilter("");
              setAreaFilters([]);
              setAlertFilter("");
            }}
            className="text-xs font-bold text-red-500 hover:text-red-600 cursor-pointer pl-2"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Main Table Grid (Feature C Expiry Highlighting) */}
      <div className="overflow-x-auto rounded-2xl border border-slate-150">
        <table className="min-w-full text-xs text-left text-slate-600 border-collapse" id="master-inventory-table">
          <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
            <tr>
              <th className="p-3">S/N (CCU Number)</th>
              <th className="p-3">Type</th>
              <th className="p-3">Dept</th>
              <th className="p-3">Area (Zone)</th>
              <th className="p-3">Status</th>
              <th className="p-3">Visual Expiry</th>
              <th className="p-3">MPI Expiry</th>
              <th className="p-3">Dimensions (L x W x H)</th>
              <th className="p-3">Tare / Payload / Gross</th>
              <th className="p-3">Remarks / Defects</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredAssets.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-10 text-center text-slate-400">
                  No matching assets found. Modify filters or register a new unit above to seed rows.
                </td>
              </tr>
            ) : (
              filteredAssets.map(a => {
                const visualAlert = checkExpiryStatus(a.visualExpiraDate);
                const mpiAlert = checkExpiryStatus(a.mpiExpiraDate);
                const isService = a.status === AssetStatus.SERVICE;
                const isNeedRecert = a.remark?.toUpperCase().includes("NEED TO RE-CERT");

                // Determine border and background accents for alerts (Feature C)
                let rowBg = "hover:bg-slate-50/50";
                if (visualAlert === "expired" || mpiAlert === "expired" || isService || isNeedRecert) {
                  rowBg = "bg-red-50/30 hover:bg-red-50/60";
                } else if (visualAlert === "warning" || mpiAlert === "warning") {
                  rowBg = "bg-amber-100/10 hover:bg-amber-100/20";
                }

                return (
                  <tr key={a.ccuNumber} className={`transition-colors divide-x divide-slate-100/50 ${rowBg}`}>
                    {/* S/N */}
                    <td className="p-3 font-bold text-slate-800">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedDetailedAsset(a)}
                            className="font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left text-[13px] flex items-center gap-1 focus:outline-none transition-colors"
                            title="คลิกเพื่อดูรายละเอียดและสเปคของ CCU ตัวนี้"
                          >
                            <span>{a.ccuNumber}</span>
                            <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          </button>
                          {a.chemicals && (
                            <span className="text-[9px] bg-sky-50 text-sky-700 px-1 rounded font-semibold border border-sky-100">
                              {a.chemicals}
                            </span>
                          )}
                        </div>
                        {(a.slingId || a.shackleId || a.ltUnit || a.ltSling || a.ltShackle) && (
                          <div className="flex flex-wrap gap-1 text-[9px] text-slate-500 font-mono mt-0.5">
                            {a.slingId && (
                              <span className="bg-slate-100 text-slate-600 px-1 py-0.5 rounded border border-slate-200/50" title={`Sling ID: ${a.slingId}`}>
                                🔗 Sling: {a.slingId}
                              </span>
                            )}
                            {a.shackleId && (
                              <span className="bg-slate-100 text-slate-600 px-1 py-0.5 rounded border border-slate-200/50" title={`Shackle ID: ${a.shackleId}`}>
                                🔩 Shackle: {a.shackleId}
                              </span>
                            )}
                            {(a.ltUnit || a.ltSling || a.ltShackle) && (
                              <span className="bg-blue-50 text-blue-600 px-1 py-0.5 rounded font-semibold border border-blue-150" title={`LT Unit: ${a.ltUnit || "-"}, LT Sling: ${a.ltSling || "-"}, LT Shackle: ${a.ltShackle || "-"}`}>
                                📃 Certs OK
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Type */}
                    <td className="p-3 font-semibold text-slate-600">{a.type}</td>

                    {/* Department Segment */}
                    <td className="p-3 text-center">
                      <span className="font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px]">
                        {a.owner}
                      </span>
                    </td>

                    {/* Location Area */}
                    <td className="p-3 font-medium text-slate-600">{a.area}</td>

                    {/* Status Badge */}
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        a.status === AssetStatus.READY ? "bg-emerald-100 text-emerald-800" :
                        a.status === AssetStatus.IN_PLAN ? "bg-blue-100 text-blue-800" :
                        a.status === AssetStatus.SERVICE ? "bg-red-100 text-red-800" :
                        a.status === AssetStatus.OUT_GOING ? "bg-amber-100 text-amber-800" :
                        "bg-indigo-100 text-indigo-800"
                      }`}>
                        {a.status}
                      </span>
                    </td>

                    {/* Visual */}
                    <td className="p-3">
                      {a.visualExpiraDate ? (
                        <div className="flex flex-col space-y-0.5">
                          <div className="flex items-center space-x-1">
                            <span className="text-[10px] text-slate-400">Cert:</span>
                            <span className="font-semibold text-slate-600">{displayDate(a.visualExpiraDate)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="text-[10px] text-slate-400">Exp:</span>
                            <span className={`font-bold ${visualAlert === "expired" ? "text-red-600" : visualAlert === "warning" ? "text-amber-600" : "text-emerald-700"}`}>
                              {displayExpiryDate(a.visualExpiraDate)}
                            </span>
                            {visualAlert === "expired" && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                            {visualAlert === "warning" && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                          </div>
                          {(() => {
                            const days = getRemainingDays(a.visualExpiraDate, todayMs);
                            if (days === null) return null;
                            return (
                              <span className={`text-[9px] font-semibold leading-none ${visualAlert === "expired" ? "text-red-500" : visualAlert === "warning" ? "text-amber-600" : "text-slate-400"}`}>
                                {days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days} days left`}
                              </span>
                            );
                          })()}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* MPI */}
                    <td className="p-3">
                      {a.mpiExpiraDate ? (
                        <div className="flex flex-col space-y-0.5">
                          <div className="flex items-center space-x-1">
                            <span className="text-[10px] text-slate-400">Cert:</span>
                            <span className="font-semibold text-slate-600">{displayDate(a.mpiExpiraDate)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="text-[10px] text-slate-400">Exp:</span>
                            <span className={`font-bold ${mpiAlert === "expired" ? "text-red-600" : mpiAlert === "warning" ? "text-amber-600" : "text-emerald-700"}`}>
                              {displayExpiryDate(a.mpiExpiraDate)}
                            </span>
                            {mpiAlert === "expired" && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                            {mpiAlert === "warning" && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                          </div>
                          {(() => {
                            const days = getRemainingDays(a.mpiExpiraDate, todayMs);
                            if (days === null) return null;
                            return (
                              <span className={`text-[9px] font-semibold leading-none ${mpiAlert === "expired" ? "text-red-500" : mpiAlert === "warning" ? "text-amber-600" : "text-slate-400"}`}>
                                {days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days} days left`}
                              </span>
                            );
                          })()}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Dimensions */}
                    <td className="p-3 text-slate-500 font-mono text-[11px]">
                      {a.lengthCm || a.widthCm || a.heightCm 
                        ? `${a.lengthCm || "-"}x${a.widthCm || "-"}x${a.heightCm || "-"} cm` 
                        : "N/A"
                      }
                    </td>

                    {/* Weights */}
                    <td className="p-3 text-slate-500 font-mono text-[11px]">
                      {a.tareWeightKg || a.payloadKg 
                        ? `${a.tareWeightKg || 0} / ${a.payloadKg || 0} / ${a.grossWeightKg || 0} kg`
                        : "N/A"
                      }
                    </td>

                    {/* Remarks */}
                    <td className="p-3 text-[11px] font-medium max-w-xs relative group/remarkcell">
                      {editingCcu === a.ccuNumber ? (
                        <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            placeholder="Add remark..."
                            className="bg-slate-50 border border-blue-400 text-slate-800 px-2 py-1 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                            value={tempRemark}
                            onChange={(e) => setTempRemark(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleSaveRemark(a);
                              } else if (e.key === "Escape") {
                                setEditingCcu(null);
                              }
                            }}
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveRemark(a)}
                            className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg cursor-pointer"
                            title="Save"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingCcu(null)}
                            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between group/cell gap-1 min-h-[22px]">
                          <div className="truncate flex-1">
                            {isNeedRecert || isService ? (
                              <span className="text-red-700 font-semibold bg-red-100/50 px-1.5 py-0.5 rounded">
                                {a.remark || "NEED TO RE-CERT"}
                              </span>
                            ) : (
                              <span className="text-slate-500">{a.remark || "-"}</span>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setEditingCcu(a.ccuNumber);
                              setTempRemark(a.remark || "");
                            }}
                            className="opacity-0 group-hover/remarkcell:opacity-100 text-blue-500 hover:text-blue-700 p-1 rounded-md hover:bg-blue-50 cursor-pointer transition-opacity"
                            title="Edit Remark"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 4. MODAL ELEMENT FOR REGISTERING AN ASSET */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="add-asset-modal">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-800">Register Warehouse Cargo Carrying Unit</h3>
              </div>
              <button 
                onClick={() => setShowAddForm(false)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAsset} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* SNo */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Asset Serial Number (S/N) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TXP-TTC-AAA-102"
                    value={newSNo}
                    onChange={(e) => setNewSNo(e.target.value)}
                    className="w-full border border-slate-250 rounded-lg p-2 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-500 uppercase"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">CCU Type *</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as AssetType)}
                    className="w-full border border-slate-250 rounded-lg p-2 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  >
                    {Object.values(AssetType).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Owner Department */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Owner / Segment *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CMT, WL, Testing, Slickline"
                    value={newOwner}
                    onChange={(e) => setNewOwner(e.target.value)}
                    className="w-full border border-slate-250 rounded-lg p-2 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-500 uppercase"
                  />
                </div>

                {/* Initial Zone Area */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Warehouse Zone Area Location</label>
                  <input
                    type="text"
                    placeholder="e.g. FREE ZONE, LOCAL FZ, HIB"
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value)}
                    className="w-full border border-slate-250 rounded-lg p-2 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Current Status */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Operational status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as AssetStatus)}
                    className="w-full border border-slate-250 rounded-lg p-2 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  >
                    {Object.values(AssetStatus).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Chemicals */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Chemicals Code ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. D168A, D075"
                    value={newChemicals}
                    onChange={(e) => setNewChemicals(e.target.value)}
                    className="w-full border border-slate-250 rounded-lg p-2 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Visual Expira Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 font-semibold text-red-650 flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5" /> Visual Certificate Expiry *
                  </label>
                  <input
                    type="date"
                    required
                    value={newVisualDate}
                    onChange={(e) => setNewVisualDate(e.target.value)}
                    className="w-full border border-slate-250 rounded-lg p-2 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* MPI Expira Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 font-semibold text-red-650 flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5" /> MPI Certificate Expiry *
                  </label>
                  <input
                    type="date"
                    required
                    value={newMpiDate}
                    onChange={(e) => setNewMpiDate(e.target.value)}
                    className="w-full border border-slate-250 rounded-lg p-2 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Specs (Dimensions) */}
              <div className="border-t border-slate-100 pt-4 space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <Package className="w-3.5 h-3.5" /> CCU Physical Specifications
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Length (cm)</label>
                    <input
                      type="number"
                      required
                      value={newLength}
                      onChange={(e) => setNewLength(parseInt(e.target.value) || 0)}
                      className="w-full border border-slate-200 rounded-lg p-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Width (cm)</label>
                    <input
                      type="number"
                      required
                      value={newWidth}
                      onChange={(e) => setNewWidth(parseInt(e.target.value) || 0)}
                      className="w-full border border-slate-200 rounded-lg p-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Height (cm)</label>
                    <input
                      type="number"
                      required
                      value={newHeight}
                      onChange={(e) => setNewHeight(parseInt(e.target.value) || 0)}
                      className="w-full border border-slate-200 rounded-lg p-1.5 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Weights (Tare, Payload, Gross) */}
              <div className="border-t border-slate-100 pt-4 space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5" /> Certificate Weights (kg)
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Tare (Tare Weight)</label>
                    <input
                      type="number"
                      required
                      value={newTare}
                      onChange={(e) => setNewTare(parseInt(e.target.value) || 0)}
                      className="w-full border border-slate-200 rounded-lg p-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Payload Weight</label>
                    <input
                      type="number"
                      required
                      value={newPayload}
                      onChange={(e) => setNewPayload(parseInt(e.target.value) || 0)}
                      className="w-full border border-slate-200 rounded-lg p-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Max Gross Weight</label>
                    <input
                      type="number"
                      required
                      value={newGross}
                      onChange={(e) => setNewGross(parseInt(e.target.value) || 0)}
                      className="w-full border border-slate-200 rounded-lg p-1.5 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Lifting Gear & Load Test Information */}
              <div className="border-t border-slate-100 pt-4 space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  🔗 CCU Lifting Gear & Certificates (Optional)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Load Test Unit (LT Unit)</label>
                    <input
                      type="text"
                      placeholder="e.g. Unit LT-105"
                      value={newLtUnit}
                      onChange={(e) => setNewLtUnit(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-1.5 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Load Test Sling (LT Sling)</label>
                    <input
                      type="text"
                      placeholder="e.g. Sling LT-208"
                      value={newLtSling}
                      onChange={(e) => setNewLtSling(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-1.5 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Sling ID</label>
                    <input
                      type="text"
                      placeholder="e.g. SL-069"
                      value={newSlingId}
                      onChange={(e) => setNewSlingId(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-1.5 text-xs font-semibold uppercase font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Load Test Shackle (LT Shackle)</label>
                    <input
                      type="text"
                      placeholder="e.g. SH-302"
                      value={newLtShackle}
                      onChange={(e) => setNewLtShackle(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-1.5 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Shackle ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 069 A to 069 D"
                      value={newShackleId}
                      onChange={(e) => setNewShackleId(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-1.5 text-xs font-semibold font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Remark */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Defect symptoms / Physical remark descriptor</label>
                <textarea
                  placeholder="Insert any outstanding defect warnings, e.g. 'lid gasket minor leak' or 'need to re-cert'"
                  value={newRemark}
                  onChange={(e) => setNewRemark(e.target.value)}
                  className="w-full border border-slate-250 rounded-lg p-2 text-xs h-16 resize-none focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
                >
                  Register Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL FOR VIEWING DETAILED CCU SPECIFICATIONS */}
      {selectedDetailedAsset && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="ccu-details-modal">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100 tracking-wider">
                  Cargo Carrying Unit Specs
                </span>
                <div className="flex items-center space-x-2 pt-1">
                  <Package className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-slate-800 font-mono tracking-tight uppercase">
                    {selectedDetailedAsset.ccuNumber}
                  </h3>
                  {selectedDetailedAsset.chemicals && (
                    <span className="text-[10px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full font-bold border border-sky-100 uppercase">
                      {selectedDetailedAsset.chemicals}
                    </span>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setSelectedDetailedAsset(null)} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Specifications Grid */}
            <div className="space-y-5">
              
              {/* General details Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Type / ประเภท</span>
                  <span className="font-bold text-slate-800 text-sm">{selectedDetailedAsset.type}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Owner / ผู้ครอบครอง</span>
                  <span className="font-extrabold text-blue-750 text-sm uppercase">{selectedDetailedAsset.owner}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Zone / โซนพื้นที่</span>
                  <span className="font-bold text-slate-800 text-sm uppercase flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {selectedDetailedAsset.area}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Status / สถานะ</span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold mt-0.5 ${
                    selectedDetailedAsset.status === AssetStatus.READY ? "bg-emerald-100 text-emerald-800" :
                    selectedDetailedAsset.status === AssetStatus.IN_PLAN ? "bg-blue-100 text-blue-800" :
                    selectedDetailedAsset.status === AssetStatus.SERVICE ? "bg-red-100 text-red-800" :
                    selectedDetailedAsset.status === AssetStatus.OUT_GOING ? "bg-amber-100 text-amber-800" :
                    "bg-indigo-100 text-indigo-800"
                  }`}>
                    {selectedDetailedAsset.status}
                  </span>
                </div>
              </div>

              {/* Physical specs (Dimensions & Mass) */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-slate-400" /> Physical Specifications / มิติขนาดและน้ำหนัก
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Dimensions Box */}
                  <div className="border border-slate-150 rounded-2xl p-3.5 space-y-2 bg-gradient-to-br from-white to-slate-50/30">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Dimensions / มิติภายนอก</span>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-xl font-extrabold text-slate-700 font-mono">
                        {selectedDetailedAsset.lengthCm || "-"}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">L</span>
                      <span className="text-xs text-slate-300">×</span>
                      <span className="text-xl font-extrabold text-slate-700 font-mono">
                        {selectedDetailedAsset.widthCm || "-"}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">W</span>
                      <span className="text-xs text-slate-300">×</span>
                      <span className="text-xl font-extrabold text-slate-700 font-mono">
                        {selectedDetailedAsset.heightCm || "-"}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">H</span>
                      <span className="text-xs text-slate-400">cm</span>
                    </div>
                  </div>

                  {/* Weights Box */}
                  <div className="border border-slate-150 rounded-2xl p-3.5 space-y-2 bg-gradient-to-br from-white to-slate-50/30">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Mass Weights / พิกัดมวลน้ำหนัก</span>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        <span className="block text-[8px] font-bold text-slate-400 uppercase">Tare Weight</span>
                        <span className="text-xs font-bold text-slate-700 font-mono">{selectedDetailedAsset.tareWeightKg?.toLocaleString() || "0"} <span className="text-[9px] text-slate-400">kg</span></span>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        <span className="block text-[8px] font-bold text-slate-400 uppercase">Payload Max</span>
                        <span className="text-xs font-bold text-slate-700 font-mono">{selectedDetailedAsset.payloadKg?.toLocaleString() || "0"} <span className="text-[9px] text-slate-400">kg</span></span>
                      </div>
                      <div className="bg-blue-50/50 p-1.5 rounded-lg border border-blue-100">
                        <span className="block text-[8px] font-bold text-blue-500 uppercase">Gross Weight</span>
                        <span className="text-xs font-extrabold text-slate-850 font-mono">{selectedDetailedAsset.grossWeightKg?.toLocaleString() || "0"} <span className="text-[9px] text-slate-400">kg</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lifting Gears & Load Test (Unhidden information!) */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="text-base">🔗</span> Lifting Gear Parts & Load Test Certs / ชุดอุปกรณ์ยกหิ้วและผลทดสอบคาร์โก้
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Gear IDs */}
                  <div className="border border-slate-150 rounded-2xl p-3.5 bg-gradient-to-tr from-white to-slate-50/40 space-y-2.5">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Registered Lifting Gear IDs / รหัสอุปกรณ์ยก</span>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center bg-slate-50/80 px-2.5 py-1.5 rounded-xl border border-slate-100">
                        <span className="text-xs text-slate-500 flex items-center gap-1 font-semibold">🔗 Sling ID (สลิงติดยก):</span>
                        <span className="text-xs font-bold text-slate-800 font-mono bg-white px-2 py-0.5 rounded border border-slate-200 uppercase">{selectedDetailedAsset.slingId || "-"}</span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-50/80 px-2.5 py-1.5 rounded-xl border border-slate-100">
                        <span className="text-xs text-slate-500 flex items-center gap-1 font-semibold">🔩 Shackle ID (สะเก็นเรือ):</span>
                        <span className="text-xs font-bold text-slate-800 font-mono bg-white px-2 py-0.5 rounded border border-slate-200 uppercase">{selectedDetailedAsset.shackleId || "-"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Load Tests */}
                  <div className="border border-slate-150 rounded-2xl p-3.5 bg-gradient-to-tr from-white to-slate-50/40 space-y-2.5">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Load Test Code Mapping / รหัสการทดสอบแรงดึง</span>
                    <div className="space-y-1.5 text-xs text-slate-600 font-medium">
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-400">Load Test Unit:</span>
                        <span className="font-bold text-slate-700">{selectedDetailedAsset.ltUnit || "-"}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-400">Load Test Sling:</span>
                        <span className="font-bold text-slate-700">{selectedDetailedAsset.ltSling || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Load Test Shackle:</span>
                        <span className="font-bold text-slate-700">{selectedDetailedAsset.ltShackle || "-"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Inspection Expiry Stats */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-slate-400" /> Certificate Expiration Timelines / ตารางสถานะใบรับรองแพทย์คาร์โก้
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Visual Certification */}
                  <div className="border border-slate-150 rounded-2xl p-3.5 space-y-2 bg-white">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100">Visual Safety</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        checkExpiryStatus(selectedDetailedAsset.visualExpiraDate) === "expired" ? "bg-red-100 text-red-800" :
                        checkExpiryStatus(selectedDetailedAsset.visualExpiraDate) === "warning" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {(() => {
                          const days = getRemainingDays(selectedDetailedAsset.visualExpiraDate, todayMs);
                          if (days === null) return "-";
                          return days < 0 ? "Expired" : "Active";
                        })()}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs pt-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Cert Issue:</span>
                        <span className="font-bold text-slate-600">{displayDate(selectedDetailedAsset.visualExpiraDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Cert Expiry:</span>
                        <span className="font-bold text-slate-700">{displayExpiryDate(selectedDetailedAsset.visualExpiraDate)}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-100 pt-1.5 mt-1 font-bold">
                        <span className="text-slate-500">Remaining Days:</span>
                        <span className={`${
                          checkExpiryStatus(selectedDetailedAsset.visualExpiraDate) === "expired" ? "text-red-650" :
                          checkExpiryStatus(selectedDetailedAsset.visualExpiraDate) === "warning" ? "text-amber-600" : "text-emerald-700"
                        }`}>
                          {(() => {
                            const days = getRemainingDays(selectedDetailedAsset.visualExpiraDate, todayMs);
                            if (days === null) return "N/A";
                            return days < 0 ? `Expired (${Math.abs(days)}d ago)` : `${days} days left`;
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* MPI Certification */}
                  <div className="border border-slate-150 rounded-2xl p-3.5 space-y-2 bg-white">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-100">MPI Crack Test</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        checkExpiryStatus(selectedDetailedAsset.mpiExpiraDate) === "expired" ? "bg-red-100 text-red-800" :
                        checkExpiryStatus(selectedDetailedAsset.mpiExpiraDate) === "warning" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {(() => {
                          const days = getRemainingDays(selectedDetailedAsset.mpiExpiraDate, todayMs);
                          if (days === null) return "-";
                          return days < 0 ? "Expired" : "Active";
                        })()}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs pt-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Cert Issue:</span>
                        <span className="font-bold text-slate-600">{displayDate(selectedDetailedAsset.mpiExpiraDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Cert Expiry:</span>
                        <span className="font-bold text-slate-700">{displayExpiryDate(selectedDetailedAsset.mpiExpiraDate)}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-100 pt-1.5 mt-1 font-bold">
                        <span className="text-slate-500">Remaining Days:</span>
                        <span className={`${
                          checkExpiryStatus(selectedDetailedAsset.mpiExpiraDate) === "expired" ? "text-red-650" :
                          checkExpiryStatus(selectedDetailedAsset.mpiExpiraDate) === "warning" ? "text-amber-600" : "text-emerald-700"
                        }`}>
                          {(() => {
                            const days = getRemainingDays(selectedDetailedAsset.mpiExpiraDate, todayMs);
                            if (days === null) return "N/A";
                            return days < 0 ? `Expired (${Math.abs(days)}d ago)` : `${days} days left`;
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Physical defect comments/remarks */}
              <div className="border-t border-slate-100 pt-4">
                <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Defects & Physical Remarks / หมายเหตุทางกายภาพ</span>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-semibold text-slate-650">
                  {selectedDetailedAsset.remark || "✔️ ไม่มีข้อบกพร่อง ไม่พบรอยร้าว และคาร์โก้อยู่ในสภาพใช้งานปลอดภัยตามข้อกำหนด (No active physical defect found.)"}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="flex items-center justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedDetailedAsset(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow-xs transition-colors"
              >
                เสร็จสิ้น (Done)
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
