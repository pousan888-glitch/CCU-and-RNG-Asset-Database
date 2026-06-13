/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Asset, AssetType, AssetStatus } from "../types";
import { 
  Building, 
  MapPin, 
  Layers, 
  CheckCircle, 
  AlertTriangle, 
  Wrench, 
  Compass, 
  FileSpreadsheet, 
  ShieldAlert,
  ChevronRight,
  TrendingUp,
  SlidersHorizontal
} from "lucide-react";
import { parseDate, displayDate, displayExpiryDate, checkCertExpiryStatus, sortAreas } from "../utils/dateUtils";
import MultiSelect from "./MultiSelect";

interface DashboardProps {
  assets: Asset[];
  onSelectOwner: (owner: string) => void;
  selectedOwner: string;
}

export default function Dashboard({ assets, onSelectOwner, selectedOwner }: DashboardProps) {
  // Get unique owners (departments)
  const owners = Array.from(new Set(assets.map(a => a.owner).filter(Boolean)));
  const [alertAreaFilters, setAlertAreaFilters] = useState<string[]>([]);

  const alertAreas = sortAreas(Array.from(new Set(assets.map(a => a.area).filter(Boolean).map(x => x.trim()))));

  // Calculate generic stats
  const totalAssets = assets.length;
  const readyCount = assets.filter(a => a.status === AssetStatus.READY).length;
  const planCount = assets.filter(a => a.status === AssetStatus.IN_PLAN).length;
  const serviceCount = assets.filter(a => a.status === AssetStatus.SERVICE).length;
  const outgoingCount = assets.filter(a => a.status === AssetStatus.OUT_GOING).length;
  const backloadCount = assets.filter(a => a.status === AssetStatus.UNDERGOING_BACKLOAD).length;

  // EXPIRED AND WARNING CERTIFICATES (FEATURE C)
  // In the dataset metadata, today is June 10, 2026.
  const todayMs = new Date("2026-06-10").getTime();

  const checkExpiryStatus = (dateStr: string) => {
    return checkCertExpiryStatus(dateStr, todayMs);
  };

  const expiredCerts = assets.filter(a => {
    const vStatus = checkExpiryStatus(a.visualExpiraDate);
    const mStatus = checkExpiryStatus(a.mpiExpiraDate);
    return vStatus === "expired" || mStatus === "expired";
  });

  const warningCerts = assets.filter(a => {
    const vStatus = checkExpiryStatus(a.visualExpiraDate);
    const mStatus = checkExpiryStatus(a.mpiExpiraDate);
    // Include in warning only if not already expired
    const isVExpired = vStatus === "expired";
    const isMExpired = mStatus === "expired";
    if (isVExpired || isMExpired) return false;
    return vStatus === "warning" || mStatus === "warning";
  });

  const filteredExpiredCerts = alertAreaFilters.length > 0
    ? expiredCerts.filter(c => c.area && alertAreaFilters.some(f => f.toLowerCase() === c.area.trim().toLowerCase()))
    : expiredCerts;

  const filteredWarningCerts = alertAreaFilters.length > 0
    ? warningCerts.filter(c => c.area && alertAreaFilters.some(f => f.toLowerCase() === c.area.trim().toLowerCase()))
    : warningCerts;

  const needRecert = assets.filter(a => a.status === AssetStatus.SERVICE || a.remark?.toUpperCase().includes("NEED TO RE-CERT"));

  // ----------------------------------------------------
  // Calculate stats for Department Grid Table
  // ----------------------------------------------------
  const filteredAssets = selectedOwner 
    ? assets.filter(a => a.owner.toLowerCase() === selectedOwner.toLowerCase())
    : assets;

  const totalFilteredCount = filteredAssets.length;

  // Split calculations
  const getDeptCount = (type: AssetType, status: AssetStatus) => {
    return filteredAssets.filter(a => a.type === type && a.status === status).length;
  };

  const assetTypes = Object.values(AssetType);

  // Summaries per status type on filtered
  const filteredReady = filteredAssets.filter(a => a.status === AssetStatus.READY).length;
  const filteredPlan = filteredAssets.filter(a => a.status === AssetStatus.IN_PLAN).length;
  const filteredService = filteredAssets.filter(a => a.status === AssetStatus.SERVICE).length;
  const filteredOutgoing = filteredAssets.filter(a => a.status === AssetStatus.OUT_GOING).length;
  const filteredBackload = filteredAssets.filter(a => a.status === AssetStatus.UNDERGOING_BACKLOAD).length;

  const warehouseTotal = filteredReady + filteredPlan + filteredService;
  const onLocationTotal = filteredOutgoing + filteredBackload;

  return (
    <div className="space-y-8" id="overall-dashboard-container">
      {/* 1. Header Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="stats-grid">
        {/* Total Item Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center space-x-4 hover:border-blue-200 transition-all" id="stat-total">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Inventory</p>
            <h3 className="text-2xl font-bold text-slate-800">{totalAssets} Units</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">All tracked assets currently registered</p>
          </div>
        </div>

        {/* Ready to Use Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center space-x-4 hover:border-emerald-200 transition-all" id="stat-ready">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Warehouse Ready</p>
            <h3 className="text-2xl font-bold text-slate-800">{readyCount} Units</h3>
            <p className="text-[11px] text-emerald-600 mt-0.5 font-medium">Ready to dispatch instantly</p>
          </div>
        </div>

        {/* Outgoing Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center space-x-4 hover:border-amber-200 transition-all" id="stat-dispatch">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">On Location</p>
            <h3 className="text-2xl font-bold text-slate-800">{outgoingCount} Units</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">{backloadCount} backloads pending</p>
          </div>
        </div>

        {/* Expired alert card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center space-x-4 hover:border-red-200 transition-all" id="stat-alerts">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl animate-pulse">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Critical Alerts</p>
            <h3 className="text-2xl font-bold text-slate-800">{expiredCerts.length + needRecert.length} Alerts</h3>
            <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-md font-semibold">REFRESH RE-CERTIFY</span>
          </div>
        </div>
      </div>

      {/* 2. Owner-Specific Department Filter Dashboard */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden" id="department-filtered-dashboard">
        {/* Banner with controls */}
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Building className="w-5 h-5 text-slate-400" />
              <h2 className="text-lg font-bold text-slate-800">Department Dashboard Summary</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Select an owner/segment below to view specialized metrics with divided logistic gates.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Department:
            </span>
            <select
              value={selectedOwner}
              onChange={(e) => onSelectOwner(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              id="department-select-dropdown"
            >
              <option value="">-- All Departments --</option>
              {owners.map(o => (
                <option key={o} value={o}>{o.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Header Metrics */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
            <div>
              <p className="text-xs text-slate-500">Selected Owner Department</p>
              <h4 className="text-base font-bold text-slate-800">
                {selectedOwner ? `${selectedOwner.toUpperCase()} Report` : "Global All Assets Report"}
              </h4>
            </div>
            <div className="flex space-x-6 text-center">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Total Category Units</p>
                <p className="text-lg font-bold text-blue-700">{totalFilteredCount}</p>
              </div>
              <div className="border-l border-slate-200"></div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">In RNG Warehouse (In-base)</p>
                <p className="text-lg font-bold text-slate-700">{warehouseTotal}</p>
              </div>
              <div className="border-l border-slate-200"></div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">On Location (On-site)</p>
                <p className="text-lg font-bold text-slate-700">{onLocationTotal}</p>
              </div>
            </div>
          </div>

          {/* Split Logistical Ledger Table (matching CMT second Excel sheet) */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-xs text-left" id="split-logistical-table">
              {/* Superheaders */}
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th rowSpan={2} className="p-3 border-r border-slate-200 font-bold text-slate-700 align-middle w-1/4">
                    CCU Type
                  </th>
                  <th rowSpan={2} className="p-3 border-r border-slate-200 font-bold text-red-600 align-middle text-center">
                    All CCU
                  </th>
                  <th colSpan={3} className="p-2 border-r border-slate-200 bg-emerald-50 text-emerald-800 font-bold text-center">
                    In RNG FZ, RNG OFS Warehouse (In base)
                  </th>
                  <th colSpan={2} className="p-2 bg-amber-50 text-amber-800 font-bold text-center">
                    On Location (On field)
                  </th>
                </tr>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-2 border-r border-slate-200 font-semibold text-emerald-700 text-center">
                    Ready to use in warehouse
                  </th>
                  <th className="p-2 border-r border-slate-200 font-semibold text-emerald-700 text-center">
                    In Plan (Booking)
                  </th>
                  <th className="p-2 border-r border-slate-200 font-semibold text-red-700 text-center">
                    Service (IN)
                  </th>
                  <th className="p-2 border-r border-slate-200 font-semibold text-amber-700 text-center">
                    Out Going
                  </th>
                  <th className="p-2 font-semibold text-amber-700 text-center">
                    Undergoing Backload
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {assetTypes.map(type => {
                  const ready = getDeptCount(type, AssetStatus.READY);
                  const plan = getDeptCount(type, AssetStatus.IN_PLAN);
                  const service = getDeptCount(type, AssetStatus.SERVICE);
                  const outgoing = getDeptCount(type, AssetStatus.OUT_GOING);
                  const backload = getDeptCount(type, AssetStatus.UNDERGOING_BACKLOAD);
                  const typeTotal = ready + plan + service + outgoing + backload;

                  return (
                    <tr key={type} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 border-r border-slate-200 font-semibold text-slate-800">{type}</td>
                      <td className="p-3 border-r border-slate-200 text-center font-bold text-red-600 bg-red-50/20">{typeTotal}</td>
                      <td className={`p-3 border-r border-slate-200 text-center font-medium ${ready > 0 ? "text-emerald-600 bg-emerald-50/10" : "text-slate-300"}`}>{ready}</td>
                      <td className={`p-3 border-r border-slate-200 text-center font-medium ${plan > 0 ? "text-blue-600 bg-blue-50/10" : "text-slate-300"}`}>{plan}</td>
                      <td className={`p-3 border-r border-slate-200 text-center font-medium ${service > 0 ? "text-red-600 bg-red-50/20" : "text-slate-300"}`}>{service}</td>
                      <td className={`p-3 border-r border-slate-200 text-center font-medium ${outgoing > 0 ? "text-amber-600 bg-amber-50/10" : "text-slate-300"}`}>{outgoing}</td>
                      <td className={`p-3 text-center font-medium ${backload > 0 ? "text-indigo-600 bg-indigo-50/10" : "text-slate-300"}`}>{backload}</td>
                    </tr>
                  );
                })}
                {/* Grand Footing Totals Row */}
                <tr className="bg-slate-50 font-bold border-t border-slate-300 text-slate-800">
                  <td className="p-3 border-r border-slate-200">Total</td>
                  <td className="p-3 border-r border-slate-200 text-center bg-red-50 text-red-700 text-sm">{totalFilteredCount}</td>
                  <td className="p-3 border-r border-slate-200 text-center text-emerald-700 bg-emerald-100/10 text-sm">{filteredReady}</td>
                  <td className="p-3 border-r border-slate-200 text-center text-blue-700 bg-blue-100/10 text-sm">{filteredPlan}</td>
                  <td className="p-3 border-r border-slate-200 text-center text-red-700 bg-red-100/10 text-sm">{filteredService}</td>
                  <td className="p-3 border-r border-slate-200 text-center text-amber-700 bg-amber-100/10 text-sm">{filteredOutgoing}</td>
                  <td className="p-3 text-center text-indigo-700 bg-indigo-100/10 text-sm">{filteredBackload}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400" id="table-definitions">
            <div className="space-x-4 flex">
              <span><strong>Ready to use in warehouse:</strong> Device is healthy and available in RNG main warehouse</span>
              <span>•</span>
              <span><strong>In Plan (Booking):</strong> Device allocated under schedule for upcoming operations</span>
              <span>•</span>
              <span><strong>Service (IN):</strong> Defective or expired cert requiring visual/MPI re-certification</span>
            </div>
            <div>
              <span>Prepared by: <strong>Pousan Yangok (QAQC Inspector)</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Certificate Warning Notification Center (Feature C) */}
      <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 space-y-4" id="alerts-and-certifications-panel">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              Certificate Warning & Expiration Center
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Monitor certificates expiring within safety thresholds or requiring urgent re-certification.
            </p>
          </div>
          
          {/* Quick Area Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-semibold text-slate-505 flex items-center gap-1 shrink-0">
              <MapPin className="w-3.5 h-3.5 text-blue-500" /> Zone/Area:
            </span>
            <MultiSelect
              options={alertAreas}
              selectedValues={alertAreaFilters}
              onChange={(values) => setAlertAreaFilters(values)}
              placeholder="-- All Areas --"
              className="relative"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="alerts-and-certifications">
          {/* Certification Alerts Card Group */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="text-sm font-bold text-slate-800">
                  Expired Certifications ({filteredExpiredCerts.length}
                  {alertAreaFilters.length > 0 && <span className="text-[11px] text-slate-400 font-normal"> of {expiredCerts.length}</span>})
                </h3>
              </div>
              <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">CRITICAL ACTION REQ</span>
            </div>

            <p className="text-xs text-slate-500">
              Cargo carrying units whose Visual or MPI certificate durations have lapsed below the active threshold relative to 10-Jun-2026.
            </p>

            <div className="max-h-56 overflow-y-auto space-y-2 pr-1" id="expired-scroll">
              {filteredExpiredCerts.length === 0 ? (
                <div className="text-center p-6 text-slate-400 text-xs">No expired certificates found! All active units operating within parameters.</div>
              ) : (
                filteredExpiredCerts.map(a => (
                  <div key={a.ccuNumber} className="border border-red-100 bg-red-50/40 p-3 rounded-xl flex items-center justify-between text-xs hover:bg-red-50 transition-colors">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-slate-800">{a.ccuNumber}</span>
                        <span className="text-[9px] bg-slate-200 text-slate-600 px-1 py-0.2 rounded font-medium">{a.type}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">Owner: <span className="font-semibold">{a.owner}</span> | Area: {a.area}</p>
                    </div>
                    <div className="text-right space-y-0.5">
                      {checkExpiryStatus(a.visualExpiraDate) === "expired" && (
                        <p className="text-[10px] text-red-600 font-semibold" title={`Cert Date: ${displayDate(a.visualExpiraDate)}`}>Visual Expired: {displayExpiryDate(a.visualExpiraDate)}</p>
                      )}
                      {checkExpiryStatus(a.mpiExpiraDate) === "expired" && (
                        <p className="text-[10px] text-red-600 font-semibold" title={`Cert Date: ${displayDate(a.mpiExpiraDate)}`}>MPI Expired: {displayExpiryDate(a.mpiExpiraDate)}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Warning Certificates Group */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-800">
                  Near Expiration warnings ({filteredWarningCerts.length}
                  {alertAreaFilters.length > 0 && <span className="text-[11px] text-slate-400 font-normal"> of {warningCerts.length}</span>})
                </h3>
              </div>
              <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">EXPIRING WITHIN 45 DAYS</span>
            </div>

            <p className="text-xs text-slate-500">
              Cargo carrying units whose certificates are nearing limit duration. Dispatching these devices on long-term operations might require advance testing.
            </p>

            <div className="max-h-56 overflow-y-auto space-y-2 pr-1" id="warning-scroll">
              {filteredWarningCerts.length === 0 ? (
                <div className="text-center p-6 text-slate-400 text-xs">No warning certificates identified.</div>
              ) : (
                filteredWarningCerts.map(a => (
                  <div key={a.ccuNumber} className="border border-amber-100 bg-amber-50/20 p-3 rounded-xl flex items-center justify-between text-xs hover:bg-amber-50/40 transition-colors">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-slate-800">{a.ccuNumber}</span>
                        <span className="text-[9px] bg-slate-200 text-slate-600 px-1 py-0.2 rounded font-medium">{a.type}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">Owner: <span className="font-semibold">{a.owner}</span> | Area: {a.area}</p>
                    </div>
                    <div className="text-right space-y-0.5">
                      {checkExpiryStatus(a.visualExpiraDate) === "warning" && (
                        <p className="text-[10px] text-amber-700 font-semibold" title={`Cert Date: ${displayDate(a.visualExpiraDate)}`}>Visual due: {displayExpiryDate(a.visualExpiraDate)}</p>
                      )}
                      {checkExpiryStatus(a.mpiExpiraDate) === "warning" && (
                        <p className="text-[10px] text-amber-700 font-semibold" title={`Cert Date: ${displayDate(a.mpiExpiraDate)}`}>MPI due: {displayExpiryDate(a.mpiExpiraDate)}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
